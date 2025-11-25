import sqlite3
import os

DATABASE_NAME = "salon_bot.db"

def fix_positions_table():
    print(f"🔧 Fixing positions table in {DATABASE_NAME}...")
    
    if not os.path.exists(DATABASE_NAME):
        print(f"❌ Database file {DATABASE_NAME} not found!")
        return

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Check existing columns
    try:
        c.execute("PRAGMA table_info(positions)")
        columns = [row[1] for row in c.fetchall()]
        print(f"📊 Current columns: {columns}")
        
        # Add name_fr if missing
        if 'name_fr' not in columns:
            print("➕ Adding name_fr column...")
            try:
                c.execute("ALTER TABLE positions ADD COLUMN name_fr TEXT")
                print("✅ name_fr added")
            except Exception as e:
                print(f"❌ Error adding name_fr: {e}")
        
        # Add name_de if missing
        if 'name_de' not in columns:
            print("➕ Adding name_de column...")
            try:
                c.execute("ALTER TABLE positions ADD COLUMN name_de TEXT")
                print("✅ name_de added")
            except Exception as e:
                print(f"❌ Error adding name_de: {e}")

        conn.commit()
        print("✅ Database fix completed!")
        
    except Exception as e:
        print(f"❌ Error inspecting table: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_positions_table()
