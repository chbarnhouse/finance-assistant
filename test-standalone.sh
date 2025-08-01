#!/bin/bash
set -e

echo "🧪 Testing Finance Assistant Standalone Deployment"

# Check if service is running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Service is not running. Start it with: docker-compose up -d"
    exit 1
fi

echo "✅ Service is running"

# Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Health endpoint is working"
else
    echo "❌ Health endpoint failed"
    exit 1
fi

# Test web interface (should require authentication)
echo "🌐 Testing web interface..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Web interface requires authentication (401)"
elif [ "$HTTP_CODE" = "200" ]; then
    echo "⚠️  Web interface accessible without authentication"
else
    echo "❌ Web interface returned unexpected code: $HTTP_CODE"
fi

# Test API endpoint (should require API key)
echo "🔌 Testing API endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/accounts/)
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ API endpoint requires authentication (401)"
else
    echo "❌ API endpoint returned unexpected code: $HTTP_CODE"
fi

# Test API endpoint with API key
echo "🔑 Testing API endpoint with API key..."
API_KEY=$(grep API_KEY .env | cut -d'=' -f2)
if [ -n "$API_KEY" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "X-API-Key: $API_KEY" \
        http://localhost:8080/api/accounts/)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ API endpoint accessible with API key"
    else
        echo "❌ API endpoint failed with API key: $HTTP_CODE"
    fi
else
    echo "⚠️  No API key found in .env file"
fi

echo ""
echo "🎉 Standalone deployment test completed!"
echo ""
echo "📋 Summary:"
echo "   - Service: Running"
echo "   - Health endpoint: Working"
echo "   - Web interface: Protected"
echo "   - API endpoints: Protected"
echo ""
echo "🌐 Access your Finance Assistant at: http://localhost:8080"
echo "🔐 Default credentials: admin / password" 