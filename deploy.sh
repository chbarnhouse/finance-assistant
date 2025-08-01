#!/bin/bash
set -e

echo "🚀 Deploying Finance Assistant (Standalone)"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp env.example .env
    echo "📝 Please edit .env file with your configuration before continuing."
    echo "   Key settings to update:"
    echo "   - SECRET_KEY (generate a new one)"
    echo "   - YNAB_API_KEY (your YNAB API key)"
    echo "   - YNAB_BUDGET_ID (your YNAB budget ID)"
    echo "   - API_KEY (for Home Assistant integration)"
    exit 1
fi

# Create data directories
echo "📁 Creating data directories..."
sudo mkdir -p /opt/finance-assistant/data
sudo mkdir -p /opt/finance-assistant/logs
sudo chown -R $USER:$USER /opt/finance-assistant

# Build and start the service
echo "🔨 Building and starting Finance Assistant..."
docker-compose up -d --build

# Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 10

# Check if service is running
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Finance Assistant is running successfully!"
    echo ""
    echo "🌐 Access your Finance Assistant at:"
    echo "   http://localhost:8080"
    echo ""
    echo "🔐 Default credentials:"
    echo "   Username: admin"
    echo "   Password: password"
    echo ""
    echo "⚠️  IMPORTANT: Change the default password after first login!"
    echo ""
    echo "📊 View logs with: docker-compose logs -f"
    echo "🛑 Stop service with: docker-compose down"
else
    echo "❌ Service failed to start. Check logs with:"
    echo "   docker-compose logs"
    exit 1
fi 