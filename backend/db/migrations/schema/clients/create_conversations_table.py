"""
Create conversations table for tracking client conversations
"""
import sqlite3
from core.config import DATABASE_NAME


def create_conversations_table():
    """Create conversations table if it doesn't exist"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Create conversations table
        c.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                message TEXT,
                sender TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(instagram_id) ON DELETE CASCADE
            )
        """)
        
        # Create index for faster lookups
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversations_client 
            ON conversations(client_id)
        """)
        
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversations_timestamp 
            ON conversations(timestamp)
        """)
        
        conn.commit()
        print("✅ Conversations table created successfully")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating conversations table: {e}")
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    create_conversations_table()
