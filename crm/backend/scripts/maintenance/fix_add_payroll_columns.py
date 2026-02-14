
import os
import sys

# Define path to backend root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)

from db.connection import get_db_connection

def migrate():
    print(f"🔧 Starting migration for Payroll Columns (PostgreSQL)")
    
    conn = None
    try:
        conn = get_db_connection()
        c = conn.cursor()

        columns_to_add = [
            ("hourly_rate", "REAL DEFAULT 0"),
            ("daily_rate", "REAL DEFAULT 0"),
            ("per_booking_rate", "REAL DEFAULT 0")
        ]

        for col_name, col_type in columns_to_add:
            try:
                print(f"➕ Adding column {col_name}...")
                c.execute(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}")
            except Exception as e:
                print(f"⚠️ Error adding {col_name} (might exist): {e}")

        conn.commit()
        print("✅ Migration completed successfully!")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate()
