
import sqlite3
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.config import DATABASE_NAME

def fix_schedule_and_services():
    print(f"Fixing schedule and services...")
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # 1. Find Manicure Services
    c.execute("SELECT id, name FROM services WHERE name LIKE '%Manicure%' OR name_ru LIKE '%Маникюр%'")
    services = c.fetchall()
    print(f"Found {len(services)} manicure services.")
    
    manicure_ids = [s[0] for s in services]
    if not manicure_ids:
        print("No manicure services found!")
        return

    # 2. Find Active Masters
    c.execute("SELECT id, full_name FROM users WHERE is_active = 1 AND is_service_provider = 1")
    masters = c.fetchall()
    print(f"Found {len(masters)} active masters: {[m[1] for m in masters]}")

    if not masters:
        print("No active masters found!")
        return

    # 3. Assign Services and Fix Schedule
    for master_id, master_name in masters:
        print(f"\nProcessing {master_name} (ID: {master_id})...")
        
        # Assign ALL manicure services
        for s_id in manicure_ids:
            try:
                # Check if exists
                c.execute("SELECT 1 FROM user_services WHERE user_id = ? AND service_id = ?", (master_id, s_id))
                if not c.fetchone():
                    print(f"  Assigning service {s_id} to {master_name}")
                    c.execute("INSERT INTO user_services (user_id, service_id, is_online_booking_enabled) VALUES (?, ?, 1)", (master_id, s_id))
                else:
                    # Ensure enabled
                    c.execute("UPDATE user_services SET is_online_booking_enabled = 1 WHERE user_id = ? AND service_id = ?", (master_id, s_id))
            except Exception as e:
                print(f"  Error assigning service {s_id}: {e}")

        # Fix Schedule (Mon-Sun, 10:00-21:00)
        for day in range(7):
            try:
                c.execute("SELECT 1 FROM user_schedule WHERE user_id = ? AND day_of_week = ?", (master_id, day))
                if not c.fetchone():
                    print(f"  Setting schedule for day {day}")
                    c.execute("INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active) VALUES (?, ?, '10:00', '21:00', 1)", (master_id, day))
                else:
                    # Ensure active
                    c.execute("UPDATE user_schedule SET is_active = 1, start_time = '10:00', end_time = '21:00' WHERE user_id = ? AND day_of_week = ?", (master_id, day))
            except Exception as e:
                print(f"  Error setting schedule for day {day}: {e}")

    conn.commit()
    conn.close()
    print("\nDone!")

if __name__ == "__main__":
    fix_schedule_and_services()
