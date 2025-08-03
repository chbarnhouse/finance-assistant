#!/usr/bin/env bash

# Finance Assistant Standalone Installation Script
# This script creates an LXC container and installs Finance Assistant
# without relying on the community-scripts framework

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
CTID=113
HOSTNAME="financeassistant"
IP="192.168.1.150/24"
GATEWAY="192.168.1.1"
CORES=2
MEMORY=2048
DISK_SIZE="4"
STORAGE="local-lvm"

echo -e "${BLUE}=== Finance Assistant Installation ===${NC}"
echo

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Check if CTID is already in use
if pct list | grep -q "^$CTID "; then
    echo -e "${YELLOW}Container ID $CTID already exists. Using next available ID...${NC}"
    CTID=$(pct list | awk 'NR>1 {print $1}' | sort -n | tail -1 | awk '{print $1+1}')
    echo -e "${GREEN}Using Container ID: $CTID${NC}"
fi

echo -e "${BLUE}Configuration:${NC}"
echo "Container ID: $CTID"
echo "Hostname: $HOSTNAME"
echo "IP: $IP"
echo "Gateway: $GATEWAY"
echo "Cores: $CORES"
echo "Memory: ${MEMORY}MB"
echo "Disk: ${DISK_SIZE}GB"
echo "Storage: $STORAGE"
echo

echo -e "${YELLOW}Proceed with installation? (Y/N):${NC} "
read -r response
if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${RED}Installation cancelled.${NC}"
    exit 1
fi

echo -e "${BLUE}Creating LXC container...${NC}"
pct create $CTID local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
    --hostname $HOSTNAME \
    --memory $MEMORY \
    --cores $CORES \
    --rootfs $STORAGE:$DISK_SIZE \
    --net0 name=eth0,bridge=vmbr0,ip=$IP,gw=$GATEWAY \
    --unprivileged 0 \
    --features nesting=1

echo -e "${GREEN}Container created successfully!${NC}"

echo -e "${BLUE}Starting container...${NC}"
pct start $CTID
sleep 10

echo -e "${BLUE}Installing Finance Assistant...${NC}"
pct exec $CTID -- bash -c "
# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y curl wget git python3 python3-pip python3-venv nodejs npm nginx supervisor

# Create finance user
useradd -m -s /bin/bash finance

# Create application directory
mkdir -p /opt/finance-assistant
chown finance:finance /opt/finance-assistant

# Clone repository
cd /opt/finance-assistant
git clone https://github.com/chbarnhouse/finance-assistant.git temp
cp -r temp/backend ./
cp -r temp/frontend ./
rm -rf temp
chown -R finance:finance /opt/finance-assistant

# Set up Python environment
cd /opt/finance-assistant
sudo -u finance python3 -m venv venv
sudo -u finance /opt/finance-assistant/venv/bin/pip install --upgrade pip
sudo -u finance /opt/finance-assistant/venv/bin/pip install gunicorn django djangorestframework django-cors-headers django-filter

# Build frontend
cd /opt/finance-assistant/frontend
sudo -u finance npm install
sudo -u finance npm run build

# Initialize Django
cd /opt/finance-assistant/backend
sudo -u finance /opt/finance-assistant/venv/bin/python manage.py migrate
sudo -u finance /opt/finance-assistant/venv/bin/python manage.py collectstatic --no-input
sudo -u finance /opt/finance-assistant/venv/bin/python populate_data.py

# Create systemd service
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

# Configure Nginx
cat > /etc/nginx/sites-available/finance-assistant << 'EOF'
server {
    listen 8080 default_server;
    server_name _;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection \"1; mode=block\";

    # Serve static files
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

    # Frontend
    location / {
        root /opt/finance-assistant/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }

    # Health check
    location /health {
        access_log off;
        return 200 'healthy\\n';
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
ufw allow 8080/tcp
ufw --force enable
"

echo -e "${GREEN}Installation completed!${NC}"
echo
echo -e "${BLUE}Access your Finance Assistant at:${NC}"
echo -e "${GREEN}http://192.168.1.150:8080${NC}"
echo
echo -e "${BLUE}Container Management:${NC}"
echo -e "  Start:  ${YELLOW}pct start $CTID${NC}"
echo -e "  Stop:   ${YELLOW}pct stop $CTID${NC}"
echo -e "  Shell:  ${YELLOW}pct enter $CTID${NC}"
echo -e "  Status: ${YELLOW}pct status $CTID${NC}"
echo
echo -e "${GREEN}Finance Assistant is now running! 🚀${NC}"