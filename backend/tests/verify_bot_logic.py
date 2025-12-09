import sys
import os
from db.connection import get_db_connection as _get_db_connection
from datetime import datetime, timedelta
from bot.tools import get_available_time_slots

def get_db_connection():
    conn = _get_db_connection()
    return conn

def verify_bot_logic():
    print("🤖 Verifying Bot Logic...")
    
    conn = get_db_connection()
    c = conn.cursor()

    # 1. Setup: Ensure Mestan provides "Hair Treatment" and it is enabled
    c.execute("SELECT id FROM services WHERE service_key = 'hair_treatment'")
    row = c.fetchone()
    if row:
        service_id = row[0]
    else:
        print("   Creating service 'hair_treatment'...")
        c.execute("INSERT INTO services (service_key, name, price, category, duration) VALUES ('hair_treatment', 'Hair Treatment', 100, 'Hair', '60') RETURNING id")
        service_id = c.fetchone()[0]
        conn.commit()
    
    c.execute("SELECT id FROM users WHERE full_name ILIKE '%Mestan%'")
    mestan_id = c.fetchone()[0]

    print(f"   Service ID: {service_id}, Mestan ID: {mestan_id}")

    # 1.1 Ensure Schedule Exists for Tomorrow
    tomorrow_dt = datetime.now() + timedelta(days=1)
    tomorrow = tomorrow_dt.strftime('%Y-%m-%d')
    day_of_week = tomorrow_dt.weekday() # 0=Monday, 6=Sunday
    
    print(f"   Checking slots for {tomorrow} (Day {day_of_week})...")

    # Check if schedule exists for this day of week
    c.execute("SELECT id FROM user_schedule WHERE user_id = %s AND day_of_week = %s", (mestan_id, day_of_week))
    schedule_exists = c.fetchone()
    
    if not schedule_exists:
        print(f"   Creating schedule for Mestan for day {day_of_week}...")
        c.execute("""INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active)
                     VALUES (%s, %s, '10:00', '20:00', TRUE)""", (mestan_id, day_of_week))
    else:
        # Ensure it is active and has hours
        c.execute("""UPDATE user_schedule 
                     SET is_active = TRUE, start_time = '10:00', end_time = '20:00'
                     WHERE user_id = %s AND day_of_week = %s""", (mestan_id, day_of_week))
        
    conn.commit()

    # Enable online booking
    # Enable online booking
    c.execute("""
        INSERT INTO user_services (user_id, service_id, is_online_booking_enabled)
        VALUES (%s, %s, TRUE)
        ON CONFLICT (user_id, service_id) 
        DO UPDATE SET is_online_booking_enabled = TRUE
    """, (mestan_id, service_id))
    conn.commit()
    print("   ✅ Enabled online booking for Mestan -> Hair Treatment")

    # DEBUG: Check user status
    c.execute("SELECT is_active, is_service_provider FROM users WHERE id = %s", (mestan_id,))
    status = c.fetchone()
    print(f"   DEBUG: Mestan Status - Active: {status[0]}, Service Provider: {status[1]}")

    # DEBUG: Check if he is in potential masters query
    c.execute("""
        SELECT DISTINCT u.full_name
        FROM users u
        JOIN user_services us ON u.id = us.user_id
        WHERE u.is_active = TRUE 
          AND u.is_service_provider = TRUE
          AND us.service_id = %s
          AND us.is_online_booking_enabled = TRUE
    """, (service_id,))
    masters = c.fetchall()
    print(f"   DEBUG: Potential Masters for service {service_id}: {[m[0] for m in masters]}")

    # 2. Check availability (Should find Mestan)
    # First, test MasterScheduleService directly
    from services.master_schedule import MasterScheduleService
    schedule_service = MasterScheduleService()
    direct_slots = schedule_service.get_available_slots("MESTAN", tomorrow, 60)
    print(f"   DEBUG: Direct MasterScheduleService slots for MESTAN: {direct_slots}")
    
    slots_enabled = get_available_time_slots(tomorrow, service_name="Hair Treatment")
    print(f"   DEBUG: get_available_time_slots returned {len(slots_enabled)} slots")

    
    mestan_found = any(s['master'] == 'MESTAN' for s in slots_enabled)
    if mestan_found:
        print("   ✅ Found Mestan in slots when enabled.")
    else:
        print("   ⚠️  Warning: Mestan not found even when enabled (might be fully booked or schedule issue).")
        # If schedule is empty, we might need to add schedule, but let's assume default schedule exists or is generated.
        # If this fails, we know the baseline is broken.

    # 3. Disable online booking
    c.execute("""UPDATE user_services 
                 SET is_online_booking_enabled = FALSE 
                 WHERE user_id = %s AND service_id = %s""", 
              (mestan_id, service_id))
    conn.commit()
    print("   🚫 Disabled online booking for Mestan -> Hair Treatment")

    # 4. Check availability (Should NOT find Mestan)
    slots_disabled = get_available_time_slots(tomorrow, service_name="Hair Treatment")
    
    mestan_found_disabled = any(s['master'] == 'MESTAN' for s in slots_disabled)
    
    if not mestan_found_disabled:
        print("   ✅ Mestan correctly NOT found in slots when disabled.")
    else:
        print("   ❌ FAILURE: Mestan found in slots even when disabled!")

    # 5. Cleanup (Re-enable)
    c.execute("""UPDATE user_services 
                 SET is_online_booking_enabled = TRUE 
                 WHERE user_id = %s AND service_id = %s""", 
              (mestan_id, service_id))
    conn.commit()
    print("   🔄 Re-enabled online booking for Mestan.")
    
    conn.close()

if __name__ == "__main__":
    verify_bot_logic()
