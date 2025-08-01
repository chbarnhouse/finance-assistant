#!/bin/bash
set -e

# Finance Assistant Proxmox LXC Installation Script
# Based on the Proxmox community scripts pattern

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script information
SCRIPT_NAME="Finance Assistant"
SCRIPT_VERSION="0.14.62"
SCRIPT_URL="https://github.com/chbarnhouse/finance-assistant"

# Default values
CTID=113
HOSTNAME="financeassistant"
IP="192.168.1.150"
GATEWAY="192.168.1.1"
DNS1="1.1.1.1"
DNS2="1.0.0.1"
STORAGE="local-lvm"
CORES=2
MEMORY=2048
SWAP=2048
DISK_SIZE=20
BRIDGE="vmbr0"
TEMPLATE="ubuntu-24.04-standard"
TEMPLATE_VERSION="24.04-2"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

# Function to check if Proxmox is installed
check_proxmox() {
    if ! command -v pct &> /dev/null; then
        print_error "Proxmox Container Toolkit (pct) not found. This script must be run on a Proxmox host."
        exit 1
    fi
}

# Function to check if template exists
check_template() {
    if ! pveam available | grep -q "$TEMPLATE"; then
        print_warning "Template $TEMPLATE not found. Attempting to download..."
        pveam update
        pveam download local "$TEMPLATE"
    fi
}

# Function to get user input
get_user_input() {
    print_status "Finance Assistant LXC Container Setup"
    echo "=========================================="
    echo ""
    
    read -p "Container ID (default: $CTID): " input_ctid
    CTID=${input_ctid:-$CTID}
    
    read -p "Hostname (default: $HOSTNAME): " input_hostname
    HOSTNAME=${input_hostname:-$HOSTNAME}
    
    read -p "IP Address (default: $IP): " input_ip
    IP=${input_ip:-$IP}
    
    read -p "Gateway (default: $GATEWAY): " input_gateway
    GATEWAY=${input_gateway:-$GATEWAY}
    
    read -p "Storage (default: $STORAGE): " input_storage
    STORAGE=${input_storage:-$STORAGE}
    
    read -p "CPU Cores (default: $CORES): " input_cores
    CORES=${input_cores:-$CORES}
    
    read -p "Memory in MB (default: $MEMORY): " input_memory
    MEMORY=${input_memory:-$MEMORY}
    
    read -p "Swap in MB (default: $SWAP): " input_swap
    SWAP=${input_swap:-$SWAP}
    
    read -p "Disk Size in GB (default: $DISK_SIZE): " input_disk
    DISK_SIZE=${input_disk:-$DISK_SIZE}
    
    echo ""
    print_status "Configuration Summary:"
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
        print_status "Installation cancelled."
        exit 0
    fi
}

# Function to create LXC container
create_container() {
    print_status "Creating LXC container..."
    
    # Create the container
    pct create $CTID local:vztmpl/$TEMPLATE-$TEMPLATE_VERSION\_amd64.tar.zst \
        --hostname $HOSTNAME \
        --memory $MEMORY \
        --swap $SWAP \
        --cores $CORES \
        --rootfs $STORAGE:$DISK_SIZE \
        --net0 name=eth0,bridge=$BRIDGE,ip=$IP/24,gw=$GATEWAY \
        --features nesting=1 \
        --unprivileged 1 \
        --start 1
    
    print_success "Container created and started successfully!"
}

# Function to wait for container to be ready
wait_for_container() {
    print_status "Waiting for container to be ready..."
    sleep 10
    
    # Wait for container to be running
    while ! pct status $CTID | grep -q "running"; do
        print_status "Waiting for container to start..."
        sleep 5
    done
    
    print_success "Container is running!"
}

# Function to install dependencies in container
install_dependencies() {
    print_status "Installing dependencies in container..."
    
    # Update package list and install basic tools
    pct exec $CTID -- bash -c "
        apt update && apt upgrade -y
        apt install -y curl wget git python3 python3-pip python3-venv nginx nodejs npm supervisor sqlite3
    "
    
    print_success "Dependencies installed!"
}

# Function to deploy Finance Assistant
deploy_finance_assistant() {
    print_status "Deploying Finance Assistant..."
    
    # Download and run the deployment script
    pct exec $CTID -- bash -c "
        curl -fsSL https://raw.githubusercontent.com/chbarnhouse/finance-assistant/main/deploy-lxc.sh | bash
    "
    
    print_success "Finance Assistant deployed successfully!"
}

# Function to display final information
display_final_info() {
    echo ""
    echo "=========================================="
    print_success "Finance Assistant Installation Complete!"
    echo "=========================================="
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
    print_success "Enjoy your Finance Assistant!"
}

# Function to handle errors
handle_error() {
    print_error "An error occurred during installation."
    print_error "Container ID: $CTID"
    print_error "You may need to clean up manually:"
    echo "  pct stop $CTID 2>/dev/null || true"
    echo "  pct destroy $CTID 2>/dev/null || true"
    exit 1
}

# Set error handler
trap handle_error ERR

# Main installation function
main() {
    check_root
    check_proxmox
    get_user_input
    check_template
    create_container
    wait_for_container
    install_dependencies
    deploy_finance_assistant
    display_final_info
}

# Run main function
main "$@" 