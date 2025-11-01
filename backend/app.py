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

# Config
NC_PATH = "data/output_diversity.nc"
VALID_VARIABLES = {"mean_values", "sd_values"}


@app.after_request
def add_header(response):
    # avoid caching
    response.cache_control.no_store = True
    return response


def _resolve_feature_index(ds, variable_name: str, feature_param):
    """
    Resolve feature_param (name or index) to integer index and feature name.
    Expects ds[variable_name].attrs['feature_names'] to be a comma-separated string.
    """
    feat_attr = ds[variable_name].attrs.get("feature_names", "")
    feature_names = [s.strip() for s in feat_attr.split(",")] if feat_attr else []

    if feature_param is None:
        return 0, feature_names[0] if feature_names else "feature_0"

    try:
        idx = int(feature_param)
        if idx < 0 or (feature_names and idx >= len(feature_names)):
            raise IndexError
        name = feature_names[idx] if feature_names else f"feature_{idx}"
        return idx, name
    except (ValueError, IndexError):
        if feature_param in feature_names:
            idx = feature_names.index(feature_param)
            return idx, feature_param
        else:
            raise ValueError(f"Unknown feature '{feature_param}'. Expected one of: {feature_names}")

def read_netcdf_map(file_path: str, variable_name: str, feature_index: int = 0, time_index: int = 0):
    """
    Return map (lat/lon grid) for given variable, feature index and month index.
    Guarantees:
     - lats ascending (from min to max)
     - variable is a list-of-lists where variable[lat_idx][lon_idx] corresponds to lats[lat_idx], lons[lon_idx]
    """
    with file_lock:
        with xr.open_dataset(file_path, decode_times=False) as ds:
            if variable_name not in ds:
                raise ValueError(f"Variable '{variable_name}' not found in dataset")

            var = ds[variable_name]
            # use isel with named dims so ordering doesn't matter
            arr = var.isel({ 'feature': feature_index, 'time': time_index }) if 'feature' in var.dims and 'time' in var.dims else var

            # replace fill values with NaN
            fill_val = var.attrs.get("_FillValue", None)
            if fill_val is not None:
                arr = arr.where(arr != fill_val)

            # make sure lat is ascending
            # arr.sortby returns a DataArray; store whether we sorted
            arr = arr.sortby("latitude", ascending=True)
            lats = arr["latitude"].values.tolist()
            lons = arr["longitude"].values.tolist()
            arr_np = arr.values.astype(float)
            arr_list = np.where(np.isfinite(arr_np), np.round(arr_np, 3), None).tolist()

            # compute min/max on finite values
            finite = arr_np[np.isfinite(arr_np)]
            if finite.size == 0:
                min_value = None
                max_value = None
            else:
                min_value = float(np.nanmin(finite))
                max_value = float(np.nanmax(finite))

            return {
                "lats": lats,
                "lons": lons,
                "variable": arr_list,
                "minValue": round(min_value, 3) if min_value is not None else None,
                "maxValue": round(max_value, 3) if max_value is not None else None,
            }


@app.route("/api/globe-data", methods=["GET"])
def get_globe_data():
    variable_name = request.args.get("variable", "mean_values")
    if variable_name not in VALID_VARIABLES:
        return jsonify({"error": f"Invalid variable '{variable_name}'."}), 400

    time_index = request.args.get("time", default=0, type=int)
    feature_param = request.args.get("feature", default=None)

    def _task():
        with xr.open_dataset(NC_PATH, decode_times=False) as ds:
            feat_idx, feat_name = _resolve_feature_index(ds, variable_name, feature_param)
        # read map once, using feature index resolved above
        return read_netcdf_map(NC_PATH, variable_name, feature_index=feat_idx, time_index=time_index), feat_name

    future = executor.submit(_task)
    try:
        data, feat_name = future.result()
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to read dataset: {e}"}), 500

    data["feature"] = feat_name
    return jsonify(data)

