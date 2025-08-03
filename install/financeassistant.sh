#!/bin/bash
# Finance Assistant Installation Script
# This script is executed inside the LXC container by the community framework

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

msg_info "Starting Finance Assistant installation..."

# Update system
msg_info "Updating system packages..."
apt update && apt upgrade -y

# Install dependencies
msg_info "Installing dependencies..."
apt install -y curl wget git python3 python3-pip python3-venv nodejs npm nginx

# Create finance user
msg_info "Creating finance user..."
useradd -m -s /bin/bash finance || true

# Clone repository
msg_info "Cloning Finance Assistant repository..."
cd /opt
git clone https://github.com/chbarnhouse/finance-assistant.git || true
cd finance-assistant

# Set up Python environment
msg_info "Setting up Python environment..."
cd /opt/finance-assistant
python3 -m venv venv
/opt/finance-assistant/venv/bin/pip install --upgrade pip
/opt/finance-assistant/venv/bin/pip install "gunicorn<21.0" django djangorestframework django-cors-headers django-filter requests

# Build frontend
msg_info "Building frontend..."
cd /opt/finance-assistant/frontend
npm install
npm run build

# Create data directory
msg_info "Creating data directory..."
mkdir -p /data
chown finance:finance /data

# Initialize Django
msg_info "Initializing Django application..."
cd /opt/finance-assistant/backend

# Remove problematic migration if it exists
if [ -f "ynab/migrations/0002_add_import_id_to_transaction.py" ]; then
    rm ynab/migrations/0002_add_import_id_to_transaction.py
fi

/opt/finance-assistant/venv/bin/python manage.py migrate
/opt/finance-assistant/venv/bin/python manage.py collectstatic --no-input
/opt/finance-assistant/venv/bin/python populate_data.py

# Create systemd service
msg_info "Creating systemd service..."
cat > /etc/systemd/system/finance-assistant.service << "EOF"
[Unit]
Description=Finance Assistant
After=network.target

[Service]
Type=notify
User=finance
Group=finance
WorkingDirectory=/opt/finance-assistant/backend
Environment=PATH=/opt/finance-assistant/venv/bin
Environment=DATABASE_PATH=/data/finance_assistant.db
ExecStart=/opt/finance-assistant/venv/bin/gunicorn finance_assistant.wsgi:application --bind 127.0.0.1:8000 --workers 3
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
msg_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/finance-assistant << "EOF"
server {
    listen 8080 default_server;
    server_name _;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Static files (Django)
    location /static/ {
        alias /opt/finance-assistant/backend/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend files
    location / {
        root /opt/finance-assistant/frontend/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=31536000";
    }
}
EOF

# Create update script
msg_info "Creating update script..."
cat > /opt/finance-assistant/install/update.sh << "EOF"
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
EOF

chmod +x /opt/finance-assistant/install/update.sh

# Enable services
msg_info "Enabling services..."
rm -f /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/finance-assistant /etc/nginx/sites-enabled/
systemctl daemon-reload
systemctl enable finance-assistant
systemctl start finance-assistant
systemctl enable nginx
systemctl start nginx

# Configure firewall
if command -v ufw >/dev/null 2>&1; then
    msg_info "Configuring firewall..."
    ufw allow 8080/tcp
    ufw --force enable
fi

msg_ok "Finance Assistant installation completed successfully!"
msg_info "Access your Finance Assistant at: http://$(hostname -I | awk '{print $1}'):8080"
msg_info "To update Finance Assistant in the future, run: /opt/finance-assistant/install/update.sh"