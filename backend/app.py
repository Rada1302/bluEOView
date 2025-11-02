from flask import Flask, jsonify, request
from flask_cors import CORS
import xarray as xr
import numpy as np
from threading import Lock
from flask_executor import Executor

app = Flask(__name__)
CORS(app)
file_lock = Lock()
executor = Executor(app)

# Path to your NetCDF file (hidden from frontend)
DATA_FILE = "data/output_diversity.nc"

# Mapping from feature names → index in the NetCDF file
FEATURE_MAP = {
    "a_shannon": 0,
    "a_richness": 1,
    "a_evenness": 2,
    "a_invsimpson": 3,
}

@app.after_request
def add_header(response):
    """Disable caching for all responses."""
    response.cache_control.no_store = True
    return response


# -----------------------------
#  Utility Functions
# -----------------------------

def read_netcdf(file_path: str, feature_name: str, time_index: int = 0):
    """
    Reads a diversity NetCDF file and extracts the map for a given feature and time.
    """
    if feature_name not in FEATURE_MAP:
        raise ValueError(f"Invalid feature: {feature_name}")
    feature_index = FEATURE_MAP[feature_name]

    file_lock.acquire()
    try:
        with xr.open_dataset(file_path, chunks={'time': 1}, decode_times=False) as ds:
            lats = ds['latitude'].values
            lons = ds['longitude'].values

            mean_values = ds['mean_values'][feature_index, time_index, :, :].compute().values
            sd_values = ds['sd_values'][feature_index, time_index, :, :].compute().values

            mean_values = np.where(np.isnan(mean_values) | (mean_values == -9999), None, mean_values.round(3))
            sd_values = np.where(np.isnan(sd_values) | (sd_values == -9999), None, sd_values.round(3))

            all_means = ds['mean_values'][feature_index, :, :, :].compute()
            min_val = float(np.nanmin(all_means))
            max_val = float(np.nanmax(all_means))

            data = {
                "feature": feature_name,
                "lats": lats.tolist(),
                "lons": lons.tolist(),
                "mean": mean_values.tolist(),
                "sd": sd_values.tolist(),
                "minValue": round(min_val, 3),
                "maxValue": round(max_val, 3),
                "colorscale": "Viridis",
            }
    finally:
        file_lock.release()
    return data


def get_timeseries(file_path: str, feature_name: str, x: float, y: float):
    """
    Extracts a time series for a single point (lat/lon) across all time steps for a given feature.
    """
    if feature_name not in FEATURE_MAP:
        raise ValueError(f"Invalid feature: {feature_name}")
    feature_index = FEATURE_MAP[feature_name]

    file_lock.acquire()
    try:
        with xr.open_dataset(file_path, decode_times=False) as ds:
            if x is None or y is None:
                raise ValueError("Both x (longitude) and y (latitude) must be provided.")

            mean_series = ds['mean_values'][feature_index, :, :, :].sel(latitude=y, longitude=x, method="nearest").compute()
            sd_series = ds['sd_values'][feature_index, :, :, :].sel(latitude=y, longitude=x, method="nearest").compute()
            time_vals = ds['time'].values

            mean_series = np.where(np.isnan(mean_series) | (mean_series == -9999), None, mean_series.round(3))
            sd_series = np.where(np.isnan(sd_series) | (sd_series == -9999), None, sd_series.round(3))

            # Trend line (linear regression)
            valid = np.array(mean_series, dtype=np.float64)
            valid_mask = ~np.isnan(valid)
            if valid_mask.sum() > 1:
                coeffs = np.polyfit(time_vals[valid_mask], valid[valid_mask], 1)
                trend_line = np.polyval(coeffs, time_vals).round(3).tolist()
            else:
                trend_line = [None] * len(time_vals)

            data = {
                "feature": feature_name,
                "time": time_vals.tolist(),
                "mean": mean_series.tolist(),
                "sd": sd_series.tolist(),
                "trend": trend_line,
            }
    finally:
        file_lock.release()
    return data


# -----------------------------
#  API Endpoints
# -----------------------------

@app.route("/api/diversity-map", methods=["GET"])
def diversity_map():
    """
    API endpoint to get map data for a given feature and time.
    Query parameters:
        - feature: string in {"a_shannon","a_richness","a_evenness","a_invsimpson"}
        - timeIndex: int (0–12)
    """
    feature = request.args.get("feature", default="a_shannon", type=str)
    time_index = request.args.get("timeIndex", default=0, type=int)

    future = executor.submit(read_netcdf, DATA_FILE, feature, time_index)
    data = future.result()

    response = jsonify(data)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response


@app.route("/api/diversity-line", methods=["GET"])
def diversity_line():
    """
    API endpoint to get time series at a single location for a given feature.
    Query parameters:
        - feature: string in {"a_shannon","a_richness","a_evenness","a_invsimpson"}
        - x: longitude
        - y: latitude
    """
    feature = request.args.get("feature", default="a_shannon", type=str)
    x = request.args.get("x", type=float)
    y = request.args.get("y", type=float)

    future = executor.submit(get_timeseries, DATA_FILE, feature, x, y)
    data = future.result()

    response = jsonify(data)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response


# -----------------------------
#  Main
# -----------------------------
if __name__ == "__main__":
    app.run(debug=False, threaded=True)