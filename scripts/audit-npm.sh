#!/bin/bash
# Script to audit and fix npm vulnerabilities

echo "=== Starting NPM Security Audit ==="

# 1. Run Audit
echo "--> Running npm audit..."
npm audit

# 2. Ask user if they want to fix
echo ""
read -p "Do you want to attempt to automatically fix vulnerabilities? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Force fix because we have major version upgrades
    echo "--> Running npm audit fix --force..."
    npm audit fix --force
    
    echo "=== Audit Fix Complete ==="
else
    echo "Skipping fix."
fi
