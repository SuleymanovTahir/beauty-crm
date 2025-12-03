import sys
import os
import requests
import json

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.connection import get_db_connection
from db.employees import update_employee_service

def test_ui_logic():
    print("="*60)
    print("🧪 TESTING UI LOGIC (BACKEND SIDE)")
    print("="*60)

    # 1. Get Gulya's ID
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE full_name LIKE '%Gulya%'")
    gulya_id = c.fetchone()[0]
    conn.close()
    print(f"   Gulya ID: {gulya_id}")

    # 2. Simulate "Toggle Service" (Add 'Manicure')
    print("\n1. Simulating 'Toggle Service' (Add 'Manicure')...")
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id, price, duration FROM services WHERE name = 'Manicure'")
    service = c.fetchone()
    service_id = service[0]
    default_price = service[1]
    default_duration = service[2]
    conn.close()

    # Frontend calls POST /users/{id}/services
    # We simulate this by calling the DB function directly as the API just wraps it
    # But wait, the API logic for POST is:
    # await api.post(`/users/${employeeId}/services`, { ... })
    
    # Let's use the update_employee_service function which acts as an upsert if we provide all fields%s
    # No, the frontend calls POST to add, DELETE to remove.
    # Let's verify the POST logic (add_employee_service)
    from db.employees import add_employee_service, remove_employee_service
    
    # Ensure it's removed first
    remove_employee_service(gulya_id, service_id)
    
    # Add it
    add_employee_service(
        gulya_id, 
        service_id, 
        price=default_price, 
        duration=default_duration,
        is_online_booking_enabled=True,
        is_calendar_enabled=True
    )
    print("   ✅ Service added via DB function")

    # Verify
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM user_services WHERE user_id = %s AND service_id = %s", (gulya_id, service_id))
    row = c.fetchone()
    conn.close()
    if row:
        print("   ✅ Service found in DB")
    else:
        print("   ❌ Service NOT found in DB")

    # 3. Simulate "Inline Edit" (Update Price & Duration)
    print("\n2. Simulating 'Inline Edit' (Update Price & Duration)...")
    # Frontend calls PUT /users/{id}/services/{service_id}
    
    success = update_employee_service(
        gulya_id, 
        service_id,
        price=123.0,
        duration=90,
        is_online_booking_enabled=False
    )
    
    if success:
        print("   ✅ Update successful")
    
    # Verify
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT price, duration, is_online_booking_enabled FROM user_services WHERE user_id = %s AND service_id = %s", (gulya_id, service_id))
    row = c.fetchone()
    conn.close()
    
    print(f"   New Values: Price={row[0]}, Duration={row[1]}, Online={row[2]}")
    if row[0] == 123.0 and row[1] == 90 and row[2] == 0:
        print("   ✅ Values match update")
    else:
        print("   ❌ Values DO NOT match")

    # Cleanup
    print("\n3. Cleanup...")
    remove_employee_service(gulya_id, service_id)
    print("   ✅ Service removed")

if __name__ == "__main__":
    test_ui_logic()
