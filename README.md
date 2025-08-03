# Finance Assistant - Standalone Deployment

A comprehensive financial management system that can be deployed as a standalone service in LXC containers on Proxmox servers.

## Quick Start

### One-Line Installation

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/chbarnhouse/finance-assistant/main/install.sh)"
```

### Manual Installation

```bash
# Download and run the installation script
curl -fsSL https://raw.githubusercontent.com/chbarnhouse/finance-assistant/main/install/financeassistant.sh | bash
```

## System Requirements

- **Proxmox VE**: 7.0 or higher
- **LXC Container**: Debian 12 template
- **Resources**:
  - CPU: 2 cores minimum
  - RAM: 4GB minimum
  - Storage: 6GB minimum
- **Network**: Internet access for installation

## Architecture

- **Backend**: Django + Gunicorn (127.0.0.1:8000)
- **Frontend**: React (served by Nginx)
- **Database**: SQLite (/data/finance_assistant.db)
- **Web Server**: Nginx (0.0.0.0:8080)
- **Services**: systemd managed

## Installation Process

The installation script automatically:

1. **Creates LXC Container**: Sets up container with proper configuration
2. **Installs Dependencies**: curl, git, python3, nodejs, nginx
3. **Clones Repository**: Downloads Finance Assistant code
4. **Builds Frontend**: Compiles React application
5. **Sets Up Backend**: Python virtual environment and Django
6. **Configures Services**: systemd services for finance-assistant and nginx
7. **Enables Services**: Starts and enables all services

## Access Information

After installation, Finance Assistant will be available at:

- **Web Interface**: http://[CONTAINER_IP]:8080
- **API Endpoints**: http://[CONTAINER_IP]:8080/api/
- **SSH Access**: Available with root password

## Update Process

### Automatic Updates

To update Finance Assistant to the latest version:

```bash
# Enter the container
pct enter [CONTAINER_ID]

# Run the update script
/opt/finance-assistant/install/update.sh
```

### Manual Updates

If you prefer manual updates:

```bash
# Enter the container
pct enter [CONTAINER_ID]

# Stop services
systemctl stop finance-assistant nginx

# Update code
cd /opt/finance-assistant
git fetch origin
git reset --hard origin/main

# Update dependencies
/opt/finance-assistant/venv/bin/pip install --upgrade -r requirements.txt
cd frontend && npm install && npm run build

# Update backend
cd /opt/finance-assistant/backend
/opt/finance-assistant/venv/bin/python manage.py migrate
/opt/finance-assistant/venv/bin/python manage.py collectstatic --no-input

# Restart services
systemctl start finance-assistant nginx
```

## Maintenance

### Service Management

```bash
# Check service status
systemctl status finance-assistant
systemctl status nginx

# Restart services
systemctl restart finance-assistant
systemctl restart nginx

# View logs
journalctl -u finance-assistant -f
journalctl -u nginx -f
```

### Database Management

```bash
# Backup database
cp /data/finance_assistant.db /data/finance_assistant.db.backup

# Restore database
cp /data/finance_assistant.db.backup /data/finance_assistant.db
chown finance:finance /data/finance_assistant.db
```

### Logs and Debugging

```bash
# View application logs
tail -f /var/log/nginx/error.log
journalctl -u finance-assistant -f

# Check port usage
ss -tlnp | grep :8080
ss -tlnp | grep :8000

# Test connectivity
curl -v http://localhost:8080
curl -v http://localhost:8000/api/
```

## Configuration

### Environment Variables

The system uses the following environment variables:

- `DATABASE_PATH`: Path to SQLite database (default: /data/finance_assistant.db)
- `DEBUG`: Django debug mode (default: False in production)

### Nginx Configuration

The Nginx configuration is located at:

- `/etc/nginx/sites-available/finance-assistant`
- `/etc/nginx/sites-enabled/finance-assistant`

### Service Configuration

Service configurations are located at:

- `/etc/systemd/system/finance-assistant.service`

## Troubleshooting

### Common Issues

1. **Service won't start**

   ```bash
   # Check logs
   journalctl -u finance-assistant -n 50

   # Check permissions
   ls -la /opt/finance-assistant/
   ls -la /data/
   ```

2. **Frontend not loading**

   ```bash
   # Check Nginx configuration
   nginx -t

   # Check if frontend files exist
   ls -la /opt/finance-assistant/frontend/dist/
   ```

3. **Database errors**

   ```bash
   # Check database permissions
   ls -la /data/finance_assistant.db

   # Run migrations manually
   cd /opt/finance-assistant/backend
   /opt/finance-assistant/venv/bin/python manage.py migrate
   ```

### Reset Installation

If you need to completely reset the installation:

```bash
# Stop and disable services
systemctl stop finance-assistant nginx
systemctl disable finance-assistant nginx

# Remove installation
rm -rf /opt/finance-assistant
rm -f /etc/systemd/system/finance-assistant.service
rm -f /etc/nginx/sites-enabled/finance-assistant

# Reload systemd
systemctl daemon-reload

# Reinstall using the installation script
curl -fsSL https://raw.githubusercontent.com/chbarnhouse/finance-assistant/main/install/financeassistant.sh | bash
```

## Development Workflow

### Local Development

1. **Make changes** to the codebase
2. **Test locally** using the development environment
3. **Commit and push** to the repository
4. **Update production** using the update script

### Testing Updates

Before updating production:

1. **Test in development environment**
2. **Create backup** of production data
3. **Run update script** during maintenance window
4. **Verify functionality** after update

## Security Considerations

- **Firewall**: Ensure port 8080 is properly configured
- **SSL**: Consider adding SSL/TLS certificates for production use
- **Updates**: Regularly update the system and dependencies
- **Backups**: Maintain regular backups of the database

## Support

For issues and questions:

- **Repository**: https://github.com/chbarnhouse/finance-assistant
- **Issues**: Create an issue on GitHub
- **Documentation**: Check the main project documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details.
