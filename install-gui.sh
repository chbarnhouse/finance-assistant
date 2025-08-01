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
var_disk="${var_disk:-8}"
var_os="${var_os:-debian}"
var_version="${var_version:-12}"
var_unprivileged="${var_unprivileged:-0}"

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

function install_finance_assistant() {
  msg_info "Installing ${APP} Dependencies"
  $STD apt-get update -qq &>/dev/null
  $STD apt-get install -y curl wget git python3 python3-pip python3-venv nodejs npm nginx supervisor &>/dev/null

  msg_info "Creating Finance Assistant User"
  $STD useradd -m -s /bin/bash finance &>/dev/null

  msg_info "Creating Application Directory"
  $STD mkdir -p /opt/finance-assistant
  $STD chown finance:finance /opt/finance-assistant

  msg_info "Cloning Repository"
  $STD cd /opt/finance-assistant
  $STD git clone https://github.com/chbarnhouse/finance-assistant.git temp &>/dev/null
  $STD cp -r temp/backend ./
  $STD cp -r temp/frontend ./
  $STD rm -rf temp
  $STD chown -R finance:finance /opt/finance-assistant

  msg_info "Setting up Python Environment"
  $STD cd /opt/finance-assistant
  $STD sudo -u finance python3 -m venv venv &>/dev/null
  $STD sudo -u finance /opt/finance-assistant/venv/bin/pip install --upgrade pip &>/dev/null
  $STD sudo -u finance /opt/finance-assistant/venv/bin/pip install gunicorn django djangorestframework django-cors-headers django-filter &>/dev/null

  msg_info "Building Frontend"
  $STD cd /opt/finance-assistant/frontend
  $STD sudo -u finance npm install &>/dev/null
  $STD sudo -u finance npm run build &>/dev/null

  msg_info "Initializing Django"
  $STD cd /opt/finance-assistant/backend
  $STD sudo -u finance /opt/finance-assistant/venv/bin/python manage.py migrate &>/dev/null
  $STD sudo -u finance /opt/finance-assistant/venv/bin/python manage.py collectstatic --no-input &>/dev/null
  $STD sudo -u finance /opt/finance-assistant/venv/bin/python manage.py populate_defaults &>/dev/null
  $STD sudo -u finance /opt/finance-assistant/venv/bin/python populate_data.py &>/dev/null

  msg_info "Creating Systemd Service"
  cat > /etc/systemd/system/finance-assistant.service << 'EOF'
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
EOF

  msg_info "Configuring Nginx"
  cat > /etc/nginx/sites-available/finance-assistant << 'EOF'
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
EOF

  msg_info "Enabling Services"
  $STD rm -f /etc/nginx/sites-enabled/default
  $STD ln -s /etc/nginx/sites-available/finance-assistant /etc/nginx/sites-enabled/
  $STD systemctl daemon-reload
  $STD systemctl enable finance-assistant
  $STD systemctl start finance-assistant
  $STD systemctl enable nginx
  $STD systemctl start nginx

  msg_info "Configuring Firewall"
  $STD ufw allow 8080/tcp &>/dev/null
  $STD ufw --force enable &>/dev/null
}

start
build_container
install_finance_assistant
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