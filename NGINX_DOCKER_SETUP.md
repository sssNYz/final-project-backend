# Nginx Docker Setup for medi-buddy.duckdns.org

This guide sets up Nginx as a reverse proxy in Docker for your Next.js app.

---

## Step 1: Configure Firewall

### 1.1 Allow HTTP and HTTPS Ports
```bash
# Check if UFW is active
sudo ufw status

# Allow HTTP (port 80)
sudo ufw allow 80/tcp

# Allow HTTPS (port 443)
sudo ufw allow 443/tcp

# If UFW is not installed, install it:
# sudo apt install ufw -y
# sudo ufw enable
```

---

## Step 2: Update Docker Compose Configuration

### 2.1 Update docker-compose.yml

Your `docker-compose.yml` should include Nginx with SSL certificate volumes:

```yaml
services:
  db:
    image: mysql:8.4
    container_name: final_project_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: "s31122546"
      MYSQL_DATABASE: "final_project_db"
    ports:
      - "3306:3306"
    volumes:
      - db-data:/var/lib/mysql

  phpmyadmin:
    image: phpmyadmin/phpmyadmin:latest
    container_name: final_project_phpmyadmin
    environment:
      - PMA_HOST=db
    ports:
      - "8080:80"
    depends_on:
      - db

  nginx:
    image: nginx:alpine
    container_name: final_project_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
      - ./ssl:/etc/ssl/private:ro
      - ./nginx-logs:/var/log/nginx
    depends_on:
      - phpmyadmin
    networks:
      - app-network

volumes:
  db-data:
    driver: local

networks:
  app-network:
    driver: bridge
```

### 2.2 Create SSL Directory
```bash
# Create directory for SSL certificates
mkdir -p ssl
chmod 755 ssl
```

---

## Step 3: Update Nginx Configuration

### 3.1 Update nginx.conf

Your `nginx.conf` should look like this (updated version):

```nginx
events {
    worker_connections 1024;
}

http {
    # Next.js app on port 3000 (running on host)
    upstream nextjs_app {
        server host.docker.internal:3000;
    }

    # Optional service on 5555 (Prisma Studio)
    upstream service_5555 {
        server host.docker.internal:5555;
    }

    # phpMyAdmin in Docker
    upstream phpmyadmin {
        server phpmyadmin:80;
    }

    # HTTP Server - Redirect to HTTPS (after SSL setup)
    # For initial setup without SSL, comment out the redirect and uncomment the proxy_pass
    server {
        listen 80;
        server_name medi-buddy.duckdns.org;

        # Redirect to HTTPS (uncomment after SSL is set up)
        return 301 https://$host$request_uri;

        # For initial HTTP-only setup (comment out redirect above and uncomment below):
        # location / {
        #     proxy_pass http://nextjs_app;
        #     proxy_http_version 1.1;
        #     proxy_set_header Upgrade $http_upgrade;
        #     proxy_set_header Connection "upgrade";
        #     proxy_set_header Host $host;
        #     proxy_set_header X-Real-IP $remote_addr;
        #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        #     proxy_set_header X-Forwarded-Proto $scheme;
        #     proxy_connect_timeout 60s;
        #     proxy_send_timeout 60s;
        #     proxy_read_timeout 60s;
        #     proxy_buffering off;
        # }
    }

    # HTTPS Server (uncomment after SSL certificate is obtained)
    server {
        listen 443 ssl http2;
        server_name medi-buddy.duckdns.org;

        # SSL Certificate paths (mounted from ./ssl directory)
        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/private/privkey.pem;

        # SSL Configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Logging
        access_log /var/log/nginx/medi-buddy-access.log;
        error_log /var/log/nginx/medi-buddy-error.log;

        # Increase body size limit if needed (for file uploads)
        client_max_body_size 10M;

        # Main app (Next.js)
        location / {
            proxy_pass http://nextjs_app;
            proxy_http_version 1.1;
            
            # Required proxy headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            
            # Buffer settings
            proxy_buffering off;
            proxy_request_buffering off;
        }

        # phpMyAdmin
        location /phpmyadmin {
            proxy_pass http://phpmyadmin;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Optional service on 5555 (Prisma Studio)
        location /service-5555 {
            proxy_pass http://service_5555;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

---

## Step 4: Start Docker Services (HTTP Only - Initial Setup)

### 4.1 For Initial HTTP Setup (Before SSL)

First, temporarily modify `nginx.conf` to serve HTTP without redirect:

1. Comment out the `return 301` line in the HTTP server block
2. Uncomment the `location /` block in the HTTP server block

### 4.2 Start Docker Containers
```bash
# Navigate to project directory
cd /root/Project/final-project-backend

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs nginx
docker-compose logs -f nginx  # Follow logs
```

### 4.3 Verify HTTP Setup
```bash
# Test from host
curl -I http://127.0.0.1 -H "Host: medi-buddy.duckdns.org"

