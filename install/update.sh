#!/bin/bash
# Finance Assistant Update Script
# This script updates the Finance Assistant installation to the latest version

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
msg_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

msg_ok() {
    echo -e "${GREEN}[OK]${NC} $1"
}

msg_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

msg_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   msg_error "This script must be run as root"
   exit 1
fi

msg_info "Starting Finance Assistant update process..."

# Stop services
msg_info "Stopping services..."
systemctl stop finance-assistant
systemctl stop nginx

# Backup current installation
msg_info "Creating backup..."
BACKUP_DIR="/opt/finance-assistant-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /opt/finance-assistant "$BACKUP_DIR/"
msg_ok "Backup created at: $BACKUP_DIR"

# Navigate to installation directory
cd /opt/finance-assistant

# Stash any local changes (if any)
msg_info "Checking for local changes..."
if ! git diff --quiet; then
    msg_warn "Local changes detected, stashing them..."
    git stash
fi

# Pull latest changes
msg_info "Pulling latest changes from repository..."
git fetch origin
git reset --hard origin/main
msg_ok "Repository updated"

# Update Python dependencies
msg_info "Updating Python dependencies..."
/opt/finance-assistant/venv/bin/pip install --upgrade pip
/opt/finance-assistant/venv/bin/pip install "gunicorn<21.0" django djangorestframework django-cors-headers django-filter requests
msg_ok "Python dependencies updated"

# Update frontend
msg_info "Updating frontend..."
cd /opt/finance-assistant/frontend
npm install
npm run build
msg_ok "Frontend updated"

# Update backend
msg_info "Updating backend..."
cd /opt/finance-assistant/backend

# Run migrations
msg_info "Running database migrations..."
/opt/finance-assistant/venv/bin/python manage.py migrate

# Collect static files
msg_info "Collecting static files..."
/opt/finance-assistant/venv/bin/python manage.py collectstatic --no-input

# Populate data if needed
if [ -f "populate_data.py" ]; then
    msg_info "Populating data..."
    /opt/finance-assistant/venv/bin/python populate_data.py
fi

msg_ok "Backend updated"

# Restart services
msg_info "Restarting services..."
systemctl start finance-assistant
systemctl start nginx

# Verify services are running
msg_info "Verifying services..."
sleep 3

if systemctl is-active --quiet finance-assistant; then
    msg_ok "Finance Assistant service is running"
else
    msg_error "Finance Assistant service failed to start"
    exit 1
fi

if systemctl is-active --quiet nginx; then
    msg_ok "Nginx service is running"
else
    msg_error "Nginx service failed to start"
    exit 1
fi

# Test the application
msg_info "Testing application..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200\|302"; then
    msg_ok "Application is responding correctly"
else
    msg_warn "Application may not be responding correctly"
fi

msg_ok "Finance Assistant update completed successfully!"
msg_info "Access your updated Finance Assistant at: http://$(hostname -I | awk '{print $1}'):8080"

# Show service status
echo ""
msg_info "Service Status:"
systemctl status finance-assistant --no-pager -l
echo ""
systemctl status nginx --no-pager -l