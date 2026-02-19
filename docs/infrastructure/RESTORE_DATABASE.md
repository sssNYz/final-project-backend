# Database Restoration Guide

This guide explains how to restore the MySQL database from the automated daily backups in case of data loss or corruption.

## 1. Locate the Backup

Backups are stored in your home directory at `/home/deploy/backups/`.
Each backup is in a folder named with the date and time (e.g., `2026-02-18_00-00-01`).

To find the latest backup:
```bash
ls -lt /home/deploy/backups/ | head -5
```

Navigate to the desired backup folder:
```bash
cd /home/deploy/backups/2026-02-18_00-00-01
```

## 2. Restore Procedure

The backup file is compressed (`db_dump.sql.gz`). You must decompress it and import it into the running MySQL Docker container.

### Step 2.1: Extract the Backup
Decompress the SQL file to a temporary location:

```bash
gunzip -c db_dump.sql.gz > restoration_temp.sql
```

### Step 2.2: Import to MySQL
Use the `docker exec` command to pipe the SQL file directly into the database.

**Command:**
```bash
docker exec -i final_project_mysql mysql -u root -ps31122546 final_project_db < restoration_temp.sql
```

*(Note: There is no space between `-p` and the password `s31122546`)*

### Step 2.3: Apply Schema Updates
If the backup is old, the database schema might be outdated compared to the current code. Run Prisma to apply any missing migrations (like new columns):

```bash
cd /home/deploy/final-project-backend
npx prisma db push
```

### Step 2.4: Clean Up
Remove the temporary SQL file to save space:

```bash
rm restoration_temp.sql
```

## 3. Verify Restoration

Restart the backend server to clear any connection pools or caches:

```bash
pm2 restart nextjs-backend
```

Check the logs to ensure the application connects successfully:

```bash
pm2 logs nextjs-backend --lines 50
```

## 4. Troubleshooting

*   **Error: `Container not found`**: Ensure the MySQL container is running:
    ```bash
    docker ps | grep mysql
    ```
    If not running, start it:
    ```bash
    docker-compose -f deployment/docker-compose.yml up -d db
    ```

*   **Error: `Access denied`**: Verify the database password in `.env` matches the command (`s31122546`).
