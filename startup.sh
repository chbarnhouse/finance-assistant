#!/bin/bash
set -e

echo "Starting Finance Assistant (Standalone)..."

# Create data directory if it doesn't exist
mkdir -p /app/data

# Generate htpasswd file if it doesn't exist
if [ ! -f /app/.htpasswd ]; then
    echo "Creating default htpasswd file..."
    echo "admin:\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi" > /app/.htpasswd
    echo "Default credentials: admin / password"
    echo "Please change these credentials after first login!"
fi

# Change to backend directory
cd /app/backend

# Run database migrations
echo "Running database migrations..."
python3 manage.py migrate --no-input

# Collect static files
echo "Collecting static files..."
python3 manage.py collectstatic --no-input

# Populate default data
echo "Populating default data..."
python3 manage.py populate_defaults

# Populate lookup tables
echo "Populating lookup tables..."
python3 populate_data.py

# Start Gunicorn in background
echo "Starting Gunicorn server..."
gunicorn finance_assistant.wsgi:application \
    --bind 127.0.0.1:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile /app/logs/gunicorn_access.log \
    --error-logfile /app/logs/gunicorn_error.log \
    --log-level info &

# Start Nginx in foreground
echo "Starting Nginx on port 8080..."
exec nginx -g "daemon off;" 