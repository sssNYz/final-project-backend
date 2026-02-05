# Docker Setup Guide

## Quick Start

### Step 1: Run the installation script
```bash
cd /root/Project/final-project-backend
bash install-docker.sh
```

### Step 2: If Docker is installed but not running, try:

**Option A: Start dockerd manually**
```bash
# Find dockerd
which dockerd
# or
find /usr -name dockerd 2>/dev/null

# Start it manually (replace path if different)
/usr/bin/dockerd > /tmp/dockerd.log 2>&1 &

# Wait a few seconds, then check
docker ps
```

**Option B: If dockerd is not found, reinstall Docker properly**
```bash
# Remove old docker packages
apt-get remove -y docker.io docker-compose

# Clean up
apt-get autoremove -y

# Install fresh
apt-get update
apt-get install -y docker.io

# Try to start
/usr/bin/dockerd &
```

### Step 3: Stop local MySQL (if running)
```bash
# Stop MySQL service
service mysql stop
# or
/etc/init.d/mysql stop
```

### Step 4: Start Docker containers
```bash
cd /root/Project/final-project-backend

# Start only DB and phpMyAdmin (skip nginx if you want)
docker-compose up -d db phpmyadmin

# Or start everything
docker-compose up -d
```

### Step 5: Verify containers are running
```bash
docker-compose ps
# or
docker ps
```

### Step 6: Access phpMyAdmin
- URL: http://localhost:8080
- Server: `db` (or `final_project_mysql`)
- Username: `root`
- Password: `s31122546`

### Step 7: Update DATABASE_URL
Set in your `.env` file:
```
DATABASE_URL="mysql://root:s31122546@localhost:3306/final_project_db"
```

## Troubleshooting

### If docker command not found:
```bash
# Check if installed
dpkg -l | grep docker

# Check binary location
find /usr -name docker 2>/dev/null

# Add to PATH if needed
export PATH=$PATH:/usr/bin
```

### If dockerd won't start:
```bash
# Check logs
cat /tmp/dockerd.log

# Check if port 3306 is free
ss -tlnp | grep 3306

# Check Docker socket
ls -la /var/run/docker.sock
```

### If containers won't start:
```bash
# Check logs
docker-compose logs db
docker-compose logs phpmyadmin

# Restart
docker-compose restart

# Stop everything
docker-compose down
```
