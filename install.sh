#!/usr/bin/env bash
source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/build.func)
# Copyright (c) 2021-2025 tteck
# Author: tteck (tteckster)
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE
# Source: https://github.com/chbarnhouse/finance-assistant

APP="Finance Assistant"
var_tags="${var_tags:-finance}"
var_cpu="${var_cpu:-2}"
var_ram="${var_ram:-2048}"
var_disk="${var_disk:-8}"
var_os="${var_os:-debian}"
var_version="${var_version:-12}"
var_unprivileged="${var_unprivileged:-1}"

header_info "$APP"
variables
color
catch_errors

function update_script() {
  header_info
  check_container_storage
  check_container_resources
  if [[ ! -d /opt/finance-assistant ]]; then
    msg_error "No ${APP} Installation Found!"
    exit
  fi

  msg_info "Updating Finance Assistant..."

  # Update the application
  cd /opt/finance-assistant
  git pull origin main

  # Update Python dependencies
  /opt/finance-assistant/venv/bin/pip install --upgrade pip
  /opt/finance-assistant/venv/bin/pip install "gunicorn<21.0" django djangorestframework django-cors-headers django-filter requests

  # Rebuild frontend
  cd /opt/finance-assistant/frontend
  npm install
  npm run build

  # Restart services
  systemctl restart finance-assistant
  systemctl restart nginx

  msg_ok "Updated Finance Assistant"
  exit
}

function description() {
  msg_info "Installing Finance Assistant..."
  msg_info "Finance Assistant is a comprehensive financial management tool"
  msg_info "that helps you track expenses, manage budgets, and analyze spending patterns."
  msg_info "It provides a modern web interface with powerful financial insights."
}

start
build_container
description

# After the container is built, install Finance Assistant
if [[ -n "$CTID" ]]; then
  msg_info "Installing Finance Assistant inside container $CTID..."

  # Create the installation script content
  INSTALL_SCRIPT='#!/bin/bash

set -e

# Colors
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m"

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

    # Static files
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

    # Welcome page
    location / {
        return 200 "Finance Assistant is Running! Backend API is operational. Visit /api/ for endpoints.";
        add_header Content-Type text/plain;
    }
}
EOF

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
msg_info "Access your Finance Assistant at: http://$(hostname -I | awk "{print \$1}"):8080"
'

  # Execute the installation script inside the container
  pct exec $CTID -- bash -c "$INSTALL_SCRIPT"
fi

msg_ok "Completed Successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW} Access it using the following URL:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}http://${IP}:8080${CL}"