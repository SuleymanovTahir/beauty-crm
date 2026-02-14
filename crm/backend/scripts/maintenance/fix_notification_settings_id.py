
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(backend_dir))

from db.connection import get_db_connection

def fix_notification_settings_id():
    print("🔧 Fixing notification_settings ID column...")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Check if sequence exists
        c.execute("SELECT 1 FROM pg_class WHERE relname = 'notification_settings_id_seq'")
        if not c.fetchone():
            print("  Creating sequence notification_settings_id_seq...")
            c.execute("CREATE SEQUENCE notification_settings_id_seq")
        else:
            print("  Sequence notification_settings_id_seq already exists.")
            
        # Set default value
        print("  Setting default value for id column...")
        c.execute("ALTER TABLE notification_settings ALTER COLUMN id SET DEFAULT nextval('notification_settings_id_seq')")
        
        # Sync sequence
        print("  Syncing sequence with max id...")
        c.execute("SELECT MAX(id) FROM notification_settings")
        max_id = c.fetchone()[0]
        
        if max_id:
            print(f"  Syncing sequence with max id: {max_id}")
            c.execute(f"SELECT setval('notification_settings_id_seq', {max_id})")
        else:
            print("  Table is empty, resetting sequence to 1...")
            c.execute("SELECT setval('notification_settings_id_seq', 1, false)")
        
        conn.commit()
        print("✅ Successfully fixed notification_settings ID column")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_notification_settings_id()
