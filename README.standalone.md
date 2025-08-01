# Finance Assistant - Standalone Deployment

A comprehensive financial tracker with deep YNAB integration, now available as a standalone service that can run in LXC containers, Docker, or any containerized environment.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Access to your Proxmox server
- YNAB API key (optional, for YNAB integration)

### 1. Clone and Configure
```bash
# Clone the repository
git clone <your-repo-url>
cd finance_assistant

# Copy and configure environment
cp env.example .env
# Edit .env with your settings
```

### 2. Deploy
```bash
# Run the deployment script
./deploy.sh
```

### 3. Access
- **URL**: http://your-server-ip:8080
- **Default credentials**: admin / password
- **⚠️ Change password after first login!**

## 🔧 Configuration

### Environment Variables (.env file)

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | `your-secret-key-change-this` |
| `DEBUG` | Debug mode | `False` |
| `YNAB_API_KEY` | Your YNAB API key | (empty) |
| `YNAB_BUDGET_ID` | Your YNAB budget ID | (empty) |
| `API_KEY` | API key for Home Assistant | `your-api-key-for-home-assistant` |
| `DATABASE_PATH` | Database file path | `/app/data/finance_assistant.db` |

### Security Features

#### 1. Basic Authentication (Web Interface)
- Username/password required for web access
- Default: `admin` / `password`
- Change credentials by editing `/app/.htpasswd` in the container

#### 2. API Key Authentication (Home Assistant Integration)
- API endpoints require `X-API-Key` header
- Configure in `.env` file
- Used by Home Assistant integration for automated access

#### 3. Rate Limiting
- API endpoints: 10 requests/second with burst of 20
- Protects against abuse

## 📁 Data Persistence

### Database
- **Location**: `/opt/finance-assistant/data/finance_assistant.db`
- **Type**: SQLite
- **Backup**: Copy the `.db` file to backup location

### Logs
- **Location**: `/opt/finance-assistant/logs/`
- **Files**: 
  - `nginx_access.log` - Web server access logs
  - `nginx_error.log` - Web server error logs
  - `gunicorn_access.log` - Application access logs
  - `gunicorn_error.log` - Application error logs

## 🔄 Management Commands

### Start/Stop
```bash
# Start service
docker-compose up -d

# Stop service
docker-compose down

# View logs
docker-compose logs -f

# Restart service
docker-compose restart
```

### Backup/Restore
```bash
# Backup database
cp /opt/finance-assistant/data/finance_assistant.db /backup/

# Restore database
cp /backup/finance_assistant.db /opt/finance-assistant/data/
docker-compose restart
```

### Update
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

## 🌐 Network Access

### Local Network
- Accessible from any device on your local network
- URL: `http://your-server-ip:8080`
- Port 8080 must be open on your firewall

### Proxmox LXC Container
1. Create Ubuntu/Debian LXC container
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Clone repository and deploy
4. Configure port forwarding if needed

### Reverse Proxy (Optional)
For HTTPS access, configure a reverse proxy (nginx, traefik, etc.):

```nginx
server {
    listen 443 ssl;
    server_name finance.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔌 Home Assistant Integration

The standalone service is designed to work with a separate Home Assistant integration:

1. **API Access**: Home Assistant uses API key authentication
2. **Endpoints**: All `/api/*` endpoints available
3. **Configuration**: Set API key and service URL in Home Assistant

### Example Home Assistant Configuration
```yaml
# configuration.yaml
finance_assistant:
  api_url: http://192.168.1.100:8080
  api_key: your-api-key-here
```

## 🛠️ Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs

# Check if port 8080 is available
netstat -tlnp | grep 8080

# Check data directory permissions
ls -la /opt/finance-assistant/
```

### Can't Access Web Interface
1. Check if service is running: `docker-compose ps`
2. Verify port is open: `curl http://localhost:8080/health`
3. Check firewall settings
4. Verify credentials in `.htpasswd`

### Database Issues
```bash
# Check database file
ls -la /opt/finance-assistant/data/

# Reset database (WARNING: loses all data)
rm /opt/finance-assistant/data/finance_assistant.db
docker-compose restart
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:8080/health
# Returns: "healthy"
```

### Log Monitoring
```bash
# Follow all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f finance-assistant
```

## 🔒 Security Best Practices

1. **Change default password** immediately after deployment
2. **Use strong API keys** for Home Assistant integration
3. **Keep system updated** with security patches
4. **Backup regularly** your database and configuration
5. **Use HTTPS** in production (configure reverse proxy)
6. **Restrict network access** if not needed from entire network

## 📝 License

[Your License Here]

## 🤝 Support

For issues and questions:
- Check the troubleshooting section above
- Review logs for error messages
- Create an issue in the repository 