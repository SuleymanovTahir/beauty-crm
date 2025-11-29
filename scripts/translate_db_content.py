import sqlite3
import asyncio
from deep_translator import GoogleTranslator
from concurrent.futures import ThreadPoolExecutor
import os

DB_PATH = "backend/salon_bot.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def translate_text(text, target_lang):
    if not text:
        return None
    try:
        # Use GoogleTranslator (free)
        translator = GoogleTranslator(source='auto', target=target_lang)
        return translator.translate(text)
    except Exception as e:
        print(f"Error translating '{text}' to {target_lang}: {e}")
        return None

def process_table(table_name, id_col, source_cols, target_langs=['en', 'ar', 'ru']):
    print(f"📦 Processing table: {table_name}")
    conn = get_db_connection()
    c = conn.cursor()
    
    # Check if columns exist, if not create them
    c.execute(f"PRAGMA table_info({table_name})")
    columns = [row['name'] for row in c.fetchall()]
    
    for col in source_cols:
        for lang in target_langs:
            target_col = f"{col}_{lang}"
            if target_col not in columns:
                print(f"  ➕ Adding column {target_col}...")
                try:
                    c.execute(f"ALTER TABLE {table_name} ADD COLUMN {target_col} TEXT")
                except Exception as e:
                    print(f"  ⚠️ Could not add column {target_col}: {e}")

    conn.commit()
    
    # Fetch all rows
    c.execute(f"SELECT * FROM {table_name}")
    rows = c.fetchall()
    
    total = len(rows)
    print(f"  📝 Found {total} rows to process")
    
    updates = 0
    
    for i, row in enumerate(rows):
        row_id = row[id_col]
        row_updates = {}
        
        for col in source_cols:
            source_text = row[col]
            if not source_text:
                continue
                
            for lang in target_langs:
                target_col = f"{col}_{lang}"
                
                # Skip if already has translation (optional, but good for speed)
                # If you want to force re-translate, comment this out
                if row[target_col]:
                    continue
                    
                # If target lang is same as source (assuming source is mostly Russian), 
                # we might want to just copy it or translate if we know source lang.
                # For now, we translate everything.
                
                print(f"    🔄 Translating [{row_id}] {col} -> {lang}...")
                translated = translate_text(source_text, lang)
                
                if translated:
                    row_updates[target_col] = translated
        
        if row_updates:
            set_clause = ", ".join([f"{k} = ?" for k in row_updates.keys()])
            values = list(row_updates.values()) + [row_id]
            c.execute(f"UPDATE {table_name} SET {set_clause} WHERE {id_col} = ?", values)
            updates += 1
            if i % 5 == 0:
                conn.commit()
                print(f"    ✅ Saved progress ({i+1}/{total})")
    
    conn.commit()
    conn.close()
    print(f"  ✅ Finished {table_name}. Updated {updates} rows.\n")

def add_missing_columns(conn, table_name, columns_to_add):
    c = conn.cursor()
    c.execute(f"PRAGMA table_info({table_name})")
    existing_columns = [row['name'] for row in c.fetchall()]
    
    for col in columns_to_add:
        if col not in existing_columns:
            print(f"  ➕ Adding column {col} to {table_name}...")
            try:
                c.execute(f"ALTER TABLE {table_name} ADD COLUMN {col} TEXT")
            except Exception as e:
                print(f"  ⚠️ Could not add column {col}: {e}")
    conn.commit()

