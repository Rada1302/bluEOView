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

DATASETS = {}
DATA_LOCK = Lock()
DOWNLOADED_FILES = {}


# helpers
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


def extract_metadata(ds):
    """Extract well-known CF/ACDD global attributes plus any extras."""
    attrs = ds.attrs
    field_map = {
        "title": ["title"],
        "summary": ["summary", "abstract", "description"],
        "institution": [
            "institution",
            "university",
            "affiliation",
            "source_institution",
        ],
        "paper": ["paper", "publication", "reference", "references", "doi", "citation"],
        "doi": ["doi"],
        "author": ["author", "creator_name", "contact"],
        "license": ["license", "licence"],
        "version": ["version", "data_version"],
        "date_created": ["date_created", "creation_date"],
        "history": ["history"],
        "source": ["source"],
        "comment": ["comment", "notes"],
        "keywords": ["keywords"],
        "project": ["project", "program"],
        "geospatial_lat_min": ["geospatial_lat_min"],
        "geospatial_lat_max": ["geospatial_lat_max"],
        "geospatial_lon_min": ["geospatial_lon_min"],
        "geospatial_lon_max": ["geospatial_lon_max"],
        "time_coverage_start": ["time_coverage_start"],
        "time_coverage_end": ["time_coverage_end"],
    }

    meta = {}
    captured = set()
    for canonical, candidates in field_map.items():
        for c in candidates:
            val = attrs.get(c) or attrs.get(c.upper()) or attrs.get(c.lower())
            if val is not None:
                meta[canonical] = str(val).strip()
                captured.add(c.lower())
                break

    extra = {k: str(v).strip() for k, v in attrs.items() if k.lower() not in captured}
    if extra:
        meta["extra_attributes"] = extra
    return meta


def slice_to_2d(da):
    """Convert a strictly 2-D (lat, lon) DataArray to a JSON list.

    Casts to float64 first so np.isfinite works on integer arrays (obs counts).
    """
    arr = da.transpose("lat", "lon").load().values.astype(np.float64)
    return [
        [None if not np.isfinite(v) else round(float(v), 3) for v in row] for row in arr
    ]


def drop_time(da, time_index):
    """Select a time index if the dim exists, otherwise return as-is."""
    if "time" in da.dims:
        return da.isel(time=time_index)
    return da


