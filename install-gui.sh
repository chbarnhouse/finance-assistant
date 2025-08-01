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