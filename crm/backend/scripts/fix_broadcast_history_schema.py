import os
import sys
from db.connection import get_db_connection

def fix_schema():
    print("🔧 Fixing broadcast_history schema...")
    conn = get_db_connection()
    c = conn.cursor()
    
    # Drop existing table
    c.execute("DROP TABLE IF EXISTS broadcast_history")
    
    # Create new table with correct schema
    c.execute("""
        CREATE TABLE broadcast_history (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER REFERENCES users(id),
            subscription_type VARCHAR(50),
            channels VARCHAR(255),
            subject VARCHAR(255),
            message TEXT,
            target_role VARCHAR(50),
            total_sent INTEGER DEFAULT 0,
            results TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()
    print("✅ broadcast_history table recreated with correct schema")

if __name__ == "__main__":
    fix_schema()
