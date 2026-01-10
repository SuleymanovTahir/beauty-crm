
import sys
import os
import hashlib

# Add project root/backend to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from db.connection import get_db_connection

def inspect_data():
    conn = get_db_connection()
    c = conn.cursor()
    
    print("\n--- POSITIONS ---")
    c.execute("SELECT id, name FROM positions")
    positions = c.fetchall()
    for p in positions:
        print(f"ID: {p[0]}, Name: {p[1]}")
        
    print("\n--- USERS (EMPLOYEES) ---")
    c.execute("SELECT id, full_name, full_name_ru, role, position_id FROM users WHERE is_active = TRUE")
    users = c.fetchall()
    for u in users:
        print(f"ID: {u[0]}, Name: {u[1]}, RU: {u[2]}, Role: {u[3]}, PosID: {u[4]}")

    print("\n--- SERVICES ---")
    c.execute("SELECT id, name FROM services LIMIT 10")
    services = c.fetchall()
    for s in services:
        print(f"ID: {s[0]}, Name: {s[1]}")
        
    conn.close()

if __name__ == "__main__":
    inspect_data()
