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

# Override the build_container function to handle the 404 error
function build_container() {
  # Call the original build_container function but skip the problematic curl command
  msg_info "Creating a ${APP} LXC using the above advanced settings"
  
  # Check if configuration file exists
  if [ -f "/opt/community-scripts/${APP,,}.conf" ]; then
    msg_info "Configuration file already exists at /opt/community-scripts/${APP,,}.conf"
  fi
  
  # Write configuration to file
  msg_info "Writing configuration to /opt/community-scripts/${APP,,}.conf"
  cat >"/opt/community-scripts/${APP,,}.conf" <<EOF
# Configuration for ${APP}
CTID=${CTID}
HOSTNAME=${HOSTNAME}
IP=${IP}
GATEWAY=${GATEWAY}
STORAGE=${STORAGE}
CORES=${CORES}
MEMORY=${MEMORY}
DISK_SIZE=${DISK_SIZE}
EOF

  # Validate storage
  if [ -z "$STORAGE" ]; then
    msg_error "Storage is required"
    exit 1
  fi
  
  if ! pvesm status | grep -q "$STORAGE"; then
    msg_error "Storage '$STORAGE' not found"
    exit 1
  fi
  
  msg_ok "Valid Storage Found"
  msg_info "Validated Storage | Container: $STORAGE (Free: $(pvesm status | grep "$STORAGE" | awk '{print $4}') Used: $(pvesm status | grep "$STORAGE" | awk '{print $5}'))"

  # Update LXC template list
  msg_info "LXC Template List Updated"
  pveam update

  # Check if template exists
  if ! pveam list local | grep -q "$TEMPLATE"; then
    msg_info "Downloading LXC Template"
    pveam download local "$TEMPLATE"
  fi
  
  msg_ok "LXC Template '$TEMPLATE' is ready to use."

  # Create container
  msg_info "Creating LXC Container"
  pct create "$CTID" "$TEMPLATE" \
    --hostname "$HOSTNAME" \
    --password "$PASSWORD" \
    --storage "$STORAGE" \
    --cores "$CORES" \
    --memory "$MEMORY" \
    --swap "$MEMORY" \
    --rootfs "$STORAGE:$DISK_SIZE" \
    --net0 name=eth0,bridge="$BRIDGE",ip="$IP"/24,gw="$GATEWAY" \
    --unprivileged "$UNPRIVILEGED" \
    --features nesting=1 \
    --onboot 1 \
    --tags "$TAGS"

  msg_ok "LXC Container $CTID was successfully created."

  # Start container
  msg_info "Starting LXC Container"
  pct start "$CTID"

  # Wait for container to be running
  for i in {1..10}; do
    if pct status "$CTID" | grep -q "status: running"; then
      msg_ok "Started LXC Container"
      break
    fi
    sleep 1
  done

  # Wait for network
  msg_info "Waiting for network to be ready..."
  for i in {1..30}; do
    if pct exec "$CTID" -- ping -c 1 8.8.8.8 >/dev/null 2>&1; then
      msg_ok "Network in LXC is reachable"
      break
    fi
    sleep 1
  done

  # Customize container
  msg_info "Customizing LXC Container"
  
  # Set timezone
  if [ -n "$TZ" ]; then
    tz="$TZ"
    if pct exec "$CTID" -- test -e "/usr/share/zoneinfo/$tz"; then
      pct exec "$CTID" -- bash -c "tz='$tz'; echo \"\$tz\" >/etc/timezone && ln -sf \"/usr/share/zoneinfo/\$tz\" /etc/localtime"
    else
      msg_warn "Skipping timezone setup – zone '$tz' not found in container"
    fi
  fi

  # Install basic packages
  pct exec "$CTID" -- bash -c "apt-get update >/dev/null && apt-get install -y sudo curl mc gnupg2 jq >/dev/null"
  
  msg_ok "Customized LXC Container"

  # Install Finance Assistant manually
  msg_info "Installing Finance Assistant inside container $CTID..."
  pct exec "$CTID" -- bash -c "$(curl -fsSL https://raw.githubusercontent.com/chbarnhouse/finance-assistant/main/install/financeassistant.sh)"
}

start
build_container
description

msg_ok "Completed Successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW} Access it using the following URL:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}http://${IP}:8080${CL}"