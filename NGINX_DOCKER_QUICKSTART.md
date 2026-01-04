# Nginx Docker Quick Start Guide

## Quick Setup Steps

### 1. Run Setup Script
```bash
cd /root/Project/final-project-backend
./setup-nginx-docker.sh
```

### 2. Configure Firewall
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 3. Start Docker Services (HTTP Only - Initial)
```bash
# Make sure your Next.js app is running first
pm2 list

# Start Docker services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs nginx
```

### 4. Test HTTP Connection
```bash
curl -I http://medi-buddy.duckdns.org -H "Host: medi-buddy.duckdns.org"
```

### 5. Get SSL Certificate (Method 2 - Recommended)

#### 5.1 Temporarily Modify nginx.conf
Comment out the HTTPS redirect in the HTTP server block and uncomment the location block for initial HTTP setup.

#### 5.2 Stop Nginx Container
```bash
docker-compose stop nginx
```

#### 5.3 Install Certbot and Get Certificate
```bash
sudo apt update
sudo apt install certbot -y
sudo certbot certonly --standalone -d medi-buddy.duckdns.org
```

#### 5.4 Copy Certificates
```bash
sudo cp /etc/letsencrypt/live/medi-buddy.duckdns.org/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/medi-buddy.duckdns.org/privkey.pem ./ssl/
sudo chmod 644 ./ssl/fullchain.pem
sudo chmod 600 ./ssl/privkey.pem
sudo chown $USER:$USER ./ssl/*
```

#### 5.5 Restore nginx.conf
Uncomment the HTTPS redirect in the HTTP server block.

#### 5.6 Restart Nginx
```bash
docker-compose up -d nginx
```

### 6. Test HTTPS
```bash
curl -I https://medi-buddy.duckdns.org
```

### 7. Set Up Auto-Renewal
```bash
# Add to crontab
crontab -e

# Add this line (runs twice daily)
0 2,14 * * * /root/Project/final-project-backend/renew-cert.sh >> /root/Project/final-project-backend/ssl-renewal.log 2>&1
```

## Common Commands

```bash
# View nginx logs
docker-compose logs -f nginx

# Restart nginx
docker-compose restart nginx

# Test nginx config
docker-compose exec nginx nginx -t

# Check container status
docker-compose ps

# Stop all services
docker-compose down

# Start all services
docker-compose up -d
```

## Troubleshooting

- **502 Bad Gateway**: Check if Next.js app is running: `pm2 list`
- **Port already in use**: `sudo lsof -i :80` or `sudo lsof -i :443`
- **DNS not working**: Update DuckDNS at https://www.duckdns.org/
- **SSL errors**: Check certificate files in `./ssl/` directory

For detailed instructions, see `NGINX_DOCKER_SETUP.md`.