@app.route("/api/line-data", methods=["GET"])
def get_line_data():
    variable_name = request.args.get("variable", "mean_values")
    if variable_name not in VALID_VARIABLES:
        return jsonify({"error": f"Invalid variable '{variable_name}'."}), 400

    feature_param = request.args.get("feature", default=None)
    x = request.args.get("x", type=float)
    y = request.args.get("y", type=float)
    x_min = request.args.get("xMin", type=float)
    x_max = request.args.get("xMax", type=float)
    y_min = request.args.get("yMin", type=float)
    y_max = request.args.get("yMax", type=float)
    start_month = request.args.get("startMonth", type=int, default=0)
    end_month = request.args.get("endMonth", type=int, default=None)

    file_lock.acquire()
    try:
        with xr.open_dataset(NC_PATH, decode_times=False) as ds:
            feat_idx, feat_name = _resolve_feature_index(ds, variable_name, feature_param)
            var = ds[variable_name].isel(feature=feat_idx)

            fill_val = ds[variable_name].attrs.get("_FillValue", None)
            if fill_val is not None:
                var = var.where(var != fill_val)

            var = var.sortby("latitude")

            if x is not None and y is not None:
                # find nearest latitude index
                lat_values = ds["latitude"].values
                lat_idx = np.abs(lat_values - y).argmin()

                # find nearest longitude index
                lon_values = ds["longitude"].values
                lon_idx = np.abs(lon_values - x).argmin()

                series = var.isel(latitude=lat_idx, longitude=lon_idx)
                std_series = None
            elif None not in (x_min, x_max, y_min, y_max):
                lat_slice = slice(y_min, y_max) if ds["latitude"].values[0] < ds["latitude"].values[-1] else slice(y_max, y_min)
                region = var.sel(latitude=lat_slice, longitude=slice(x_min, x_max))
                series = region.mean(dim=["latitude", "longitude"])
                std_series = region.std(dim=["latitude", "longitude"])
            else:
                return jsonify({"error": "Must provide a point or an area"}), 400

            total_months = int(series.sizes["time"])
            if end_month is None or end_month >= total_months:
                end_month = total_months - 1
            if start_month < 0 or start_month > end_month:
                return jsonify({"error": "Invalid startMonth/endMonth range"}), 400

            months = list(range(start_month, end_month + 1))

            slice_arr = series[start_month:end_month + 1].values.astype(float)
            values = np.where(np.isfinite(slice_arr), np.round(slice_arr, 2), None).tolist()

            if std_series is not None:
                std_slice = std_series[start_month:end_month + 1].values.astype(float)
                std_values = np.where(np.isfinite(std_slice), np.round(std_slice, 2), None).tolist()
                n = max(1, len(values))
                std_values = [(v / (n ** 0.5)) if v is not None else None for v in std_values]
            else:
                std_values = [0] * len(values)

            valid_vals = np.array([v if v is not None else np.nan for v in values], dtype=float)
            if not np.all(np.isnan(valid_vals)):
                x_for_fit = np.array(months, dtype=float)
                mask = np.isfinite(valid_vals)
                if mask.sum() >= 2:
                    coeffs = np.polyfit(x_for_fit[mask], valid_vals[mask], 1)
                    trend_line = np.polyval(coeffs, x_for_fit).tolist()
                else:
                    trend_line = [None] * len(months)
            else:
                trend_line = [None] * len(months)
    finally:
        file_lock.release()

    return jsonify({
        "months": months,
        "feature": feat_name,
        "variable": {
            "values": values,
            "std": std_values,
            "trend": trend_line
        }
    })


@app.route("/api/features", methods=["GET"])
def get_features():
    with xr.open_dataset(NC_PATH, decode_times=False) as ds:
        if "mean_values" in ds and "feature_names" in ds["mean_values"].attrs:
            names = [s.strip() for s in ds["mean_values"].attrs["feature_names"].split(",")]
            features_info = {n: n for n in names}
        else:
            features_info = {
                "a_shannon": "a_shannon",
                "a_richness": "a_richness",
                "a_evenness": "a_evenness",
                "a_invsimpson": "a_invsimpson",
            }
    return jsonify(features_info)


if __name__ == "__main__":
    app.run(debug=False, threaded=True)
