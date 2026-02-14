
import psycopg2
import os
import sys

# Add backend dir to path to import db connection
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))
from db.connection import get_db_connection

def migrate():
    print("🔧 Adding 'response_style' column to bot_settings...")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Check if column exists
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='bot_settings' AND column_name='response_style'
        """)
        
        if c.fetchone():
            print("✅ Column 'response_style' already exists")
        else:
            c.execute("ALTER TABLE bot_settings ADD COLUMN response_style TEXT DEFAULT 'adaptive'")
            conn.commit()
            print("✅ Added column 'response_style' (default: 'adaptive')")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
