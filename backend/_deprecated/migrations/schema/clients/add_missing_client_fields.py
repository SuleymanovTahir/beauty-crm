import sqlite3
import os

DATABASE_NAME = "salon_bot.db"

def run_migration():
    print(f"🔄 Starting migration for {DATABASE_NAME}...")
    
    if not os.path.exists(DATABASE_NAME):
        print(f"❌ Database {DATABASE_NAME} not found!")
        return

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # List of new columns to add
    new_columns = [
        ("first_contact", "TEXT"),
        ("last_contact", "TEXT"),
        ("gender", "TEXT"),
        ("card_number", "TEXT"),
        ("discount", "REAL DEFAULT 0"),
        ("total_visits", "INTEGER DEFAULT 0"),
        ("additional_phone", "TEXT"),
        ("newsletter_agreed", "INTEGER DEFAULT 0"),
        ("personal_data_agreed", "INTEGER DEFAULT 0"),
        ("total_spend", "REAL DEFAULT 0"),
        ("paid_amount", "REAL DEFAULT 0")
    ]
    
    # Get existing columns
    c.execute("PRAGMA table_info(clients)")
    existing_columns = [row[1] for row in c.fetchall()]
    
    for col_name, col_type in new_columns:
        if col_name not in existing_columns:
            try:
                print(f"➕ Adding column: {col_name} ({col_type})")
                c.execute(f"ALTER TABLE clients ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                print(f"⚠️ Error adding {col_name}: {e}")
        else:
            print(f"✅ Column {col_name} already exists")

    conn.commit()
    conn.close()
    print("✅ Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
