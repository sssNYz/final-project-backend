#!/bin/bash
# Test script for Medication Log API
# Usage: ./test_medication_log.sh <ACCESS_TOKEN>

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://82.26.104.98"
# BASE_URL="http://localhost:3000"

# Get token from argument or prompt
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./test_medication_log.sh <ACCESS_TOKEN>${NC}"
    echo ""
    echo "To get an access token, login via Supabase or use the admin signin endpoint."
    exit 1
fi

TOKEN="$1"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Medication Log API Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ "$method" == "GET" ]; then
        curl -s -X GET "${BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json"
    else
        curl -s -X POST "${BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" \
            -d "$data"
    fi
}

# ============================================
# TEST 1: List Medication Logs
# ============================================
echo -e "${YELLOW}TEST 1: List Medication Logs${NC}"
echo "Endpoint: GET /api/mobile/v1/medication-log/list"
echo ""

# First, get user's profile
echo -e "${BLUE}Step 1a: Getting user profile...${NC}"
PROFILE_RESPONSE=$(api_call "GET" "/api/mobile/v1/profile/list")
echo "$PROFILE_RESPONSE" | jq '.' 2>/dev/null || echo "$PROFILE_RESPONSE"
echo ""

# Extract first profileId
PROFILE_ID=$(echo "$PROFILE_RESPONSE" | jq -r '.profiles[0].profileId' 2>/dev/null)

if [ "$PROFILE_ID" == "null" ] || [ -z "$PROFILE_ID" ]; then
    echo -e "${RED}No profile found. Please create a profile first.${NC}"
    exit 1
fi

echo -e "${GREEN}Found profileId: $PROFILE_ID${NC}"
echo ""

echo -e "${BLUE}Step 1b: Listing medication logs for profile...${NC}"
LIST_RESPONSE=$(api_call "GET" "/api/mobile/v1/medication-log/list?profileId=${PROFILE_ID}")
echo "$LIST_RESPONSE" | jq '.' 2>/dev/null || echo "$LIST_RESPONSE"
echo ""

# Extract first logId for further tests
LOG_ID=$(echo "$LIST_RESPONSE" | jq -r '.logs[0].logId' 2>/dev/null)

if [ "$LOG_ID" == "null" ] || [ -z "$LOG_ID" ]; then
    echo -e "${YELLOW}No medication logs found.${NC}"
    echo "To create a log, you need to have a medicine regimen scheduled."
    echo "The medication-cron-worker will create logs when medications are due."
    echo ""
    echo -e "${BLUE}Tip: You can manually insert a test log using Prisma or SQL.${NC}"
    echo ""
