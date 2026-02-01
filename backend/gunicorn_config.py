# gunicorn_config.py
import multiprocessing

# Bind to all interfaces on port 5000 (standard for Flask)
bind = "0.0.0.0:5000"

# Workers: Recommended formula is (2 x $num_cores) + 1
#mm workers = multiprocessing.cpu_count() * 2 + 1
# Let's just use 4 workers
workers = 4

# Logging
accesslog = "-" # Log to stdout for Docker logs
errorlog = "-"  # Log to stderr for Docker logs
