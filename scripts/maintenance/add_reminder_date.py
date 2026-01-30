
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
            
        # Check/Add 'Remind Later' stage in workflow_stages
        c.execute("SELECT id FROM workflow_stages WHERE entity_type = 'pipeline' AND (LOWER(name) LIKE '%remind%' OR name ILIKE '%напомнить%')")
        stage = c.fetchone()
        if not stage:
            print("➕ Creating 'Напомнить позже' stage...")
            # Find max order index
            c.execute("SELECT MAX(sort_order) FROM workflow_stages WHERE entity_type = 'pipeline'")
            max_idx = c.fetchone()[0] or 0

            c.execute("""
                INSERT INTO workflow_stages (entity_type, name, color, sort_order)
                VALUES ('pipeline', 'Напомнить позже', '#F59E0B', %s)
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
