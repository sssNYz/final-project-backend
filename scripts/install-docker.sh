#!/bin/bash
# Docker Installation Script
# Run this script: bash install-docker.sh

set -e

echo "=== Installing Docker ==="

# Update package list
echo "Step 1: Updating package list..."
apt-get update

# Remove old Docker repository if it exists (to avoid GPG errors)
if [ -f /etc/apt/sources.list.d/docker.list ]; then
    echo "Step 2: Removing problematic Docker repository..."
    rm -f /etc/apt/sources.list.d/docker.list
fi

# Install Docker from Ubuntu repository
echo "Step 3: Installing docker.io..."
apt-get install -y docker.io docker-compose

# Check if docker binary exists
if [ -f /usr/bin/docker ]; then
    echo "✓ Docker binary found at /usr/bin/docker"
    /usr/bin/docker --version || echo "Docker installed but daemon not running"
else
    echo "✗ Docker binary not found. Checking alternatives..."
    find /usr -name docker 2>/dev/null | head -5
fi

# Check docker-compose
echo ""
echo "Step 4: Checking docker-compose..."
docker-compose --version || /usr/bin/docker-compose --version || echo "docker-compose check failed"

# Try to start Docker daemon manually
echo ""
echo "Step 5: Attempting to start Docker daemon..."
if [ -f /usr/bin/dockerd ]; then
    echo "Starting dockerd..."
    /usr/bin/dockerd > /tmp/dockerd.log 2>&1 &
    sleep 3
    if pgrep dockerd > /dev/null; then
        echo "✓ Docker daemon started!"
    else
        echo "✗ Docker daemon failed to start. Check /tmp/dockerd.log"
    fi
else
    echo "dockerd not found at /usr/bin/dockerd"
    find /usr -name dockerd 2>/dev/null | head -5
fi

echo ""
echo "=== Installation Complete ==="
echo "Try running: docker --version"
echo "If it works, then run: cd /root/Project/final-project-backend && docker compose up -d"
