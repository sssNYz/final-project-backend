#!/bin/bash
set -e

echo "=== Upgrading Node.js to v20 (LTS) ==="

# 1. Remove old version
echo "--> Removing old Node.js..."
sudo apt-get remove -y nodejs npm || true
sudo apt-get autoremove -y

# 2. Add NodeSource Repository
echo "--> Adding NodeSource v20 repo..."
# Install curl if missing
sudo apt-get install -y curl
# Download and run the setup script
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 3. Install Node.js
echo "--> Installing Node.js v20..."
sudo apt-get install -y nodejs

# 4. Verify
echo "--> Verifying installation..."
RESULT=$(node -v)
echo "Current Node.js version: $RESULT"

# 5. Install Global Tools
echo "--> Re-installing PM2..."
sudo npm install -g pm2

echo "=== Upgrade Complete ==="
echo "Please restart your terminal or run: hash -r"
