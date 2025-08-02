#!/bin/bash

# Finance Assistant - GUI Installation Script
# Usage: bash -c "$(curl -fsSL https://raw.githubusercontent.com/chbarnhouse/finance-assistant/main/install.sh)"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Check if whiptail is available
if ! command -v whiptail &> /dev/null; then
    print_error "whiptail is required but not installed. Please install it first."
    exit 1
fi

# Default configuration
CTID=113
CT_NAME="financeassistant"
CT_PASSWORD="finance123"
CT_STORAGE="local-lvm"
CT_CORES=2
CT_MEMORY=2048
CT_DISK_SIZE=8
CT_IP="192.168.1.113/24"
CT_GATEWAY="192.168.1.1"

# Function to show header
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

# Function to check storage
check_storage() {
    print_status "Checking available storage..."
    STORAGE_INFO=$(pvesm status | grep -E "(local|local-lvm)" | head -1)
    if [ -z "$STORAGE_INFO" ]; then
        print_error "No suitable storage found"
        exit 1
    fi
    
    # Parse available space from pvesm status output (column 5 is 'Available')
    AVAILABLE=$(echo "$STORAGE_INFO" | awk '{print $5}' | sed 's/G//' | sed 's/[^0-9.]//g')
    
    if [ "$AVAILABLE" -lt 10 ]; then
        print_warning "Low storage space: ${AVAILABLE}GB available"
        if ! whiptail --backtitle "Finance Assistant Installation" --title "LOW STORAGE" --yesno "Only ${AVAILABLE}GB available. Continue anyway?" 8 50; then
            exit 1
        fi
    fi
}

# Function to get container ID
get_ctid() {
    while true; do
        CTID=$(whiptail --backtitle "Finance Assistant Installation" --title "Container ID" --inputbox "Enter container ID (100-999):" 8 50 "$CTID" 3>&1 1>&2 2>&3)
        
        if [ $? -ne 0 ]; then
            exit 1
        fi
        
        if [[ "$CTID" =~ ^[0-9]+$ ]] && [ "$CTID" -ge 100 ] && [ "$CTID" -le 999 ]; then
            if pct list | grep -q "^$CTID "; then
                if whiptail --backtitle "Finance Assistant Installation" --title "Container Exists" --yesno "Container $CTID already exists. Remove it?" 8 50; then
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
}

# Function to get container configuration
get_config() {
    # Container name
    CT_NAME=$(whiptail --backtitle "Finance Assistant Installation" --title "Container Name" --inputbox "Enter container name:" 8 50 "$CT_NAME" 3>&1 1>&2 2>&3)
    [ $? -ne 0 ] && exit 1
    
    # Storage
    STORAGE_OPTIONS=$(pvesm status | grep -E "(local|local-lvm)" | awk '{print $1}' | tr '\n' ' ')
    CT_STORAGE=$(whiptail --backtitle "Finance Assistant Installation" --title "Storage" --menu "Select storage:" 12 50 5 $STORAGE_OPTIONS 3>&1 1>&2 2>&3)
    [ $? -ne 0 ] && exit 1
    
    # CPU cores
    CT_CORES=$(whiptail --backtitle "Finance Assistant Installation" --title "CPU Cores" --inputbox "Number of CPU cores:" 8 50 "$CT_CORES" 3>&1 1>&2 2>&3)
    [ $? -ne 0 ] && exit 1
    
    # Memory
    CT_MEMORY=$(whiptail --backtitle "Finance Assistant Installation" --title "Memory" --inputbox "Memory (MB):" 8 50 "$CT_MEMORY" 3>&1 1>&2 2>&3)
    [ $? -ne 0 ] && exit 1
    
    # Disk size
    CT_DISK_SIZE=$(whiptail --backtitle "Finance Assistant Installation" --title "Disk Size" --inputbox "Disk size (GB):" 8 50 "$CT_DISK_SIZE" 3>&1 1>&2 2>&3)
    [ $? -ne 0 ] && exit 1
    
    # IP address
    CT_IP=$(whiptail --backtitle "Finance Assistant Installation" --title "IP Address" --inputbox "IP address (CIDR format):" 8 50 "$CT_IP" 3>&1 1>&2 2>&3)
    [ $? -ne 0 ] && exit 1
    
    # Gateway
    CT_GATEWAY=$(whiptail --backtitle "Finance Assistant Installation" --title "Gateway" --inputbox "Gateway IP:" 8 50 "$CT_GATEWAY" 3>&1 1>&2 2>&3)
    [ $? -ne 0 ] && exit 1
}

