#!/bin/bash
# SSL Certificate Renewal Script for Docker Nginx Setup
# This script renews Let's Encrypt certificates and updates Docker volumes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting SSL certificate renewal..."

# Stop nginx container temporarily
echo "Stopping nginx container..."
docker-compose stop nginx

# Renew certificate
echo "Renewing certificate..."
sudo certbot renew

# Copy renewed certificates to project directory
echo "Copying certificates..."
sudo cp /etc/letsencrypt/live/medi-buddy.duckdns.org/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/medi-buddy.duckdns.org/privkey.pem ./ssl/

# Set permissions
echo "Setting permissions..."
sudo chmod 644 ./ssl/fullchain.pem
sudo chmod 600 ./ssl/privkey.pem
sudo chown $USER:$USER ./ssl/*

# Restart nginx
echo "Restarting nginx container..."
docker-compose up -d nginx

echo "Certificate renewal completed successfully!"
echo "Date: $(date)"








