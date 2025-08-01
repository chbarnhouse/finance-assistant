#!/usr/bin/env bash

# Finance Assistant Installation Script
# This script is called by the community-scripts framework

set -e

# Install dependencies
apt-get update -qq >/dev/null
apt-get install -y curl wget git python3 python3-pip python3-venv nodejs npm nginx supervisor >/dev/null

# Create finance user
useradd -m -s /bin/bash finance >/dev/null

# Create application directory
mkdir -p /opt/finance-assistant
chown finance:finance /opt/finance-assistant

# Clone repository
cd /opt/finance-assistant
git clone https://github.com/chbarnhouse/finance-assistant.git temp >/dev/null
cp -r temp/backend ./
cp -r temp/frontend ./
rm -rf temp
chown -R finance:finance /opt/finance-assistant

# Set up Python environment
cd /opt/finance-assistant
sudo -u finance python3 -m venv venv >/dev/null
sudo -u finance /opt/finance-assistant/venv/bin/pip install --upgrade pip >/dev/null
sudo -u finance /opt/finance-assistant/venv/bin/pip install gunicorn django djangorestframework django-cors-headers django-filter >/dev/null

# Build frontend
cd /opt/finance-assistant/frontend
sudo -u finance npm install >/dev/null
sudo -u finance npm run build >/dev/null

# Initialize Django
cd /opt/finance-assistant/backend
sudo -u finance /opt/finance-assistant/venv/bin/python manage.py migrate >/dev/null
sudo -u finance /opt/finance-assistant/venv/bin/python manage.py collectstatic --no-input >/dev/null
sudo -u finance /opt/finance-assistant/venv/bin/python populate_data.py >/dev/null

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
        return 200 'healthy\n';
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
ufw allow 8080/tcp >/dev/null
ufw --force enable >/dev/null

echo "Finance Assistant installation completed successfully!"