#!/bin/bash

# Finance Assistant Installation Script
# Based on community script format

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

# Header
header_info() {
    clear
    cat << 'EOF'
    ╔══════════════════════════════════════════════════════════════╗
    ║                    Finance Assistant                        ║
    ║                     Installation Script                     ║
    ║                                                              ║
    ║  This script will install Finance Assistant in an LXC       ║
    ║  container on your Proxmox server.                          ║
    ╚══════════════════════════════════════════════════════════════╝
EOF
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    msg_error "This script must be run as root"
    exit 1
fi

# Check if Proxmox is installed
if ! command -v pct &> /dev/null; then
    msg_error "Proxmox Container Toolkit (pct) not found. This script must be run on a Proxmox host."
    exit 1
fi

# Check if whiptail is available
if ! command -v whiptail &> /dev/null; then
    msg_error "whiptail is required but not installed. Please install it first."
    exit 1
fi

# Check if we're in an interactive environment
if [ ! -t 0 ] || [ -z "$TERM" ]; then
    msg_error "This script requires an interactive terminal with GUI support."
    msg_error "Please run this script from a proper terminal, not from the Proxmox web shell."
    msg_error "You can run it via SSH or from the Proxmox host console."
    exit 1
fi

# Default values
CTID=113
HOSTNAME="financeassistant"
IP="192.168.1.113"
GATEWAY="192.168.1.1"
STORAGE="local-lvm"
CORES=2
MEMORY=2048
SWAP=2048
DISK_SIZE=8

# Check available storage and set default
AVAILABLE_STORAGE=$(pvesm status | grep -E "(local-lvm|local)" | head -1 | awk '{print $1}')
if [ -n "$AVAILABLE_STORAGE" ]; then
    STORAGE="$AVAILABLE_STORAGE"
fi

# Show header
header_info

# Get container ID
while true; do
    CTID=$(whiptail --backtitle "Finance Assistant Installation" --title "Container ID" --inputbox "Enter container ID (100-999):" 8 50 "$CTID" 3>&1 1>&2 2>&3)

    if [ $? -ne 0 ]; then
        msg_info "Installation cancelled."
        exit 0
    fi

    if [[ "$CTID" =~ ^[0-9]+$ ]] && [ "$CTID" -ge 100 ] && [ "$CTID" -le 999 ]; then
        if pct list | grep -q "^$CTID "; then
            if whiptail --backtitle "Finance Assistant Installation" --title "Container Exists" --yesno "Container $CTID already exists. Remove it?" 8 50; then
                msg_info "Removing existing container $CTID..."
                pct stop $CTID 2>/dev/null || true
                pct destroy $CTID
                break
            fi
        else
            break
        fi
    else
        whiptail --backtitle "Finance Assistant Installation" --title "Invalid ID" --msgbox "Please enter a valid ID between 100-999" 8 50
    fi
done

# Get container name
HOSTNAME=$(whiptail --backtitle "Finance Assistant Installation" --title "Container Name" --inputbox "Enter container name:" 8 50 "$HOSTNAME" 3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then
    msg_info "Installation cancelled."
    exit 0
fi

# Get IP address
IP=$(whiptail --backtitle "Finance Assistant Installation" --title "IP Address" --inputbox "Enter IP address (without /24):" 8 50 "$IP" 3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then
    msg_info "Installation cancelled."
    exit 0
fi

# Get gateway
GATEWAY=$(whiptail --backtitle "Finance Assistant Installation" --title "Gateway" --inputbox "Enter gateway IP:" 8 50 "$GATEWAY" 3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then
    msg_info "Installation cancelled."
    exit 0
fi

# Get storage
STORAGE_LIST=$(pvesm status | grep -E "(local-lvm|local)" | awk '{print $1}')
STORAGE_OPTIONS=""
for storage in $STORAGE_LIST; do
    STORAGE_OPTIONS="$STORAGE_OPTIONS $storage $storage"
done

STORAGE=$(whiptail --backtitle "Finance Assistant Installation" --title "Storage" --menu "Select storage:" 12 50 5 $STORAGE_OPTIONS 3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then
    msg_info "Installation cancelled."
    exit 0
fi

# Get CPU cores
CORES=$(whiptail --backtitle "Finance Assistant Installation" --title "CPU Cores" --inputbox "Number of CPU cores:" 8 50 "$CORES" 3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then
    msg_info "Installation cancelled."
    exit 0
fi

# Get memory
MEMORY=$(whiptail --backtitle "Finance Assistant Installation" --title "Memory" --inputbox "Memory (MB):" 8 50 "$MEMORY" 3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then
    msg_info "Installation cancelled."
    exit 0
fi

# Get disk size
DISK_SIZE=$(whiptail --backtitle "Finance Assistant Installation" --title "Disk Size" --inputbox "Disk size (GB):" 8 50 "$DISK_SIZE" 3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then
    msg_info "Installation cancelled."
    exit 0
fi

# Show configuration summary
CONFIG_TEXT="Configuration Summary:

Container ID: $CTID
Name: $HOSTNAME
IP Address: $IP
Gateway: $GATEWAY
Storage: $STORAGE
CPU Cores: $CORES
Memory: ${MEMORY}MB
Disk Size: ${DISK_SIZE}GB

Proceed with installation?"

if ! whiptail --backtitle "Finance Assistant Installation" --title "Configuration Summary" --yesno "$CONFIG_TEXT" 15 60; then
    msg_info "Installation cancelled."
    exit 0
fi

# Start installation
msg_info "Starting Finance Assistant installation..."

# Check and download template
msg_info "Checking for available templates..."
TEMPLATE=""
TEMPLATE_NAME=""

# Check what templates are actually available
AVAILABLE_TEMPLATES=$(pveam available | grep -E "(debian|ubuntu)" | head -10)
msg_info "Available templates:"
echo "$AVAILABLE_TEMPLATES"

# Try to find a suitable template
if pveam list local | grep -q "debian-12"; then
    TEMPLATE="local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst"
    TEMPLATE_NAME="debian-12-standard_12.2-1_amd64.tar.zst"
elif pveam list local | grep -q "debian-11"; then
    TEMPLATE="local:vztmpl/debian-11-standard_11.7-1_amd64.tar.zst"
    TEMPLATE_NAME="debian-11-standard_11.7-1_amd64.tar.zst"
elif pveam list local | grep -q "ubuntu-22.04"; then
    TEMPLATE="local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
    TEMPLATE_NAME="ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
elif pveam list local | grep -q "ubuntu-20.04"; then
    TEMPLATE="local:vztmpl/ubuntu-20.04-standard_20.04-1_amd64.tar.zst"
    TEMPLATE_NAME="ubuntu-20.04-standard_20.04-1_amd64.tar.zst"
else
    msg_info "No suitable template found locally. Downloading Debian 12..."
    pveam download local debian-12-standard_12.2-1_amd64.tar.zst
    TEMPLATE="local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst"
    TEMPLATE_NAME="debian-12-standard_12.2-1_amd64.tar.zst"
fi

msg_info "Using template: $TEMPLATE"

# Verify template exists
if [ ! -f "/var/lib/vz/template/cache/$TEMPLATE_NAME" ]; then
    msg_error "Template file not found: $TEMPLATE_NAME"
    msg_info "Available local templates:"
    pveam list local
    exit 1
fi

# Create container
msg_info "Creating LXC container..."
pct create $CTID $TEMPLATE \
    --hostname $HOSTNAME \
    --password "finance123" \
    --storage $STORAGE \
    --cores $CORES \
    --memory $MEMORY \
    --swap $MEMORY \
    --rootfs $STORAGE:$DISK_SIZE \
    --net0 name=eth0,bridge=vmbr0,ip=$IP/24,gw=$GATEWAY \
    --unprivileged 0 \
    --features nesting=1 \
    --onboot 1

msg_ok "Container created successfully!"

# Start container
msg_info "Starting container..."
pct start $CTID

# Wait for container to be ready
msg_info "Waiting for container to be ready..."
sleep 10

# Install Finance Assistant
msg_info "Installing Finance Assistant..."
pct exec $CTID -- bash -c "
set -e

# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y curl wget git python3 python3-pip python3-venv nodejs npm nginx

# Create finance user
useradd -m -s /bin/bash finance || true

# Clone repository
cd /opt
git clone https://github.com/chbarnhouse/finance-assistant.git || true
cd finance-assistant

# Set up Python environment
cd /opt/finance-assistant
python3 -m venv venv
/opt/finance-assistant/venv/bin/pip install --upgrade pip
/opt/finance-assistant/venv/bin/pip install \"gunicorn<21.0\" django djangorestframework django-cors-headers django-filter requests

# Build frontend
cd /opt/finance-assistant/frontend
npm install
npm run build

# Create data directory
mkdir -p /data
chown finance:finance /data

# Initialize Django
cd /opt/finance-assistant/backend

# Remove problematic migration if it exists
if [ -f \"ynab/migrations/0002_add_import_id_to_transaction.py\" ]; then
    rm ynab/migrations/0002_add_import_id_to_transaction.py
fi

/opt/finance-assistant/venv/bin/python manage.py migrate
/opt/finance-assistant/venv/bin/python manage.py collectstatic --no-input
/opt/finance-assistant/venv/bin/python populate_data.py

# Create systemd service
cat > /etc/systemd/system/finance-assistant.service << 'EOF'
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
cat > /etc/nginx/sites-available/finance-assistant << 'EOF'
server {
    listen 8080 default_server;
    server_name _;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection \"1; mode=block\";

    # Static files
    location /static/ {
        alias /opt/finance-assistant/backend/static/;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }

    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Welcome page
    location / {
        return 200 \"Finance Assistant is Running! Backend API is operational. Visit /api/ for endpoints.\";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable services
rm -f /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/finance-assistant /etc/nginx/sites-enabled/
systemctl daemon-reload
systemctl enable finance-assistant
systemctl start finance-assistant
systemctl enable nginx
systemctl start nginx

# Configure firewall
if command -v ufw >/dev/null 2>&1; then
    ufw allow 8080/tcp
    ufw --force enable
fi
"

# Configure port forwarding on host
msg_info "Configuring port forwarding..."
CONTAINER_IP=$(pct exec $CTID ip route get 1 | awk '{print $7;exit}')

# Add iptables rules for port forwarding
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination $CONTAINER_IP:8080
iptables -A FORWARD -p tcp -d $CONTAINER_IP --dport 8080 -j ACCEPT

# Save iptables rules
if [ -d "/etc/iptables" ]; then
    iptables-save > /etc/iptables/rules.v4
fi

msg_ok "Installation completed successfully!"

# Show completion message
COMPLETION_TEXT="Installation Complete!

Finance Assistant has been successfully installed.

Access your Finance Assistant at:
http://$IP:8080

Container Management:
Start:  pct start $CTID
Stop:   pct stop $CTID
Shell:  pct enter $CTID
Status: pct status $CTID

Finance Assistant is now running! 🚀"

whiptail --backtitle "Finance Assistant Installation" \
    --title "Installation Complete" \
    --msgbox "$COMPLETION_TEXT" \
    20 70