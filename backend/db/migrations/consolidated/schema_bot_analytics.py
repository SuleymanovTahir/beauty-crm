
"""
Consolidated Bot Analytics Schema Migration
"""
from db.connection import get_db_connection

def migrate_bot_analytics_schema(db_path="salon_bot.db"):
    """
    Apply all bot_analytics table schema changes
    """
    print("\n" + "="*60)
    print("🔧 BOT ANALYTICS SCHEMA MIGRATION")
    print("="*60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Ensure table exists first (if not created by init)
        # Note: id SERIAL for Postgres
        c.execute('''CREATE TABLE IF NOT EXISTS bot_analytics
                 (id SERIAL PRIMARY KEY,
                  instagram_id TEXT NOT NULL,
                  session_started TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  session_ended TIMESTAMP,
                  messages_count INTEGER DEFAULT 0,
                  outcome TEXT DEFAULT 'in_progress',
                  escalated_to_manager BOOLEAN DEFAULT FALSE,
                  booking_created BOOLEAN DEFAULT FALSE,
                  booking_id INTEGER,
                  cancellation_requested BOOLEAN DEFAULT FALSE,
                  language_detected TEXT,
                  FOREIGN KEY (instagram_id) REFERENCES clients(instagram_id))''')

        # Get existing columns
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='bot_analytics'")
        existing_columns = {col[0] for col in c.fetchall()}
        
        # Define columns we want to ensure exist
        columns_to_add = {
             'last_message_at': "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
             'reminder_sent': "BOOLEAN DEFAULT FALSE",
             'context': "TEXT"
        }
        
        added_count = 0
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                print(f"  ➕ Adding column: {column_name}")
                c.execute(f"ALTER TABLE bot_analytics ADD COLUMN {column_name} {column_type}")
                added_count += 1
        
        if added_count > 0:
            print(f"\n✅ Added {added_count} columns to bot_analytics table")
        else:
            print("\n✅ All columns already exist")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        # Don't raise, just log error so other migrations can proceed if possible, or raise if critical
        # raising is safer for schema consistency
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_bot_analytics_schema()
