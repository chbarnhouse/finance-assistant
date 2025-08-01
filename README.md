# Finance Assistant - Standalone

A comprehensive financial tracker with deep YNAB integration, designed to run as a standalone service in containers, VMs, or on bare metal.

## 🚀 Quick Start

### Deploy in LXC Container (Recommended)

#### Option 1: GUI Installation (Community Script Style)
```bash
# Interactive GUI installation with colors and progress indicators
bash -c "$(curl -fsSL https://raw.githubusercontent.com/chbarnhouse/finance-assistant/main/install-gui.sh)"
```

#### Option 2: Simple Installation
```bash
# Simple one-line installation
bash -c "$(curl -fsSL https://raw.githubusercontent.com/chbarnhouse/finance-assistant/main/install.sh)"
```

### Deploy with Docker

```bash
# Clone the repository
git clone https://github.com/chbarnhouse/finance-assistant.git
cd finance-assistant

# Configure environment
cp env.example .env
# Edit .env with your settings

# Deploy
./deploy.sh
```

## 🌐 Access

- **URL**: `http://your-server-ip:8080`
- **Default credentials**: `admin` / `password`
- **⚠️ Change password after first login!**

## 📚 Documentation

- [LXC Deployment Guide](README.LXC.md) - Complete guide for Proxmox LXC containers
- [Standalone Deployment Guide](README.standalone.md) - Docker and general deployment
- [Migration Guide](STANDALONE_MIGRATION.md) - From Home Assistant addon to standalone

## 🔧 Features

- **Dual Authentication**: Web interface (username/password) + API (API key)
- **YNAB Integration**: Deep integration with You Need A Budget
- **Query Engine**: Custom data queries and reporting
- **Network Access**: Accessible from your entire local network
- **Data Persistence**: SQLite database with easy backup/restore
- **Security**: Rate limiting, security headers, and authentication

## 🔌 Home Assistant Integration

This standalone service is designed to work with a separate Home Assistant integration that connects via API.

## 📄 License

[Your License Here]

## 🤝 Support

For issues and questions, please check the documentation or create an issue in the repository.
