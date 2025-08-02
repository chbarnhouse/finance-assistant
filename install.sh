#!/bin/bash

# Finance Assistant - Single Command Installation Script
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

# Configuration
CTID=113
CT_NAME="financeassistant"
CT_PASSWORD="finance123"
CT_STORAGE="local-lvm"
CT_CORES=2
CT_MEMORY=2048
CT_DISK_SIZE=8
CT_IP="192.168.1.113/24"
CT_GATEWAY="192.168.1.1"

print_status "Starting Finance Assistant installation..."

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

print_success "Installation completed successfully!"
echo
echo "🌐 Access your Finance Assistant at: http://192.168.1.150:8080"
echo "📊 API Endpoints: http://192.168.1.150:8080/api/"
echo
echo "Container Management:"
echo "  Start:  pct start $CTID"
echo "  Stop:   pct stop $CTID"
echo "  Shell:  pct enter $CTID"
echo "  Status: pct status $CTID"
echo
print_success "Finance Assistant is now running! 🚀"