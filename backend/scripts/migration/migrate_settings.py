"""
Migration script to transfer salon settings from SQLite to PostgreSQL.
"""

import os
import sys
import psycopg2
from psycopg2.extras import DictCursor

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection
from utils.logger import log_info, log_error

# Path to SQLite DB
SQLITE_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'salon_bot.db')

def migrate_settings():
    if not os.path.exists(SQLITE_DB_PATH):
        log_error(f"❌ SQLite database not found at {SQLITE_DB_PATH}", "migration")
        return

    log_info(f"🚀 Starting settings migration from SQLite: {SQLITE_DB_PATH}", "migration")
    
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_c = sqlite_conn.cursor()
    
    # Connect to Postgres
    pg_conn = get_db_connection()
    pg_c = pg_conn.cursor()
    
    try:
        log_info("⚙️ Migrating Salon Settings...", "migration")
        
        # Get settings from SQLite
        sqlite_c.execute("SELECT * FROM salon_settings LIMIT 1")
        settings = sqlite_c.fetchone()
        
        if settings:
            # Map columns dynamically
            # We want to update the existing row (id=1) in Postgres
            
            # Get column names from SQLite row
            keys = settings.keys()
            
            # Filter keys that exist in Postgres schema (to avoid errors if schema differs)
            # First get PG columns
            pg_c.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'salon_settings'")
            pg_columns = {row[0] for row in pg_c.fetchall()}
            
            # Prepare update dict
            update_data = {}
            for key in keys:
                if key in pg_columns and key != 'id': # Don't update ID
                    val = settings[key]
                    # Handle boolean conversion if needed (SQLite 1/0 -> PG boolean)
                    if key in ['wifi_available'] and isinstance(val, int):
                        val = bool(val)
                    # prepayment_required is INTEGER in Postgres schema (0/1), so keep as is
                    
                    update_data[key] = val
            
            if update_data:
                # Construct UPDATE query
                set_clause = ', '.join([f"{k} = %s" for k in update_data.keys()])
                values = list(update_data.values())
                
                # Check if row exists
                pg_c.execute("SELECT id FROM salon_settings WHERE id = 1")
                if pg_c.fetchone():
                    pg_c.execute(f"UPDATE salon_settings SET {set_clause} WHERE id = 1", values)
                    log_info("✅ Updated existing salon settings", "migration")
                else:
                    # Insert
                    cols = ', '.join(update_data.keys())
                    placeholders = ', '.join(['%s'] * len(update_data))
                    pg_c.execute(f"INSERT INTO salon_settings ({cols}) VALUES ({placeholders})", values)
                    log_info("✅ Inserted salon settings", "migration")
            else:
                log_info("⚠️ No matching columns to update", "migration")
                
        else:
            log_info("⚠️ No settings found in SQLite", "migration")

        pg_conn.commit()
        log_info("🎉 Settings migration completed successfully!", "migration")

    except Exception as e:
        pg_conn.rollback()
        log_error(f"❌ Error during migration: {e}", "migration")
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate_settings()
