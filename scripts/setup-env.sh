#!/bin/bash
# Environment Setup Script

set -e

echo "=== Setting up Environment for User: $USER ==="

# 1. Update Package List
echo "--> Updating apt..."
sudo apt-get update

# 2. Install Node.js & NPM
if ! command -v npm &> /dev/null; then
    echo "--> Installing Node.js and NPM..."
    sudo apt-get install -y nodejs npm
else
    echo "✓ NPM is already installed."
fi

# 3. Install Docker
if ! command -v docker &> /dev/null; then
    echo "--> Installing Docker..."
    # Attempt to install docker.io
    sudo apt-get install -y docker.io
    
    # Try to install docker-compose (standalone) if plugin not found
    if ! command -v docker-compose &> /dev/null; then
        echo "--> Installing docker-compose..."
        sudo apt-get install -y docker-compose || echo "Warning: docker-compose install failed, you might need to install it manually."
    fi
    
    echo "--> Adding $USER to docker group..."
    # Create group if it doesn't exist (it should from installing docker.io)
    sudo groupadd docker || true
    sudo usermod -aG docker "$USER"
else
    echo "✓ Docker is already installed."
fi

# 4. Install PM2 Globally
if ! command -v pm2 &> /dev/null; then
    echo "--> Installing PM2 globally..."
    # Config npm to use a directory owned by the user if we don't want to use sudo for every global install, 
    # but for simplicity, we'll use sudo here to install to /usr/local/bin
    sudo npm install -g pm2
else
    echo "✓ PM2 is already installed."
fi

echo "=== Setup Complete ==="
echo "IMPORTANT: If you just installed Docker, run 'newgrp docker' to activate the group changes without logging out."
