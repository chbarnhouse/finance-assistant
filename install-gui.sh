#!/usr/bin/env bash

# Copyright (c) 2024-2025 chbarnhouse
# Author: chbarnhouse
# License: MIT | https://github.com/chbarnhouse/finance-assistant/raw/main/LICENSE
# Source: https://github.com/chbarnhouse/finance-assistant

# Colors for output
YW=$(echo "\033[33m")
YWB=$'\e[93m'
BL=$(echo "\033[36m")
RD=$(echo "\033[01;31m")
BGN=$(echo "\033[4;92m")
GN=$(echo "\033[1;92m")
DGN=$(echo "\033[32m")
CL=$(echo "\033[m")

# Icons
CM="${GN}✓${CL}"
CROSS="${RD}✖${CL}"
INFO="${BL}ℹ${CL}"
WARN="${YW}⚠${CL}"

# Formatting
BFR="\\r\\033[K"
TAB="  "

# Variables
APP="Finance Assistant"
CTID=113
HOSTNAME="financeassistant"
IP="192.168.1.150/24"
GATEWAY="192.168.1.1"
CORES=2
MEMORY=2048
DISK_SIZE="8"
STORAGE="local-lvm"
OS_TEMPLATE="local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RD}This script must be run as root${CL}"
   exit 1
fi

# Check available storage
check_storage() {
    msg_info "Checking available storage..."
    if ! pvesm status | grep -q "$STORAGE"; then
        msg_error "Storage '$STORAGE' not found!"
        echo -e "${BL}Available storage pools:${CL}"
        pvesm status | grep -v "storage" | awk '{print "  " $1}'
        exit 1
    fi
    
    # Get available space
    AVAILABLE_SPACE=$(pvesm status | grep "$STORAGE" | awk '{print $3}' | sed 's/[^0-9]//g')
    if [[ "$AVAILABLE_SPACE" -lt "$DISK_SIZE" ]]; then
        msg_error "Not enough space in $STORAGE. Available: ${AVAILABLE_SPACE}GB, Required: ${DISK_SIZE}GB"
        exit 1
    fi
    
    msg_ok "Storage check passed. Available: ${AVAILABLE_SPACE}GB"
}

# Check if CTID is already in use
if pct list | grep -q "^$CTID "; then
    echo -e "${YW}Container ID $CTID already exists. Using next available ID...${CL}"
    CTID=$(pct list | awk 'NR>1 {print $1}' | sort -n | tail -1 | awk '{print $1+1}')
    echo -e "${GN}Using Container ID: $CTID${CL}"
fi

# Header function
header_info() {
    clear
    echo -e "${BL}╔══════════════════════════════════════════════════════════════╗${CL}"
    echo -e "${BL}║                    Finance Assistant                        ║${CL}"
    echo -e "${BL}║                     Installation Script                     ║${CL}"
    echo -e "${BL}╚══════════════════════════════════════════════════════════════╝${CL}"
    echo
}

# Message functions
msg_info() {
    echo -e "${INFO}${BL} $1${CL}"
}

msg_ok() {
    echo -e "${CM}${GN} $1${CL}"
}

msg_error() {
    echo -e "${CROSS}${RD} $1${CL}"
}

msg_warn() {
    echo -e "${WARN}${YW} $1${CL}"
}

# Spinner function
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Show configuration
show_config() {
    echo -e "${BL}Configuration:${CL}"
    echo -e "${TAB}${BL}Container ID:${CL} $CTID"
    echo -e "${TAB}${BL}Hostname:${CL} $HOSTNAME"
    echo -e "${TAB}${BL}IP Address:${CL} $IP"
    echo -e "${TAB}${BL}Gateway:${CL} $GATEWAY"
    echo -e "${TAB}${BL}Storage:${CL} $STORAGE"
    echo -e "${TAB}${BL}CPU Cores:${CL} $CORES"
    echo -e "${TAB}${BL}Memory:${CL} ${MEMORY}MB"
    echo -e "${TAB}${BL}Disk Size:${CL} ${DISK_SIZE}GB"
    echo
}

# Confirm installation
confirm_installation() {
    echo -e "${YW}Proceed with installation? (Y/N):${CL} "
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        return 0
    else
        echo -e "${RD}Installation cancelled.${CL}"
        exit 1
    fi
}

# Create container
create_container() {
    msg_info "Creating LXC container..."
    if pct create $CTID $OS_TEMPLATE \
        --hostname $HOSTNAME \
        --memory $MEMORY \
        --cores $CORES \
        --rootfs $STORAGE:$DISK_SIZE \
        --net0 name=eth0,bridge=vmbr0,ip=$IP,gw=$GATEWAY \
        --unprivileged 0 \
        --features nesting=1 2>&1; then
        msg_ok "Container created successfully!"
    else
        msg_error "Failed to create container!"
        echo -e "${BL}Error details:${CL}"
        pct create $CTID $OS_TEMPLATE \
            --hostname $HOSTNAME \
            --memory $MEMORY \
            --cores $CORES \
            --rootfs $STORAGE:$DISK_SIZE \
            --net0 name=eth0,bridge=vmbr0,ip=$IP,gw=$GATEWAY \
            --unprivileged 0 \
            --features nesting=1
        exit 1
    fi
}

# Start container
start_container() {
    msg_info "Starting container..."
    if pct start $CTID; then
        msg_ok "Container started successfully!"
    else
        msg_error "Failed to start container!"
        exit 1
    fi

    # Wait for container to be ready
    msg_info "Waiting for container to be ready..."
    sleep 10
}

