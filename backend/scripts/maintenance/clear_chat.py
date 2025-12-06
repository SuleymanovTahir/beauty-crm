import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from db.connection import get_db_connection

def clear_chat_history(instagram_id):
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Check if client exists
        c.execute("SELECT instagram_id, name FROM clients WHERE instagram_id = %s", (instagram_id,))
        client = c.fetchone()
        
        if not client:
            print(f"❌ Client '{instagram_id}' not found in database.")
            # Ask to proceed anyway?
            # return
        
        # Count messages
        c.execute("SELECT COUNT(*) FROM chat_history WHERE instagram_id = %s", (instagram_id,))
        count = c.fetchone()[0]
        
        if count == 0:
            print(f"⚠️ No messages found for '{instagram_id}'.")
            return

        print(f"🗑️ Found {count} messages for '{instagram_id}'.")
        
        # Delete
        c.execute("DELETE FROM chat_history WHERE instagram_id = %s", (instagram_id,))
        conn.commit()
        
        print(f"✅ Successfully deleted {count} messages for '{instagram_id}'.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 clear_chat.py <instagram_id>")
        sys.exit(1)
        
    client_id = sys.argv[1]
    clear_chat_history(client_id)
