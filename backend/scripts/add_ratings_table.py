import sqlite3
from core.config import DATABASE_NAME

def run_migration():
    print("🔄 Adding ratings table...")
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER,
            instagram_id TEXT,
            rating INTEGER,
            comment TEXT,
            created_at TEXT,
            FOREIGN KEY (booking_id) REFERENCES bookings(id)
        )
    """)
    
    conn.commit()
    conn.close()
    print("✅ ratings table added!")

if __name__ == "__main__":
    run_migration()
