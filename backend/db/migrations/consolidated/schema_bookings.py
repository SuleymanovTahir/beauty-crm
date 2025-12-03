"""
Consolidated Bookings Schema Migration
All schema changes for bookings table in one place
"""
from db.connection import get_db_connection


def migrate_bookings_schema(db_path="salon_bot.db"):
    """
    Apply all bookings table schema changes
    """
    print("\n" + "="*60)
    print("🔧 BOOKINGS SCHEMA MIGRATION")
    print("="*60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Get existing columns
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'bookings\'")
        existing_columns = {col[0] for col in c.fetchall()}
        
        # Define all columns that should exist
        columns_to_add = {
            'employee_id': 'INTEGER',
            'master': 'TEXT',
            'master_id': 'INTEGER',
            'course_id': 'INTEGER',
            'course_session_number': 'INTEGER',
            'waitlist_position': 'INTEGER',
            'is_waitlist': 'BOOLEAN DEFAULT FALSE',
            'reminder_sent_24h': 'BOOLEAN DEFAULT FALSE',
            'reminder_sent_2h': 'BOOLEAN DEFAULT FALSE',
            'reminder_sent_at': 'TEXT',
        }
        
        # Add missing columns
        added_count = 0
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                print(f"  ➕ Adding column: {column_name}")
                c.execute(f"ALTER TABLE bookings ADD COLUMN {column_name} {column_type}")
                added_count += 1
        
        # Create booking_reminder_settings table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS booking_reminder_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                reminder_24h_enabled BOOLEAN DEFAULT TRUE,
                reminder_2h_enabled BOOLEAN DEFAULT TRUE,
                reminder_24h_template TEXT,
                reminder_2h_template TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            )
        """)
        print("  ✅ booking_reminder_settings table ensured")
        
        # Migration: Add new columns for flexible reminder system
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'booking_reminder_settings\'")
        reminder_columns = [col[0] for col in c.fetchall()]
        
        reminder_migrations = {
            'days_before': 'BOOLEAN DEFAULT FALSE',
            'hours_before': 'BOOLEAN DEFAULT FALSE',
            'is_enabled': 'BOOLEAN DEFAULT TRUE',
            'notification_type': "TEXT DEFAULT \'email\'"
        }
        
        for col, col_type in reminder_migrations.items():
            if col not in reminder_columns:
                c.execute(f"ALTER TABLE booking_reminder_settings ADD COLUMN {col} {col_type}")
                print(f"  ➕ Added column: {col}")

        # Create booking_drafts table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS booking_drafts (
                instagram_id TEXT PRIMARY KEY,
                data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ booking_drafts table ensured")
        
        if added_count > 0:
            print(f"\n✅ Added {added_count} columns to bookings table")
        else:
            print("\n✅ All columns already exist")
            
        # Create indexes for analytics
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings(status, created_at)")
        print("  ✅ Analytics indexes ensured")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_bookings_schema()
