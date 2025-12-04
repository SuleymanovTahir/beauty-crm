import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from db.connection import get_db_connection
from utils.logger import log_info

def add_faces_display_count():
    """Add faces_display_count column to salon_settings if not exists"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Check if column exists
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='salon_settings' AND column_name='faces_display_count'
        """)
        
        if not c.fetchone():
            log_info("🔧 Adding faces_display_count column to salon_settings...", "migration")
            c.execute("ALTER TABLE salon_settings ADD COLUMN faces_display_count INTEGER DEFAULT 6")
            conn.commit()
            log_info("✅ Column faces_display_count added", "migration")
        else:
            log_info("✅ Column faces_display_count already exists", "migration")
            
        # Also check for services_display_count
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='salon_settings' AND column_name='services_display_count'
        """)
        
        if not c.fetchone():
            log_info("🔧 Adding services_display_count column to salon_settings...", "migration")
            c.execute("ALTER TABLE salon_settings ADD COLUMN services_display_count INTEGER DEFAULT 6")
            conn.commit()
            log_info("✅ Column services_display_count added", "migration")
            
    except Exception as e:
        log_info(f"❌ Error adding columns: {e}", "migration")
    finally:
        conn.close()

if __name__ == "__main__":
    add_faces_display_count()
