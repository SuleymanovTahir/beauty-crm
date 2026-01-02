import sys
import os

# Add the project root to the python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection
from utils.logger import log_info, log_error, log_warning

def run_migration():
    """Add points_expiration_days and feature_flags columns to salon_settings"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Check existing columns
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='salon_settings'
        """)
        columns = [row[0] for row in c.fetchall()]
        
        # Add points_expiration_days
        if 'points_expiration_days' not in columns:
            log_info("➕ Adding points_expiration_days column to salon_settings...", "db")
            c.execute("ALTER TABLE salon_settings ADD COLUMN points_expiration_days INTEGER DEFAULT 365")
        else:
            log_info("✅ points_expiration_days column already exists", "db")
            
        # Add feature_flags
        if 'feature_flags' not in columns:
            log_info("➕ Adding feature_flags column to salon_settings...", "db")
            c.execute("ALTER TABLE salon_settings ADD COLUMN feature_flags TEXT DEFAULT '{}'")
        else:
            log_info("✅ feature_flags column already exists", "db")
            
        conn.commit()
        conn.close()
        log_info("✅ Migration completed successfully", "db")
        
    except Exception as e:
        log_error(f"❌ Migration failed: {e}", "db")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
