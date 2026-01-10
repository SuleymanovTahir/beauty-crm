
import sys
import os

# Add project root/backend to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from db.connection import get_db_connection

def inspect_masters():
    conn = get_db_connection()
    c = conn.cursor()
    
    print("\n--- POSITIONS ---")
    c.execute("SELECT id, name FROM positions")
    positions_data = c.fetchall()
    positions = {row[0]: row[1] for row in positions_data}
    for pid, name in positions.items():
        print(f"ID: {pid}, Name: {name}")

    print("\n--- MASTERS (EMPLOYEES) ---")
    c.execute("SELECT id, full_name, role, position, position_id FROM users WHERE role = 'employee' AND is_active = TRUE")
    masters = c.fetchall()
    for m in masters:
        pos_id = m[4]
        pos_name = positions.get(pos_id, "NONE")
        print(f"ID: {m[0]}, Name: {m[1]}, TextPos: {m[3]}, PosID: {pos_id} ({pos_name})")

    conn.close()

if __name__ == "__main__":
    inspect_masters()
