#!/usr/bin/env python3
"""
Script to reset passwords for all staff users with unique passwords.
Run from backend directory: python3 scripts/reset_all_passwords.py
"""

import hashlib
import os
from datetime import datetime
import psycopg2

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'beauty_crm',
    'user': 'beauty_crm_user',
    'password': 'local_password'
}

# Unique passwords for each user (username -> password)
USER_PASSWORDS = {
    'admin': 'admin123',        # Will be changed to tahir
    'tahir': 'admin123',        # Tahir's password
    'tursunai': 'tursunai123',
    'simo': 'simo123',
    'jennifer': 'jennifer123',
    'mestan': 'mestan123',
    'lyazzat': 'lyazzat123',
    'Akbota': 'akbota123',
    'gulya': 'gulya123',
}

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def reset_passwords():
    conn = get_connection()
    c = conn.cursor()

    try:
        # First, change admin login to tahir
        print("\n[1] Changing login 'admin' -> 'tahir'...")
        c.execute("UPDATE users SET username = 'tahir' WHERE username = 'admin'")
        if c.rowcount > 0:
            print("   [OK] Login changed from 'admin' to 'tahir'")
        else:
            print("   [INFO] User 'admin' not found or already changed")

        # Get all staff users (not clients)
        c.execute("""
            SELECT id, username, full_name, role, position
            FROM users
            WHERE role != 'client' AND deleted_at IS NULL
            ORDER BY role, full_name
        """)
        users = c.fetchall()

        if not users:
            print("No staff users found!")
            return

        print(f"\n[2] Resetting passwords for {len(users)} users...")
        print("=" * 60)

        credentials = []

        for user in users:
            user_id, username, full_name, role, position = user

            # Get password for user (default if not specified)
            password = USER_PASSWORDS.get(username, f"{username.lower()}123")
            password_hash = hashlib.sha256(password.encode()).hexdigest()

            # Update password
            c.execute("""
                UPDATE users SET password_hash = %s WHERE id = %s
            """, (password_hash, user_id))

            credentials.append({
                'name': full_name,
                'login': username,
                'role': role,
                'position': position or 'N/A',
                'password': password
            })

            print(f"  [OK] {full_name} ({username}) - {role} - password: {password}")

        conn.commit()
        print("=" * 60)
        print(f"Successfully reset {len(users)} passwords!")

        # Write credentials file
        cred_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'staff_credentials.txt')
        with open(cred_file, 'w', encoding='utf-8') as f:
            f.write("=== STAFF CREDENTIALS (CONFIDENTIAL) ===\n")
            f.write(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 40 + "\n\n")

            for cred in credentials:
                f.write(f"Name: {cred['name']}\n")
                f.write(f"Login: {cred['login']}\n")
                f.write(f"Role: {cred['role']}\n")
                f.write(f"Position: {cred['position']}\n")
                f.write(f"Password: {cred['password']}\n")
                f.write("-" * 40 + "\n")

        print(f"\nCredentials saved to: {cred_file}")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    reset_passwords()
