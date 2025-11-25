"""
Migration: Add indexes for analytics performance
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def add_analytics_indexes():
    """Add indexes to improve analytics query performance"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Index for clients by creation date
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_clients_created_at 
            ON clients(created_at)
        """)
        
        # Index for bookings by creation date
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
            ON bookings(created_at)
        """)
        
        # Composite index for bookings by status and creation date
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_bookings_status_created 
            ON bookings(status, created_at)
        """)
        
        # Index for client status
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_clients_status 
            ON clients(status)
        """)
        
        conn.commit()
        conn.close()
        
        log_info("✅ Analytics indexes created successfully", "migration")
        return {"success": True}
        
    except Exception as e:
        log_error(f"❌ Error creating analytics indexes: {e}", "migration")
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    add_analytics_indexes()
