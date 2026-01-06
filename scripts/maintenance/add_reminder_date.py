
import sys
import os
import psycopg2
from psycopg2 import sql

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))
from db.connection import get_db_connection

def add_reminder_date_column():
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Check if column exists
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='clients' AND column_name='reminder_date'
        """)
        if c.fetchone():
            print("✅ Column 'reminder_date' already exists.")
        else:
            print("➕ Adding column 'reminder_date'...")
            c.execute("ALTER TABLE clients ADD COLUMN reminder_date TIMESTAMP")
            conn.commit()
            print("✅ Column added successfully.")
            
        # Check/Add 'Remind Later' stage
        c.execute("SELECT id FROM pipeline_stages WHERE key = 'remind_later' OR name ILIKE '%напомнить%'")
        stage = c.fetchone()
        if not stage:
            print("➕ Creating 'Напомнить позже' stage...")
            # Find max order index
            c.execute("SELECT MAX(order_index) FROM pipeline_stages")
            max_idx = c.fetchone()[0] or 0
            
            c.execute("""
                INSERT INTO pipeline_stages (name, key, color, order_index, is_active)
                VALUES ('Напомнить позже', 'remind_later', '#F59E0B', %s, TRUE)
            """, (max_idx + 1,))
            conn.commit()
            print("✅ Stage created.")
        else:
            print(f"✅ 'Remind Later' stage exists (ID: {stage[0]}).")

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_reminder_date_column()
