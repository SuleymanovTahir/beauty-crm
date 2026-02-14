
import os
import sys
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def reset_database():
    """Wipe the database and re-initialize it"""
    log_info("🧨 Nuking database...", "reset")
    conn = get_db_connection()
    conn.autocommit = True
    c = conn.cursor()
    
    try:
        # PostgreSQL specific: drop public schema and recreate
        c.execute("DROP SCHEMA public CASCADE;")
        c.execute("CREATE SCHEMA public;")
        c.execute("GRANT ALL ON SCHEMA public TO public;")
        conn.close()
        
        log_info("✅ Schema reset. Initializing...", "reset")
        
        # Run init
        from db.init import init_database
        init_database()
        
    except Exception as e:
        log_error(f"Failed to reset DB: {e}", "reset")
        sys.exit(1)

if __name__ == "__main__":
    reset_database()
