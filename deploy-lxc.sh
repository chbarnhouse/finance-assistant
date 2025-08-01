#!/bin/bash
set -e

echo "🚀 Deploying Finance Assistant directly in LXC container"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root in the LXC container"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install system dependencies
echo "🔧 Installing system dependencies..."
apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    nginx \
    nodejs \
    npm \
    git \
    curl \
    supervisor \
    sqlite3

# Create application user
echo "👤 Creating application user..."
if ! id "finance" &>/dev/null; then
    useradd -m -s /bin/bash finance
fi

# Create application directory
echo "📁 Setting up application directory..."
mkdir -p /opt/finance-assistant
chown finance:finance /opt/finance-assistant

# Switch to finance user for application setup
echo "🔧 Setting up Python environment..."
sudo -u finance bash << 'EOF'
cd /opt/finance-assistant

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install gunicorn django djangorestframework django-cors-headers django-filter

# Clone or copy application files
# Note: You'll need to copy the backend and frontend files here
# For now, we'll create a placeholder structure
mkdir -p backend frontend/dist logs data

# Create basic Django project structure
django-admin startproject finance_assistant backend/
cd backend
python manage.py startapp api
python manage.py startapp data
python manage.py startapp ynab
python manage.py startapp lookups
python manage.py startapp accounts
python manage.py startapp fa_budget
python manage.py startapp query_engine
python manage.py startapp fa_ynab_sync
EOF

# Create nginx configuration
echo "🌐 Configuring nginx..."
cat > /etc/nginx/sites-available/finance-assistant << 'EOF'
server {
    listen 8080 default_server;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Disable caching for dynamic content
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    expires -1;

    # Root directory for static files
    root /opt/finance-assistant/frontend/dist;

    # API endpoints - bypass basic auth with API key
    location /api/ {
        # Check for API key in headers
        if ($http_x_api_key != $env_API_KEY) {
            return 401;
        }

        # Rate limiting for API
        limit_req zone=api burst=20 nodelay;

        # Proxy to Django backend
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Handle large request bodies
        client_max_body_size 10M;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # All other requests - require basic authentication
    location / {
        # Basic authentication
        auth_basic "Finance Assistant";
        auth_basic_user_file /opt/finance-assistant/.htpasswd;

        # Try to serve static files first
        try_files $uri $uri/ /index.html;

        # Security for static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check endpoint (no auth required)
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/finance-assistant /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Create supervisor configuration
echo "⚙️ Configuring supervisor..."
cat > /etc/supervisor/conf.d/finance-assistant.conf << 'EOF'
[program:finance-assistant]
command=/opt/finance-assistant/venv/bin/gunicorn finance_assistant.wsgi:application --bind 127.0.0.1:8000 --workers 3 --timeout 120 --access-logfile /opt/finance-assistant/logs/gunicorn_access.log --error-logfile /opt/finance-assistant/logs/gunicorn_error.log --log-level info
directory=/opt/finance-assistant/backend
user=finance
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/opt/finance-assistant/logs/supervisor.log
EOF

# Create startup script
echo "📜 Creating startup script..."
cat > /opt/finance-assistant/startup.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting Finance Assistant..."

# Create data directory if it doesn't exist
mkdir -p /opt/finance-assistant/data

# Generate htpasswd file if it doesn't exist
if [ ! -f /opt/finance-assistant/.htpasswd ]; then
    echo "Creating default htpasswd file..."
    echo "admin:\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi" > /opt/finance-assistant/.htpasswd
    echo "Default credentials: admin / password"
    echo "Please change these credentials after first login!"
fi

# Change to backend directory
cd /opt/finance-assistant/backend

# Activate virtual environment
source /opt/finance-assistant/venv/bin/activate

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --no-input

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --no-input

# Populate default data
echo "Populating default data..."
python manage.py populate_defaults

# Populate lookup tables
echo "Populating lookup tables..."
python populate_data.py

echo "Finance Assistant startup completed!"
EOF

chmod +x /opt/finance-assistant/startup.sh
chown finance:finance /opt/finance-assistant/startup.sh

# Create systemd service
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/finance-assistant.service << 'EOF'
[Unit]
Description=Finance Assistant
After=network.target

[Service]
Type=forking
User=finance
Group=finance
WorkingDirectory=/opt/finance-assistant
ExecStart=/opt/finance-assistant/startup.sh
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Set up log rotation
echo "📋 Setting up log rotation..."
cat > /etc/logrotate.d/finance-assistant << 'EOF'
/opt/finance-assistant/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 finance finance
}
EOF

# Create environment file
echo "📝 Creating environment configuration..."
cat > /opt/finance-assistant/.env << 'EOF'
# Finance Assistant Environment Configuration
SECRET_KEY=your-secret-key-change-this-in-production
DEBUG=False
YNAB_API_KEY=your-ynab-api-key-here
YNAB_BUDGET_ID=your-ynab-budget-id-here
API_KEY=your-api-key-for-home-assistant-integration
DATABASE_PATH=/opt/finance-assistant/data/finance_assistant.db
ALLOWED_HOSTS=*
EOF

chown finance:finance /opt/finance-assistant/.env

# Start services
echo "🚀 Starting services..."
systemctl daemon-reload
systemctl enable finance-assistant
systemctl start finance-assistant
systemctl enable nginx
systemctl start nginx
systemctl enable supervisor
systemctl start supervisor

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 8080/tcp
ufw --force enable

echo ""
echo "✅ Finance Assistant deployed successfully!"
echo ""
echo "🌐 Access your Finance Assistant at:"
echo "   http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "🔐 Default credentials:"
echo "   Username: admin"
echo "   Password: password"
echo ""
echo "⚠️  IMPORTANT: Change the default password after first login!"
echo ""
echo "📊 View logs with:"
echo "   journalctl -u finance-assistant -f"
echo "   tail -f /opt/finance-assistant/logs/*.log"
echo ""
echo "🛑 Stop service with:"
echo "   systemctl stop finance-assistant"