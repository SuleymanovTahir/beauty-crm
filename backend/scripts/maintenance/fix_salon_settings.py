"""
Script to populate salon settings with social media links.
"""
import sys
import os
import psycopg2

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection
from utils.logger import log_info, log_error

def fix_salon_settings():
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        log_info("🔧 Updating salon settings...", "maintenance")
        
        # Update instagram and whatsapp if they are null
        c.execute("""
            UPDATE salon_settings 
            SET instagram = COALESCE(instagram, '@beauty_salon_dubai'),
                whatsapp = COALESCE(whatsapp, '+971501234567'),
                phone = COALESCE(phone, '+971 50 123 4567')
            WHERE id = 1
        """)
        
        # If no row exists, insert one
        c.execute("SELECT COUNT(*) FROM salon_settings")
        if c.fetchone()[0] == 0:
            c.execute("""
                INSERT INTO salon_settings (name, instagram, whatsapp, phone)
                VALUES ('Beauty Salon', '@beauty_salon_dubai', '+971501234567', '+971 50 123 4567')
            """)
            
        conn.commit()
        log_info("✅ Salon settings updated", "maintenance")

    except Exception as e:
        conn.rollback()
        log_error(f"❌ Error updating settings: {e}", "maintenance")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_salon_settings()
