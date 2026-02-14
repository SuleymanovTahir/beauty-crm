#!/usr/bin/env python3
"""
Package Scheduler Service
Automatically activates and deactivates special packages based on schedule.
"""

import sys
import os
from datetime import datetime, time
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection
from utils.logger import log_info, log_error

def process_scheduled_packages():
    """Process packages that need to be activated or deactivated"""
    log_info("Starting package scheduler check")

    conn = get_db_connection()
    c = conn.cursor()

    try:
        current_date = datetime.now().date()
        current_time = datetime.now().time()
        current_datetime = datetime.now()

        # 1. Auto-activate packages that are scheduled for today
        c.execute("""
            SELECT id, name, schedule_date, schedule_time, auto_activate
            FROM special_packages
            WHERE scheduled = TRUE
              AND is_active = FALSE
              AND auto_activate = TRUE
              AND schedule_date = %s
        """, (current_date,))

        packages_to_activate = c.fetchall()

        for pkg in packages_to_activate:
            pkg_id, pkg_name, schedule_date, schedule_time, auto_activate = pkg

            # Check if it's time to activate
            if schedule_time:
                # If schedule_time is specified, check if current time >= schedule time
                if isinstance(schedule_time, str):
                    schedule_time = datetime.strptime(schedule_time, '%H:%M:%S').time()

                if current_time >= schedule_time:
                    c.execute("""
                        UPDATE special_packages
                        SET is_active = TRUE,
                            scheduled = FALSE,
                            updated_at = %s
                        WHERE id = %s
                    """, (current_datetime.isoformat(), pkg_id))
                    log_info(f"Auto-activated package: {pkg_name} (ID: {pkg_id})")
            else:
                # No specific time, activate immediately
                c.execute("""
                    UPDATE special_packages
                    SET is_active = TRUE,
                        scheduled = FALSE,
                        updated_at = %s
                    WHERE id = %s
                """, (current_datetime.isoformat(), pkg_id))
                log_info(f"Auto-activated package: {pkg_name} (ID: {pkg_id})")

        # 2. Auto-deactivate packages that have passed their valid_until date
        c.execute("""
            SELECT id, name, valid_until
            FROM special_packages
            WHERE is_active = TRUE
              AND auto_deactivate = TRUE
              AND valid_until::date < %s
        """, (current_date,))

        packages_to_deactivate = c.fetchall()

        for pkg in packages_to_deactivate:
            pkg_id, pkg_name, valid_until = pkg

            c.execute("""
                UPDATE special_packages
                SET is_active = FALSE,
                    updated_at = %s
                WHERE id = %s
            """, (current_datetime.isoformat(), pkg_id))
            log_info(f"Auto-deactivated package: {pkg_name} (ID: {pkg_id}) - validity expired on {valid_until}")

        conn.commit()

        activated_count = len(packages_to_activate)
        deactivated_count = len(packages_to_deactivate)

        if activated_count > 0 or deactivated_count > 0:
            log_info(f"Package scheduler completed: {activated_count} activated, {deactivated_count} deactivated")
        else:
            log_info("Package scheduler completed: no changes")

    except Exception as e:
        log_error(f"Error in package scheduler: {str(e)}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    process_scheduled_packages()
