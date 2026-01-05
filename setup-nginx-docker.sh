#!/bin/bash
# Setup script for Nginx Docker configuration
# Creates necessary directories and sets permissions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Setting up Nginx Docker directories..."

# Create SSL directory
echo "Creating ssl directory..."
mkdir -p ssl
chmod 755 ssl

# Create certbot webroot directory
echo "Creating certbot-webroot directory..."
mkdir -p certbot-webroot
chmod 755 certbot-webroot

# Create nginx logs directory
echo "Creating nginx-logs directory..."
mkdir -p nginx-logs
chmod 755 nginx-logs

echo "Directories created successfully!"
echo ""
echo "Next steps:"
echo "1. Configure firewall: sudo ufw allow 80/tcp && sudo ufw allow 443/tcp"
echo "2. Start Docker services: docker-compose up -d"
echo "3. Get SSL certificate (see NGINX_DOCKER_SETUP.md)"
echo "4. Update nginx.conf with SSL paths"
echo "5. Restart nginx: docker-compose restart nginx"