# Install Finance Assistant
install_finance_assistant() {
    msg_info "Installing Finance Assistant..."

    # Update system
    pct exec $CTID -- apt update -qq &>/dev/null
    pct exec $CTID -- apt upgrade -y &>/dev/null

    # Install dependencies
    msg_info "Installing dependencies..."
    pct exec $CTID -- apt install -y curl wget git python3 python3-pip python3-venv nodejs npm nginx supervisor &>/dev/null

    # Create finance user
    msg_info "Creating finance user..."
    pct exec $CTID -- useradd -m -s /bin/bash finance &>/dev/null

    # Create application directory
    msg_info "Creating application directory..."
    pct exec $CTID -- mkdir -p /opt/finance-assistant
    pct exec $CTID -- chown finance:finance /opt/finance-assistant

    # Clone repository
    msg_info "Cloning repository..."
    pct exec $CTID -- bash -c "cd /opt/finance-assistant && git clone https://github.com/chbarnhouse/finance-assistant.git temp &>/dev/null"
    pct exec $CTID -- bash -c "cd /opt/finance-assistant && cp -r temp/backend ./ && cp -r temp/frontend ./ && rm -rf temp"
    pct exec $CTID -- chown -R finance:finance /opt/finance-assistant

    # Set up Python environment
    msg_info "Setting up Python environment..."
    pct exec $CTID -- bash -c "cd /opt/finance-assistant && sudo -u finance python3 -m venv venv &>/dev/null"
    pct exec $CTID -- bash -c "cd /opt/finance-assistant && sudo -u finance /opt/finance-assistant/venv/bin/pip install --upgrade pip &>/dev/null"
    pct exec $CTID -- bash -c "cd /opt/finance-assistant && sudo -u finance /opt/finance-assistant/venv/bin/pip install gunicorn django djangorestframework django-cors-headers django-filter &>/dev/null"

    # Build frontend
    msg_info "Building frontend..."
    pct exec $CTID -- bash -c "cd /opt/finance-assistant/frontend && sudo -u finance npm install &>/dev/null"
    pct exec $CTID -- bash -c "cd /opt/finance-assistant/frontend && sudo -u finance npm run build &>/dev/null"

    # Initialize Django
    msg_info "Initializing Django..."
    pct exec $CTID -- bash -c "cd /opt/finance-assistant/backend && sudo -u finance /opt/finance-assistant/venv/bin/python manage.py migrate &>/dev/null"
    pct exec $CTID -- bash -c "cd /opt/finance-assistant/backend && sudo -u finance /opt/finance-assistant/venv/bin/python manage.py collectstatic --no-input &>/dev/null"
    pct exec $CTID -- bash -c "cd /opt/finance-assistant/backend && sudo -u finance /opt/finance-assistant/venv/bin/python populate_data.py &>/dev/null"

    # Create systemd service
    msg_info "Creating systemd service..."
    pct exec $CTID -- bash -c 'cat > /etc/systemd/system/finance-assistant.service << "EOF"
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
EOF'

    # Configure Nginx
    msg_info "Configuring Nginx..."
    pct exec $CTID -- bash -c 'cat > /etc/nginx/sites-available/finance-assistant << "EOF"
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
        return 200 "healthy\n";
    }
}
EOF'

    # Enable services
    msg_info "Enabling services..."
    pct exec $CTID -- rm -f /etc/nginx/sites-enabled/default
    pct exec $CTID -- ln -s /etc/nginx/sites-available/finance-assistant /etc/nginx/sites-enabled/
    pct exec $CTID -- systemctl daemon-reload
    pct exec $CTID -- systemctl enable finance-assistant
    pct exec $CTID -- systemctl start finance-assistant
    pct exec $CTID -- systemctl enable nginx
    pct exec $CTID -- systemctl start nginx

    # Configure firewall
    msg_info "Configuring firewall..."
    pct exec $CTID -- ufw allow 8080/tcp &>/dev/null
    pct exec $CTID -- ufw --force enable &>/dev/null

    msg_ok "Finance Assistant installation completed!"
}

# Main installation process
main() {
    header_info
    show_config
    check_storage
    confirm_installation
    
    create_container
    start_container
    install_finance_assistant

    # Success message
    echo
    echo -e "${GN}╔══════════════════════════════════════════════════════════════╗${CL}"
    echo -e "${GN}║                    Installation Complete!                    ║${CL}"
    echo -e "${GN}╚══════════════════════════════════════════════════════════════╝${CL}"
    echo
    echo -e "${BL}Access your Finance Assistant at:${CL}"
    echo -e "${TAB}${BGN}http://192.168.1.150:8080${CL}"
    echo
    echo -e "${BL}Container Management:${CL}"
    echo -e "${TAB}${BGN}Start:  pct start $CTID${CL}"
    echo -e "${TAB}${BGN}Stop:   pct stop $CTID${CL}"
    echo -e "${TAB}${BGN}Shell:  pct enter $CTID${CL}"
    echo -e "${TAB}${BGN}Status: pct status $CTID${CL}"
    echo
    echo -e "${BL}Service Management (inside container):${CL}"
    echo -e "${TAB}${BGN}Check status: pct exec $CTID -- systemctl status finance-assistant${CL}"
    echo -e "${TAB}${BGN}View logs:    pct exec $CTID -- journalctl -u finance-assistant -f${CL}"
    echo
    echo -e "${GN}Finance Assistant is now running! 🚀${CL}"
}

# Run main function
main