else
    echo -e "${GREEN}Found logId: $LOG_ID${NC}"
    echo ""

    # ============================================
    # TEST 2: Get Medication Log Detail
    # ============================================
    echo -e "${YELLOW}TEST 2: Get Medication Log Detail${NC}"
    echo "Endpoint: GET /api/mobile/v1/medication-log/{logId}"
    echo ""

    DETAIL_RESPONSE=$(api_call "GET" "/api/mobile/v1/medication-log/${LOG_ID}")
    echo "$DETAIL_RESPONSE" | jq '.' 2>/dev/null || echo "$DETAIL_RESPONSE"
    echo ""

    # ============================================
    # TEST 3: Respond to Medication - SNOOZE
    # ============================================
    echo -e "${YELLOW}TEST 3: Respond with SNOOZE${NC}"
    echo "Endpoint: POST /api/mobile/v1/medication-log/response"
    echo ""

    SNOOZE_DATA="{\"logId\": ${LOG_ID}, \"responseStatus\": \"SNOOZE\"}"
    echo -e "${BLUE}Request body: ${SNOOZE_DATA}${NC}"
    
    SNOOZE_RESPONSE=$(api_call "POST" "/api/mobile/v1/medication-log/response" "$SNOOZE_DATA")
    echo "$SNOOZE_RESPONSE" | jq '.' 2>/dev/null || echo "$SNOOZE_RESPONSE"
    echo ""

    # Check if snooze was successful
    NEXT_REMINDER=$(echo "$SNOOZE_RESPONSE" | jq -r '.nextReminderAt' 2>/dev/null)
    SNOOZED_COUNT=$(echo "$SNOOZE_RESPONSE" | jq -r '.snoozedCount' 2>/dev/null)
    
    if [ "$NEXT_REMINDER" != "null" ] && [ -n "$NEXT_REMINDER" ]; then
        echo -e "${GREEN}✓ Snooze successful!${NC}"
        echo "  Next reminder at: $NEXT_REMINDER"
        echo "  Snoozed count: $SNOOZED_COUNT"
    fi
    echo ""

    # ============================================
    # TEST 4: Respond with TAKE
    # ============================================
    echo -e "${YELLOW}TEST 4: Respond with TAKE${NC}"
    echo "Endpoint: POST /api/mobile/v1/medication-log/response"
    echo ""

    TAKE_DATA="{\"logId\": ${LOG_ID}, \"responseStatus\": \"TAKE\", \"note\": \"Taken with breakfast\"}"
    echo -e "${BLUE}Request body: ${TAKE_DATA}${NC}"
    
    TAKE_RESPONSE=$(api_call "POST" "/api/mobile/v1/medication-log/response" "$TAKE_DATA")
    echo "$TAKE_RESPONSE" | jq '.' 2>/dev/null || echo "$TAKE_RESPONSE"
    echo ""

    MESSAGE=$(echo "$TAKE_RESPONSE" | jq -r '.message' 2>/dev/null)
    if [[ "$MESSAGE" == *"TAKE"* ]]; then
        echo -e "${GREEN}✓ Take response recorded!${NC}"
    fi
    echo ""
fi

# ============================================
# TEST 5: List with Date Filter
# ============================================
echo -e "${YELLOW}TEST 5: List with Date Filter${NC}"
echo "Endpoint: GET /api/mobile/v1/medication-log/list?profileId=...&startDate=...&endDate=..."
echo ""

TODAY=$(date -u +"%Y-%m-%dT00:00:00Z")
TOMORROW=$(date -u -d "+1 day" +"%Y-%m-%dT23:59:59Z" 2>/dev/null || date -u -v+1d +"%Y-%m-%dT23:59:59Z" 2>/dev/null || echo "2026-02-02T23:59:59Z")

echo "Filtering from $TODAY to $TOMORROW"
FILTERED_RESPONSE=$(api_call "GET" "/api/mobile/v1/medication-log/list?profileId=${PROFILE_ID}&startDate=${TODAY}&endDate=${TOMORROW}&limit=10")
echo "$FILTERED_RESPONSE" | jq '.' 2>/dev/null || echo "$FILTERED_RESPONSE"
echo ""

# ============================================
# TEST 6: Error Cases
# ============================================
echo -e "${YELLOW}TEST 6: Error Cases${NC}"
echo ""

echo -e "${BLUE}6a: Missing profileId${NC}"
ERROR_RESPONSE=$(api_call "GET" "/api/mobile/v1/medication-log/list")
echo "$ERROR_RESPONSE" | jq '.' 2>/dev/null || echo "$ERROR_RESPONSE"
echo ""

echo -e "${BLUE}6b: Invalid logId${NC}"
ERROR_RESPONSE=$(api_call "GET" "/api/mobile/v1/medication-log/99999")
echo "$ERROR_RESPONSE" | jq '.' 2>/dev/null || echo "$ERROR_RESPONSE"
echo ""

echo -e "${BLUE}6c: Invalid responseStatus${NC}"
INVALID_DATA="{\"logId\": 1, \"responseStatus\": \"INVALID\"}"
ERROR_RESPONSE=$(api_call "POST" "/api/mobile/v1/medication-log/response" "$INVALID_DATA")
echo "$ERROR_RESPONSE" | jq '.' 2>/dev/null || echo "$ERROR_RESPONSE"
echo ""

# ============================================
# Summary
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "To view API documentation, visit:"
echo -e "${GREEN}${BASE_URL}/docs.html${NC}"
echo ""
echo "To monitor snooze worker logs:"
echo -e "${YELLOW}pm2 logs snooze-cron-worker${NC}"
