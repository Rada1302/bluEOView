#!/bin/sh

# 1. Run the custom Flask CLI command we registered
echo "Running pre-boot storage maintenance..."
flask --app app clean-storage

# 1.1 Update netCDF file in the data dir with files on data.up.ethz.ch
# wget option:
# -4: ip4,  -r: recursive, -N:updates only, -np: no parent-dir
# -nH: no sub-dir, -A: only *.nc files  -q: quite
# -nd: do not create a hierarchy of directories 
# -P: target directory to download to
# wget -4 -r -N -np -nH -nd -A nc -q -P /var/cephaloview_data/ https://data.up.ethz.ch/shared/Blueoview_data/
wget -4 -r -N -np -nH -nd -A nc -nv -P /var/cephaloview_data/ https://data.up.ethz.ch/shared/Blueoview_data/

# Only OK for developping/debugging
# 2. Start the actual Flask app
#echo "Starting Flask application..."
#exec python app.py

# 2. Start the production WSGI server instead of the dev server
echo "Starting production WSGI server (Gunicorn)..."
#exec gunicorn --bind 0.0.0.0:5000 --workers 4 --threads 2 app:app

exec gunicorn --config gunicorn_config.py app:app
