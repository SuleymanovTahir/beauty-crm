"""
Migration to add user profile enhancements:
- Avatar URL
- Birth Date
- Notification Preferences
"""
from db.connection import get_db_connection

def migrate_user_enhancements(db_path="salon_bot.db"):
    """
    Apply schema changes for user profile enhancements
    """
    print("\n" + "="*60)
    print("👤 USER ENHANCEMENTS MIGRATION")
    print("="*60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Check existing columns in clients table (users are stored in clients table in this system)
        # Note: The system seems to use 'clients' table for end-users/clients.
        
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='clients'")
        existing_columns = {col[0] for col in c.fetchall()}
        
        columns_to_add = {
            'avatar_url': 'TEXT',
            'birth_date': 'TEXT', # YYYY-MM-DD
            'notification_preferences': "TEXT DEFAULT '{\"email\": true, \"sms\": true, \"push\": true}'",
            'loyalty_points': 'INTEGER DEFAULT 0'
        }
        
        for col, dtype in columns_to_add.items():
            if col not in existing_columns:
                print(f"  ➕ Adding column to clients: {col}")
                c.execute(f"ALTER TABLE clients ADD COLUMN {col} {dtype}")
            else:
                print(f"  ✓ Column {col} already exists in clients")
        
        # Create client_notifications table
        print("  🔧 Checking client_notifications table...")
        c.execute("""
            CREATE TABLE IF NOT EXISTS client_notifications (
                id SERIAL PRIMARY KEY,
                client_instagram_id TEXT REFERENCES clients(instagram_id),
                notification_type TEXT,
                title TEXT,
                message TEXT,
                sent_at TIMESTAMP,
                read_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ Table client_notifications ensured")

        print("  ✅ User enhancements applied successfully")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"\n❌ Error during user enhancements migration: {e}")
        conn.rollback()
        # Don't raise, just return False so other migrations can proceed if needed, 
        # but typically we want to know. 
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_user_enhancements()
