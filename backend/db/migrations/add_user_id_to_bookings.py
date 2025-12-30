"""
Migration: Add user_id column to bookings table
This allows proper tracking of bookings by user account
"""
import psycopg2
from db.connection import get_db_connection

def run_migration():
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        print("Adding user_id column to bookings table...")
        
        # Add user_id column
        c.execute("""
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
        """)
        
        # Create index for faster lookups
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_bookings_user_id 
            ON bookings(user_id);
        """)
        
        print("✅ Migration completed successfully!")
        conn.commit()
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