def main():
    print("🚀 Starting database content translation...\n")
    
    target_langs = ['ru', 'en', 'ar', 'de', 'es', 'fr', 'hi', 'kk', 'pt']
    
    # 1. Services
    print(f"📦 Processing table: services")
    conn = get_db_connection()
    
    # Add missing columns for services
    service_cols = []
    for lang in target_langs:
        service_cols.append(f"name_{lang}")
        service_cols.append(f"description_{lang}")
    add_missing_columns(conn, "services", service_cols)
    
    process_table(
        table_name="services",
        id_col="id",
        source_cols=["name", "description"],
        target_langs=target_langs
    )
    
    # 2. Employees (users table)
    # Users table already has columns (verified), but let's be safe
    print(f"📦 Processing table: users (employees)")
    conn = get_db_connection()
    user_cols = []
    for lang in target_langs:
        user_cols.append(f"position_{lang}")
        user_cols.append(f"bio_{lang}")
    add_missing_columns(conn, "users", user_cols)
    
    process_table(
        table_name="users",
        id_col="id",
        source_cols=["position", "bio"], 
        target_langs=target_langs
    )
    
    # 3. Reviews
    print(f"📦 Processing table: public_reviews")
    conn = get_db_connection()
    c = conn.cursor()
    
    # Add missing columns for reviews
    review_cols = [f"text_{lang}" for lang in target_langs]
    add_missing_columns(conn, "public_reviews", review_cols)
    
    # Fetch all rows
    c.execute("SELECT * FROM public_reviews")
    rows = c.fetchall()
    
    total = len(rows)
    print(f"  📝 Found {total} rows to process")
    
    updates = 0
    
    for i, row in enumerate(rows):
        row_id = row['id']
        row_updates = {}
        
        # Determine source text (prefer ru, then en)
        source_text = row['text_ru'] or row['text_en']
        # print(f"    Processing row {row_id}, source: {source_text[:10]}...")
        
        if not source_text:
            continue
            
        for lang in target_langs:
            target_col = f"text_{lang}"
            
            # Skip if already has translation
            val = row[target_col] if target_col in row.keys() else None
            # print(f"      Checking {target_col}: {val}")
            
            if val and len(val) > 0:
                # print(f"    Skipping {target_col} (already has value)")
                continue
                
            print(f"    🔄 Translating [{row_id}] text -> {lang}...")
            translated = translate_text(source_text, lang)
            
            if translated:
                row_updates[target_col] = translated
                print(f"    ✅ Translated: {translated[:20]}...")
            else:
                print(f"    ❌ Translation failed for {lang}")
        
        if row_updates:
            set_clause = ", ".join([f"{k} = ?" for k in row_updates.keys()])
            values = list(row_updates.values()) + [row_id]
            c.execute(f"UPDATE public_reviews SET {set_clause} WHERE id = ?", values)
            updates += 1
            if i % 5 == 0:
                conn.commit()
                print(f"    ✅ Saved progress ({i+1}/{total})")
    
    conn.commit()
    conn.close()
    print(f"  ✅ Finished public_reviews. Updated {updates} rows.\n")

    # 4. FAQ
    print(f"📦 Processing table: public_faq")
    conn = get_db_connection()
    c = conn.cursor()
    
    # Add missing columns for FAQ
    faq_cols = []
    for lang in target_langs:
        faq_cols.append(f"question_{lang}")
        faq_cols.append(f"answer_{lang}")
    add_missing_columns(conn, "public_faq", faq_cols)
    
    c.execute("SELECT * FROM public_faq")
    rows = c.fetchall()
    total = len(rows)
    print(f"  📝 Found {total} rows to process")
    updates = 0
    
    for i, row in enumerate(rows):
        row_id = row['id']
        row_updates = {}
        
        # Determine source (prefer ru)
        q_source = row['question_ru'] or row['question_en']
        a_source = row['answer_ru'] or row['answer_en']
        
        if not q_source: continue

        for lang in target_langs:
            # Question
            target_q = f"question_{lang}"
            if target_q in row.keys() and not row[target_q]:
                print(f"    🔄 Translating [{row_id}] question -> {lang}...")
                trans_q = translate_text(q_source, lang)
                if trans_q: row_updates[target_q] = trans_q
            
            # Answer
            target_a = f"answer_{lang}"
            if target_a in row.keys() and not row[target_a]:
                print(f"    🔄 Translating [{row_id}] answer -> {lang}...")
                trans_a = translate_text(a_source, lang)
                if trans_a: row_updates[target_a] = trans_a
        
        if row_updates:
            set_clause = ", ".join([f"{k} = ?" for k in row_updates.keys()])
            values = list(row_updates.values()) + [row_id]
            c.execute(f"UPDATE public_faq SET {set_clause} WHERE id = ?", values)
            updates += 1
            if i % 5 == 0: conn.commit()
    
    conn.commit()
    conn.close()
    print(f"  ✅ Finished public_faq. Updated {updates} rows.\n")

    # 5. Gallery (public_gallery is empty, using gallery_images)
    print(f"📦 Processing table: gallery_images")
    conn = get_db_connection()
    c = conn.cursor()
    
    # Check/Add columns for gallery_images
    gallery_cols = []
    for lang in target_langs:
        gallery_cols.append(f"title_{lang}")
        gallery_cols.append(f"description_{lang}")
    add_missing_columns(conn, "gallery_images", gallery_cols)

    c.execute("SELECT * FROM gallery_images")
    rows = c.fetchall()
    total = len(rows)
    print(f"  📝 Found {total} rows to process")
    updates = 0
    
    for i, row in enumerate(rows):
        row_id = row['id']
        row_updates = {}
        
        # Determine source (title is the main field here)
        t_source = row['title'] # Assuming title is Russian
        d_source = row['description']
        
        if not t_source: continue

        for lang in target_langs:
            # Title
            target_t = f"title_{lang}"
            
            if target_t in row.keys() and not row[target_t]:
                print(f"    🔄 Translating [{row_id}] title -> {lang}...")
                trans_t = translate_text(t_source, lang)
                if trans_t: row_updates[target_t] = trans_t
            
            # Description
            target_d = f"description_{lang}"
            if d_source and target_d in row.keys() and not row[target_d]:
                print(f"    🔄 Translating [{row_id}] description -> {lang}...")
                trans_d = translate_text(d_source, lang)
                if trans_d: row_updates[target_d] = trans_d
        
        if row_updates:
            set_clause = ", ".join([f"{k} = ?" for k in row_updates.keys()])
            values = list(row_updates.values()) + [row_id]
            c.execute(f"UPDATE gallery_images SET {set_clause} WHERE id = ?", values)
            updates += 1
            if i % 5 == 0: conn.commit()

    conn.commit()
    conn.close()
    print(f"  ✅ Finished gallery_images. Updated {updates} rows.\n")
    
    print("✨ All done! Database content translated.")

if __name__ == "__main__":
    main()
