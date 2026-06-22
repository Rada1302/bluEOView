# Stage 1: Build/Base Image
FROM python:3.11-slim AS base

# Set the working directory
WORKDIR /app

# Set environment variables for non-buffered output (good for logs)
ENV PYTHONUNBUFFERED 1
ENV FLASK_ENV production

# ─── UV CONFIGURATION ──────────────────────────────────────────────────
# Copy the uv executable from the official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Optional optimization: compile bytecode after installation for faster app startup
ENV UV_COMPILE_BYTECODE=1

# Tell uv to install packages globally into the system Python (like pip does)
# instead of trying to create or manage a virtual environment
ENV UV_SYSTEM_PYTHON=1
# ───────────────────────────────────────────────────────────────────────

# Copy requirements file and install dependencies
# This step is separated to leverage Docker layer caching
COPY requirements.txt .

# Use `uv pip install` instead of standard pip
# --no-cache avoids saving intermediate downloads inside the layer
RUN uv pip install --no-cache -r requirements.txt gunicorn

# Install tool for large data-file downloads; clean up afterwards
RUN apt-get update && apt-get install -y wget \
    && rm -rf /var/lib/apt/lists/*

# Copy the rest of the application code
COPY . .

# Expose the port the Python app runs on
EXPOSE 5000

# Update to cleanup old storage using the entrypoint.sh script
RUN chmod +x ./entrypoint.sh
CMD ["./entrypoint.sh"]
