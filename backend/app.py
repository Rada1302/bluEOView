from flask import Flask, jsonify, request
from flask_cors import CORS
import xarray as xr
import numpy as np
from threading import Lock, Thread
from collections import defaultdict
import requests
import tempfile
import hashlib
import os
import traceback

app = Flask(__name__)
CORS(app)

# caches
DATASETS = {}
DATASETS_LOCK = Lock()  # protects DATASETS dict only (fast)
PER_URL_LOCKS = defaultdict(Lock)  # serialize work per-URL, not globally
PER_URL_LOCKS_GUARD = Lock()
DOWNLOADED_FILES = {}


CACHE_DIR = "/var/cephaloview_data"
os.makedirs(CACHE_DIR, exist_ok=True)


def get_url_lock(file_url):
    with PER_URL_LOCKS_GUARD:
        return PER_URL_LOCKS[file_url]


# download with persistent cache
def get_local_path(file_url):
    # in-memory hit
    cached = DOWNLOADED_FILES.get(file_url)
    if cached and os.path.exists(cached):
        return cached

    # on-disk hit (survives restarts)
    h = hashlib.sha1(file_url.encode("utf-8")).hexdigest()
    stable_path = os.path.join(CACHE_DIR, f"{h}.nc")
    if os.path.exists(stable_path) and os.path.getsize(stable_path) > 0:
        DOWNLOADED_FILES[file_url] = stable_path
        print(f"Disk cache hit: {stable_path}")
        return stable_path

    print(f"Downloading: {file_url}")
    response = requests.get(file_url, stream=True, timeout=120)
    response.raise_for_status()

    # write to a temp file in the cache dir, then rename atomically
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".nc.part", dir=CACHE_DIR)
    try:
        for chunk in response.iter_content(chunk_size=1 << 20):  # 1 MB chunks
            tmp.write(chunk)
        tmp.close()
        os.replace(tmp.name, stable_path)
    except Exception:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass
        raise

    DOWNLOADED_FILES[file_url] = stable_path
    print(f"Downloaded to: {stable_path}")
    return stable_path


# helpers
def decode_name(name):
    if isinstance(name, (bytes, np.bytes_)):
        return name.decode("utf-8", errors="replace").strip()
    return str(name).strip()


