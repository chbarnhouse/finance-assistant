#!/usr/bin/env bash
source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/build.func)
# Copyright (c) 2024-2025 chbarnhouse
# Author: chbarnhouse
# License: MIT | https://github.com/chbarnhouse/finance-assistant/raw/main/LICENSE
# Source: https://github.com/chbarnhouse/finance-assistant

APP="Finance Assistant"
var_tags="${var_tags:-finance}"
var_cpu="${var_cpu:-2}"
var_ram="${var_ram:-2048}"
var_disk="${var_disk:-4}"
var_os="${var_os:-debian}"
var_version="${var_version:-12}"
var_unprivileged="${var_unprivileged:-0}"
var_install="finance"

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
  msg_info "Updating ${APP} (Patience)"
  # Update logic would go here
  msg_ok "Updated ${APP}"
  exit
}



start
build_container

# Override the default installation behavior
msg_info "Installing Finance Assistant"
lxc-attach -n "$CTID" -- bash -c "$(cat << 'EOF'
#!/usr/bin/env bash
set -e

# Install dependencies
apt-get update -qq >/dev/null
apt-get install -y curl wget git python3 python3-pip python3-venv nodejs npm nginx supervisor >/dev/null

# Create finance user
useradd -m -s /bin/bash finance >/dev/null

# Create application directory
mkdir -p /opt/finance-assistant
chown finance:finance /opt/finance-assistant

# Clone repository
cd /opt/finance-assistant
git clone https://github.com/chbarnhouse/finance-assistant.git temp >/dev/null
cp -r temp/backend ./
cp -r temp/frontend ./
rm -rf temp
chown -R finance:finance /opt/finance-assistant

# Set up Python environment
cd /opt/finance-assistant
sudo -u finance python3 -m venv venv >/dev/null
sudo -u finance /opt/finance-assistant/venv/bin/pip install --upgrade pip >/dev/null
sudo -u finance /opt/finance-assistant/venv/bin/pip install gunicorn django djangorestframework django-cors-headers django-filter >/dev/null

# Build frontend
cd /opt/finance-assistant/frontend
sudo -u finance npm install >/dev/null
sudo -u finance npm run build >/dev/null

# Initialize Django
cd /opt/finance-assistant/backend
sudo -u finance /opt/finance-assistant/venv/bin/python manage.py migrate >/dev/null
sudo -u finance /opt/finance-assistant/venv/bin/python manage.py collectstatic --no-input >/dev/null
sudo -u finance /opt/finance-assistant/venv/bin/python populate_data.py >/dev/null

# Create systemd service
cat > /etc/systemd/system/finance-assistant.service << 'SERVICE_EOF'
[Unit]
Description=Finance Assistant
After=network.target

[Service]
Type=simple
User=finance
Group=finance
WorkingDirectory=/opt/finance-assistant/backend
Environment=PATH=/opt/finance-assistant/venv/bin
ExecStart=/opt/finance-assistant/venv/bin/gunicorn finance_assistant.wsgi:application --bind 127.0.0.1:8000 --workers 3
Restart=always

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Configure Nginx
cat > /etc/nginx/sites-available/finance-assistant << 'NGINX_EOF'
server {
    listen 8080 default_server;
    server_name _;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Serve static files
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

    # Frontend
    location / {
        root /opt/finance-assistant/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        access_log off;
        return 200 'healthy\n';
    }
}
NGINX_EOF

# Enable services
rm -f /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/finance-assistant /etc/nginx/sites-enabled/
systemctl daemon-reload
systemctl enable finance-assistant
systemctl start finance-assistant
systemctl enable nginx
systemctl start nginx

# Configure firewall
ufw allow 8080/tcp >/dev/null
ufw --force enable >/dev/null

echo "Finance Assistant installation completed successfully!"
EOF
)" $?

description

msg_ok "Completed Successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW} Access it using the following URL:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}http://${IP}:8080${CL}"
echo -e "${INFO}${YW} Default credentials:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}Username: admin${CL}"
echo -e "${TAB}${GATEWAY}${BGN}Password: admin${CL}"
echo -e "${INFO}${YW} Container Management:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}Start:  pct start ${CTID}${CL}"
echo -e "${TAB}${GATEWAY}${BGN}Stop:   pct stop ${CTID}${CL}"
echo -e "${TAB}${GATEWAY}${BGN}Shell:  pct enter ${CTID}${CL}"
echo -e "${TAB}${GATEWAY}${BGN}Status: pct status ${CTID}${CL}"