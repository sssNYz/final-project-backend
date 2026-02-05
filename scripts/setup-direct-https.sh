#!/bin/bash
set -e

echo "==========================================="
echo "Setup: Direct HTTPS without reverse proxy"
echo "==========================================="

# 1. Stop nginx
echo ""
echo "1. Stopping nginx..."
sudo docker compose down nginx 2>/dev/null || echo "Nginx already stopped"

# 2. Install certbot if not present
echo ""
echo "2. Checking certbot installation..."
if ! command -v certbot &> /dev/null; then
    echo "   Installing certbot..."
    sudo apt update
    sudo apt install -y certbot
else
    echo "   Certbot already installed ✓"
fi

# 3. Stop PM2 temporarily
echo ""
echo "3. Temporarily stopping Next.js..."
pm2 stop nextjs-backend || true

# 4. Get certificate (standalone mode)
echo ""
echo "4. Getting SSL certificate..."
sudo certbot certonly --standalone \
  -d medi-buddy.duckdns.org \
  --non-interactive \
  --agree-tos \
  --email your-email@example.com \
  --keep-files || echo "Certificate already exists"

# 5. Set permissions
echo ""
echo "5. Setting certificate permissions..."
sudo chmod -R 755 /etc/letsencrypt/live/
sudo chmod -R 755 /etc/letsencrypt/archive/

# 6. Update environment variable
echo ""
echo "6. Updating .env for HTTPS..."
if grep -q "^PORT=" .env; then
    sed -i 's/^PORT=.*/PORT=443/' .env
else
    echo "PORT=443" >> .env
fi

# 7. Restart PM2
echo ""
echo "7. Restarting Next.js with HTTPS..."
pm2 restart nextjs-backend

echo ""
echo "==========================================="
echo "✅ Setup Complete!"
echo "==========================================="
echo ""
echo "NOTE: Next.js on port 443 requires sudo."
echo "Update your PM2 ecosystem.config.cjs to use sudo."
echo ""
