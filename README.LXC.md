# Finance Assistant - Direct LXC Deployment

Deploy Finance Assistant directly in a Proxmox LXC container without Docker overhead. This approach is more efficient and gives you direct control over the system.

## 🎯 **Why Direct LXC Deployment?**

### **Advantages:**

- ✅ **Lower Resource Usage**: No Docker overhead
- ✅ **Direct System Access**: Full control over the container
- ✅ **Simpler Debugging**: Direct access to logs and processes
- ✅ **Better Performance**: Native Python and nginx installation
- ✅ **Easier Backup**: Direct file system access
- ✅ **System Integration**: Native systemd services

### **Architecture:**

```
Proxmox LXC Container
├── Python 3.11 + Virtual Environment
├── Django Backend (Gunicorn)
├── React Frontend (Built)
├── Nginx Web Server
├── SQLite Database
└── Systemd Services
```

## 🚀 **Quick Deployment**

### **Step 1: Create LXC Container**

**In Proxmox Web UI:**

1. Right-click your node → "Create CT"
2. **Template**: `ubuntu-22.04-standard`
3. **Resources**:
   - **Memory**: 4GB (minimum 2GB)
   - **Storage**: 20GB
   - **CPU**: 2 cores
   - **Network**: DHCP or static IP
4. **Start container after creation**: ✅

### **Step 2: Deploy Finance Assistant**

**Connect to your LXC container:**

```bash
# Via SSH (if configured)
ssh root@your-container-ip

# Or via Proxmox console
# In Proxmox Web UI: Container → Console
```

**Run the deployment script:**

```bash
# Download and run deployment script
curl -fsSL https://raw.githubusercontent.com/your-repo/finance_assistant/main/deploy-lxc.sh | bash
```

**Or manually:**

```bash
# Clone repository
git clone <your-repo-url>
cd finance_assistant

# Run deployment
./deploy-lxc.sh
```

### **Step 3: Access Your Service**

- **URL**: `http://your-container-ip:8080`
- **Credentials**: `admin` / `password`
- **⚠️ Change password after first login!**

## 🔧 **Manual Deployment (Step-by-Step)**

If you prefer to deploy manually or customize the process:

### **1. System Setup**

```bash
# Update system
apt update && apt upgrade -y

# Install dependencies
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
```

### **2. Create Application User**

```bash
# Create dedicated user
useradd -m -s /bin/bash finance

# Create application directory
mkdir -p /opt/finance-assistant
chown finance:finance /opt/finance-assistant
```

### **3. Set Up Python Environment**

```bash
# Switch to finance user
sudo -u finance bash

# Create virtual environment
cd /opt/finance-assistant
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install gunicorn django djangorestframework django-cors-headers django-filter

# Exit finance user shell
exit
```

### **4. Deploy Application Code**

```bash
# Clone repository
cd /opt/finance-assistant
git clone <your-repo-url> temp
cp -r temp/backend ./
cp -r temp/frontend ./
rm -rf temp

# Set ownership
chown -R finance:finance /opt/finance-assistant
```

### **5. Build Frontend**

```bash
# Switch to finance user
sudo -u finance bash
cd /opt/finance-assistant/frontend

# Install dependencies and build
npm install
npm run build

# Exit finance user shell
exit
```

### **6. Configure Services**

**Nginx Configuration:**

```bash
# Copy nginx configuration
cp /opt/finance-assistant/nginx-site.conf /etc/nginx/sites-available/finance-assistant
ln -sf /etc/nginx/sites-available/finance-assistant /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
```

**Systemd Service:**

```bash
# Create service file
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
```

### **7. Initialize Application**

```bash
# Switch to finance user
sudo -u finance bash
cd /opt/finance-assistant/backend

# Activate virtual environment
source /opt/finance-assistant/venv/bin/activate

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input

# Populate data
python manage.py populate_defaults
python populate_data.py

# Exit finance user shell
exit
```

### **8. Start Services**

```bash
# Enable and start services
systemctl daemon-reload
systemctl enable finance-assistant
systemctl start finance-assistant
systemctl enable nginx
systemctl start nginx

# Configure firewall
ufw allow 8080/tcp
ufw --force enable
```

## 📁 **Directory Structure**

