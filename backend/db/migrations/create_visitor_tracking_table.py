import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from db.connection import get_db_connection
from utils.logger import log_info

def create_visitor_tracking_table():
    """Create visitor_tracking table for analytics"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        log_info("🔧 Creating visitor_tracking table...", "migration")
        
        c.execute("""
            CREATE TABLE IF NOT EXISTS visitor_tracking (
                id SERIAL PRIMARY KEY,
                ip_address VARCHAR(45),
                ip_hash VARCHAR(64),
                latitude REAL,
                longitude REAL,
                city VARCHAR(100),
                country VARCHAR(100),
                distance_km REAL,
                is_local BOOLEAN,
                user_agent TEXT,
                page_url TEXT,
                visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for better query performance
        c.execute("CREATE INDEX IF NOT EXISTS idx_visitor_visited_at ON visitor_tracking(visited_at)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_visitor_country ON visitor_tracking(country)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_visitor_is_local ON visitor_tracking(is_local)")
        
        conn.commit()
        log_info("✅ visitor_tracking table created successfully", "migration")
        
    except Exception as e:
        log_info(f"❌ Error creating visitor_tracking table: {e}", "migration")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    create_visitor_tracking_table()
