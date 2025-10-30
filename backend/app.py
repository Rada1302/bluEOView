from flask import Flask, jsonify, request, make_response
from flask_cors import CORS  # Ensure this import is correct
import xarray as xr
import numpy as np
from threading import Lock
from flask_executor import Executor  # Import Flask-Executor

from data_lookup_variables import *

app = Flask(__name__)
# Apply CORS to the entire application
CORS(app)
file_lock = Lock()
executor = Executor(app)  # Initialize Flask-Executor

@app.after_request
def add_header(response):
    response.cache_control.no_store = True  # Disable caching for all responses
    return response

def read_netcdf(file_path: str, variable_name: str, time_index: int = 0, feature_index: int = 0):
    file_lock.acquire()
    try:
        with xr.open_dataset(file_path) as ds:
            lats = ds['latitude']
            lons = ds['longitude']

            # Choose variable (mean or sd)
            variable_data = ds[variable_name]

            # Select slice (feature, time)
            var = variable_data.isel(feature=feature_index, time=time_index)

            # Compute stats for color scaling
            min_value = float(var.min().values)
            max_value = float(var.max().values)

            data = {
                'lats': lats.values.tolist(),
                'lons': lons.values.tolist(),
                'variable': np.where(np.isnan(var), None, var.round(3)).tolist(),
                'colorscale': 'Viridis',
                'minValue': round(min_value, 3),
                'maxValue': round(max_value, 3),
                'feature': ds['mean_values'].attrs.get('feature_names', '').split(',')[feature_index]
            }
    finally:
        file_lock.release()

    return data

def get_timeseries(
    file_path: str,
    variable_name: str,
    x: float = None, y: float = None,
    x_min: float = None, x_max: float = None,
    y_min: float = None, y_max: float = None,
    year_start: int = 2012, year_end: int = 2100,
    file_path_env: str = None, variable_name_env: str = None
):
    file_lock.acquire()
    try:
        with xr.open_dataset(file_path) as ds:
            variable = ds[variable_name]

            # Select data: single point or area mean
            if x is not None and y is not None:
                # Single point selection
                data_series = variable.sel(lat=y, lon=x, method="nearest")
                data_series_std = None
            elif None not in (x_min, x_max, y_min, y_max):
                # Area selection (mean and std)
                if ds.lat.values[0] > ds.lat.values[-1]:
                    lat_slice = slice(y_max, y_min)
                else:
                    lat_slice = slice(y_min, y_max)

                data_series = variable.sel(
                    lat=lat_slice, lon=slice(x_min, x_max)
                ).mean(dim=["lat", "lon"])
                data_series_std = variable.sel(
                    lat=lat_slice, lon=slice(x_min, x_max)
                ).std(dim=["lat", "lon"])
            else:
                raise ValueError("Either (x, y) or (xMin, xMax, yMin, yMax) must be provided")

            # Year slicing
            year_start_index = year_start - 2012
            year_end_index = year_end - 2012 + 1
            years = np.arange(year_start, year_end + 1).astype(float)

            # Main variable values
            variable_vals = data_series[year_start_index:year_end_index].compute()
            variable_vals = np.where(np.isnan(variable_vals), None, variable_vals.round(2))

            # Standard deviation (if area)
            if data_series_std is not None:
                variable_std = data_series_std[year_start_index:year_end_index].compute()
                variable_std = np.where(np.isnan(variable_std), None, variable_std.round(2))
                variable_std /= len(variable_vals) ** 0.5
            else:
                variable_std = np.zeros_like(variable_vals)

            # Trend line
            valid_data = np.array(variable_vals)
            if valid_data.tolist().count(None) == 0 and "biomes" not in variable_name:
                trend = np.polyfit(years, valid_data.astype(float), 1)
                trend_line = np.polyval(trend, years).tolist()
            else:
                trend_line = [None]

        # Environmental variable
        variable_env = variable_env_std = trend_line_env = None
        if file_path_env is not None:
            with xr.open_dataset(file_path_env) as ds_env:
                variable_env_data = ds_env[variable_name_env]

                if x is not None and y is not None:
                    # Single point
                    data_series_env = variable_env_data.sel(lat=y, lon=x, method="nearest")
                    data_series_env_std = None
                else:
                    # Area selection
                    if ds_env.lat.values[0] > ds_env.lat.values[-1]:
                        lat_slice_env = slice(y_max, y_min)
                    else:
                        lat_slice_env = slice(y_min, y_max)

                    data_series_env = variable_env_data.sel(
                        lat=lat_slice_env, lon=slice(x_min, x_max)
                    ).mean(dim=["lat", "lon"])
                    data_series_env_std = variable_env_data.sel(
                        lat=lat_slice_env, lon=slice(x_min, x_max)
                    ).std(dim=["lat", "lon"])

                # Extract values
                variable_env = data_series_env[year_start_index:year_end_index].compute()
                variable_env = np.where(np.isnan(variable_env), None, variable_env.round(2))

                # Compute std if applicable
                if data_series_env_std is not None:
                    variable_env_std = data_series_env_std[year_start_index:year_end_index].compute()
                    variable_env_std = np.where(np.isnan(variable_env_std), None, variable_env_std.round(2))
                    variable_env_std /= len(variable_env) ** 0.5
                else:
                    variable_env_std = np.zeros_like(variable_env)

                # Compute trend line
                valid_data_env = np.array(variable_env)
                if valid_data_env.tolist().count(None) == 0:
                    trend_env = np.polyfit(years, valid_data_env.astype(float), 1)
                    trend_line_env = np.polyval(trend_env, years).tolist()
                else:
                    trend_line_env = [None]

        # Return structured numeric result
        return {
            "years": years.tolist(),
            "variable": {
                "name": variable_name,
                "values": valid_data.tolist(),
                "std": variable_std.tolist(),
                "trend": trend_line,
            },
            "environmental_variable": {
                "name": variable_name_env,
                "values": variable_env.tolist() if variable_env is not None else None,
                "std": variable_env_std.tolist() if variable_env_std is not None else None,
                "trend": trend_line_env,
            },
        }

    finally:
        file_lock.release()

