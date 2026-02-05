#!/bin/bash

# ==========================================
# Backup Script for Final Project Backend
# ==========================================

# --- Configuration ---
BACKUP_ROOT="/home/deploy/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
PROJECT_DIR="/home/deploy/final-project-backend"
UPLOADS_DIR="$PROJECT_DIR/public/uploads"
ENV_FILE="$PROJECT_DIR/.env"

# Database Config
DB_CONTAINER="final_project_mysql"
DB_USER="root"
DB_PASS="s31122546"
DB_NAME="final_project_db"

# --- Setup ---
mkdir -p "$BACKUP_DIR"
echo "[$(date)] Starting backup to $BACKUP_DIR"

# --- 1. Database Backup ---
echo "[$(date)] Backing up MySQL database..."
if docker ps | grep -q "$DB_CONTAINER"; then
    docker exec "$DB_CONTAINER" /usr/bin/mysqldump -u "$DB_USER" --password="$DB_PASS" "$DB_NAME" > "$BACKUP_DIR/db_dump.sql"
    if [ $? -eq 0 ]; then
        echo "[$(date)] Database backup successful."
        gzip "$BACKUP_DIR/db_dump.sql"
    else
        echo "[$(date)] ERROR: Database backup failed!"
    fi
else
    echo "[$(date)] ERROR: MySQL container '$DB_CONTAINER' is not running!"
fi

# --- 2. Uploads Backup ---
echo "[$(date)] Backing up uploaded files..."
if [ -d "$UPLOADS_DIR" ]; then
    tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
    echo "[$(date)] Uploads backup successful."
else
    echo "[$(date)] Uploads directory not found ($UPLOADS_DIR), skipping."
fi

# --- 3. Environment Backup ---
echo "[$(date)] Backing up .env file..."
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$BACKUP_DIR/.env.backup"
    echo "[$(date)] .env backup successful."
else
    echo "[$(date)] .env file not found, skipping."
fi

# --- Summary ---
echo "[$(date)] Backup process completed."
echo "Backup location: $BACKUP_DIR"

# Optional: Print size
du -sh "$BACKUP_DIR"
