#!/usr/bin/env bash

# Finance Assistant GUI Installation Script
# This script uses whiptail like the community scripts

set -e

# Check if whiptail is available
if ! command -v whiptail >/dev/null 2>&1; then
    echo "whiptail is required but not installed. Installing..."
    apt update && apt install -y whiptail
fi

# Colors and formatting (for non-whiptail output)
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
TAGS="finance"

# Function to display header
header_info() {
    clear
    whiptail --backtitle "Proxmox VE Helper Scripts" \
        --title "Finance Assistant Installation" \
        --msgbox "Welcome to Finance Assistant LXC Installation\n\nThis script will create and configure a Finance Assistant container on your Proxmox server." \
        10 60
}

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        whiptail --backtitle "Proxmox VE Helper Scripts" \
            --title "Error" \
            --msgbox "This script must be run as root" \
            8 50
        exit 1
    fi
}

# Function to check storage
check_storage() {
    # Debug: Show all storage info first
    echo "DEBUG: All storage pools:" >&2
    pvesm status >&2

    # Get available space properly - debug the command first
    STORAGE_INFO=$(pvesm status | grep "$STORAGE")
    echo "DEBUG: Storage info for '$STORAGE': $STORAGE_INFO" >&2

    if [[ -z "$STORAGE_INFO" ]]; then
        whiptail --backtitle "Proxmox VE Helper Scripts" \
            --title "Storage Error" \
            --msgbox "Storage pool '$STORAGE' not found or not accessible\n\nAvailable storage pools:\n$(pvesm status | awk '{print "  " $1}')" \
            12 70
        exit 1
    fi

            # Parse available space from pvesm status output
    # Format: Storage Type Total Used Available Used%
    AVAILABLE=$(echo "$STORAGE_INFO" | awk '{print $5}' | sed 's/G//' | sed 's/[^0-9.]//g')
    echo "DEBUG: Parsed available space: $AVAILABLE" >&2

    # If that didn't work, try parsing the 3rd column (Total)
    if [[ -z "$AVAILABLE" ]] || [[ "$AVAILABLE" == "0" ]]; then
        AVAILABLE=$(echo "$STORAGE_INFO" | awk '{print $3}' | sed 's/G//' | sed 's/[^0-9.]//g')
        echo "DEBUG: Trying 3rd column (Total), got: $AVAILABLE" >&2
    fi

    # Debug: show what we found
    if [[ -z "$AVAILABLE" ]] || [[ "$AVAILABLE" == "0" ]]; then
        whiptail --backtitle "Proxmox VE Helper Scripts" \
            --title "Storage Error" \
            --msgbox "Could not determine available space for storage pool '$STORAGE'\n\nStorage info: $STORAGE_INFO\n\nFull pvesm status:\n$(pvesm status)" \
            15 80
        exit 1
    fi

    echo "DEBUG: Final available space: ${AVAILABLE}GB" >&2

    if [[ $AVAILABLE -lt $DISK_SIZE ]]; then
        if ! whiptail --backtitle "Proxmox VE Helper Scripts" \
            --title "Storage Warning" \
            --yesno "Warning: Only ${AVAILABLE}GB available, need ${DISK_SIZE}GB\n\nContinue anyway?" \
            10 60; then
            exit 1
        fi
    fi
}

# Function to check if CTID is available
check_ctid() {
    if pct list | grep -q "^$CTID "; then
        if whiptail --backtitle "Proxmox VE Helper Scripts" \
            --title "Container ID Conflict" \
            --yesno "Container ID $CTID already exists.\n\nUse next available ID?" \
            10 50; then
            # Find next available CTID
            CTID=$(pct list | awk 'NR>1 {print $1}' | sort -n | tail -1 | awk '{print $1+1}')
        else
            exit 1
        fi
    fi
}

# Function to show configuration
show_config() {
    CONFIG_TEXT="Configuration:
Container ID: $CTID
Hostname: $HOSTNAME
IP Address: $IP
Gateway: $GATEWAY
CPU Cores: $CORES
Memory: ${MEMORY}MB
Disk Size: ${DISK_SIZE}GB
Storage: $STORAGE
Tags: $TAGS"

    if ! whiptail --backtitle "Proxmox VE Helper Scripts" \
        --title "Configuration" \
        --yesno "$CONFIG_TEXT\n\nProceed with installation?" \
        15 60; then
        exit 1
    fi
}

