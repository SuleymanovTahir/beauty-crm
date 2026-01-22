import sqlite3
import psycopg2
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def run_migration():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Check existing columns
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='visitor_tracking'")
        columns = [row[0] for row in c.fetchall()]
        
        new_columns = {
            'referrer': 'TEXT',
            'device_type': 'TEXT',
            'browser': 'TEXT'
        }
        
        for col, col_type in new_columns.items():
            if col not in columns:
                log_info(f"Adding column {col} to visitor_tracking...", "db")
                c.execute(f"ALTER TABLE visitor_tracking ADD COLUMN {col} {col_type}")
        
        conn.commit()
        conn.close()
        log_info("Analytics columns migration completed successfully", "db")
        return True
    except Exception as e:
        log_error(f"Migration failed: {e}", "db")
        return False

if __name__ == "__main__":
    run_migration()
