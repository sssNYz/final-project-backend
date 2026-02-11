#!/bin/bash

# ==========================================
# Lightweight Virus Scanner
# ==========================================

KNOWN_BAD_PROCESSES="xmrig scanner_linux monero ocean_miner kinsing"
KNOWN_BAD_FILES="xmrig.tar.gz xmrig-*.tar.gz scanner_linux"
PROJECT_DIR="/home/deploy/final-project-backend"
STATUS="CLEAN"
DETAILS=""

# 1. Check for Known Bad Processes
for PROC in $KNOWN_BAD_PROCESSES; do
    if pgrep -f "$PROC" > /dev/null; then
        STATUS="INFECTED"
        DETAILS="$DETAILS\n- 🚨 Found Malicious Process: $PROC"
        
        # Kill it
        pkill -9 -f "$PROC"
        DETAILS="$DETAILS (Killed)"
    fi
done

# 2. Check for Known Bad Files
for FILE in $KNOWN_BAD_FILES; do
    FOUND=$(find "$PROJECT_DIR" -name "$FILE" 2>/dev/null)
    if [ ! -z "$FOUND" ]; then
        STATUS="INFECTED"
        DETAILS="$DETAILS\n- 🚨 Found Malicious File: $FOUND"
        
        # Delete it behavior (commented out for safety, or auto-delete)
        # rm -f "$FOUND"
        # DETAILS="$DETAILS (Deleted)"
    fi
done

# 3. Check for Suspicious High CPU (Non-System)
# Finds processes using > 80% CPU that are NOT common system tools
HIGH_CPU=$(ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%cpu | head -n 2 | awk '$5 > 80.0 {print $3}')

if [ ! -z "$HIGH_CPU" ]; then
    # Filter out our own known heavy processes if needed
    if [[ "$HIGH_CPU" != *"node"* ]] && [[ "$HIGH_CPU" != *"mysqld"* ]]; then
         STATUS="WARNING"
         DETAILS="$DETAILS\n- ⚠️ Suspicious High CPU Process: $HIGH_CPU"
    fi
fi

if [ "$STATUS" == "CLEAN" ]; then
    echo "CLEAN"
else
    echo -e "$DETAILS"
fi
