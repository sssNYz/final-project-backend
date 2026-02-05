#!/bin/bash

# ==========================================
# Discord Alert Script for Final Project Backend
# ==========================================

WEBHOOK_URL="https://discord.com/api/webhooks/1468955946121429055/6uMinRoHwem85UK3-S-nXjRYXAsBBLQuxqZGkjsMTZnLaysyFNLg3SIVCoNOMGLxpUWv"

# Arguments
MESSAGE="$1"
LEVEL="${2:-INFO}" # INFO, WARNING, ALARM, SUCCESS

# Colors (Decimal)
COLOR_INFO=3447003    # Blue
COLOR_WARNING=16776960 # Yellow
COLOR_ALARM=15158332   # Red
COLOR_SUCCESS=3066993  # Green

# Set Color & Emoji based on Level
if [ "$LEVEL" == "ALARM" ]; then
    COLOR=$COLOR_ALARM
    TITLE="🚨 Critical Security Alert!"
elif [ "$LEVEL" == "WARNING" ]; then
    COLOR=$COLOR_WARNING
    TITLE="⚠️ Warning"
elif [ "$LEVEL" == "SUCCESS" ]; then
    COLOR=$COLOR_SUCCESS
    TITLE="✅ Success"
else
    COLOR=$COLOR_INFO
    TITLE="ℹ️ Info"
fi

# Get dynamic data
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Construct JSON Payload
# We use jq if available, otherwise simple string construction (risky with quotes). 
# Using a robust heredoc method for safety.

# Construct JSON Payload using Python for safety
# (Bash strings with newlines break JSON structure easily)

JSON_PAYLOAD=$(python3 -c "
import json
import sys

try:
    title = sys.argv[1]
    message = sys.argv[2]
    color = int(sys.argv[3])
    timestamp = sys.argv[4]

    payload = {
        'username': 'Security Capybara 🕶️',
        'avatar_url': 'https://medi-buddy.duckdns.org/discord-profile/capybara.png',
        'embeds': [{
            'title': title,
            'description': message,
            'color': color,
            'footer': {'text': f'Server Time: {timestamp}'}
        }]
    }
    print(json.dumps(payload))
except Exception as e:
    print(json.dumps({'content': f'Error generating payload: {str(e)}'}))
" "$TITLE" "$MESSAGE" "$COLOR" "$TIMESTAMP")

# Send to Discord
curl -s -H "Content-Type: application/json" -X POST -d "$JSON_PAYLOAD" "$WEBHOOK_URL"
