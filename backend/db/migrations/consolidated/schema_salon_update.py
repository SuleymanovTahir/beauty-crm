from db.connection import get_db_connection

def migrate_salon_schema():
    """Add translation columns to salon_settings table"""
    conn = get_db_connection()
    c = conn.cursor()
    
    print("🔧 Checking salon_settings schema...")
    
    # Check existing columns
    c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='salon_settings'
        """)
    columns = [row[0] for row in c.fetchall()]
    
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
            except Exception as e:
                print(f"  ⚠️ Error adding {col_name}: {e}")
        else:
            print(f"  ✅ Column {col_name} already exists")

    conn.commit()
    conn.close()
    print("✨ Salon schema migration complete")

if __name__ == "__main__":
    migrate_salon_schema()
