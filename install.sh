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

msg_ok "Completed Successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW} Access it using the following URL:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}http://${IP}:8080${CL}"