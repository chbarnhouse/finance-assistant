#!/bin/bash

# Fix port forwarding for existing Finance Assistant container
# This script should be run on the Proxmox host

CTID=113  # Finance Assistant container ID

echo "🔧 Fixing port forwarding for Finance Assistant container $CTID..."

# Get container IP
CONTAINER_IP=$(pct exec $CTID ip route get 1 | awk '{print $7;exit}')

if [ -z "$CONTAINER_IP" ]; then
    echo "❌ Error: Could not get container IP address"
    exit 1
fi

echo "📡 Container IP: $CONTAINER_IP"

# Add iptables rules for port forwarding
echo "🔗 Adding port forwarding rules..."
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination $CONTAINER_IP:8080
iptables -A FORWARD -p tcp -d $CONTAINER_IP --dport 8080 -j ACCEPT

# Save iptables rules
if [ -d "/etc/iptables" ]; then
    iptables-save > /etc/iptables/rules.v4
    echo "💾 Iptables rules saved"
else
    echo "⚠️  Warning: /etc/iptables directory not found, rules not saved"
fi

echo "✅ Port forwarding configured: Host port 8080 -> Container $CONTAINER_IP:8080"
echo "🌐 You should now be able to access Finance Assistant at: http://192.168.1.150:8080" 