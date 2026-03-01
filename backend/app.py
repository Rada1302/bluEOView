from flask import Flask, jsonify, request
from flask_cors import CORS
import xarray as xr
import numpy as np

app = Flask(__name__)
CORS(app)

# Configuration
DATA_FILE = "https://data.up.ethz.ch/shared/mapmaker/output_diversity.nc"

FEATURE_MAP = {
    "a_shannon": 0,
    "a_richness": 1,
    "a_evenness": 2,
    "a_invsimpson": 3,
}

# Open dataset once at startup for better performance
print("Opening NetCDF dataset...")

ds = xr.open_dataset(
    DATA_FILE,
    engine="h5netcdf",
    decode_times=False,
    chunks={"time": 1}
)

# Cache coordinates once
LATS = ds["latitude"].values.tolist()
LONS = ds["longitude"].values.tolist()

# Precompute global min/max
print("Precomputing global min/max values...")

GLOBAL_MINMAX = {}

for feature_name, feature_index in FEATURE_MAP.items():
    arr = ds["mean_values"][feature_index]
    min_val = float(arr.min().compute())
    max_val = float(arr.max().compute())
    GLOBAL_MINMAX[feature_name] = (
        round(min_val, 3),
        round(max_val, 3),
    )

print("Backend ready.")

def clean_array(arr):
    """Replace NaN and -9999 with None, round to 3 decimals."""
    arr = arr.compute()
    arr = np.where(
        np.isnan(arr) | (arr == -9999),
        None,
        np.round(arr, 3),
    )
    return arr.tolist()


# API Endpoints
@app.route("/api/diversity-map", methods=["GET"])
def diversity_map():
    """
    GET /api/diversity-map?feature=a_shannon&timeIndex=1–13
    1–12 = months, 13 = annual mean
    """

    feature = request.args.get("feature", default="a_shannon", type=str)
    month_index = request.args.get("timeIndex", default=1, type=int)

    if feature not in FEATURE_MAP:
        return jsonify({"error": "Invalid feature"}), 400

    if not (1 <= month_index <= 13):
        return jsonify({"error": "timeIndex must be 1–13"}), 400

    feature_index = FEATURE_MAP[feature]
    time_index = month_index - 1  # zero-based

    mean_slice = ds["mean_values"][feature_index, time_index, :, :]
    sd_slice = ds["sd_values"][feature_index, time_index, :, :]

    mean_values = clean_array(mean_slice)
    sd_values = clean_array(sd_slice)

    min_val, max_val = GLOBAL_MINMAX[feature]

    return jsonify({
        "feature": feature,
        "lats": LATS,
        "lons": LONS,
        "mean": mean_values,
        "sd": sd_values,
        "minValue": min_val,
        "maxValue": max_val,
        "colorscale": "Viridis",
    })


@app.route("/api/diversity-line", methods=["GET"])
def diversity_line():
    """
    GET /api/diversity-line?feature=a_shannon&x=<lon>&y=<lat>
    Returns full 13-step time series
    """

    feature = request.args.get("feature", default="a_shannon", type=str)
    x = request.args.get("x", type=float)
    y = request.args.get("y", type=float)

    if feature not in FEATURE_MAP:
        return jsonify({"error": "Invalid feature"}), 400

    if x is None or y is None:
        return jsonify({"error": "Both x and y must be provided"}), 400

    feature_index = FEATURE_MAP[feature]

    mean_series = (
        ds["mean_values"][feature_index]
        .sel(latitude=y, longitude=x, method="nearest")
    )

    sd_series = (
        ds["sd_values"][feature_index]
        .sel(latitude=y, longitude=x, method="nearest")
    )

    mean_values = clean_array(mean_series)
    sd_values = clean_array(sd_series)

    # Time values (1–13)
    time_vals = list(range(1, len(mean_values) + 1))

    # Trend line
    valid = np.array(mean_values, dtype=np.float64)
    valid_mask = ~np.isnan(valid)

    if valid_mask.sum() > 1:
        coeffs = np.polyfit(np.arange(len(valid))[valid_mask], valid[valid_mask], 1)
        trend_line = np.polyval(coeffs, np.arange(len(valid)))
        trend_line = np.round(trend_line, 3).tolist()
    else:
        trend_line = [None] * len(valid)

    return jsonify({
        "feature": feature,
        "time": time_vals,
        "mean": mean_values,
        "sd": sd_values,
        "trend": trend_line,
    })

if __name__ == "__main__":
    app.run(debug=False, threaded=True)