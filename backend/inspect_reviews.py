
import sqlite3
import os
import sys

# Add backend to path to import config if needed, but we can just use sqlite3 directly since we access the DB file
db_path = "/Users/tahir/Desktop/beauty-crm/backend/beauty_crm.db"

def check_reviews():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check columns
        cursor.execute("PRAGMA table_info(public_reviews)")
        columns = [info[1] for info in cursor.fetchall()]
        print(f"Columns: {columns}")
        
        # Fetch reviews
        cursor.execute("SELECT id, author_name, author_name_ru, author_name_en, text_ru, author_name_fr FROM public_reviews LIMIT 10")
        rows = cursor.fetchall()
        
        print(f"\nFound {len(rows)} reviews:")
        for row in rows:
            print(row)
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_reviews()