# Function to show configuration summary
show_config() {
    CONFIG_TEXT="Configuration Summary:

Container ID: $CTID
Name: $CT_NAME
Storage: $CT_STORAGE
CPU Cores: $CT_CORES
Memory: ${CT_MEMORY}MB
Disk Size: ${CT_DISK_SIZE}GB
IP Address: $CT_IP
Gateway: $CT_GATEWAY

Proceed with installation?"

    if ! whiptail --backtitle "Finance Assistant Installation" --title "Configuration Summary" --yesno "$CONFIG_TEXT" 15 60; then
        exit 1
    fi
}

# Function to create and install container
create_and_install() {
    # Check if container already exists
    if pct list | grep -q "$CTID"; then
        print_warning "Container $CTID already exists. Removing it..."
        pct stop $CTID 2>/dev/null || true
        pct destroy $CTID
    fi

    # Detect available templates
    print_status "Detecting available templates..."
    AVAILABLE_TEMPLATES=$(pveam available | grep -E "(debian|ubuntu)" | head -5)
    print_status "Available templates:"
    echo "$AVAILABLE_TEMPLATES"

    # Try to find a suitable template
    TEMPLATE=""
    if pveam list local | grep -q "debian-12"; then
        TEMPLATE="local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst"
    elif pveam list local | grep -q "debian-11"; then
        TEMPLATE="local:vztmpl/debian-11-standard_11.7-1_amd64.tar.zst"
    elif pveam list local | grep -q "ubuntu-22.04"; then
        TEMPLATE="local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
    elif pveam list local | grep -q "ubuntu-20.04"; then
        TEMPLATE="local:vztmpl/ubuntu-20.04-standard_20.04-1_amd64.tar.zst"
    else
        # Download a template if none available
        print_status "No suitable template found. Downloading Debian 12..."
        pveam download local debian-12-standard_12.2-1_amd64.tar.zst
        TEMPLATE="local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst"
    fi

    print_status "Using template: $TEMPLATE"

    # Create container
    print_status "Creating LXC container..."
    pct create $CTID $TEMPLATE \
        --hostname $CT_NAME \
        --password $CT_PASSWORD \
        --storage $CT_STORAGE \
        --cores $CT_CORES \
        --memory $CT_MEMORY \
        --rootfs $CT_STORAGE:$CT_DISK_SIZE \
        --net0 name=eth0,bridge=vmbr0,ip=$CT_IP,gw=$CT_GATEWAY \
        --unprivileged 0 \
        --features nesting=1

    # Start container
    print_status "Starting container..."
    pct start $CTID

    # Wait for container to be ready
    print_status "Waiting for container to be ready..."
    sleep 10

    # Install Finance Assistant
    print_status "Installing Finance Assistant..."
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
    print_status "Configuring port forwarding..."
    CONTAINER_IP=$(pct exec $CTID ip route get 1 | awk '{print $7;exit}')

    # Add iptables rules for port forwarding
    iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination $CONTAINER_IP:8080
    iptables -A FORWARD -p tcp -d $CONTAINER_IP --dport 8080 -j ACCEPT

    # Save iptables rules
    if [ -d "/etc/iptables" ]; then
        iptables-save > /etc/iptables/rules.v4
    fi
}

# Function to show completion message
show_completion() {
    COMPLETION_TEXT="Installation Complete!

Finance Assistant has been successfully installed.

Access your Finance Assistant at:
http://192.168.1.150:8080

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
}

# Main execution
main() {
    header_info
    check_storage
    get_ctid
    get_config
    show_config

    create_and_install
    show_completion
}

# Run main function
main "$@"