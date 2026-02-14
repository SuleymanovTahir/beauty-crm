# Package Scheduler Service

## Description

The Package Scheduler Service automatically manages the activation and deactivation of special packages based on their schedule settings.

## Installation

### Option 1: Run as Separate Process

```bash
cd /Users/tahir/Desktop/beauty-crm/crm/backend
PYTHONPATH=/Users/tahir/Desktop/beauty-crm/crm/backend ./venv/bin/python services/package_scheduler.py
```

### Option 2: Setup as Cron Job (Recommended)

Add the following line to crontab to run every minute:

```bash
# Open crontab
crontab -e

# Add this line (runs every minute)
* * * * * cd /Users/tahir/Desktop/beauty-crm/crm/backend && PYTHONPATH=/Users/tahir/Desktop/beauty-crm/crm/backend ./venv/bin/python services/package_scheduler.py >> /tmp/package_scheduler.log 2>&1
```

### Option 3: System Service (Linux/macOS)

Create file `/etc/systemd/system/package-scheduler.service`:

```ini
[Unit]
Description=Beauty CRM Package Scheduler
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/Users/tahir/Desktop/beauty-crm/crm/backend
Environment="PYTHONPATH=/Users/tahir/Desktop/beauty-crm/crm/backend"
ExecStart=/Users/tahir/Desktop/beauty-crm/crm/backend/venv/bin/python /Users/tahir/Desktop/beauty-crm/crm/backend/services/package_scheduler.py
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
```

Then activate the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable package-scheduler
sudo systemctl start package-scheduler
```

## Functionality

The scheduler performs the following tasks:

1. **Auto-activate scheduled packages** - Activates packages at their scheduled date/time
2. **Auto-deactivate expired packages** - Deactivates packages after their valid_until date

### Auto-Activation

When a package has:
- `scheduled = TRUE`
- `auto_activate = TRUE`
- `schedule_date` set to today (or past)
- `schedule_time` set to current time (or earlier)

The scheduler will:
1. Set `is_active = TRUE`
2. Set `scheduled = FALSE`
3. Update `updated_at` timestamp

### Auto-Deactivation

When a package has:
- `is_active = TRUE`
- `auto_deactivate = TRUE`
- `valid_until` date has passed

The scheduler will:
1. Set `is_active = FALSE`
2. Update `updated_at` timestamp

## Logging

Logs are written via `utils.logger`. Check log files to track scheduler operations.

## Requirements

- PostgreSQL database with `special_packages` table
- Migration `add_package_scheduling.sql` must be applied
- Required fields in special_packages:
  - `scheduled` (boolean)
  - `schedule_date` (date)
  - `schedule_time` (time)
  - `auto_activate` (boolean)
  - `auto_deactivate` (boolean)
  - `is_active` (boolean)
  - `valid_until` (date)

## Notes

- The scheduler checks the database every time it runs (recommended: every minute)
- For production, use cron or systemd
- For scaling, consider using Celery or RQ
- The scheduler is idempotent - running it multiple times won't cause issues

## Testing

Test the scheduler manually:

```bash
# Run once manually
cd /Users/tahir/Desktop/beauty-crm/crm/backend
PYTHONPATH=/Users/tahir/Desktop/beauty-crm/crm/backend ./venv/bin/python services/package_scheduler.py

# Check logs
tail -f /tmp/package_scheduler.log
```

## Example Usage

1. Create a package with scheduling:
   - Set `scheduled = true`
   - Set `schedule_date = '2025-12-31'`
   - Set `schedule_time = '09:00:00'`
   - Set `auto_activate = true`
   - Set `is_active = false`

2. The scheduler will automatically activate it on 2025-12-31 at 09:00

3. Set `auto_deactivate = true` and `valid_until = '2026-01-31'`

4. The scheduler will automatically deactivate it after 2026-01-31
