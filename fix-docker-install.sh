#!/bin/bash
set -e

echo "=== Fixing Docker Installation ==="
echo ""

# Step 1: Remove ALL problematic Docker repository files
echo "Step 1: Removing problematic Docker repository files..."
rm -f /etc/apt/sources.list.d/docker.list
rm -f /etc/apt/keyrings/docker.gpg
rm -f /etc/apt/keyrings/docker.asc
rm -rf /etc/apt/keyrings/docker* 2>/dev/null || true
echo "✓ Removed Docker repo files"

# Step 2: Clean apt cache
echo ""
echo "Step 2: Cleaning apt cache..."
apt-get clean
rm -rf /var/lib/apt/lists/*
echo "✓ Cache cleaned"

# Step 3: Update package list (should work now)
echo ""
echo "Step 3: Updating package list..."
apt-get update
echo "✓ Package list updated"

# Step 4: Install docker.io from Ubuntu repos (NOT Docker's official repo)
echo ""
echo "Step 4: Installing docker.io from Ubuntu repository..."
apt-get install -y docker.io docker-compose
echo "✓ Docker packages installed"

# Step 5: Check if docker binary exists
echo ""
echo "Step 5: Checking Docker installation..."
if [ -f /usr/bin/docker ]; then
    echo "✓ Docker binary found at /usr/bin/docker"
    /usr/bin/docker --version || echo "⚠ Docker installed but daemon not running"
else
    echo "✗ Docker binary not found!"
    echo "Searching for docker..."
    find /usr -name docker -type f 2>/dev/null | head -5
    exit 1
fi

# Step 6: Check docker-compose
echo ""
echo "Step 6: Checking docker-compose..."
if docker-compose --version 2>/dev/null; then
    echo "✓ docker-compose is working"
else
    echo "⚠ docker-compose check failed"
fi

# Step 7: Try to start Docker daemon
echo ""
echo "Step 7: Starting Docker daemon..."
if [ -f /usr/bin/dockerd ]; then
    echo "Found dockerd at /usr/bin/dockerd"
    
    # Kill any existing dockerd
    pkill dockerd 2>/dev/null || true
    sleep 1
    
    # Start dockerd in background
    echo "Starting dockerd..."
    nohup /usr/bin/dockerd > /tmp/dockerd.log 2>&1 &
    DOCKERD_PID=$!
    
    # Wait for daemon to start
    echo "Waiting for Docker daemon to start..."
    for i in {1..10}; do
        sleep 1
        if docker ps >/dev/null 2>&1; then
            echo "✓ Docker daemon is running!"
            break
        fi
        if [ $i -eq 10 ]; then
            echo "⚠ Docker daemon may not have started properly"
            echo "Check logs: cat /tmp/dockerd.log"
        fi
    done
else
    echo "✗ dockerd not found at /usr/bin/dockerd"
    echo "Searching for dockerd..."
    find /usr -name dockerd -type f 2>/dev/null | head -5
fi

# Step 8: Final check
echo ""
echo "Step 8: Final verification..."
if docker ps >/dev/null 2>&1; then
    echo "✓✓✓ Docker is working! ✓✓✓"
    docker --version
    docker ps
else
    echo "⚠ Docker daemon is not responding"
    echo "Try manually: /usr/bin/dockerd > /tmp/dockerd.log 2>&1 &"
    echo "Then wait a few seconds and run: docker ps"
fi

echo ""
echo "=== Done ==="
echo ""
echo "Next steps:"
echo "1. Stop local MySQL: service mysql stop || /etc/init.d/mysql stop"
echo "2. Start containers: cd /root/Project/final-project-backend && docker-compose up -d db phpmyadmin"
echo "3. Check containers: docker-compose ps"
