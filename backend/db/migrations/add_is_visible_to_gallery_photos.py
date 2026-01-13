
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection

def run_migration():
    print("🚀 Adding is_visible to gallery_photos...")
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Check if column exists
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='gallery_photos' AND column_name='is_visible'
        """)
        if not c.fetchone():
            print("📝 Adding is_visible column...")
            c.execute("ALTER TABLE gallery_photos ADD COLUMN is_visible BOOLEAN DEFAULT TRUE")
            print("✅ Column added.")
        else:
            print("INFO: is_visible column already exists.")

        conn.commit()
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
