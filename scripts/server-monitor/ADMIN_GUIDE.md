# Server Administration & Monitoring Guide 🛡️

This guide documents the automated monitoring system installed on the `final-project-backend` server.

## 📂 Directory Structure

All monitoring scripts are located in:
**/home/deploy/final-project-backend/scripts/server-monitor/**

| Script | Purpose | Frequency |
| :--- | :--- | :--- |
| `monitor_cpu.sh` | **Watchdog**: Checks usage every minute. Alerts if > 90%. | 1 min |
| `daily_report.sh` | **Organizer**: Runs backup, scan, stats, and sends daily report. | Daily (07:00 TH) |
| `backup_data.sh` | **Backup**: Dumps MySQL DB & zips uploads to `~/backups`. | Called by Report |
| `perform_scan.sh` | **Antivirus**: Checks for malicious processes & files. | Called by Report |
| `discord_alert.sh` | **Messenger**: Sends styled messages to Discord. | Helper |

---

## ⚙️ How to Manage Cron Jobs (Automation)

The system uses `cron` to run scripts automatically.

### View Current Jobs
```bash
crontab -l
```

### Edit Jobs
```bash
crontab -e
```
**Standard Configuration:**
```bash
# Watchdog (Every Minute)
* * * * * /home/deploy/final-project-backend/scripts/server-monitor/monitor_cpu.sh >> ...

# Daily Report (00:00 UTC = 07:00 Thailand)
0 0 * * * /home/deploy/final-project-backend/scripts/server-monitor/daily_report.sh >> ...
```

---

## 🚀 How to Run Manually

If you need to trigger a check immediately:

**1. Run Daily Report (Backup + Scan)**
```bash
./scripts/server-monitor/daily_report.sh
```
*Effect: Sends the "Good Morning" message to Discord with fresh stats.*

**2. Run CPU Watchdog**
```bash
./scripts/server-monitor/monitor_cpu.sh
```
*Effect: Checks CPU. If low, does nothing. If high, alerts (debounced).*

---

## ⚠️ Troubleshooting & Conflicts

### Q: Why didn't I get a CPU Alert?
*   **Debounce Logic:** The script is designed to NOT spam you. If it sent an alert 10 minutes ago, it will **wait 1 hour** before sending another one.
*   **Reset:** delete the lock file to force a new alert:
    ```bash
    rm /home/deploy/final-project-backend/logs/last_cpu_alert.txt
    ```

### Q: Why is "Virus Scan" red?
*   It found a process name matching known miners (`xmrig`, `scanner_linux`).
*   **Action:**
    1.  Run `top` to see the process.
    2.  Run `kill -9 <PID>`.
    3.  Check `scripts/server-monitor/perform_scan.sh` to add new virus names to the blocklist.

### Q: Backup Failed?
*   Check disk space: `df -h`
*   Check MySQL container status: `docker ps` (must be running).
