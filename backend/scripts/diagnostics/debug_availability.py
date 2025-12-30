
from db.connection import get_db_connection
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.core.config import DATABASE_NAME
from backend.bot.tools import get_available_time_slots
from backend.services.master_schedule import MasterScheduleService
from datetime import datetime

def debug_availability():
    print(f"Checking availability for 2026-11-26 (Wednesday)")
    conn = get_db_connection()
    c = conn.cursor()

    print("\n--- Service Check ---")
    c.execute("SELECT id, name, name_ru FROM services WHERE name LIKE '%manicure%' OR name_ru LIKE '%маникюр%'")
    services_found = c.fetchall()
    print(f"Services found: {services_found}")
    
    for s_id, s_name, s_name_ru in services_found:
        print(f"Checking masters for service: {s_name} ({s_id})")
        c.execute("SELECT user_id, is_online_booking_enabled FROM user_services WHERE service_id = %s", (s_id,))
        links = c.fetchall()
        print(f"  Masters with this service: {links}")

    # 1. Check Masters
    print("\n--- Masters ---")
    c.execute("SELECT id, full_name, is_active, is_service_provider FROM users WHERE is_service_provider = TRUE")
    masters = c.fetchall()
    for m in masters:
        print(f"ID: {m[0]}, Name: {m[1]}, Active: {m[2]}, Provider: {m[3]}")
        
        # Check User Services
        c.execute("SELECT s.name, s.name_ru, us.is_online_booking_enabled FROM user_services us JOIN services s ON us.service_id = s.id WHERE us.user_id = %s", (m[0],))
        services = c.fetchall()
        print(f"  Services: {services}")
        for s in services:
            if 'manicure' in s[0].lower() or (s[1] and 'маникюр' in s[1].lower()):
                print(f"  !!! FOUND MANICURE: {s[0]} ({s[1]}), Enabled: {s[2]}")

        # Check Schedule for Wednesday (2)
        c.execute("SELECT start_time, end_time, is_active FROM user_schedule WHERE user_id = %s AND day_of_week = 2", (m[0],))
        schedule = c.fetchone()
        if schedule:
            print(f"  Schedule (Wed): {schedule[0]} - {schedule[1]}, Active: {schedule[2]}")
        else:
            print(f"  Schedule (Wed): NOT SET")

        # Check Time Offs
        c.execute("SELECT date_from, date_to FROM user_time_off WHERE user_id = %s", (m[0],))
        time_offs = c.fetchall()
        if time_offs:
            print(f"  Time Offs: {time_offs}")

        # Check Bookings
        c.execute("SELECT datetime, status FROM bookings WHERE master = %s AND datetime LIKE '2026-11-26%'", (m[1],))
        bookings = c.fetchall()
        if bookings:
            print(f"  Bookings on 2026-11-26: {bookings}")

    # 2. Run Tool
    print("\n--- Tool Result ---")
    
    # Debug Service Selection
    print("Debugging Service Selection for 'маникюр':")
    c.execute("SELECT id, name, duration FROM services WHERE name_ru LIKE '%маникюр%' OR name LIKE '%маникюр%' LIMIT 1")
    s_row = c.fetchone()
    if s_row:
        print(f"  Selected Service: ID={s_row[0]}, Name={s_row[1]}, Duration={s_row[2]}")
        # Check masters for THIS service
        c.execute("SELECT user_id FROM user_services WHERE service_id = %s AND is_online_booking_enabled = TRUE", (s_row[0],))
        masters_with_service = c.fetchall()
        print(f"  Masters with this service enabled: {masters_with_service}")
    else:
        print("  No service found for 'маникюр'")

    print("\nCalling get_available_time_slots('2026-11-26', service_name='маникюр')...")
    slots = get_available_time_slots("2026-11-26", service_name="маникюр")
    print(f"Slots found: {len(slots)}")
    for s in slots:
        print(s)

    print("\nCalling get_available_time_slots('2026-11-26', service_name=None) (ANY SERVICE)...")
    slots_any = get_available_time_slots("2026-11-26", service_name=None)
    print(f"Slots found (any): {len(slots_any)}")
    for s in slots_any[:5]:
        print(s)

    print("\n--- Direct Service Debug ---")
    service = MasterScheduleService()
    # Try with first master found
    c.execute("SELECT full_name FROM users WHERE is_service_provider = TRUE LIMIT 1")
    m_name = c.fetchone()[0]
    print(f"Testing with master: {m_name}")
    
    user_id = service._get_user_id(m_name)
    print(f"  _get_user_id('{m_name}') -> {user_id}")
    
    slots = service.get_available_slots(m_name, "2026-11-26", duration_minutes=60)
    print(f"  get_available_slots -> {len(slots)} slots")
    print(f"  Slots: {slots}")

    conn.close()

if __name__ == "__main__":
    debug_availability()
