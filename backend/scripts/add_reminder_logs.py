import sqlite3
from core.config import DATABASE_NAME

def run_migration():
    print("🔄 Adding reminder_logs table...")
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        CREATE TABLE IF NOT EXISTS reminder_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER,
            client_id TEXT,
            reminder_type TEXT, -- '24h', '2h', 'retention'
            sent_at TEXT,
            status TEXT
        )
    """)
    
    conn.commit()
    conn.close()
    print("✅ reminder_logs table added!")

if __name__ == "__main__":
    run_migration()
