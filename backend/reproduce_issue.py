
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.soft_delete import soft_delete_user
from db.connection import get_db_connection

def test_soft_delete():
    print("🚀 Testing soft_delete_user...")
    
    # 1. Create a dummy user
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (username, password_hash, role, is_active) VALUES ('test_del_user', 'hash', 'employee', TRUE) RETURNING id")
        user_id = c.fetchone()[0]
        conn.commit()
        print(f"✅ Created dummy user ID: {user_id}")
        
        # 2. Try to soft delete
        deleted_by = {"id": 1, "username": "admin", "role": "admin"}
        success = soft_delete_user(user_id, deleted_by)
        
        if success:
            print("✅ soft_delete_user succeeded.")
        else:
            print("❌ soft_delete_user returned False.")
            
    except Exception as e:
        print(f"❌ Exception during test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        try:
            c.execute("DELETE FROM users WHERE id = %s", (user_id,))
            c.execute("DELETE FROM deleted_items WHERE entity_id = %s AND entity_type = 'user'", (str(user_id),))
            conn.commit()
            print("Cleanup done.")
        except:
            pass
        conn.close()

if __name__ == "__main__":
    test_soft_delete()
