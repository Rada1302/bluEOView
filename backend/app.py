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

@app.after_request
def add_header(response):
    response.cache_control.no_store = True
    return response

def read_netcdf(file_path: str, variable_name: str, time_index: int = 0, feature_index: int = 0):
    """Read NetCDF file and return slice for a specific feature and time."""
    file_lock.acquire()
    try:
        with xr.open_dataset(file_path) as ds:
            lats = ds['latitude'].values.tolist()
            lons = ds['longitude'].values.tolist()

            variable_data = ds[variable_name].isel(feature=feature_index, time=time_index)
            variable_values = np.where(np.isnan(variable_data), None, variable_data.round(3)).tolist()
            min_value = float(np.nanmin(variable_data))
            max_value = float(np.nanmax(variable_data))

            feature_name = ds['mean_values'].attrs.get('feature_names', '').split(',')[feature_index]

            return {
                'lats': lats,
                'lons': lons,
                'variable': variable_values,
                'minValue': round(min_value, 3),
                'maxValue': round(max_value, 3),
                'feature': feature_name
            }
    finally:
        file_lock.release()

@app.route('/api/globe-data', methods=['GET'])
def get_globe_data():
    file_path = "output_diversity.nc"
    variable_name = request.args.get('variable', 'mean_values')
    time_index = request.args.get('time', default=0, type=int) 
    feature_index = request.args.get('feature', default=0, type=int)

    # Keep only 4 features
    feature_index = min(max(feature_index, 0), 3)

    future = executor.submit(read_netcdf, file_path, variable_name, time_index, feature_index)
    data = future.result()
    return jsonify(data)

@app.route('/api/features', methods=['GET'])
def get_features():
    features_info = {
        "a_shannon": "Shannon Diversity Index",
        "a_richness": "Species Richness",
        "a_evenness": "Evenness Index",
        "a_invsimpson": "Inverse Simpson Index"
    }
    return jsonify(features_info)

@app.route('/api/line-data', methods=['GET'])
def get_line_data():
    """Return timeseries for a point or area, for one of the 4 features."""
    x = request.args.get('x', type=float)
    y = request.args.get('y', type=float)
    x_min = request.args.get('xMin', type=float)
    x_max = request.args.get('xMax', type=float)
    y_min = request.args.get('yMin', type=float)
    y_max = request.args.get('yMax', type=float)
    year_start = request.args.get('startYear', type=int)
    year_end = request.args.get('endYear', type=int)
    feature_index = request.args.get('feature', type=int, default=0)
    feature_index = min(max(feature_index, 0), 3)
    variable_name = request.args.get('variable', 'mean_values')  # mean_values or sd_values

    file_path = "output_diversity.nc"

    file_lock.acquire()
    try:
        with xr.open_dataset(file_path) as ds:
            variable = ds[variable_name].isel(feature=feature_index)

            # Slice for point or area
            if x is not None and y is not None:
                series = variable.sel(lat=y, lon=x, method="nearest")
                std_series = None
            elif None not in (x_min, x_max, y_min, y_max):
                lat_slice = slice(y_min, y_max) if ds.lat.values[0] < ds.lat.values[-1] else slice(y_max, y_min)
                series = variable.sel(lat=lat_slice, lon=slice(x_min, x_max)).mean(dim=["lat", "lon"])
                std_series = variable.sel(lat=lat_slice, lon=slice(x_min, x_max)).std(dim=["lat", "lon"])
            else:
                return jsonify({"error": "Must provide either a point or an area"}), 400

            # Slice for years
            year_start_idx = year_start - 2012
            year_end_idx = year_end - 2012 + 1
            years = np.arange(year_start, year_end + 1).tolist()

            values = np.where(np.isnan(series[year_start_idx:year_end_idx]), None,
                              series[year_start_idx:year_end_idx].round(2)).tolist()

            if std_series is not None:
                std_values = np.where(np.isnan(std_series[year_start_idx:year_end_idx]), None,
                                      std_series[year_start_idx:year_end_idx].round(2)).tolist()
                std_values = [v / len(values) ** 0.5 for v in std_values]
            else:
                std_values = [0]*len(values)

            # Trend line
            valid_vals = np.array([v if v is not None else np.nan for v in values])
            if not np.all(np.isnan(valid_vals)):
                trend = np.polyfit(years, valid_vals, 1)
                trend_line = np.polyval(trend, years).tolist()
            else:
                trend_line = [None]*len(years)

    finally:
        file_lock.release()

    return jsonify({
        "years": years,
        "variable": {
            "feature_index": feature_index,
            "values": values,
            "std": std_values,
            "trend": trend_line
        }
    })

if __name__ == '__main__':
    app.run(debug=False, threaded=True)