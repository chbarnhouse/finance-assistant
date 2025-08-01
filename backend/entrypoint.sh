#!/bin/bash

# Navigate to the backend directory
cd /app/backend

export PYTHONPATH=/app/backend

# Apply database migrations
echo "Applying database migrations..."
python3 manage.py migrate

# Populate default cross-references and account type mappings
echo "Populating default data..."
python3 manage.py populate_defaults

# Populate lookup tables with essential data
echo "Populating lookup tables..."
python3 populate_data.py

# Start the Gunicorn server
echo "Starting Gunicorn server..."
gunicorn finance_assistant.wsgi:application --bind 0.0.0.0:8000 --workers 3