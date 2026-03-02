from flask import Flask, jsonify, request
from flask_cors import CORS
import xarray as xr
import numpy as np
from threading import Lock

app = Flask(__name__)
CORS(app)

# Configuration
DEFAULT_DATA_FILE = "https://data.up.ethz.ch/shared/mapmaker/output_diversity.nc"

FEATURE_MAP = {
    "a_shannon": 0,
    "a_richness": 1,
    "a_evenness": 2,
    "a_invsimpson": 3,
}

# Dataset cache per url
DATASETS = {}
DATA_LOCK = Lock()

def get_dataset(file_url):
    """
    Returns cached dataset for given URL.
    If not cached yet, opens and caches it.
    """

    with DATA_LOCK:
        if file_url in DATASETS:
            return DATASETS[file_url]

        print(f"Opening dataset: {file_url}")

        ds = xr.open_dataset(
            file_url,
            engine="h5netcdf",
            decode_times=False,
            chunks={"time": 1}
        )

        # Cache coordinates
        lats = ds["latitude"].values.tolist()
        lons = ds["longitude"].values.tolist()

        # Precompute min/max per feature
        global_minmax = {}
        for feature_name, feature_index in FEATURE_MAP.items():
            arr = ds["mean_values"][feature_index]
            min_val = float(arr.min().compute())
            max_val = float(arr.max().compute())
            global_minmax[feature_name] = (
                round(min_val, 3),
                round(max_val, 3),
            )

        DATASETS[file_url] = {
            "ds": ds,
            "lats": lats,
            "lons": lons,
            "minmax": global_minmax,
        }

        print(f"Dataset cached: {file_url}")

        return DATASETS[file_url]


# Utilities
def clean_array(arr):
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

    feature = request.args.get("feature", default="a_shannon", type=str)
    month_index = request.args.get("timeIndex", default=1, type=int)
    file_url = request.args.get("file", default=DEFAULT_DATA_FILE, type=str)

    if feature not in FEATURE_MAP:
        return jsonify({"error": "Invalid feature"}), 400

    if not (1 <= month_index <= 13):
        return jsonify({"error": "timeIndex must be 1–13"}), 400

    dataset = get_dataset(file_url)
    ds = dataset["ds"]

    feature_index = FEATURE_MAP[feature]
    time_index = month_index - 1

    mean_slice = ds["mean_values"][feature_index, time_index, :, :]
    sd_slice = ds["sd_values"][feature_index, time_index, :, :]

    mean_values = clean_array(mean_slice)
    sd_values = clean_array(sd_slice)

    min_val, max_val = dataset["minmax"][feature]

    return jsonify({
        "feature": feature,
        "lats": dataset["lats"],
        "lons": dataset["lons"],
        "mean": mean_values,
        "sd": sd_values,
        "minValue": min_val,
        "maxValue": max_val,
        "colorscale": "Viridis",
    })


@app.route("/api/diversity-line", methods=["GET"])
def diversity_line():

    feature = request.args.get("feature", default="a_shannon", type=str)
    x = request.args.get("x", type=float)
    y = request.args.get("y", type=float)
    file_url = request.args.get("file", default=DEFAULT_DATA_FILE, type=str)

    if feature not in FEATURE_MAP:
        return jsonify({"error": "Invalid feature"}), 400

    if x is None or y is None:
        return jsonify({"error": "Both x and y must be provided"}), 400

    dataset = get_dataset(file_url)
    ds = dataset["ds"]

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

    time_vals = list(range(1, len(mean_values) + 1))

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