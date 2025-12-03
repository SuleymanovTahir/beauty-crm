import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'salon_bot.db')

def migrate():
    print(f"Migrating database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if columns exist
        cursor.execute("PRAGMA table_info(salon_settings)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'google_place_id' not in columns:
            print("Adding google_place_id column...")
            cursor.execute("ALTER TABLE salon_settings ADD COLUMN google_place_id TEXT")
            
        if 'google_api_key' not in columns:
            print("Adding google_api_key column...")
            cursor.execute("ALTER TABLE salon_settings ADD COLUMN google_api_key TEXT")
            
        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        print(f"Error migrating database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
