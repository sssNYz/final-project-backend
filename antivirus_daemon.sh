#!/bin/bash
echo "Starting Antivirus Daemon..."

# Change to the correct directory
cd /root/final-project-backend || exit

while true; do
    echo "[$(date)] Scanning for malware..."
    
    # Try to kill processes and log if found
    if pkill -9 -f xmrig; then
        echo "[$(date)] !!! ALARM: KILLED xmrig process"
    fi
    
    if pkill -9 -f scanner_linux; then
        echo "[$(date)] !!! ALARM: KILLED scanner_linux process"
    fi

    # Remove files
    FILES="xmrig.tar.gz xmrig-6.21.0 scanner_linux data.log monitor.log scanner_deployed.log exploited.log failed.log"
    
    for FILE in $FILES; do
        if [ -e "$FILE" ]; then
            rm -rf "$FILE"
            echo "[$(date)] !!! ALARM: DELETED malicious file $FILE"
        fi
    done

    # Sleep for 10 minutes (600 seconds)
    sleep 600
done
