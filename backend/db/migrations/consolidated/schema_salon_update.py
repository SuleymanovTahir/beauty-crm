import sqlite3

def migrate_salon_schema(db_path="salon_bot.db"):
    """Add translation columns to salon_settings table"""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    print("🔧 Checking salon_settings schema...")
    
    # Check existing columns
    c.execute("PRAGMA table_info(salon_settings)")
    columns = [row[1] for row in c.fetchall()]
    
    new_columns = [
        ("address_ru", "TEXT"),
        ("address_ar", "TEXT"),
        ("hours_ar", "TEXT")
    ]
    
    for col_name, col_type in new_columns:
        if col_name not in columns:
            print(f"  ➕ Adding column {col_name}...")
            try:
                c.execute(f"ALTER TABLE salon_settings ADD COLUMN {col_name} {col_type}")
            except sqlite3.OperationalError as e:
                print(f"  ⚠️ Error adding {col_name}: {e}")
        else:
            print(f"  ✅ Column {col_name} already exists")

    conn.commit()
    conn.close()
    print("✨ Salon schema migration complete")

if __name__ == "__main__":
    migrate_salon_schema()
