# Stage 1: Build/Base Image
FROM python:3.11-slim AS base

# Set the working directory
WORKDIR /app

# Set environment variables for non-buffered output (good for logs)
ENV PYTHONUNBUFFERED 1
ENV FLASK_ENV production

# Copy requirements file and install dependencies
# This step is separated to leverage Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy the rest of the application code
COPY . .
COPY data/ data/

# Expose the port the Python app runs on:
EXPOSE 5000

# Run the application using gunicorn
CMD ["gunicorn", "--config", "gunicorn_config.py", "app:app"]
