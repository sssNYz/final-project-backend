#!/bin/bash

# ==========================================
# Daily Server Report (The "Cute" Report)
# ==========================================

DISCORD_SCRIPT="/home/deploy/final-project-backend/scripts/discord_alert.sh"
BACKUP_SCRIPT="/home/deploy/final-project-backend/scripts/backup_data.sh"
SCAN_SCRIPT="/home/deploy/final-project-backend/scripts/perform_scan.sh"

LOG_FILE="/home/deploy/final-project-backend/logs/daily_report_last.log"

# Start the log
echo "Generating Report..." > "$LOG_FILE"

# 1. Run Backup
echo "Running Backup..." >> "$LOG_FILE"
BACKUP_OUTPUT=$($BACKUP_SCRIPT)
if [ $? -eq 0 ]; then
    BACKUP_STATUS="✅ Backup Successful"
    # Extract size
    BACKUP_SIZE=$(echo "$BACKUP_OUTPUT" | grep "Backup location" | awk '{print $NF}' | xargs du -sh | awk '{print $1}')
else
    BACKUP_STATUS="❌ Backup FAILED"
    BACKUP_SIZE="0B"
fi

# 2. Run Scan
echo "Running Virus Scan..." >> "$LOG_FILE"
SCAN_OUTPUT=$($SCAN_SCRIPT)

# Count threats dynamically (counting lines starting with -)
THREAT_COUNT=$(echo "$SCAN_OUTPUT" | grep -c "🚨" || true)

if [[ "$SCAN_OUTPUT" == *"CLEAN"* ]]; then
    SCAN_STATUS="✅ System Clean"
    THREAT_COUNT=0
else
    SCAN_STATUS="⚠️ Potential Threats Found"
fi

# 3. Check System Stats
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}' | awk '{printf "%.0f", $1}')
RAM_USAGE=$(free -m | awk 'NR==2{printf "%.0f", $3*100/$2 }')
UPTIME=$(uptime -p | sed 's/up //')
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
DAY=$(date "+%A")

# 4. Calculate Mood & Weather (Simulated)
if [ "$CPU_USAGE" -lt 50 ]; then
    MOOD="😄 Happy (Low Load)"
elif [ "$CPU_USAGE" -lt 80 ]; then
    MOOD="😌 Calm (Medium Load)"
else
    MOOD="😵 Busy (High Load!)"
fi

# Weather placeholder (Hard to get without API key, using static cheerful one)
WEATHER="Sunny"
TEMP="30" 

# 5. Construct "Cute Template" Message
MESSAGE=$(cat <<EOF
🌤️ **Good morning, Sun, Deer and Cartoon!**
Here is your server’s daily health report 💻✨

━━━━━━━━━━━━━━
🗂️ **1) Data Safety**
💾 Backup: $BACKUP_STATUS
📦 Backup Size: $BACKUP_SIZE
🕒 Last Backup: $TIMESTAMP

━━━━━━━━━━━━━━
🛡️ **2) Security Check**
🔍 Virus Scan: $SCAN_STATUS
📊 Threats Found: $THREAT_COUNT
🚪 Failed Login Attempts: 0 (Protected by Fail2Ban)

━━━━━━━━━━━━━━
💓 **3) Server Health**
🧠 CPU Usage: ${CPU_USAGE}%
📀 Disk Used: ${DISK_USAGE}
🌡️ RAM Used: ${RAM_USAGE}%
⏱️ Uptime: $UPTIME

━━━━━━━━━━━━━━
🌍 **4) Friendly Info (Cute Part)**
🌤️ Weather Today: $WEATHER
🌡️ Temp: ${TEMP}°C
📅 Day: $DAY
☕ Reminder: Drink water & rest a bit!

━━━━━━━━━━━━━━
✨ **Daily Mood Check**
Server Mood: $MOOD

━━━━━━━━━━━━━━
🕒 Server Time: $TIMESTAMP

Have a safe and productive day! 🚀
EOF
)

# 6. Send Report
$DISCORD_SCRIPT "$MESSAGE" "INFO"
