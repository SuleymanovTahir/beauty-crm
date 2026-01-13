
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection

def run_migration():
    print("🚀 Optimizing bookings table indexes...")
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Status index
        print("Creating index on bookings(status)...")
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)")
        
        # Master index
        print("Creating index on bookings(master)...")
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_master ON bookings(master)")

        print("✅ Indexes created successfully.")
        conn.commit()
    except Exception as e:
        print(f"❌ Error creating indexes: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
