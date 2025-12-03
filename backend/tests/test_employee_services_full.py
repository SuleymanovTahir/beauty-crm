import sys
import os
import requests
import json

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.connection import get_db_connection

def test_employee_services():
    print("="*60)
    print("🧪 TESTING EMPLOYEE SERVICES UPDATE")
    print("="*60)

    # 1. Verify Gulya's services in DB
    print("\n1. Verifying Gulya's services in DB...")
    conn = get_db_connection()
    c = conn.cursor()
    
    # Get Gulya's ID
    c.execute("SELECT id FROM users WHERE full_name LIKE '%Gulya%'")
    gulya_id = c.fetchone()[0]
    print(f"   Gulya ID: {gulya_id}")

    # Check 'Half arms' service
    c.execute("""
        SELECT us.price, us.duration, us.is_online_booking_enabled 
        FROM user_services us 
        JOIN services s ON us.service_id = s.id 
        WHERE us.user_id = %s AND s.name = 'Half arms'
    """, (gulya_id,))
    row = c.fetchone()
    
    if row:
        print(f"   ✅ 'Half arms' found: Price={row[0]}, Duration={row[1]}, Online={row[2]}")
        if row[0] == 50 and row[1] == 60 and row[2] == 1:
            print("      ✅ Values match expected")
        else:
            print("      ❌ Values DO NOT match expected")
    else:
        print("   ❌ 'Half arms' service not found for Gulya")

    conn.close()

    # 2. Test API Update (Simulating Frontend)
    print("\n2. Testing API Update (PUT /employees/{id}/services/{service_id})...")
    
    # We need a session token. For now, we'll mock the auth or use a direct DB check if API is hard to reach without login
    # Since we are running locally, we can try to use the API if server is running.
    # But for simplicity and reliability in this script, let's test the DB function `update_employee_service` directly
    # and then the API endpoint if possible.
    
    from db.employees import update_employee_service, get_employee_services
    
    # Get 'Half arms' service ID
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id FROM services WHERE name = 'Half arms'")
    service_id = c.fetchone()[0]
    conn.close()
    
    print(f"   Updating 'Half arms' (id={service_id}) for Gulya...")
    
    # Update to new values
    success = update_employee_service(
        gulya_id, service_id,
        price=55.0,
        duration=45,
        is_online_booking_enabled=False
    )
    
    if success:
        print("   ✅ Update function returned True")
    else:
        print("   ❌ Update function returned False")
        
    # Verify in DB
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT price, duration, is_online_booking_enabled 
        FROM user_services 
        WHERE user_id = %s AND service_id = %s
    """, (gulya_id, service_id))
    row = c.fetchone()
    conn.close()
    
    print(f"   New values: Price={row[0]}, Duration={row[1]}, Online={row[2]}")
    
    if row[0] == 55.0 and row[1] == 45 and row[2] == 0:
        print("   ✅ DB update verified!")
    else:
        print("   ❌ DB update failed verification")

    # Revert changes
    print("\n3. Reverting changes...")
    update_employee_service(
        gulya_id, service_id,
        price=50.0,
        duration=60,
        is_online_booking_enabled=True
    )
    print("   ✅ Reverted")

if __name__ == "__main__":
    test_employee_services()
