# Nginx Docker Setup - Changes Summary

## Date: 2025-12-25

## Overview
Set up Nginx reverse proxy in Docker to route traffic from `medi-buddy.duckdns.org` (ports 80/443) to the Next.js app running on port 3000.

---

## Files Created

### 1. `NGINX_DOCKER_SETUP.md`
- **Purpose**: Complete setup guide for Nginx in Docker
- **Contents**: 
  - Docker Compose configuration
  - Nginx configuration with WebSocket support
  - SSL certificate setup (two methods)
  - Auto-renewal setup
  - Troubleshooting checklist

### 2. `NGINX_DOCKER_QUICKSTART.md`
- **Purpose**: Quick reference guide
- **Contents**: Essential commands and quick setup steps

### 3. `setup-nginx-docker.sh`
- **Purpose**: Helper script to create required directories
- **Creates**: `ssl/`, `certbot-webroot/`, `nginx-logs/` directories

### 4. `renew-cert.sh`
- **Purpose**: SSL certificate auto-renewal script
- **Usage**: Run via cron job for automatic certificate renewal

---

## Files Modified

### 1. `docker-compose.yml`
**Changes:**
- Added volume mounts for SSL certificates:
  - `./ssl:/etc/ssl/certs:ro`
  - `./ssl:/etc/ssl/private:ro`
- Added certbot webroot volume: `./certbot-webroot:/var/www/certbot:ro`
- Added nginx logs volume: `./nginx-logs:/var/log/nginx`
- Removed `extra_hosts` (not compatible with docker-compose 1.29.2)

**Before:**
```yaml
volumes:
  - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

**After:**
```yaml
volumes:
  - ./nginx.conf:/etc/nginx/nginx.conf:ro
  - ./ssl:/etc/ssl/certs:ro
  - ./ssl:/etc/ssl/private:ro
  - ./certbot-webroot:/var/www/certbot:ro
  - ./nginx-logs:/var/log/nginx
```

### 2. `nginx.conf`
**Changes:**
- Changed upstream from `host.docker.internal:3000` to `172.17.0.1:3000` (Linux compatibility)
- Added HTTP server block with proxy configuration (currently active)
- Added certbot challenge location for SSL setup
- Added HTTPS server block (commented out until SSL certificates are obtained)
- Enhanced WebSocket support with proper headers
- Added timeout and buffer settings
- Fixed deprecated `http2` syntax

**Key Changes:**
```nginx
# Before: host.docker.internal:3000 (doesn't work on Linux)
# After: 172.17.0.1:3000 (Docker bridge gateway IP)

upstream nextjs_app {
    server 172.17.0.1:3000;
}
```

---

## Issues Fixed

### 1. Docker Compose Error: 'ContainerConfig'
- **Problem**: `extra_hosts` with `host-gateway` not supported in docker-compose 1.29.2
- **Solution**: Removed `extra_hosts` configuration

### 2. host.docker.internal Not Available
- **Problem**: `host.docker.internal` doesn't work on Linux by default
- **Solution**: Changed to `172.17.0.1` (Docker bridge gateway IP)

### 3. SSL Certificate Missing
- **Problem**: Nginx trying to load SSL certificates that don't exist
- **Solution**: Commented out HTTPS server block until certificates are obtained

### 4. Deprecated http2 Syntax
- **Problem**: `listen 443 ssl http2;` is deprecated
- **Solution**: Changed to `listen 443 ssl;` and `http2 on;` (when uncommented)

---

## Current Configuration Status

### ✅ Working
- HTTP reverse proxy (port 80 → port 3000)
- WebSocket support configured
- All Docker containers running
- Nginx serving traffic

### ⏳ Pending
- SSL certificate setup (HTTPS)
- HTTP → HTTPS redirect (after SSL)
- Auto-renewal cron job setup

---

## Next Steps

1. **Get SSL Certificate**:
   ```bash
   docker-compose stop nginx
   sudo certbot certonly --standalone -d medi-buddy.duckdns.org
   sudo cp /etc/letsencrypt/live/medi-buddy.duckdns.org/fullchain.pem ./ssl/
   sudo cp /etc/letsencrypt/live/medi-buddy.duckdns.org/privkey.pem ./ssl/
   docker-compose up -d nginx
   ```

2. **Enable HTTPS**:
   - Uncomment HTTPS server block in `nginx.conf`
   - Uncomment HTTP redirect in HTTP server block

3. **Set Up Auto-Renewal**:
   ```bash
   crontab -e
   # Add: 0 2,14 * * * /root/Project/final-project-backend/renew-cert.sh >> /root/Project/final-project-backend/ssl-renewal.log 2>&1
   ```

---

## Directory Structure Created

```
/root/Project/final-project-backend/
├── ssl/                    # SSL certificates (created by setup script)
├── certbot-webroot/        # Certbot validation files
├── nginx-logs/             # Nginx access/error logs
├── nginx.conf              # Nginx configuration (modified)
├── docker-compose.yml      # Docker Compose config (modified)
├── setup-nginx-docker.sh   # Setup script (new)
├── renew-cert.sh           # SSL renewal script (new)
├── NGINX_DOCKER_SETUP.md   # Main guide (new)
├── NGINX_DOCKER_QUICKSTART.md  # Quick reference (new)
└── NGINX_CHANGES_SUMMARY.md    # This file (new)
```

---

## Testing Commands

```bash
# Check containers
docker-compose ps

# View nginx logs
docker-compose logs -f nginx

# Test HTTP connection
curl -I http://127.0.0.1 -H "Host: medi-buddy.duckdns.org"

# Test from external (if DNS configured)
curl -I http://medi-buddy.duckdns.org
```

---

## Notes

- Nginx is running in Docker, proxying to Next.js app on host (port 3000)
- Using Docker bridge gateway IP (172.17.0.1) to access host services
- SSL certificates will be stored in `./ssl/` directory
- All configuration files are ready for HTTPS once certificates are obtained


