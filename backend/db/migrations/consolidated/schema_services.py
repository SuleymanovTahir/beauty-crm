"""
Consolidated Services Schema Migration
All schema changes for services table in one place
"""
import sqlite3


def migrate_services_schema(db_path="salon_bot.db"):
    """
    Apply all services table schema changes
    """
    print("\n" + "="*60)
    print("🔧 SERVICES SCHEMA MIGRATION")
    print("="*60)
    
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    try:
        # Get existing columns
        c.execute("PRAGMA table_info(services)")
        existing_columns = {col[1] for col in c.fetchall()}
        
        # Define all columns that should exist
        columns_to_add = {
            'position_id': 'INTEGER',
            'notes': 'TEXT',
            # Translation columns for name
            'name_en': 'TEXT',
            'name_de': 'TEXT',
            'name_es': 'TEXT',
            'name_fr': 'TEXT',
            'name_hi': 'TEXT',
            'name_kk': 'TEXT',
            'name_pt': 'TEXT',
            # Translation columns for description
            'description_en': 'TEXT',
            'description_de': 'TEXT',
            'description_es': 'TEXT',
            'description_fr': 'TEXT',
            'description_hi': 'TEXT',
            'description_kk': 'TEXT',
            'description_pt': 'TEXT',
        }
        
        # Add missing columns
        added_count = 0
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                print(f"  ➕ Adding column: {column_name}")
                c.execute(f"ALTER TABLE services ADD COLUMN {column_name} {column_type}")
                added_count += 1
        
        # Create user_services table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS user_services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                service_id INTEGER NOT NULL,
                price REAL,
                price_min REAL,
                price_max REAL,
                duration TEXT,
                is_online_booking_enabled INTEGER DEFAULT 1,
                is_calendar_enabled INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, service_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (service_id) REFERENCES services(id)
            )
        """)
        print("  ✅ user_services table ensured")
        
        # Create indexes for performance
        c.execute("CREATE INDEX IF NOT EXISTS idx_services_position ON services(position_id)")
        print("  ✅ Services indexes ensured")
        
        if added_count > 0:
            print(f"\n✅ Added {added_count} columns to services table")
        else:
            print("\n✅ All columns already exist")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_services_schema()