def get_environmental_data(env_parameter:str, scenario:str, model:str):

    decoded_model = ESMS_ENV[model]
    decoded_scenario = SCENARIOS[scenario]
    file_path = ENVIRONMENTAL_FILE.format(decoded_model, decoded_scenario)
    variable = ENVIRONMENTALS_VARIABLES[env_parameter]

    return file_path, variable

def get_file_and_variable(index:str, group:str, scenario:str, model:str):

    decoded_model = ESMS[model]
    decoded_scenario = SCENARIOS[scenario]

    if index == 'Biomes':
        decoded_scenario = SCENARIOS[scenario]
        file_path = BIOMES_FILE
        variable = BIOMES_VARIABLES[decoded_scenario]

    elif index == 'Species Richness':
        file_path = RICHNESS_FILE.format(decoded_model, decoded_scenario)
        variable = RICHNESS_VARIABLES[group]

    elif index == 'Hotspots of Change in Diversity':
        file_path = RICHNESS_FILE.format(decoded_model, decoded_scenario)
        variable = DIVERSITY_VARIABLES[group]

    elif index == 'Habitat Suitability Index (HSI)':
        file_path = HSI_FILE.format(decoded_model, decoded_scenario)
        variable = HSI_VARIABLES[group]

    elif index == 'Change in HSI':
        file_path = HSI_FILE.format(decoded_model, decoded_scenario)
        variable = DELTA_HSI_VARIABLES[group]

    elif index == 'Species Turnover':
        file_path = TURNOVER_FILE.format(decoded_model, decoded_scenario)
        variable = TURNOVER_VARIABLES[group]

    return file_path, variable

@app.route('/api/globe-data', methods=['GET'])
def get_globe_data():
    file_path = "output_diversity.nc"
    variable_name = request.args.get('variable', 'mean_values')  # mean_values or sd_values
    time_index = request.args.get('time', default=0, type=int)    # 0–12
    feature_index = request.args.get('feature', default=0, type=int)  # 0–3

    future = executor.submit(read_netcdf, file_path, variable_name, time_index, feature_index)
    data = future.result()

    return jsonify(data)

@app.route('/api/features', methods=['GET'])
def get_features():
    with xr.open_dataset("output_diversity.nc") as ds:
        features = ds['mean_values'].attrs.get('feature_names', '').split(',')
    return jsonify({"features": features})

@app.route('/api/map-data', methods=['GET'])
def get_map_data():

    year = request.args.get('year', type=int)  # Get the year parameter
    index = request.args.get('index', type=str)  # Get the index parameter
    group = request.args.get('group', type=str)
    scenario = request.args.get('scenario', type=str)
    model = request.args.get('model', type=str)

    file_path, variable = get_file_and_variable(index, group, scenario, model)

    # Run the data processing asynchronously
    future = executor.submit(read_netcdf, file_path, variable, year)
    data = future.result()  # Wait for the result

    response = jsonify(data)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    print(f"Response length: {len(response.get_data(as_text=True))}")
    return response

@app.route('/api/line-data', methods=['GET'])
def get_line_data():

    # Area bounds (may be None if not provided)
    x_min = request.args.get('xMin', type=float)
    x_max = request.args.get('xMax', type=float)
    y_min = request.args.get('yMin', type=float)
    y_max = request.args.get('yMax', type=float)

    # Single point (may be None if area is provided)
    x = request.args.get('x', type=float)
    y = request.args.get('y', type=float)

    # Time range
    year_start = request.args.get('startYear', type=int)
    year_end = request.args.get('endYear', type=int)

    # Data identifiers
    index = request.args.get('index', type=str)
    group = request.args.get('group', type=str)
    scenario = request.args.get('scenario', type=str)
    model = request.args.get('model', type=str)
    env_parameter = request.args.get('envParam', type=str)

    # Resolve file paths & variable names
    file_path, variable = get_file_and_variable(index, group, scenario, model)
    file_path_env, variable_env = get_environmental_data(env_parameter, scenario, model)

    # Run timeseries (handles point OR area)
    future = executor.submit(
        get_timeseries,
        file_path, variable,
        x=x, y=y,
        x_min=x_min, x_max=x_max,
        y_min=y_min, y_max=y_max,
        year_start=year_start, year_end=year_end,
        file_path_env=file_path_env, variable_name_env=variable_env
    )
    data = future.result()

    response = jsonify(data)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

if __name__ == '__main__':
    app.run(debug=False, threaded=True)  # Enable threaded mode