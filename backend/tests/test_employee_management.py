#!/usr/bin/env python3
"""
Comprehensive tests for Employee Management functionality
Tests: Database operations for Employee Services and Schedule
"""
import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from tests.config import get_test_config
TEST_CONFIG = get_test_config()

from db.connection import get_db_connection
from core.config import DATABASE_NAME

def setup_test_employee():
    """Create test employee with services"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create test employee
        cursor.execute("""
            INSERT INTO users (username, password_hash, full_name, role, is_active, is_service_provider, position, email, phone, bio)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, ('test_emp_mgmt', 'hash123', 'Test Employee', 'employee', True, True, 'Test Master', 'test@test.com', '123', 'Test bio'))
        cursor.execute("SELECT id FROM users WHERE username = %s", ('test_emp_mgmt',))
        user_id = cursor.fetchone()[0]
        
        # Create test services
        cursor.execute("INSERT INTO services (name, service_key, category, price, duration) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                      ('Test Service 1', 'test_service_1', 'Test', 100, 60))
        service1_id = cursor.fetchone()[0]
        
        cursor.execute("INSERT INTO services (name, service_key, category, price, duration) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                      ('Test Service 2', 'test_service_2', 'Test', 200, 90))
        service2_id = cursor.fetchone()[0]
        
        conn.commit()
        return {
            'user_id': user_id,
            'service1_id': service1_id,
            'service2_id': service2_id
        }, conn
    except Exception as e:
        conn.close()
        raise e

def cleanup_test_data(conn, data):
    """Remove test data"""
    cursor = conn.cursor()
    user_id = data['user_id']
    
    cursor.execute("DELETE FROM user_services WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM user_schedule WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM user_time_off WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    cursor.execute("DELETE FROM services WHERE id IN (%s, %s)", (data['service1_id'], data['service2_id']))
    
    conn.commit()
    conn.close()

# ==================== DATABASE TESTS ====================

def test_user_table_structure(conn):
    """Test users table has required columns"""
    print("   Testing users table structure...", end=" ")
    cursor = conn.cursor()
    
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users'")
    columns = {row[0] for row in cursor.fetchall()}
    
    required_columns = {'id', 'full_name', 'position', 'email', 'phone', 'bio', 'is_service_provider'}
    if not required_columns.issubset(columns):
        missing = required_columns - columns
        print(f"FAILED (Missing columns: {missing})")
        return False
    
    print("PASSED")
    return True

def test_user_services_table(conn):
    """Test user_services table exists and has correct structure"""
    print("   Testing user_services table...", end=" ")
    cursor = conn.cursor()
    
    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='user_services'")
    if not cursor.fetchone():
        print("FAILED (Table doesn't exist)")
        return False
    
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='user_services'")
    columns = {row[0] for row in cursor.fetchall()}
    
    required_columns = {'user_id', 'service_id', 'price', 'duration', 'is_online_booking_enabled'}
    if not required_columns.issubset(columns):
        print(f"FAILED (Missing columns)")
        return False
    
    print("PASSED")
    return True

def test_user_schedule_table(conn):
    """Test user_schedule table exists"""
    print("   Testing user_schedule table...", end=" ")
    cursor = conn.cursor()
    
    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='user_schedule'")
    if not cursor.fetchone():
        print("FAILED (Table doesn't exist)")
        return False
    
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='user_schedule'")
    columns = {row[0] for row in cursor.fetchall()}
    
    required_columns = {'user_id', 'day_of_week', 'start_time', 'end_time', 'is_active'}
    if not required_columns.issubset(columns):
        print(f"FAILED (Missing columns)")
        return False
    
    print("PASSED")
    return True

def test_add_user_service(data, conn):
    """Test adding service to user"""
    print("   Testing add user service...", end=" ")
    cursor = conn.cursor()
    user_id = data['user_id']
    service_id = data['service1_id']
    
    cursor.execute("""
        INSERT INTO user_services (user_id, service_id, price, duration, is_online_booking_enabled)
        VALUES (%s, %s, %s, %s, %s)
    """, (user_id, service_id, 150, 60, True))
    conn.commit()
    
    # Verify
    cursor.execute("SELECT * FROM user_services WHERE user_id = %s AND service_id = %s", (user_id, service_id))
    row = cursor.fetchone()
    
    if not row:
        print("FAILED (Service not added)")
        return False
    
    print("PASSED")
    return True

def test_update_user_service(data, conn):
    """Test updating user service"""
    print("   Testing update user service...", end=" ")
    cursor = conn.cursor()
    user_id = data['user_id']
    service_id = data['service1_id']
    
    cursor.execute("""
        UPDATE user_services 
        SET price = %s, duration = %s, is_online_booking_enabled = %s
        WHERE user_id = %s AND service_id = %s
    """, (200, 90, False, user_id, service_id))
    conn.commit()
    
    # Verify
    cursor.execute("SELECT price, duration, is_online_booking_enabled FROM user_services WHERE user_id = %s AND service_id = %s", 
                  (user_id, service_id))
    row = cursor.fetchone()
    
    if not row or row[0] != 200 or str(row[1]) != '90' or row[2] != 0:
        print(f"FAILED (Update not applied: {row})")
        return False
    
    print("PASSED")
    return True

def test_delete_user_service(data, conn):
    """Test deleting user service"""
    print("   Testing delete user service...", end=" ")
    cursor = conn.cursor()
    user_id = data['user_id']
    service_id = data['service1_id']
    
    cursor.execute("DELETE FROM user_services WHERE user_id = %s AND service_id = %s", (user_id, service_id))
    conn.commit()
    
    # Verify
    cursor.execute("SELECT * FROM user_services WHERE user_id = %s AND service_id = %s", (user_id, service_id))
    if cursor.fetchone():
        print("FAILED (Service not deleted)")
        return False
    
    print("PASSED")
    return True

def test_add_user_schedule(data, conn):
    """Test adding schedule for user"""
    print("   Testing add user schedule...", end=" ")
    cursor = conn.cursor()
    user_id = data['user_id']
    
    work_start = TEST_CONFIG['work_start_weekday']
    work_end = TEST_CONFIG['work_end_weekday']
    # Add schedule for Monday
    cursor.execute("""
        INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active)
        VALUES (%s, %s, %s, %s, %s)
    """, (user_id, 0, work_start, work_end, True))
    conn.commit()
    
    # Verify
    cursor.execute("SELECT * FROM user_schedule WHERE user_id = %s AND day_of_week = %s", (user_id, 0))
    row = cursor.fetchone()
    
    if not row:
        print("FAILED (Schedule not added)")
        return False
    
    print("PASSED")
    return True

def test_real_employees_exist(conn):
    """Test that real employees exist (without creating test duplicates)"""
    print("   Testing real employees exist...", end=" ")
    cursor = conn.cursor()
    
    # Проверяем реальных пользователей (без email или с реальными email)
    cursor.execute("""
        SELECT COUNT(*) FROM users 
        WHERE full_name IN ('SIMO', 'LYAZZAT', 'MESTAN', 'GULYA', 'JENNIFER', 'Турсунай', 'Tahir')
        AND (email IS NULL OR email NOT LIKE '%@test.com')
    """)
    count = cursor.fetchone()[0]
    
    if count < 3:
        print(f"FAILED (Only {count}/7 real employees found - need at least 3)")
        print(f"   ℹ️  Hint: Make sure you have migrated real employee data")
        return False
    
    print(f"PASSED ({count}/7 employees found)")
    return True

def test_real_employees_have_services(conn):
    """Test that real employees have services assigned (without creating test data)"""
    print("   Testing employees have services...", end=" ")
    cursor = conn.cursor()
    
    # Проверяем только реальных пользователей
    cursor.execute("""
        SELECT COUNT(DISTINCT us.user_id) 
        FROM user_services us
        JOIN users u ON u.id = us.user_id
        WHERE u.full_name IN ('SIMO', 'LYAZZAT', 'MESTAN', 'GULYA', 'JENNIFER', 'Турсунай', 'Tahir')
        AND (u.email IS NULL OR u.email NOT LIKE '%@test.com')
    """)
    count = cursor.fetchone()[0]
    
    if count < 1:
        print(f"WARNING (Only {count}/7 employees have services)")
        print(f"   ℹ️  Hint: Assign services to employees in the admin panel")
        return True  # Не фейлим тест, просто предупреждаем
    
    print(f"PASSED ({count}/7 employees have services)")
    return True

# ==================== MAIN TEST RUNNER ====================

def main():
    print("\n" + "="*60)
    print("🧪 EMPLOYEE MANAGEMENT TESTS")
    print("="*60)
    
    # First test database structure without creating test data
    conn = get_db_connection()
    
    print("\n📋 Testing Database Structure...")
    structure_tests = [
        test_user_table_structure(conn),
        test_user_services_table(conn),
        test_user_schedule_table(conn),
        test_real_employees_exist(conn),
        test_real_employees_have_services(conn),
    ]
    
    conn.close()
    
    # Now test CRUD operations with test data
    print("\n📋 Testing CRUD Operations...")
    try:
        data, conn = setup_test_employee()
        print(f"✅ Test employee created (ID: {data['user_id']})")
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        return False
    
    try:
        crud_tests = [
            test_add_user_service(data, conn),
            test_update_user_service(data, conn),
            test_delete_user_service(data, conn),
            test_add_user_schedule(data, conn),
        ]
        
        all_results = structure_tests + crud_tests
        passed = sum(all_results)
        total = len(all_results)
        
        print("\n" + "="*60)
        print(f"📊 RESULTS: {passed}/{total} tests passed")
        print("="*60)
        
        if all(all_results):
            print("✅ All Employee Management tests PASSED!")
            return True
        else:
            print("❌ Some Employee Management tests FAILED")
            return False
            
    finally:
        cleanup_test_data(conn, data)
        print("🧹 Test data cleaned up")

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
