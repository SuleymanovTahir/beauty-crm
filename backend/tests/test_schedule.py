#!/usr/bin/env python3
"""
Test script for Employee Scheduling API
"""
import sys
import os
import sqlite3
from fastapi.testclient import TestClient

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from core.config import DATABASE_NAME

client = TestClient(app)

def setup_test_data():
    """Create test user and employee"""
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    try:
        # Create a test user and employee
        cursor.execute("INSERT INTO users (username, password_hash, full_name, role, is_active) VALUES ('test_schedule_user', 'hash', 'Test Schedule User', 'employee', 1)")
        user_id = cursor.lastrowid
        
        cursor.execute("INSERT INTO employees (full_name, position, is_active) VALUES ('Test Schedule User', 'Master', 1)")
        employee_id = cursor.lastrowid
        
        # Link them
        # Check if employee_id column exists in users
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'employee_id' in columns:
            cursor.execute("UPDATE users SET employee_id = ? WHERE id = ?", (employee_id, user_id))
        
        conn.commit()
        return {'user_id': user_id, 'employee_id': employee_id}, conn
    except Exception as e:
        conn.close()
        raise e

def cleanup_test_data(conn, data):
    """Remove test data"""
    cursor = conn.cursor()
    user_id = data['user_id']
    employee_id = data['employee_id']
    
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    cursor.execute("DELETE FROM employees WHERE id = ?", (employee_id,))
    cursor.execute("DELETE FROM employee_schedule WHERE employee_id = ?", (employee_id,))
    cursor.execute("DELETE FROM employee_unavailability WHERE employee_id = ?", (employee_id,))
    conn.commit()
    conn.close()

def test_get_schedule(data):
    print("   Testing GET schedule...", end=" ")
    user_id = data['user_id']
    response = client.get(f"/api/schedule/user/{user_id}")
    
    if response.status_code != 200:
        print(f"FAILED (Status {response.status_code})")
        return False
        
    schedule = response.json()
    if not isinstance(schedule, list) or len(schedule) != 7:
        print(f"FAILED (Invalid data format: {len(schedule)} items)")
        return False
        
    print("PASSED")
    return True

def test_update_schedule(data):
    print("   Testing PUT schedule...", end=" ")
    user_id = data['user_id']
    
    new_schedule = [
        {"day_of_week": 0, "start_time": "09:00", "end_time": "18:00", "is_working": True},
        {"day_of_week": 1, "start_time": "09:00", "end_time": "18:00", "is_working": True},
        {"day_of_week": 2, "start_time": "00:00", "end_time": "00:00", "is_working": False}
    ]
    
    response = client.put(f"/api/schedule/user/{user_id}", json={"schedule": new_schedule})
    
    if response.status_code != 200:
        print(f"FAILED (Status {response.status_code})")
        return False
        
    # Verify
    response = client.get(f"/api/schedule/user/{user_id}")
    schedule = response.json()
    
    monday = next((d for d in schedule if d['day_of_week'] == 0), None)
    wednesday = next((d for d in schedule if d['day_of_week'] == 2), None)
    
    if not monday or monday['start_time'] != "09:00" or not monday['is_working']:
        print("FAILED (Monday update incorrect)")
        return False
        
    if not wednesday or wednesday['is_working']:
        print("FAILED (Wednesday update incorrect)")
        return False
        
    print("PASSED")
    return True

def test_time_off(data):
    print("   Testing Time Off CRUD...", end=" ")
    user_id = data['user_id']
    
    # Create
    time_off_data = {
        "start_datetime": "2025-12-01 00:00:00",
        "end_datetime": "2025-12-05 23:59:59",
        "type": "vacation",
        "reason": "Winter break"
    }
    response = client.post(f"/api/schedule/user/{user_id}/time-off", json=time_off_data)
    
    if response.status_code != 200:
        print(f"FAILED (Create status {response.status_code})")
        return False
        
    created_id = response.json()['id']
    
    # Read
    response = client.get(f"/api/schedule/user/{user_id}/time-off")
    items = response.json()
    
    if len(items) != 1 or items[0]['reason'] != "Winter break":
        print("FAILED (Read incorrect)")
        return False
        
    # Delete
    response = client.delete(f"/api/schedule/time-off/{created_id}")
    if response.status_code != 200:
        print(f"FAILED (Delete status {response.status_code})")
        return False
        
    # Verify Delete
    response = client.get(f"/api/schedule/user/{user_id}/time-off")
    if len(response.json()) != 0:
        print("FAILED (Delete verification failed)")
        return False
        
    print("PASSED")
    return True

def main():
    print("\nRunning Schedule API Tests...")
    try:
        data, conn = setup_test_data()
    except Exception as e:
        print(f"Setup failed: {e}")
        return False
        
    try:
        results = [
            test_get_schedule(data),
            test_update_schedule(data),
            test_time_off(data)
        ]
        
        success = all(results)
        if success:
            print("\n✅ All schedule tests passed!")
        else:
            print("\n❌ Some schedule tests failed.")
            
        return success
    finally:
        cleanup_test_data(conn, data)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
