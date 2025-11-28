import sqlite3
from utils.logger import log_info, log_error

def fix_plans_role_key():
    """
    Fix plans table: replace position_id (int) with role_key (text)
    """
    from core.config import DATABASE_NAME
    
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    try:
        # Check if role_key already exists
        cursor.execute("PRAGMA table_info(plans)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'role_key' not in columns:
            log_info("Adding role_key column to plans table...", "migration")
            cursor.execute("ALTER TABLE plans ADD COLUMN role_key TEXT")
            
            # Create index for role_key
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_plans_role_key ON plans(role_key)")
            
        if 'position_id' in columns:
            log_info("Removing position_id column from plans table...", "migration")
            try:
                cursor.execute("ALTER TABLE plans DROP COLUMN position_id")
            except sqlite3.OperationalError:
                log_info("Could not drop position_id column (SQLite version might be old), ignoring it.", "migration")
                
        conn.commit()
        log_info("✅ Plans table schema fixed successfully", "migration")
        return True
        
    except Exception as e:
        log_error(f"❌ Error fixing plans table schema: {e}", "migration")
        conn.rollback()
        return False
    finally:
        conn.close()
