import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.clients import delete_client
from db.connection import get_db_connection

def test_delete():
    print("🚀 Test delete_client script started")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    test_id = 'test_delete_debug'
    
    # 1. Create dummy client
    print(f"1️⃣ Creating dummy client: {test_id}")
    c.execute("""
        INSERT INTO clients (instagram_id, name, created_at)
        VALUES (%s, 'Test User', NOW())
        ON CONFLICT (instagram_id) DO NOTHING
    """, (test_id,))
    conn.commit()
    conn.close()
    
    # 2. Try to delete
    print(f"2️⃣ Calling delete_client({test_id!r})")
    try:
        result = delete_client(test_id)
        print(f"👉 delete_client returned: {result}")
    except Exception as e:
        print(f"💥 Exception caught in script: {e}")

if __name__ == "__main__":
    test_delete()