# Function to create container
create_container() {
    whiptail --backtitle "Proxmox VE Helper Scripts" \
        --title "Creating Container" \
        --infobox "Creating LXC container..." \
        8 50

    pct create $CTID local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
        --hostname $HOSTNAME \
        --memory $MEMORY \
        --cores $CORES \
        --rootfs $STORAGE:$DISK_SIZE \
        --net0 name=eth0,bridge=vmbr0,ip=$IP,gw=$GATEWAY \
        --unprivileged 0 \
        --features nesting=1 \
        --tags $TAGS
}

# Function to start container
start_container() {
    whiptail --backtitle "Proxmox VE Helper Scripts" \
        --title "Starting Container" \
        --infobox "Starting container..." \
        8 50

    pct start $CTID
    sleep 10

    # Wait for network
    whiptail --backtitle "Proxmox VE Helper Scripts" \
        --title "Waiting for Network" \
        --infobox "Waiting for network..." \
        8 50

    for i in {1..30}; do
        if pct exec $CTID -- ping -c 1 8.8.8.8 >/dev/null 2>&1; then
            break
        fi
        sleep 2
    done
}

# Function to install Finance Assistant
install_finance_assistant() {
    whiptail --backtitle "Proxmox VE Helper Scripts" \
        --title "Installing Finance Assistant" \
        --infobox "Installing Finance Assistant...\nThis may take several minutes." \
        10 60

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
          python3 -m venv venv
          /opt/finance-assistant/venv/bin/pip install --upgrade pip
          /opt/finance-assistant/venv/bin/pip install 'gunicorn<21.0' django djangorestframework django-cors-headers django-filter requests

          # Build frontend
          cd /opt/finance-assistant/frontend
          npm install
          npm run build

          # Create data directory and set permissions
          mkdir -p /data
          chown finance:finance /data

                    # Initialize Django
          cd /opt/finance-assistant/backend
          
          # Remove problematic migration if it exists
          if [ -f "ynab/migrations/0002_add_import_id_to_transaction.py" ]; then
              rm ynab/migrations/0002_add_import_id_to_transaction.py
          fi
          
          /opt/finance-assistant/venv/bin/python manage.py migrate
          /opt/finance-assistant/venv/bin/python manage.py collectstatic --no-input
          /opt/finance-assistant/venv/bin/python populate_data.py
          
          # Create Django views and URLs for root path
          echo 'from django.http import HttpResponse

def home(request):
    return HttpResponse("""
    <html>
    <head>
        <title>Finance Assistant</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; }
            .container { max-width: 800px; margin: 0 auto; }
            .api-section { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; }
            a { color: #007bff; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎉 Finance Assistant is Running!</h1>
            <p>The Django backend is working correctly.</p>
            
            <div class="api-section">
                <h2>📊 Available API Endpoints:</h2>
                <ul>
                    <li><a href="/api/">API Root</a></li>
                    <li><a href="/api/ynab/">YNAB Integration</a></li>
                    <li><a href="/api/lookups/">Lookup Tables</a></li>
                    <li><a href="/api/data/">Data Management</a></li>
                    <li><a href="/api/budget/">Budget Management</a></li>
                    <li><a href="/api/sync/">Sync Services</a></li>
                </ul>
            </div>
            
            <div class="api-section">
                <h2>🔧 Administration:</h2>
                <ul>
                    <li><a href="/admin/">Django Admin Interface</a></li>
                </ul>
            </div>
            
            <p><strong>Status:</strong> ✅ Backend API is operational</p>
        </div>
    </body>
    </html>
    """)' > finance_assistant/views.py

          # Update URL patterns to include root path
          echo 'from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("admin/", admin.site.urls),
    path("api/ynab/", include("ynab.urls")),
    path("api/lookups/", include("lookups.urls")),
    path("api/data/", include("data.urls")),
    path("api/budget/", include("fa_budget.urls")),
    #path("api/rewards/", include("credit_card_rewards.urls")), # Temporarily disabled
    path("api/sync/", include("fa_ynab_sync.urls")),
    path("api/", include("api.urls")),
]' > finance_assistant/urls.py

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

                  # Configure firewall (skip if ufw not available)
          if command -v ufw >/dev/null 2>&1; then
              ufw allow 8080/tcp
              ufw --force enable
          fi
    "
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

    whiptail --backtitle "Proxmox VE Helper Scripts" \
        --title "Installation Complete" \
        --msgbox "$COMPLETION_TEXT" \
        20 70
}

# Main execution
main() {
    header_info
    check_root
    check_storage
    check_ctid
    show_config

    create_container
    start_container
    install_finance_assistant
    show_completion
}

# Run main function
main "$@"