# Test from external (if DNS is configured)
curl -I http://medi-buddy.duckdns.org
```

---

## Step 5: SSL Certificate Setup with Docker

There are two methods to get SSL certificates with Docker:

### Method 1: Certbot in Docker (Recommended)

#### 5.1 Add Certbot Service to docker-compose.yml

Add this service to your `docker-compose.yml`:

```yaml
  certbot:
    image: certbot/certbot:latest
    container_name: final_project_certbot
    volumes:
      - ./ssl:/etc/letsencrypt
      - ./ssl-logs:/var/log/letsencrypt
    command: certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d medi-buddy.duckdns.org
```

#### 5.2 Update Nginx for Certbot Challenge

Temporarily update `nginx.conf` HTTP server block to allow certbot validation:

```nginx
server {
    listen 80;
    server_name medi-buddy.duckdns.org;

    # Certbot challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect everything else to HTTPS (after certificate is obtained)
    location / {
        return 301 https://$host$request_uri;
    }
}
```

#### 5.3 Create Certbot Webroot Directory
```bash
mkdir -p certbot-webroot
```

#### 5.4 Update docker-compose.yml for Certbot

Full certbot service configuration:

```yaml
  certbot:
    image: certbot/certbot:latest
    container_name: final_project_certbot
    volumes:
      - ./ssl:/etc/letsencrypt
      - ./certbot-webroot:/var/www/certbot
      - ./ssl-logs:/var/log/letsencrypt
    command: certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d medi-buddy.duckdns.org
```

#### 5.5 Update Nginx Volume for Certbot
```yaml
  nginx:
    # ... other config ...
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/letsencrypt:ro  # Changed from ./ssl:/etc/ssl/certs:ro
      - ./certbot-webroot:/var/www/certbot:ro
      - ./nginx-logs:/var/log/nginx
```

#### 5.6 Run Certbot
```bash
# Make sure nginx is running first
docker-compose up -d nginx

# Run certbot
docker-compose run --rm certbot

# After certificate is obtained, update nginx.conf to use:
# ssl_certificate /etc/letsencrypt/live/medi-buddy.duckdns.org/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/medi-buddy.duckdns.org/privkey.pem;
```

### Method 2: Certbot on Host (Simpler)

#### 5.1 Install Certbot on Host
```bash
sudo apt update
sudo apt install certbot -y
```

#### 5.2 Temporarily Stop Nginx Container
```bash
docker-compose stop nginx
```

#### 5.3 Run Certbot Standalone
```bash
# Certbot will temporarily use port 80
sudo certbot certonly --standalone -d medi-buddy.duckdns.org
```

#### 5.4 Copy Certificates to Project Directory
```bash
# Create ssl directory if it doesn't exist
mkdir -p ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/medi-buddy.duckdns.org/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/medi-buddy.duckdns.org/privkey.pem ./ssl/

