#!/bin/bash
set -e

echo "==========================================="
echo "Switching from Nginx to Caddy"
echo "==========================================="

# Stop current nginx setup
echo ""
echo "1. Stopping current nginx containers..."
sudo docker-compose down nginx 2>/dev/null || echo "Nginx already stopped"

# Backup old docker-compose
echo ""
echo "2. Backing up old docker-compose.yml..."
if [ -f "docker-compose.yml" ]; then
    cp docker-compose.yml docker-compose.nginx-backup.yml
    echo "   Backup saved to: docker-compose.nginx-backup.yml"
fi

# Switch to Caddy
echo ""
echo "3. Switching to Caddy configuration..."
cp docker-compose-caddy.yml docker-compose.yml

# Start Caddy
echo ""
echo "4. Starting Caddy..."
sudo docker-compose up -d

# Wait a moment
sleep 3

# Check status
echo ""
echo "5. Checking status..."
sudo docker-compose ps

echo ""
echo "==========================================="
echo "✅ Setup Complete!"
echo "==========================================="
echo ""
echo "Caddy will automatically:"
echo "  • Get SSL certificate from Let's Encrypt"
echo "  • Renew certificates automatically"
echo "  • Redirect HTTP → HTTPS"
echo ""
echo "Your site should be available at:"
echo "  🌐 https://medi-buddy.duckdns.org"
echo ""
echo "Check logs with:"
echo "  sudo docker-compose logs caddy -f"
echo ""
echo "To rollback to nginx:"
echo "  cp docker-compose.nginx-backup.yml docker-compose.yml"
echo "  sudo docker-compose up -d"
echo ""
