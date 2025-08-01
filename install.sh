#!/bin/bash
set -e

# Finance Assistant Installation Script
# Simple one-step installation for Proxmox LXC containers

echo "🚀 Finance Assistant Installation Script"
echo "========================================"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo "❌ This script must be run as root"
    exit 1
fi

# Check if Proxmox is installed
if ! command -v pct &> /dev/null; then
    echo "❌ Proxmox Container Toolkit (pct) not found. This script must be run on a Proxmox host."
    exit 1
fi

# Default values
CTID=113
HOSTNAME="financeassistant"
IP="192.168.1.150"
GATEWAY="192.168.1.1"
STORAGE="local-lvm"
CORES=2
MEMORY=2048
SWAP=2048
DISK_SIZE=20

echo "📋 Configuration:"
echo "  Container ID: $CTID"
echo "  Hostname: $HOSTNAME"
echo "  IP Address: $IP"
echo "  Gateway: $GATEWAY"
echo "  Storage: $STORAGE"
echo "  CPU Cores: $CORES"
echo "  Memory: ${MEMORY}MB"
echo "  Swap: ${SWAP}MB"
echo "  Disk Size: ${DISK_SIZE}GB"
echo ""

read -p "Proceed with installation? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
fi

echo "🔧 Creating LXC container..."

# Create the container
pct create $CTID local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst \
    --hostname $HOSTNAME \
    --memory $MEMORY \
    --swap $SWAP \
    --cores $CORES \
    --rootfs $STORAGE:$DISK_SIZE \
    --net0 name=eth0,bridge=vmbr0,ip=$IP/24,gw=$GATEWAY \
    --features nesting=1 \
    --unprivileged 1 \
    --start 1

echo "✅ Container created and started!"

echo "⏳ Waiting for container to be ready..."
sleep 15

echo "📦 Installing dependencies..."

# Install dependencies
pct exec $CTID -- bash -c "
    apt update && apt upgrade -y
    apt install -y curl wget git python3 python3-pip python3-venv nginx nodejs npm supervisor sqlite3
"

echo "🚀 Deploying Finance Assistant..."

# Deploy Finance Assistant
pct exec $CTID -- bash -c "
    curl -fsSL https://raw.githubusercontent.com/chbarnhouse/finance-assistant/main/deploy-lxc.sh | bash
"

echo ""
echo "========================================"
echo "✅ Finance Assistant Installation Complete!"
echo "========================================"
echo ""
echo "🌐 Access your Finance Assistant at:"
echo "   http://$IP:8080"
echo ""
echo "🔐 Default credentials:"
echo "   Username: admin"
echo "   Password: password"
echo ""
echo "⚠️  IMPORTANT: Change the default password after first login!"
echo ""
echo "📊 Container Management:"
echo "   View logs: pct exec $CTID -- journalctl -u finance-assistant -f"
echo "   Stop container: pct stop $CTID"
echo "   Start container: pct start $CTID"
echo "   Access console: pct enter $CTID"
echo ""
echo "🔧 Configuration:"
echo "   Edit environment: pct exec $CTID -- nano /opt/finance-assistant/.env"
echo "   View logs: pct exec $CTID -- tail -f /opt/finance-assistant/logs/*.log"
echo ""
echo "🎉 Enjoy your Finance Assistant!"