# Set permissions
sudo chmod 644 ./ssl/fullchain.pem
sudo chmod 600 ./ssl/privkey.pem
sudo chown $USER:$USER ./ssl/*
```

#### 5.5 Update nginx.conf SSL Paths

Update the SSL certificate paths in `nginx.conf`:

```nginx
ssl_certificate /etc/ssl/certs/fullchain.pem;
ssl_certificate_key /etc/ssl/private/privkey.pem;
```

#### 5.6 Restart Nginx Container
```bash
docker-compose up -d nginx
```

---

## Step 6: Auto-Renewal of SSL Certificates

### 6.1 Create Renewal Script

Create `renew-cert.sh`:

```bash
#!/bin/bash
# SSL Certificate Renewal Script for Docker

# Stop nginx container temporarily
docker-compose stop nginx

# Renew certificate
sudo certbot renew

# Copy renewed certificates
sudo cp /etc/letsencrypt/live/medi-buddy.duckdns.org/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/medi-buddy.duckdns.org/privkey.pem ./ssl/

# Set permissions
sudo chmod 644 ./ssl/fullchain.pem
sudo chmod 600 ./ssl/privkey.pem
sudo chown $USER:$USER ./ssl/*

# Restart nginx
docker-compose up -d nginx

echo "Certificate renewal completed"
```

### 6.2 Make Script Executable
```bash
chmod +x renew-cert.sh
```

### 6.3 Add to Crontab
```bash
# Edit crontab
crontab -e

# Add this line (runs twice daily at 2 AM and 2 PM)
0 2,14 * * * /root/Project/final-project-backend/renew-cert.sh >> /root/Project/final-project-backend/ssl-renewal.log 2>&1
```

---

## Step 7: Verify Setup

### 7.1 Test HTTP (should redirect to HTTPS)
```bash
curl -I http://medi-buddy.duckdns.org
# Should return: HTTP/1.1 301 Moved Permanently
```

### 7.2 Test HTTPS
```bash
# Test HTTPS connection
curl -I https://medi-buddy.duckdns.org

# Test with verbose output
curl -v https://medi-buddy.duckdns.org

# Test WebSocket upgrade
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://medi-buddy.duckdns.org
```

### 7.3 Check Docker Containers
```bash
# List running containers
docker-compose ps

# Check nginx logs
docker-compose logs nginx

# Check nginx logs in real-time
docker-compose logs -f nginx

# Check all logs
docker-compose logs
```

### 7.4 Verify Your App is Running
```bash
# Check if Next.js app is running on host
curl http://127.0.0.1:3000

# Or check with PM2
pm2 list
pm2 logs nextjs-backend --lines 50
```

---

## Step 8: Troubleshooting Checklist

### 8.1 App Not Running
```bash
# Check if your Next.js app is running
pm2 list

# Check app logs
pm2 logs nextjs-backend

# Restart app if needed
pm2 restart nextjs-backend

# Or start it
cd /root/Project/final-project-backend
pm2 start ecosystem.config.cjs
```

### 8.2 Port 80/443 Already in Use
```bash
# Check what's using the ports
sudo lsof -i :80
sudo lsof -i :443
sudo netstat -tulpn | grep :80
sudo ss -tulpn | grep :80

# Stop conflicting services
sudo systemctl stop nginx  # If nginx is installed on host
sudo systemctl stop apache2  # If Apache is running
```

### 8.3 DNS Not Pointing to Server IP
```bash
# Check your server's public IP
curl ifconfig.me
# or
curl ipinfo.io/ip

# Test DNS resolution
nslookup medi-buddy.duckdns.org
dig medi-buddy.duckdns.org

# Update DuckDNS if needed:
# Visit https://www.duckdns.org/ and update your domain's IP
```

### 8.4 Cloud Firewall Not Open
**For AWS:**
- Check Security Groups: Allow inbound traffic on ports 80 and 443

**For Google Cloud:**
- Check Firewall Rules: Allow tcp:80 and tcp:443

**For Azure:**
- Check Network Security Groups: Allow ports 80 and 443

**For DigitalOcean:**
- Check Firewall settings in Control Panel

**For other providers:**
- Check your cloud provider's firewall/security group settings

### 8.5 Docker Container Issues
```bash
# Check container status
docker-compose ps

# Check container logs
docker-compose logs nginx
docker-compose logs certbot

# Restart containers
docker-compose restart nginx

# Rebuild and restart
docker-compose up -d --build nginx

# Check if container can reach host
docker-compose exec nginx ping host.docker.internal
```

### 8.6 Nginx Configuration Errors
```bash
# Test nginx configuration inside container
docker-compose exec nginx nginx -t

# View nginx error logs
docker-compose logs nginx | grep error
# Or check mounted log directory
tail -f nginx-logs/error.log
```

### 8.7 SSL Certificate Issues
```bash
# Check if certificates exist
ls -la ssl/

# Check certificate expiry (if using host certbot)
sudo certbot certificates

# Test certificate renewal (dry run)
sudo certbot renew --dry-run

# Verify certificate files are readable
docker-compose exec nginx ls -la /etc/ssl/certs/
docker-compose exec nginx ls -la /etc/ssl/private/
```

### 8.8 Connection Refused Errors
```bash
# Verify Next.js app is listening on 127.0.0.1:3000
netstat -tulpn | grep 3000
ss -tulpn | grep 3000

# Test connection from host
curl http://127.0.0.1:3000

# Test connection from nginx container
docker-compose exec nginx wget -O- http://host.docker.internal:3000
```

### 8.9 WebSocket Not Working
```bash
# Check nginx.conf has WebSocket headers:
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "upgrade";

# Test WebSocket connection
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://medi-buddy.duckdns.org
```

---

## Quick Reference Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart nginx
docker-compose restart nginx

# View nginx logs
docker-compose logs -f nginx

# Test nginx config
docker-compose exec nginx nginx -t

# Reload nginx (inside container)
docker-compose exec nginx nginx -s reload

# Check container status
docker-compose ps

# Renew SSL certificate (Method 2)
./renew-cert.sh

# Check SSL certificate expiry
sudo certbot certificates
```

---

## Summary

1. ✅ Configure firewall: `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`
2. ✅ Update `docker-compose.yml` with SSL volumes
3. ✅ Update `nginx.conf` with proper proxy settings
4. ✅ Create SSL directory: `mkdir -p ssl`
5. ✅ Start Docker services: `docker-compose up -d`
6. ✅ Get SSL certificate: Use Method 1 (Docker) or Method 2 (Host)
7. ✅ Update nginx.conf with SSL paths
8. ✅ Restart nginx: `docker-compose restart nginx`
9. ✅ Set up auto-renewal: Add cron job for `renew-cert.sh`
10. ✅ Verify: `curl https://medi-buddy.duckdns.org`

Your app should now be accessible at `https://medi-buddy.duckdns.org`!








