import sys
import os
import requests
import json

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.connection import get_db_connection
from db.employees import update_employee_service, get_employee_services

def test_employee_services():
    print("="*60)
    print("🧪 TESTING EMPLOYEE SERVICES UPDATE")
    print("="*60)

    # 1. Verify Gulya's services in DB
    print("\n1. Verifying Gulya's services in DB...")
    conn = get_db_connection()
    c = conn.cursor()
    
    # Get Gulya's ID
    # Get Employee ID (Any)
    c.execute("SELECT id, full_name FROM users WHERE is_active=TRUE AND role IN ('employee', 'master') LIMIT 1")
    row = c.fetchone()
    if not row:
         print("❌ No employee found")
         return
    gulya_id = row[0]
    print(f"   Employee ID: {gulya_id} ({row[1]})")

    # Get a Service ID (Any)
    c.execute("SELECT id, name FROM services LIMIT 1")
    srv = c.fetchone()
    if not srv:
         print("❌ No services found")
         return
    service_id = srv[0]
    service_name = srv[1]
    
    # Check if user has this service, if not add it
    c.execute("SELECT price, duration, is_online_booking_enabled FROM user_services WHERE user_id=%s AND service_id=%s", (gulya_id, service_id))
    us = c.fetchone()
    if not us:
         print(f"   Adding service {service_name} to employee...")
         c.execute("INSERT INTO user_services (user_id, service_id, price, duration, is_online_booking_enabled) VALUES (%s, %s, 100, 60, TRUE)", (gulya_id, service_id))
         conn.commit()
         us = [100.0, 60, 1]

    # Check service
    print(f"   ✅ '{service_name}' found: Price={us[0]}, Duration={us[1]}, Online={us[2]}")
    
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
