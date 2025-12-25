"""
Migration: Add 'source' column to bookings table
"""
import sys
import os

# Add backend to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '../../../'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from db.connection import get_db_connection
from utils.logger import log_info, log_error

def add_source_column_to_bookings(db_name=None):
    """Add source column to bookings table if it doesn't exist"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Check if column exists
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='bookings' AND column_name='source'
        """)
        
        if not c.fetchone():
            print("Adding 'source' column to bookings table...")
            c.execute("ALTER TABLE bookings ADD COLUMN source TEXT DEFAULT 'manual'")
            conn.commit()
            log_info("Added 'source' column to bookings table", "migration")
            print("✅ Added 'source' column")
        else:
            print("ℹ️ 'source' column already exists in bookings table")
            
        conn.close()
        return True
    except Exception as e:
        log_error(f"Error adding source column: {e}", "migration")
        print(f"❌ Error adding source column: {e}")
        return False

if __name__ == "__main__":
    add_source_column_to_bookings()
