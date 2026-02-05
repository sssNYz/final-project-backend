#!/bin/bash
# Fix Docker installation script

echo "=== Step 1: Stop Docker service ==="
sudo systemctl stop docker
sudo systemctl stop docker.socket

echo "=== Step 2: Remove old Docker packages ==="
sudo apt remove -y docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc 2>/dev/null || true

echo "=== Step 3: Clean up ==="
sudo apt autoremove -y
sudo apt autoclean

echo "=== Step 4: Update package list ==="
sudo apt update

echo "=== Step 5: Install Docker properly ==="
sudo apt install -y docker.io containerd

echo "=== Step 6: Reload systemd ==="
sudo systemctl daemon-reload

echo "=== Step 7: Start Docker ==="
sudo systemctl enable docker
sudo systemctl start docker

echo "=== Step 8: Check if dockerd exists ==="
if [ -f /usr/bin/dockerd ]; then
    echo "✓ dockerd found at /usr/bin/dockerd"
    /usr/bin/dockerd --version
else
    echo "✗ dockerd NOT found! Trying to find it..."
    find /usr -name dockerd 2>/dev/null || echo "dockerd not found anywhere"
fi

echo "=== Step 9: Check Docker status ==="
sudo systemctl status docker --no-pager -l | head -20

echo "=== Step 10: Test Docker ==="
docker version 2>&1 | head -5 || echo "Docker command failed"

echo ""
echo "=== Done! ==="
echo "If Docker is still not working, check:"
echo "  sudo journalctl -xeu docker.service --no-pager | tail -30"