def extract_metadata(ds):
    attrs = ds.attrs
    field_map = {
        "title": ["title"],
        "summary": ["summary", "abstract"],
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
        "description": ["description", "global:description"],
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
    arr = da.transpose("lat", "lon").values.astype(np.float64)
    return [
        [None if not np.isfinite(v) else round(float(v), 3) for v in row] for row in arr
    ]


def drop_time(da, time_index):
    if "time" in da.dims:
        return da.isel(time=time_index)
    return da


def detect_obs_type_fast(ds):
    """Sample a small slice instead of loading the whole obs array.

    A few thousand finite values is plenty to decide 0/1 vs continuous.
    """
    if "obs" not in ds:
        return None

    obs = ds["obs"]
    # take the first slice along the first dim; load only that
    try:
        sample = obs.isel({d: 0 for d in obs.dims if d != "lat" and d != "lon"})
        vals = sample.values.astype(np.float64).ravel()
    except Exception:
        # fallback: tiny corner
        vals = obs.values.ravel()[:10000].astype(np.float64)

    finite = vals[np.isfinite(vals)]
    if finite.size == 0:
        # try one more slice deeper before giving up
        return None

    unique_vals = np.unique(finite)
    # cheap binary check
    is_binary = unique_vals.size <= 2 and np.all(np.isin(unique_vals, [0.0, 1.0]))
    return "diversity" if is_binary else "taxa"


# dataset loader
def get_dataset(file_url):
    # fast path: already in cache
    with DATASETS_LOCK:
        cached = DATASETS.get(file_url)
    if cached is not None:
        return cached

    # serialize per URL, not globally -- different files load in parallel
    url_lock = get_url_lock(file_url)
    with url_lock:
        with DATASETS_LOCK:
            cached = DATASETS.get(file_url)
        if cached is not None:
            return cached

        local_path = get_local_path(file_url)
        print(f"Opening dataset: {local_path}")

        try:
            ds = xr.open_dataset(
                local_path, engine="h5netcdf", mask_and_scale=True, chunks={}
            )
        except Exception:
            try:
                ds = xr.open_dataset(local_path, mask_and_scale=True, chunks={})
            except Exception:
                ds = xr.open_dataset(
                    local_path, mask_and_scale=True, chunks={}, decode_times=False
                )

        print(f"Data vars: {list(ds.data_vars)}, dims: {dict(ds.sizes)}")

        # normalise legacy species -- taxa -- target naming
        rename_map = {}
        if "species_name" in ds and "taxa_name" not in ds:
            rename_map["species_name"] = "taxa_name"
        if "species" in ds.dims and "taxa" not in ds.dims:
            rename_map["species"] = "taxa"
        if rename_map:
            ds = ds.rename(rename_map)

        rename_map = {}
        if "taxa_name" in ds and "target_name" not in ds:
            rename_map["taxa_name"] = "target_name"
        if "taxa" in ds.dims and "target" not in ds.dims:
            rename_map["taxa"] = "target"
        if rename_map:
            ds = ds.rename(rename_map)

        # resolve name variable
        taxa_name_var = next((v for v in ["target_name", "taxa_name"] if v in ds), None)
        if taxa_name_var is None:
            raise ValueError("Dataset has neither 'target_name' nor 'taxa_name'")
        raw_names = [decode_name(n) for n in ds[taxa_name_var].values.tolist()]

        # global metadata
        metadata = extract_metadata(ds)

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
        except Exception as e:
            print(f"Coord extraction failed ({e}), inferring from dim size")
            n_lat = ds.sizes.get("lat", 180)
            n_lon = ds.sizes.get("lon", 360)
            lats = [round(-90 + (i + 0.5) * 180 / n_lat, 4) for i in range(n_lat)]
            lons = [round(-180 + (i + 0.5) * 360 / n_lon, 4) for i in range(n_lon)]

        has_obs = "obs" in ds
        obs_has_target_dim = has_obs and (
            "target" in ds["obs"].dims or "taxa" in ds["obs"].dims
        )

        # cheap obs_type detection
        obs_type = detect_obs_type_fast(ds)

        # Valid targets: need at least one finite mean at t=0.
        # This pulls (n_target, lat, lon) into memory -- unavoidable, but it's a
        # single slice along time, not the whole cube.
        print("Filtering valid targets…")
        mean_da = ds["mean"]
        if "time" in mean_da.dims:
            mean_da = mean_da.isel(time=0)
        # Transpose so target is always the leading axis before flattening.
        mean_t0 = mean_da.transpose("target", ...).values
        n_targets = ds.sizes["target"]
        valid_mask = np.isfinite(mean_t0).reshape(n_targets, -1).any(axis=1)
        orig_indices = [int(i) for i, ok in enumerate(valid_mask) if ok]

        ds = ds.isel(target=orig_indices)
        t_keys = [f"target_{orig_indices[pos]}" for pos in range(len(orig_indices))]
        t_labels = [raw_names[i] for i in orig_indices]

        # Read WORMS IDs from the target_id variable/coord if present
        worms_ids = None
        for id_var in ["target_id"]:
            if id_var in ds:
                try:
                    worms_ids = [int(v) for v in ds[id_var].values.tolist()]
                except Exception:
                    worms_ids = [str(v) for v in ds[id_var].values.tolist()]
                break
            if id_var in ds.coords:
                try:
                    worms_ids = [int(v) for v in ds.coords[id_var].values.tolist()]
                except Exception:
                    worms_ids = [str(v) for v in ds.coords[id_var].values.tolist()]
                break

        ds = ds.assign_coords(target=("target", t_keys))

        valid_targets = [
            {
                "key": k,
                "label": l,
                "target_id": worms_ids[pos] if worms_ids is not None else None,
            }
            for pos, (k, l) in enumerate(zip(t_keys, t_labels))
        ]
        target_map = {t["key"]: t for t in valid_targets}
        print(f"Valid targets: {len(valid_targets)}")

        # obs global max -- only meaningful when obs is NOT per-target.
        # Defer to first request rather than scanning here.
        # Stored as None == "not computed yet".
        entry = {
            "ds": ds,
            "targets": valid_targets,
            "target_map": target_map,
            "lats": lats,
            "lons": lons,
            "metadata": metadata,
            "has_obs": has_obs,
            "obs_has_target_dim": obs_has_target_dim,
            "obs_type": obs_type,
            "sd_global_max": {},  # filled lazily, per target
            "sd_max_lock": Lock(),
            "obs_global_max": None,  # filled lazily on first need
            "obs_max_lock": Lock(),
        }

        with DATASETS_LOCK:
            DATASETS[file_url] = entry

        # Warm sd_global_max in the background so the first map request is fast.
        # If a map request beats it, get_sd_max_for_target will compute that one
        # target on demand (and the warmer will skip it).
        Thread(
            target=_warm_sd_max,
            args=(file_url,),
            daemon=True,
            name=f"sd-warm-{file_url[-8:]}",
        ).start()

        return entry


def _warm_sd_max(file_url):
    """Background: compute SD max for every target in one vectorised pass."""
    try:
        with DATASETS_LOCK:
            entry = DATASETS.get(file_url)
        if entry is None:
            return
        ds = entry["ds"]
        print(f"[warm] computing per-target SD max for {file_url[-12:]}…")
        sd_max_values = ds["sd"].max(dim=["time", "lat", "lon"], skipna=True).values
        with entry["sd_max_lock"]:
            existing = entry["sd_global_max"]
            for pos, t in enumerate(entry["targets"]):
                if t["key"] in existing:
                    continue  # already computed on demand
                v = float(sd_max_values[pos])
                existing[t["key"]] = v if (np.isfinite(v) and v > 0) else 1.0
        print(f"[warm] done for {file_url[-12:]}")
    except Exception as e:
        print(f"[warm] failed: {e}")


def get_sd_max_for_target(entry, feature_key):
    """Return SD max for one target, computing on demand if not warmed yet."""
    with entry["sd_max_lock"]:
        v = entry["sd_global_max"].get(feature_key)
    if v is not None:
        return v

    ds = entry["ds"]
    v_arr = ds["sd"].sel(target=feature_key).max(skipna=True).values
    v = float(v_arr)
    v = v if (np.isfinite(v) and v > 0) else 1.0
    with entry["sd_max_lock"]:
        entry["sd_global_max"][feature_key] = v
    return v


def get_obs_global_max(entry):
    if entry["obs_global_max"] is not None:
        return entry["obs_global_max"]
    with entry["obs_max_lock"]:
        if entry["obs_global_max"] is not None:
            return entry["obs_global_max"]
        v = float(entry["ds"]["obs"].max(skipna=True).values)
        entry["obs_global_max"] = v if np.isfinite(v) else None
    return entry["obs_global_max"]


# routes
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
        traceback.print_exc()
        return jsonify({"error": f"Failed to load dataset: {e}"}), 500

    ds = dataset["ds"]
    target_map = dataset["target_map"]

    if feature_key not in target_map:
        return jsonify({"error": f"Unknown feature '{feature_key}'"}), 400

    max_time = ds.sizes["time"]
    if not (1 <= month_index <= max_time):
        return (
            jsonify({"error": f"timeIndex {month_index} out of range 1–{max_time}"}),
            400,
        )

    time_index = month_index - 1

    mean_slice = ds["mean"].sel(target=feature_key).isel(time=time_index).load()
    finite_mean = mean_slice.values[np.isfinite(mean_slice.values)]
    min_val = round(float(finite_mean.min()), 3) if finite_mean.size > 0 else None
    max_val = round(float(finite_mean.max()), 3) if finite_mean.size > 0 else None

    sd_slice = ds["sd"].sel(target=feature_key).isel(time=time_index).load()
    sd_max_for_target = get_sd_max_for_target(dataset, feature_key)

    obs_2d = None
    obs_max = None
    obs_type = dataset["obs_type"]

    if dataset["has_obs"]:
        try:
            obs_var = ds["obs"]
            if dataset["obs_has_target_dim"]:
                obs_slice = obs_var.sel(target=feature_key)
                obs_slice = drop_time(obs_slice, time_index).load()
                obs_arr = obs_slice.values.astype(np.float64)
                finite_obs = obs_arr[np.isfinite(obs_arr)]
                obs_max = (
                    round(float(finite_obs.max()), 3) if finite_obs.size > 0 else None
                )
                obs_2d = slice_to_2d(obs_slice)
            else:
                obs_slice = drop_time(obs_var, time_index).load()
                obs_2d = slice_to_2d(obs_slice)
                obs_max = get_obs_global_max(dataset)
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


@app.route("/api/diversity-features", methods=["GET"])
def diversity_features():
    file_url = request.args.get("file", type=str)
    if not file_url:
        return jsonify({"error": "Missing required parameter: file"}), 400

    try:
        dataset = get_dataset(file_url)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Failed to load dataset: {e}"}), 500

    return jsonify(
        {
            "features": [
                {
                    "value": t["key"],
                    "label": t["label"].replace("_", " ").title(),
                    "description": f"Diversity metric: {t['label']}",
                    "target_id": t["target_id"],
                }
                for t in dataset["targets"]
            ],
            "metadata": dataset["metadata"],
            "hasObs": dataset["has_obs"],
            "obsType": dataset["obs_type"],
        }
    )


@app.route("/api/diversity-metadata", methods=["GET"])
def diversity_metadata():
    file_url = request.args.get("file", type=str)
    if not file_url:
        return jsonify({"error": "Missing required parameter: file"}), 400
    try:
        dataset = get_dataset(file_url)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Failed to load dataset: {e}"}), 500
    return jsonify(
        {
            "metadata": dataset["metadata"],
            "hasObs": dataset["has_obs"],
            "obsType": dataset["obs_type"],
        }
    )


def decode_str(val):
    if isinstance(val, (bytes, np.bytes_)):
        return val.decode("utf-8", errors="replace").strip()
    return str(val).strip()


@app.route("/api/diversity-qc", methods=["GET"])
def diversity_qc():
    file_url = request.args.get("file", type=str)
    feature_key = request.args.get("feature", type=str)
    if not file_url:
        return jsonify({"error": "Missing required parameter: file"}), 400

    try:
        dataset = get_dataset(file_url)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Failed to load dataset: {e}"}), 500

    ds = dataset["ds"]

    if "qc_col" not in ds or "qc_rec" not in ds:
        return jsonify({"available": False})

    if feature_key and feature_key not in dataset["target_map"]:
        return jsonify({"error": f"Unknown feature '{feature_key}'"}), 400

    try:
        qc_col = ds["qc_col"]
        qc_rec = ds["qc_rec"]
        qc_col_long_name = decode_str(qc_col.attrs.get("long_name", ""))
        qc_rec_long_name = decode_str(qc_rec.attrs.get("long_name", ""))
        print(f"[qc] qc_col dims={list(qc_col.dims)}, qc_rec dims={list(qc_rec.dims)}, feature={feature_key}")

        col_dims = list(qc_col.dims)
        target_dim = next(
            (d for d in col_dims if "target" in d.lower() or "taxa" in d.lower()),
            None,
        )
        if target_dim:
            if feature_key:
                qc_col = qc_col.sel({target_dim: feature_key})
            else:
                qc_col = qc_col.isel({target_dim: 0})
            col_dims = list(qc_col.dims)

        rec_dims = list(qc_rec.dims)
        rec_target_dim = next(
            (d for d in rec_dims if "target" in d.lower() or "taxa" in d.lower()),
            None,
        )
        if rec_target_dim:
            if feature_key:
                qc_rec = qc_rec.sel({rec_target_dim: feature_key})
            else:
                qc_rec = qc_rec.isel({rec_target_dim: 0})

        if len(col_dims) != 2:
            raise ValueError(
                f"qc_col must be 2-D after reduction, got dims: {col_dims}"
            )

        alg_dim = next(
            (d for d in col_dims if "alg" in d.lower() or "model" in d.lower()),
            col_dims[0],
        )
        qcn_dim = next(
            (
                d
                for d in col_dims
                if "qc" in d.lower() or "name" in d.lower() or "crit" in d.lower()
            ),
            col_dims[1] if col_dims[1] != alg_dim else col_dims[0],
        )

        if alg_dim in ds.coords:
            alg_labels = [decode_str(v) for v in ds.coords[alg_dim].values]
        else:
            alg_labels = [f"Algorithm {i+1}" for i in range(qc_col.sizes[alg_dim])]

        if qcn_dim in ds.coords:
            qc_name_labels = [decode_str(v) for v in ds.coords[qcn_dim].values]
        else:
            qc_name_labels = [f"Criterion {i+1}" for i in range(qc_col.sizes[qcn_dim])]

        col_vals = qc_col.transpose(alg_dim, qcn_dim).load().values
        colors = [
            [decode_str(col_vals[i, j]) for j in range(col_vals.shape[1])]
            for i in range(col_vals.shape[0])
        ]

        rec_vals = qc_rec.load().values
        if rec_vals.ndim == 0:
            rec_vals = rec_vals.reshape(1)
        print(f"[qc] rec_vals shape={rec_vals.shape}, sample={rec_vals.ravel()[:3]}")

        def parse_rec(v):
            s = decode_str(v)
            parts = s.split("'")
            if len(parts) >= 3:
                # "Use 'BRT' for ..." → extract text between first pair of quotes
                return parts[1] + "."
            return s if s.endswith(".") else s + "."

        recommendations = [parse_rec(v) for v in rec_vals.ravel()]

        n_alg = len(alg_labels)
        if len(recommendations) < n_alg:
            recommendations += ["No recommendation available."] * (
                n_alg - len(recommendations)
            )
        recommendations = recommendations[:n_alg]

        return jsonify(
            {
                "available": True,
                "algorithms": alg_labels,
                "qcNames": qc_name_labels,
                "colors": colors,
                "recommendations": recommendations,
                "qcColLongName": qc_col_long_name,
                "qcRecLongName": qc_rec_long_name,
            }
        )

    except Exception as e:
        print(f"QC extraction error: {e}")
        return jsonify({"error": f"Failed to extract QC data: {e}"}), 500


if __name__ == "__main__":
    app.run(debug=False, threaded=True)