# dataset loader
def get_dataset(file_url):
    with DATA_LOCK:
        if file_url in DATASETS:
            return DATASETS[file_url]

        local_path = get_local_path(file_url)
        print(f"Opening dataset: {local_path}")

        ds = xr.open_dataset(local_path, mask_and_scale=True)
        print(f"Data vars: {list(ds.data_vars)}")
        print(f"Dims: {dict(ds.sizes)}")

        # normalise legacy species to taxa naming
        rename_map = {}
        if "species_name" in ds and "taxa_name" not in ds:
            rename_map["species_name"] = "taxa_name"
        if "species" in ds.dims and "taxa" not in ds.dims:
            rename_map["species"] = "taxa"
        if rename_map:
            ds = ds.rename(rename_map)
            print(f"Renamed: {rename_map}")

        # resolve name variable
        taxa_name_var = next((v for v in ["taxa_name", "target_name"] if v in ds), None)
        if taxa_name_var is None:
            raise ValueError("Dataset has neither 'taxa_name' nor 'target_name'")
        raw_names = [decode_name(n) for n in ds[taxa_name_var].values.tolist()]

        # global metadata
        metadata = extract_metadata(ds)
        print(f"Metadata keys: {list(metadata.keys())}")

        # lat/lon grid
        try:
            ds_raw = xr.open_dataset(local_path, decode_cf=False)
            raw_lats = np.array(ds_raw["lat"].values, dtype=float).flatten()
            raw_lons = np.array(ds_raw["lon"].values, dtype=float).flatten()
            ds_raw.close()
            lats = sorted(
                [
                    round(float(v), 4)
                    for v in raw_lats
                    if np.isfinite(v) and -90 <= v <= 90
                ]
            )
            lons = sorted(
                [
                    round(float(v), 4)
                    for v in raw_lons
                    if np.isfinite(v) and -180 <= v <= 360
                ]
            )
            if not lats or not lons:
                raise ValueError("lat/lon contain only fill values")
            print(f"Lats: {len(lats)} [{lats[0]} … {lats[-1]}]")
            print(f"Lons: {len(lons)} [{lons[0]} … {lons[-1]}]")
        except Exception as e:
            print(f"Coord extraction failed ({e}), inferring from dim size")
            n_lat = ds.sizes.get("lat", 180)
            n_lon = ds.sizes.get("lon", 360)
            lats = [round(-90 + (i + 0.5) * 180 / n_lat, 4) for i in range(n_lat)]
            lons = [round(-180 + (i + 0.5) * 360 / n_lon, 4) for i in range(n_lon)]
            print(f"Inferred: lats {lats[0]}…{lats[-1]}, lons {lons[0]}…{lons[-1]}")

        # obs variable detection
        has_obs = "obs" in ds
        obs_has_target_dim = has_obs and (
            "target" in ds["obs"].dims or "taxa" in ds["obs"].dims
        )
        print(f"obs present: {has_obs}, has target dim: {obs_has_target_dim}")

        # filter valid targets
        # A target is valid if it has at least one finite mean value at t=0.
        print("Filtering valid targets…")
        mean_t0 = ds["mean"].isel(time=0).values  # (n_target, lat, lon)
        valid_mask = np.isfinite(mean_t0).reshape(mean_t0.shape[0], -1).any(axis=1)

        # orig_indices: positions in the ORIGINAL target dimension that are valid.
        orig_indices = [int(i) for i, ok in enumerate(valid_mask) if ok]

        ds = ds.isel(target=orig_indices)

        # Assign string keys as coordinate labels.
        # Key encodes the ORIGINAL index so it's stable and traceable.
        t_keys = [f"target_{orig_indices[pos]}" for pos in range(len(orig_indices))]
        t_labels = [raw_names[i] for i in orig_indices]
        ds = ds.assign_coords(target=("target", t_keys))

        valid_targets = [{"key": k, "label": l} for k, l in zip(t_keys, t_labels)]
        target_map = {t["key"]: t for t in valid_targets}

        print(f"Valid targets: {len(valid_targets)}")
        print(f"Sample: {[(t['key'], t['label']) for t in valid_targets[:3]]}")

        # SD diagnostics
        if orig_indices:
            raw_sd = ds["sd"].isel(target=0).values
            finite_sd = raw_sd[np.isfinite(raw_sd)]
            if finite_sd.size > 0:
                print(
                    f"Raw SD (first valid target, all times): "
                    f"min={finite_sd.min():.4g} max={finite_sd.max():.4g} "
                    f"median={np.median(finite_sd):.4g} "
                    f"p95={np.percentile(finite_sd, 95):.4g}"
                )

        # per-target SD global max (lazy)
        print("Computing per-target SD global max (lazy)…")
        sd_max_values = ds["sd"].max(dim=["time", "lat", "lon"], skipna=True).values

        sd_global_max = {}
        for pos, t_key in enumerate(t_keys):
            v = float(sd_max_values[pos])
            sd_global_max[t_key] = v if (np.isfinite(v) and v > 0) else 1.0
        print(
            f"SD max sample: { {k: round(v, 4) for k, v in list(sd_global_max.items())[:3]} }"
        )

        # obs global max (diversity only, no target dim)
        obs_global_max = None
        if has_obs and not obs_has_target_dim:
            v = float(ds["obs"].max(skipna=True).values)
            obs_global_max = v if np.isfinite(v) else None
            print(f"obs (diversity density) global max: {obs_global_max}")

        DATASETS[file_url] = {
            "ds": ds,
            "targets": valid_targets,
            "target_map": target_map,
            "lats": lats,
            "lons": lons,
            "metadata": metadata,
            "has_obs": has_obs,
            "obs_has_target_dim": obs_has_target_dim,
            "sd_global_max": sd_global_max,
            "obs_global_max": obs_global_max,
        }
        return DATASETS[file_url]


