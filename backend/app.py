from flask import Flask, jsonify, request
from flask_cors import CORS
import xarray as xr
import numpy as np
from threading import Lock
import requests
import tempfile
import os

app = Flask(__name__)
CORS(app)

DEFAULT_DATA_FILE = "https://data.up.ethz.ch/shared/Blueoview_data/diversity_output.nc"

DATASETS = {}
DATA_LOCK = Lock()
DOWNLOADED_FILES = {}


def get_local_path(file_url):
    if file_url in DOWNLOADED_FILES:
        local_path = DOWNLOADED_FILES[file_url]
        if os.path.exists(local_path):
            return local_path

    print(f"Downloading: {file_url}")
    response = requests.get(file_url, stream=True, timeout=120)
    response.raise_for_status()

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".nc")
    for chunk in response.iter_content(chunk_size=8192):
        tmp.write(chunk)
    tmp.close()

    DOWNLOADED_FILES[file_url] = tmp.name
    print(f"Downloaded to: {tmp.name}")
    return tmp.name


def decode_name(name):
    if isinstance(name, (bytes, np.bytes_)):
        return name.decode("utf-8", errors="replace").strip()
    return str(name).strip()


def get_dataset(file_url):
    with DATA_LOCK:
        if file_url in DATASETS:
            return DATASETS[file_url]

        local_path = get_local_path(file_url)
        print(f"Opening dataset: {local_path}")

        ds = xr.open_dataset(local_path, mask_and_scale=True)
        print(f"Data vars: {list(ds.data_vars)}")
        print(f"Dims: {dict(ds.sizes)}")

        raw_target_names = [decode_name(n) for n in ds["target_name"].values.tolist()]

        try:
            ds_coords = xr.open_dataset(local_path, decode_cf=False)
            raw_lats = np.array(ds_coords["lat"].values, dtype=float).flatten()
            raw_lons = np.array(ds_coords["lon"].values, dtype=float).flatten()
            ds_coords.close()
            lats = sorted([round(float(v), 4) for v in raw_lats if np.isfinite(v) and -90 <= v <= 90])
            lons = sorted([round(float(v), 4) for v in raw_lons if np.isfinite(v) and -180 <= v <= 360])
            if not lats or not lons:
                raise ValueError(f"lat/lon variables contain only fill values")
            print(f"Lats: {len(lats)} from {lats[0]} to {lats[-1]}")
            print(f"Lons: {len(lons)} from {lons[0]} to {lons[-1]}")
        except Exception as e:
            print(f"Coord extraction failed ({e}), inferring from dimension size")
            n_lat = ds.sizes.get("lat", 180)
            n_lon = ds.sizes.get("lon", 360)
            lats = [round(-90 + (i + 0.5) * 180 / n_lat, 4) for i in range(n_lat)]
            lons = [round(-180 + (i + 0.5) * 360 / n_lon, 4) for i in range(n_lon)]
            print(f"Inferred grid: lats {lats[0]} to {lats[-1]}, lons {lons[0]} to {lons[-1]}")

        print("Filtering valid targets...")
        mean_t0 = ds["mean"].isel(time=0).values  # shape: (target, lat, lon)
        finite_counts = np.isfinite(mean_t0).reshape(mean_t0.shape[0], -1).any(axis=1)

        valid_indices = [i for i, ok in enumerate(finite_counts) if ok]
        valid_targets = [{"key": f"target_{i}", "label": raw_target_names[i]} for i in valid_indices]
        print(f"Found {len(valid_targets)} valid targets")

        # Print raw SD stats for first valid target across all time steps
        if valid_indices:
            raw_sd = ds["sd"].isel(target=valid_indices[0]).values
            finite_sd = raw_sd[np.isfinite(raw_sd)]
            if finite_sd.size > 0:
                print(f"Raw SD (target 0, all times): min={finite_sd.min():.4g} max={finite_sd.max():.4g} "
                      f"median={np.median(finite_sd):.4g} p95={np.percentile(finite_sd, 95):.4g}")

        ds = ds.isel(target=valid_indices)
        ds = ds.assign_coords(target=("target", [t["key"] for t in valid_targets]))
        target_map = {t["key"]: t for t in valid_targets}

        DATASETS[file_url] = {
            "ds": ds,
            "targets": valid_targets,
            "target_map": target_map,
            "lats": lats,
            "lons": lons,
        }
        print(f"Kept {len(valid_targets)} targets: {[(t['key'], t['label']) for t in valid_targets[:3]]}")
        return DATASETS[file_url]


def slice_to_2d(slice_):
    arr = slice_.transpose("lat", "lon").load().values
    return [
        [None if not np.isfinite(x) else round(float(x), 3) for x in row]
        for row in arr
    ]


@app.route("/api/diversity-map", methods=["GET"])
def diversity_map():
    feature_key = request.args.get("feature", type=str)
    month_index = request.args.get("timeIndex", default=1, type=int)
    file_url = request.args.get("file", default=DEFAULT_DATA_FILE, type=str)

    try:
        dataset = get_dataset(file_url)
    except Exception as e:
        return jsonify({"error": f"Failed to load dataset: {str(e)}"}), 500

    ds = dataset["ds"]
    target_map = dataset["target_map"]

    if feature_key not in target_map:
        return jsonify({"error": f"Unknown feature '{feature_key}'"}), 400

    max_time = ds.sizes["time"]
    if not (1 <= month_index <= max_time):
        return jsonify({"error": f"Invalid timeIndex {month_index}, valid range 1-{max_time}"}), 400

    time_index = month_index - 1
    mean_slice = ds["mean"].sel(target=feature_key).isel(time=time_index).load()
    sd_slice   = ds["sd"].sel(target=feature_key).isel(time=time_index).load()

    sd_vals = sd_slice.values[np.isfinite(sd_slice.values)]
    if sd_vals.size > 0:
        print(f"SD: min={sd_vals.min():.3g} max={sd_vals.max():.3g} "
              f"median={np.median(sd_vals):.3g} p90={np.percentile(sd_vals, 90):.3g} "
              f"pct_over_0.5={100*(sd_vals > 0.5).mean():.1f}%")

    finite_vals = mean_slice.values[np.isfinite(mean_slice.values)]
    min_val = round(float(finite_vals.min()), 3) if finite_vals.size > 0 else None
    max_val = round(float(finite_vals.max()), 3) if finite_vals.size > 0 else None

    sd_finite = sd_slice.values[np.isfinite(sd_slice.values)]
    sd_min = round(float(sd_finite.min()), 3) if sd_finite.size > 0 else None
    sd_max = round(float(sd_finite.max()), 3) if sd_finite.size > 0 else None

    return jsonify({
        "feature":  feature_key,
        "label":    target_map[feature_key]["label"],
        "lats":     dataset["lats"],
        "lons":     dataset["lons"],
        "mean":     slice_to_2d(mean_slice),
        "sd":       slice_to_2d(sd_slice),
        "minValue": min_val,
        "maxValue": max_val,
        "sdMin":    sd_min,
        "sdMax":    sd_max,
    })


@app.route("/api/diversity-features", methods=["GET"])
def diversity_features():
    file_url = request.args.get("file", default=DEFAULT_DATA_FILE, type=str)

    try:
        dataset = get_dataset(file_url)
    except Exception as e:
        return jsonify({"error": f"Failed to load dataset: {str(e)}"}), 500

    return jsonify({"features": [
        {
            "value": t["key"],
            "label": t["label"].replace("_", " ").title(),
            "description": f"Diversity metric: {t['label']}",
        }
        for t in dataset["targets"]
    ]})


if __name__ == "__main__":
    app.run(debug=False, threaded=True)