from flask import Flask, jsonify, request
from flask_cors import CORS
import xarray as xr
import numpy as np
from threading import Lock

app = Flask(__name__)
CORS(app)

# Default dataset URL
DEFAULT_DATA_FILE = "https://data.up.ethz.ch/shared/Blueoview_data/diversity_output.nc"

# Dataset cache for performance
DATASETS = {}
DATA_LOCK = Lock()


def get_dataset(file_url):
    with DATA_LOCK:
        if file_url in DATASETS:
            return DATASETS[file_url]

        print(f"Opening dataset: {file_url}")

        ds = xr.open_dataset(
            file_url,
            engine="h5netcdf",
            decode_times=False,
            mask_and_scale=True,
            chunks={"time": 1}
        )

        # Extract target names
        raw_target_names = ds["target_name"].values.tolist()

        lats = ds["lat"].values.tolist()
        lons = ds["lon"].values.tolist()

        valid_indices = []
        valid_targets = []
        global_minmax = {}

        print("Filtering empty targets...")

        for i, name in enumerate(raw_target_names):
            arr = ds["mean"].isel(target=i).compute().values
            arr = np.array(arr, dtype=float)
            finite_vals = arr[np.isfinite(arr)]

            if finite_vals.size > 0:
                valid_indices.append(i)

                # If duplicates exist, make them unique
                if name in valid_targets:
                    name = f"{name}_{i}"

                valid_targets.append(name)

                min_val = round(float(np.min(finite_vals)), 3)
                max_val = round(float(np.max(finite_vals)), 3)
                global_minmax[name] = (min_val, max_val)

        # Select only valid indices
        ds = ds.isel(target=valid_indices)

        # Assign new unique coordinate
        ds = ds.assign_coords(target=("target", valid_targets))

        print(f"Kept {len(valid_targets)} valid targets")

        DATASETS[file_url] = {
            "ds": ds,
            "targets": valid_targets,
            "lats": lats,
            "lons": lons,
            "minmax": global_minmax,
        }

        print("Dataset cached")
        return DATASETS[file_url]


@app.route("/api/diversity-map", methods=["GET"])
def diversity_map():
    feature = request.args.get("feature", type=str)
    month_index = request.args.get("timeIndex", default=1, type=int)
    file_url = request.args.get("file", default=DEFAULT_DATA_FILE, type=str)

    dataset = get_dataset(file_url)
    ds = dataset["ds"]
    lats = np.array(dataset["lats"])
    lons = np.array(dataset["lons"])

    if feature not in dataset["targets"]:
        return jsonify({"error": "Invalid or empty feature"}), 400

    if not (1 <= month_index <= ds.sizes["time"]):
        return jsonify({"error": "Invalid timeIndex"}), 400

    time_index = month_index - 1

    mean_slice = ds["mean"].sel(target=feature).isel(time=time_index)
    sd_slice = ds["sd"].sel(target=feature).isel(time=time_index)

    def slice_to_2d(slice_):
        arr = slice_.values
        arr = np.array(arr, dtype=float)

        # Ensure 2D shape
        if arr.ndim == 1:
            if len(arr) == len(lats) * len(lons):
                arr = arr.reshape(len(lats), len(lons))
            elif len(arr) == len(lats):
                arr = np.repeat(arr[:, np.newaxis], len(lons), axis=1)
            elif len(arr) == len(lons):
                arr = np.repeat(arr[np.newaxis, :], len(lats), axis=0)
            else:
                raise ValueError(f"Unexpected slice shape: {arr.shape}")

        arr = np.where(np.isfinite(arr), arr, None)

        arr_rounded = np.array([
            [round(x, 3) if x is not None else None for x in row]
            for row in arr
        ])

        return arr_rounded.tolist()

    mean_values = slice_to_2d(mean_slice)
    sd_values = slice_to_2d(sd_slice)

    min_val, max_val = dataset["minmax"][feature]

    return jsonify({
        "feature": feature,
        "lats": lats.tolist(),
        "lons": lons.tolist(),
        "mean": mean_values,
        "sd": sd_values,
        "minValue": min_val,
        "maxValue": max_val,
        "colorscale": "Viridis",
    })


@app.route("/api/diversity-features", methods=["GET"])
def diversity_features():
    file_url = request.args.get("file", default=DEFAULT_DATA_FILE, type=str)
    dataset = get_dataset(file_url)

    features = [
        {
            "value": name,
            "label": name.replace("_", " ").title(),
            "description": f"Diversity metric: {name}"
        }
        for name in dataset["targets"]
    ]

    return jsonify({"features": features})


if __name__ == "__main__":
    app.run(debug=False, threaded=True)