# /api/diversity-map
@app.route("/api/diversity-map", methods=["GET"])
def diversity_map():
    file_url = request.args.get("file", type=str)
    feature_key = request.args.get("feature", type=str)
    month_index = request.args.get("timeIndex", default=1, type=int)

    if not file_url:
        return jsonify({"error": "Missing required parameter: file"}), 400
    if not feature_key:
        return jsonify({"error": "Missing required parameter: feature"}), 400

    try:
        dataset = get_dataset(file_url)
    except Exception as e:
        return jsonify({"error": f"Failed to load dataset: {e}"}), 500

    ds = dataset["ds"]
    target_map = dataset["target_map"]
    sd_global_max = dataset["sd_global_max"]

    if feature_key not in target_map:
        return jsonify({"error": f"Unknown feature '{feature_key}'"}), 400

    max_time = ds.sizes["time"]
    if not (1 <= month_index <= max_time):
        return (
            jsonify({"error": f"timeIndex {month_index} out of range 1–{max_time}"}),
            400,
        )

    time_index = month_index - 1

    # mean
    mean_slice = ds["mean"].sel(target=feature_key).isel(time=time_index).load()
    finite_mean = mean_slice.values[np.isfinite(mean_slice.values)]
    min_val = round(float(finite_mean.min()), 3) if finite_mean.size > 0 else None
    max_val = round(float(finite_mean.max()), 3) if finite_mean.size > 0 else None

    # sd
    sd_slice = ds["sd"].sel(target=feature_key).isel(time=time_index).load()
    sd_max_for_target = sd_global_max.get(feature_key, 1.0)
    sd_vals = sd_slice.values[np.isfinite(sd_slice.values)]
    if sd_vals.size > 0:
        print(
            f"SD [{feature_key}] t={time_index}: "
            f"min={sd_vals.min():.3g} max={sd_vals.max():.3g} "
            f"global_max={sd_max_for_target:.3g} "
            f"p90={np.percentile(sd_vals, 90):.3g}"
        )

    # obs
    # mean, sd, and obs all share the same "target" coordinate (assigned at load
    # time from the same isel), so .sel(target=feature_key) on obs is guaranteed
    # to return data for the same taxon as mean/sd.
    obs_2d = None
    obs_max = None
    obs_type = None

    if dataset["has_obs"]:
        try:
            obs_var = ds["obs"]
            if dataset["obs_has_target_dim"]:
                # shape: (target, [time,] lat, lon)
                obs_slice = obs_var.sel(target=feature_key)
                # do obs vary by month?
                obs_slice = drop_time(obs_slice, time_index).load()
                obs_arr = obs_slice.values.astype(np.float64)
                finite_obs = obs_arr[np.isfinite(obs_arr)]
                obs_max = (
                    round(float(finite_obs.max()), 3) if finite_obs.size > 0 else None
                )
                obs_2d = slice_to_2d(obs_slice)
                obs_type = "taxa"
                print(
                    f"obs [{feature_key}]: cells={finite_obs.size} "
                    f"total={finite_obs.sum():.0f} max={obs_max}"
                )
            else:
                # shape: ([time,] lat, lon) diversity observation density
                obs_slice = drop_time(obs_var, time_index).load()
                obs_2d = slice_to_2d(obs_slice)
                obs_type = "diversity"
                obs_max = dataset["obs_global_max"]
        except Exception as e:
            print(f"obs extraction failed for {feature_key}: {e}")

    return jsonify(
        {
            "feature": feature_key,
            "label": target_map[feature_key]["label"],
            "lats": dataset["lats"],
            "lons": dataset["lons"],
            "mean": slice_to_2d(mean_slice),
            "sd": slice_to_2d(sd_slice),
            "minValue": min_val,
            "maxValue": max_val,
            "sdGlobalMax": sd_max_for_target,
            "sdMax": sd_max_for_target,  # legacy alias
            "obs": obs_2d,
            "obsMax": obs_max,
            "obsType": obs_type,
            "hasObs": obs_2d is not None,
        }
    )


# /api/diversity-features
@app.route("/api/diversity-features", methods=["GET"])
def diversity_features():
    file_url = request.args.get("file", type=str)
    if not file_url:
        return jsonify({"error": "Missing required parameter: file"}), 400

    try:
        dataset = get_dataset(file_url)
    except Exception as e:
        return jsonify({"error": f"Failed to load dataset: {e}"}), 500

    obs_type = (
        "taxa"
        if dataset["obs_has_target_dim"]
        else "diversity" if dataset["has_obs"] else None
    )
    return jsonify(
        {
            "features": [
                {
                    "value": t["key"],
                    "label": t["label"].replace("_", " ").title(),
                    "description": f"Diversity metric: {t['label']}",
                }
                for t in dataset["targets"]
            ],
            "metadata": dataset["metadata"],
            "hasObs": dataset["has_obs"],
            "obsType": obs_type,
        }
    )


# /api/diversity-metadata
@app.route("/api/diversity-metadata", methods=["GET"])
def diversity_metadata():
    file_url = request.args.get("file", type=str)
    if not file_url:
        return jsonify({"error": "Missing required parameter: file"}), 400

    try:
        dataset = get_dataset(file_url)
    except Exception as e:
        return jsonify({"error": f"Failed to load dataset: {e}"}), 500

    obs_type = (
        "taxa"
        if dataset["obs_has_target_dim"]
        else "diversity" if dataset["has_obs"] else None
    )
    return jsonify(
        {
            "metadata": dataset["metadata"],
            "hasObs": dataset["has_obs"],
            "obsType": obs_type,
        }
    )


if __name__ == "__main__":
    app.run(debug=False, threaded=True)
