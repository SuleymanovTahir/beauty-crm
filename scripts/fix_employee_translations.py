import sqlite3
from deep_translator import GoogleTranslator

DB_PATH = "backend/salon_bot.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def translate_text(text, target_lang):
    if not text:
        return None
    try:
        translator = GoogleTranslator(source='auto', target=target_lang)
        return translator.translate(text)
    except Exception as e:
        print(f"Error translating '{text}' to {target_lang}: {e}")
        return None

def main():
    print("🚀 Starting employee translation fix...\n")
    conn = get_db_connection()
    c = conn.cursor()
    
    # Fetch employees
    c.execute("SELECT * FROM users WHERE is_service_provider=1")
    rows = c.fetchall()
    
    updates = 0
    
    for row in rows:
        row_id = row['id']
        position = row['position']
        bio = row['bio']
        
        print(f"👤 Processing Employee [{row_id}] {position}")
        
        row_updates = {}
        
        # 1. Fix Position
        # If position is ASCII (English), set position_en = position
        if position and position.isascii():
            print(f"   ✅ Position is English. Setting position_en = '{position}'")
            row_updates['position_en'] = position
        
        # 2. Fix Bio
        # If bio is Cyrillic (Russian), translate to En and Ar
        # We assume bio is Russian if it contains Cyrillic characters
        is_cyrillic = any('а' <= char.lower() <= 'я' for char in bio) if bio else False
        
        if is_cyrillic:
            print(f"   🇷🇺 Bio is Russian. Translating...")
            
            # Translate to English
            bio_en = translate_text(bio, 'en')
            if bio_en:
                print(f"     -> EN: {bio_en[:50]}...")
                row_updates['bio_en'] = bio_en
                
            # Translate to Arabic
            bio_ar = translate_text(bio, 'ar')
            if bio_ar:
                print(f"     -> AR: {bio_ar[:50]}...")
                row_updates['bio_ar'] = bio_ar
                
            # Ensure bio_ru is set
            if not row['bio_ru']:
                row_updates['bio_ru'] = bio
        
        # 3. Translate Position to Arabic if missing
        if not row['position_ar'] and position:
            pos_ar = translate_text(position, 'ar')
            if pos_ar:
                row_updates['position_ar'] = pos_ar

        if row_updates:
            set_clause = ", ".join([f"{k} = ?" for k in row_updates.keys()])
            values = list(row_updates.values()) + [row_id]
            c.execute(f"UPDATE users SET {set_clause} WHERE id = ?", values)
            updates += 1
            
    conn.commit()
    conn.close()
    print(f"\n✨ Finished fixing {updates} employees.")

if __name__ == "__main__":
    main()
