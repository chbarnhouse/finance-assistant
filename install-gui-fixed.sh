#!/usr/bin/env bash

# Finance Assistant GUI Installation Script
# This script mimics the community-scripts GUI experience

set -e

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Icons
CHECK='\033[0;32m✓\033[0m'
CROSS='\033[0;31m✗\033[0m'
INFO='\033[0;34mℹ\033[0m'
WARN='\033[0;33m⚠\033[0m'

# Default configuration
CTID=113
HOSTNAME="financeassistant"
IP="192.168.1.150/24"
GATEWAY="192.168.1.1"
CORES=2
MEMORY=2048
DISK_SIZE="4"
STORAGE="local-lvm"
TAGS="finance"

# Function to display header
header_info() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    Finance Assistant                        ║${NC}"
    echo -e "${BLUE}║                     LXC Installation                        ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# Function to display configuration
show_config() {
    echo -e "${CYAN}Configuration:${NC}"
    echo -e "  ${WHITE}Container ID:${NC} $CTID"
    echo -e "  ${WHITE}Hostname:${NC} $HOSTNAME"
    echo -e "  ${WHITE}IP Address:${NC} $IP"
    echo -e "  ${WHITE}Gateway:${NC} $GATEWAY"
    echo -e "  ${WHITE}CPU Cores:${NC} $CORES"
    echo -e "  ${WHITE}Memory:${NC} ${MEMORY}MB"
    echo -e "  ${WHITE}Disk Size:${NC} ${DISK_SIZE}GB"
    echo -e "  ${WHITE}Storage:${NC} $STORAGE"
    echo -e "  ${WHITE}Tags:${NC} $TAGS"
    echo
}

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${CROSS} This script must be run as root${NC}"
        exit 1
    fi
}

# Function to check storage
check_storage() {
    echo -e "${INFO} Checking storage availability...${NC}"
    
    # Check if storage pool exists
    if ! pvesm status | grep -q "$STORAGE"; then
        echo -e "${CROSS} Storage pool '$STORAGE' not found${NC}"
        echo -e "${INFO} Available storage pools:${NC}"
        pvesm status | grep -v "local" | awk '{print "  " $1}'
        exit 1
    fi
    
    # Get available space
    AVAILABLE=$(pvesm status | grep "$STORAGE" | awk '{print $3}' | sed 's/G//')
    if [[ $AVAILABLE -lt $DISK_SIZE ]]; then
        echo -e "${WARN} Warning: Only ${AVAILABLE}GB available, need ${DISK_SIZE}GB${NC}"
        echo -e "${INFO} Continue anyway? (y/N):${NC} "
        read -r response
        if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo -e "${CROSS} Installation cancelled${NC}"
            exit 1
        fi
    fi
    
    echo -e "${CHECK} Storage validation passed${NC}"
}

# Function to check if CTID is available
check_ctid() {
    if pct list | grep -q "^$CTID "; then
        echo -e "${WARN} Container ID $CTID already exists${NC}"
        echo -e "${INFO} Use next available ID? (Y/n):${NC} "
        read -r response
        if [[ "$response" =~ ^([nN][oO]|[nN])$ ]]; then
            echo -e "${CROSS} Installation cancelled${NC}"
            exit 1
        fi
        
        # Find next available CTID
        CTID=$(pct list | awk 'NR>1 {print $1}' | sort -n | tail -1 | awk '{print $1+1}')
        echo -e "${INFO} Using Container ID: $CTID${NC}"
    fi
}

# Function to confirm installation
confirm_installation() {
    echo -e "${YELLOW}Proceed with installation? (Y/n):${NC} "
    read -r response
    if [[ "$response" =~ ^([nN][oO]|[nN])$ ]]; then
        echo -e "${CROSS} Installation cancelled${NC}"
        exit 1
    fi
}

# Function to create container
create_container() {
    echo -e "${INFO} Creating LXC container...${NC}"
    
    pct create $CTID local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
        --hostname $HOSTNAME \
        --memory $MEMORY \
        --cores $CORES \
        --rootfs $STORAGE:$DISK_SIZE \
        --net0 name=eth0,bridge=vmbr0,ip=$IP,gw=$GATEWAY \
        --unprivileged 0 \
        --features nesting=1 \
        --tags $TAGS
    
    echo -e "${CHECK} Container created successfully${NC}"
}

# Function to start container
start_container() {
    echo -e "${INFO} Starting container...${NC}"
    pct start $CTID
    sleep 10
    
    # Wait for network
    echo -e "${INFO} Waiting for network...${NC}"
    for i in {1..30}; do
        if pct exec $CTID -- ping -c 1 8.8.8.8 >/dev/null 2>&1; then
            echo -e "${CHECK} Network is reachable${NC}"
            break
        fi
        sleep 2
    done
    
    echo -e "${CHECK} Container started successfully${NC}"
}

# Function to install Finance Assistant
install_finance_assistant() {
    echo -e "${INFO} Installing Finance Assistant...${NC}"
    
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
    
    echo -e "${CHECK} Finance Assistant installed successfully${NC}"
}

# Function to display completion message
show_completion() {
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Installation Complete!                    ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${CYAN}Access your Finance Assistant at:${NC}"
    echo -e "${GREEN}  http://192.168.1.150:8080${NC}"
    echo
    echo -e "${CYAN}Container Management:${NC}"
    echo -e "  ${YELLOW}Start:${NC}  pct start $CTID"
    echo -e "  ${YELLOW}Stop:${NC}   pct stop $CTID"
    echo -e "  ${YELLOW}Shell:${NC}  pct enter $CTID"
    echo -e "  ${YELLOW}Status:${NC} pct status $CTID"
    echo
    echo -e "${GREEN}Finance Assistant is now running! 🚀${NC}"
}

# Main execution
main() {
    header_info
    check_root
    show_config
    check_storage
    check_ctid
    confirm_installation
    
    create_container
    start_container
    install_finance_assistant
    show_completion
}

# Run main function
main "$@" 