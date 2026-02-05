#!/bin/bash

# Configuration
DOMAIN="medi-buddy.duckdns.org"
EMAIL="admin@medi-buddy.duckdns.org" # Change this if you want SSL expiry alerts
DOCKER_COMPOSE_FILE="docker-compose.yml"

echo "=== Starting HTTPS Setup for $DOMAIN ==="

# Check for docker compose command
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="sudo docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="sudo docker-compose"
else
    echo "ERROR: docker-compose or 'docker compose' not found. Please install Docker Compose."
    exit 1
fi

echo "Using: $DOCKER_COMPOSE_CMD"

# 1. Step: Ensure Docker Nginx is running with basic HTTP config
echo "--> Setting up temporary HTTP config..."
cp nginx-temp.conf nginx.conf

echo "--> Ensuring Nginx is running..."
$DOCKER_COMPOSE_CMD up -d nginx

# 2. Step: Request Certificate
echo "--> Requesting SSL Certificate via Certbot..."
# We use a temporary certbot container that mounts the same volume as Nginx
sudo docker run --rm \
  -v "$(pwd)/certbot-webroot:/var/www/certbot" \
  -v "$(pwd)/ssl:/etc/letsencrypt" \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --keep-until-expiring

if [ $? -eq 0 ]; then
    echo "SUCCESS: Certificate obtained!"
    
    # 3. Step: Switch to Secure Config
    echo "--> Switching to Secure Nginx Configuration..."
    cp nginx.conf nginx.conf.bak
    cp nginx-secure.conf nginx.conf
    
    # 4. Step: Reload Nginx
    echo "--> Reloading Nginx..."
    $DOCKER_COMPOSE_CMD restart nginx
    
    echo "=== HTTPS Setup Complete! ==="
    echo "Your site should now be accessible at https://$DOMAIN"
else
    echo "ERROR: Failed to obtain certificate."
    echo "Please check:"
    echo "1. Is port 80 open and accessible from the internet?"
    echo "2. Does the domain $DOMAIN point to this server's IP?"
    exit 1
fi
