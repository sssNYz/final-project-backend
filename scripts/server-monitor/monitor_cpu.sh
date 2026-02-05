#!/bin/bash

# ==========================================
# CPU Watchdog Monitor
# ==========================================

THRESHOLD=90
LOG_FILE="/home/deploy/final-project-backend/logs/monitor_cpu.log"
LAST_ALERT_FILE="/home/deploy/final-project-backend/logs/last_cpu_alert.txt"
DISCORD_SCRIPT="/home/deploy/final-project-backend/scripts/server-monitor/discord_alert.sh"

# 1. Get CPU Usage (User + System)
# uses top in batch mode, parses the CPU line
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')

# Convert to integer for comparison
CPU_INT=$(printf "%.0f" "$CPU_USAGE")

echo "[$(date)] Current CPU Usage: $CPU_INT%"

# 2. Check Threshold
if [ "$CPU_INT" -gt "$THRESHOLD" ]; then
    echo "[$(date)] ⚠️ CPU is high ($CPU_INT%). Checking debounce..."

    # 3. Debounce Logic (1 Hour)
    NOW=$(date +%s)
    
    if [ -f "$LAST_ALERT_FILE" ]; then
        LAST_ALERT=$(cat "$LAST_ALERT_FILE")
    else
        LAST_ALERT=0
    fi

    # Calculate difference
    DIFF=$((NOW - LAST_ALERT))
    ONE_HOUR=3600

    if [ "$DIFF" -ge "$ONE_HOUR" ]; then
        echo "[$(date)] Sending Alert!"
        
        # Send Alert
        $DISCORD_SCRIPT "⚠️ **High CPU Usage Detected!**\n\nThe server CPU is at **$CPU_INT%**. Check for potential miners or infinite loops." "WARNING"
        
        # Update Timestamp
        echo "$NOW" > "$LAST_ALERT_FILE"
    else
        echo "[$(date)] Alert suppressed. Last alert was $((DIFF / 60)) minutes ago."
    fi
fi