```
/opt/finance-assistant/
├── backend/                 # Django application
│   ├── finance_assistant/   # Django project
│   ├── api/                # API app
│   ├── data/               # Data app
│   ├── ynab/               # YNAB app
│   ├── manage.py           # Django management
│   └── requirements.txt    # Python dependencies
├── frontend/               # React application
│   ├── src/               # Source code
│   ├── dist/              # Built files
│   └── package.json       # Node dependencies
├── venv/                  # Python virtual environment
├── data/                  # Database and data files
│   └── finance_assistant.db
├── logs/                  # Application logs
├── .env                   # Environment variables
├── .htpasswd             # Web authentication
└── startup.sh            # Startup script
```

## 🔄 **Management Commands**

### **Service Management**

```bash
# Start service
systemctl start finance-assistant

# Stop service
systemctl stop finance-assistant

# Restart service
systemctl restart finance-assistant

# Check status
systemctl status finance-assistant

# Enable auto-start
systemctl enable finance-assistant
```

### **Logs**

```bash
# Application logs
journalctl -u finance-assistant -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application logs
tail -f /opt/finance-assistant/logs/*.log
```

### **Database Management**

```bash
# Backup database
cp /opt/finance-assistant/data/finance_assistant.db /backup/

# Restore database
cp /backup/finance_assistant.db /opt/finance-assistant/data/
chown finance:finance /opt/finance-assistant/data/finance_assistant.db
systemctl restart finance-assistant
```

### **Updates**

```bash
# Update application code
cd /opt/finance-assistant
git pull

# Update Python dependencies
sudo -u finance bash
source venv/bin/activate
pip install -r backend/requirements.txt

# Update frontend
cd frontend
npm install
npm run build

# Restart services
systemctl restart finance-assistant
```

## 🔒 **Security Configuration**

### **Change Default Password**

```bash
# Generate new password hash
htpasswd -c /opt/finance-assistant/.htpasswd admin

# Or manually edit
nano /opt/finance-assistant/.htpasswd
```

### **Update API Key**

```bash
# Edit environment file
nano /opt/finance-assistant/.env

# Update API_KEY value
# Restart service
systemctl restart finance-assistant
```

### **Firewall Configuration**

```bash
# Allow only specific IPs (optional)
ufw allow from 192.168.1.0/24 to any port 8080

# Or restrict to specific IP
ufw deny 8080
ufw allow from 192.168.1.100 to any port 8080
```

## 🛠️ **Troubleshooting**

### **Service Won't Start**

```bash
# Check service status
systemctl status finance-assistant

# Check logs
journalctl -u finance-assistant -n 50

# Check if port is in use
netstat -tlnp | grep 8080
```

### **Database Issues**

```bash
# Check database file
ls -la /opt/finance-assistant/data/

# Check permissions
ls -la /opt/finance-assistant/data/finance_assistant.db

# Reset database (WARNING: loses data)
rm /opt/finance-assistant/data/finance_assistant.db
systemctl restart finance-assistant
```

### **Permission Issues**

```bash
# Fix ownership
chown -R finance:finance /opt/finance-assistant

# Fix permissions
chmod 755 /opt/finance-assistant
chmod 644 /opt/finance-assistant/.env
chmod 600 /opt/finance-assistant/.htpasswd
```

### **Nginx Issues**

```bash
# Check nginx configuration
nginx -t

# Check nginx status
systemctl status nginx

# Check nginx logs
tail -f /var/log/nginx/error.log
```

## 📊 **Monitoring**

### **Resource Usage**

```bash
# Check memory usage
free -h

# Check disk usage
df -h

# Check CPU usage
top

# Check specific process
ps aux | grep gunicorn
```

### **Health Check**

```bash
# Test health endpoint
curl http://localhost:8080/health

# Test web interface
curl -I http://localhost:8080/

# Test API endpoint
curl -H "X-API-Key: your-api-key" http://localhost:8080/api/accounts/
```

## 🔮 **Advanced Configuration**

### **SSL/HTTPS Setup**

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d finance.yourdomain.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Reverse Proxy Setup**

If you want to run behind a reverse proxy:

```nginx
# On your main nginx server
server {
    listen 443 ssl;
    server_name finance.yourdomain.com;

    location / {
        proxy_pass http://your-container-ip:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **Backup Automation**

```bash
# Create backup script
cat > /opt/finance-assistant/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/finance-assistant"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp /opt/finance-assistant/data/finance_assistant.db $BACKUP_DIR/finance_assistant_$DATE.db
cp /opt/finance-assistant/.env $BACKUP_DIR/env_$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "env_*" -mtime +7 -delete
EOF

chmod +x /opt/finance-assistant/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/finance-assistant/backup.sh
```

---

**🎯 Your Finance Assistant is now running efficiently in a direct LXC container!**
