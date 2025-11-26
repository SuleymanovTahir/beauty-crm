#!/usr/bin/env python3
"""
Update employee details with correct information
Creates all employees if they don't exist
"""
import sqlite3
import sys
import os
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from core.config import DATABASE_NAME

def hash_password(password: str) -> str:
    """Simple password hashing"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

def column_exists(cursor, table, column):
    """Check if a column exists in a table"""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns

def update_employees():
    """Update employee details with correct information"""
    print("="*60)
    print("👥 UPDATING EMPLOYEE DETAILS")
    print("="*60)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Check if gender column exists
    has_gender = column_exists(c, 'users', 'gender')
    print(f"\n🔍 Gender column exists: {has_gender}")
    
    # Employee data with correct information
    employees = [
        {
            'username': 'gulya',
            'full_name': 'GULYA',
            'phone': '+971502029268',
            'email': None,  # No email
            'position': 'Nail Master/Waxing',
            'birthday': '1970-01-01',
            'gender': 'female',
            'is_service_provider': 1,
            'role': 'employee'
        },
        {
            'username': 'jennifer',
            'full_name': 'JENNIFER',
            'phone': '+971564208308',
            'email': 'peradillajennifer47@gmail.com',
            'position': 'Nail Master/Massage Therapist',
            'birthday': '1970-01-01',
            'gender': 'female',
            'is_service_provider': 1,
            'role': 'employee'
        },
        {
            'username': 'lyazzat',
            'full_name': 'LYAZZAT',
            'phone': None,
            'email': None,
            'position': 'Nail Master',
            'birthday': '1970-01-01',
            'gender': 'female',
            'is_service_provider': 1,
            'role': 'employee'
        },
        {
            'username': 'mestan',
            'full_name': 'MESTAN',
            'phone': '+971501800346',
            'email': 'amandurdyyeva80@gmail.com',
            'position': 'Hair Stylist',
            'birthday': '1970-01-01',
            'gender': 'female',
            'is_service_provider': 1,
            'role': 'employee'
        },
        {
            'username': 'simo',
            'full_name': 'SIMO',
            'phone': None,
            'email': None,
            'position': 'Hair Stylist',
            'birthday': '1970-01-01',
            'gender': 'male',
            'is_service_provider': 1,
            'role': 'employee'
        },
        {
            'username': 'tursunay',
            'full_name': 'Tursunay',
            'phone': '+971582081188',
            'email': 'rakhmattursinay@gmail.com',
            'position': 'Director',
            'birthday': '1970-01-01',
            'gender': 'female',
            'is_service_provider': 0,  # Director, not a service provider
            'role': 'director'  # Director role
        }
    ]
    
    try:
        for emp in employees:
            # Check if user exists
            c.execute("SELECT id FROM users WHERE username = ?", (emp['username'],))
            existing = c.fetchone()
            
            if existing:
                # Update existing user
                print(f"\n📝 Updating {emp['full_name']}...")
                if has_gender:
                    c.execute("""
                        UPDATE users 
                        SET full_name = ?, phone = ?, email = ?, position = ?, 
                            birthday = ?, gender = ?, is_service_provider = ?, role = ?
                        WHERE username = ?
                    """, (
                        emp['full_name'], emp['phone'], emp['email'], emp['position'],
                        emp['birthday'], emp['gender'], emp['is_service_provider'], 
                        emp['role'], emp['username']
                    ))
                else:
                    c.execute("""
                        UPDATE users 
                        SET full_name = ?, phone = ?, email = ?, position = ?, 
                            birthday = ?, is_service_provider = ?, role = ?
                        WHERE username = ?
                    """, (
                        emp['full_name'], emp['phone'], emp['email'], emp['position'],
                        emp['birthday'], emp['is_service_provider'], 
                        emp['role'], emp['username']
                    ))
                print(f"   ✅ Updated {emp['full_name']}")
            else:
                # Create new user
                print(f"\n➕ Creating {emp['full_name']}...")
                password_hash = hash_password('12345678')  # Default password
                
                if has_gender:
                    c.execute("""
                        INSERT INTO users (
                            username, password_hash, full_name, phone, email, position,
                            birthday, gender, is_service_provider, role, is_active, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                    """, (
                        emp['username'], password_hash, emp['full_name'], emp['phone'],
                        emp['email'], emp['position'], emp['birthday'], emp['gender'],
                        emp['is_service_provider'], emp['role'], datetime.now().isoformat()
                    ))
                else:
                    c.execute("""
                        INSERT INTO users (
                            username, password_hash, full_name, phone, email, position,
                            birthday, is_service_provider, role, is_active, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                    """, (
                        emp['username'], password_hash, emp['full_name'], emp['phone'],
                        emp['email'], emp['position'], emp['birthday'],
                        emp['is_service_provider'], emp['role'], datetime.now().isoformat()
                    ))
                print(f"   ✅ Created {emp['full_name']} (password: 12345678)")
        
        conn.commit()
        
        # Show final list
        print("\n" + "="*60)
        print("📋 FINAL EMPLOYEE LIST:")
        print("="*60)
        
        if has_gender:
            c.execute("""
                SELECT full_name, username, position, phone, email, gender, is_service_provider
                FROM users 
                WHERE role IN ('employee', 'admin')
                ORDER BY full_name
            """)
            
            for row in c.fetchall():
                name, username, position, phone, email, gender, is_provider = row
                gender_icon = "👨" if gender == 'male' else "👩"
                provider_status = "✅ Service Provider" if is_provider else "❌ Not Provider"
                print(f"{gender_icon} {name:15} | {username:12} | {position:25} | {provider_status}")
                if phone:
                    print(f"   📱 {phone}")
                if email:
                    print(f"   📧 {email}")
        else:
            c.execute("""
                SELECT full_name, username, position, phone, email, is_service_provider
                FROM users 
                WHERE role IN ('employee', 'admin')
                ORDER BY full_name
            """)
            
            for row in c.fetchall():
                name, username, position, phone, email, is_provider = row
                provider_status = "✅ Service Provider" if is_provider else "❌ Not Provider"
                print(f"👤 {name:15} | {username:12} | {position:25} | {provider_status}")
                if phone:
                    print(f"   📱 {phone}")
                if email:
                    print(f"   📧 {email}")
        
        print("\n" + "="*60)
        print("✅ Employee details updated successfully!")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    update_employees()
