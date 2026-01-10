import asyncio
from deep_translator import GoogleTranslator
from concurrent.futures import ThreadPoolExecutor
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
from db.connection import get_db_connection

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
    c.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}'")
    columns = [row[0] for row in c.fetchall()]
    
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
    
    # Get column names for indexing
    c.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}'")
    col_names = [row[0] for row in c.fetchall()]
    
    total = len(rows)
    print(f"  📝 Found {total} rows to process")
    
    updates = 0
    
    for i, row in enumerate(rows):
        row_dict = dict(zip(col_names, row))
        row_id = row_dict[id_col]
        row_updates = {}
        
        for col in source_cols:
            source_text = row_dict.get(col)
            if not source_text:
                continue
                
            for lang in target_langs:
                target_col = f"{col}_{lang}"
                
                if row_dict.get(target_col):
                    continue
                    
                print(f"    🔄 Translating [{row_id}] {col} -> {lang}...")
                translated = translate_text(source_text, lang)
                
                if translated:
                    row_updates[target_col] = translated
        
        if row_updates:
            set_clause = ", ".join([f"{k} = %s" for k in row_updates.keys()])
            values = list(row_updates.values()) + [row_id]
            c.execute(f"UPDATE {table_name} SET {set_clause} WHERE {id_col} = %s", values)
            updates += 1
            if i % 5 == 0:
                conn.commit()
                print(f"    ✅ Saved progress ({i+1}/{total})")
    
    conn.commit()
    conn.close()
    print(f"  ✅ Finished {table_name}. Updated {updates} rows.\n")

def add_missing_columns(conn, table_name, columns_to_add):
    c = conn.cursor()
    c.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}'")
    existing_columns = [row[0] for row in c.fetchall()]
    
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
    service_cols = []
    for lang in target_langs:
        service_cols.append(f"name_{lang}")
        service_cols.append(f"description_{lang}")
    add_missing_columns(conn, "services", service_cols)
    conn.close()
    
    process_table(
        table_name="services",
        id_col="id",
        source_cols=["name", "description"],
        target_langs=target_langs
    )
    
    # 2. Employees (users table)
    print(f"📦 Processing table: users (employees)")
    conn = get_db_connection()
    user_cols = []
    for lang in target_langs:
        user_cols.append(f"position_{lang}")
        user_cols.append(f"bio_{lang}")
    add_missing_columns(conn, "users", user_cols)
    conn.close()
    
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
    
    review_cols = [f"text_{lang}" for lang in target_langs]
    add_missing_columns(conn, "public_reviews", review_cols)
    
    c.execute("SELECT * FROM public_reviews")
    rows = c.fetchall()
    
    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='public_reviews'")
    col_names = [row[0] for row in c.fetchall()]
    
    total = len(rows)
    print(f"  📝 Found {total} rows to process")
    updates = 0
    
    for i, row in enumerate(rows):
        row_dict = dict(zip(col_names, row))
        row_id = row_dict['id']
        row_updates = {}
        
        source_text = row_dict.get('text_ru') or row_dict.get('text_en')
        if not source_text:
            continue
            
        for lang in target_langs:
            target_col = f"text_{lang}"
            if row_dict.get(target_col):
                continue
                
            print(f"    🔄 Translating [{row_id}] text -> {lang}...")
            translated = translate_text(source_text, lang)
            
            if translated:
                row_updates[target_col] = translated
        
        if row_updates:
            set_clause = ", ".join([f"{k} = %s" for k in row_updates.keys()])
            values = list(row_updates.values()) + [row_id]
            c.execute(f"UPDATE public_reviews SET {set_clause} WHERE id = %s", values)
            updates += 1
            if i % 5 == 0:
                conn.commit()
    
    conn.commit()
    conn.close()
    print(f"  ✅ Finished public_reviews. Updated {updates} rows.\n")

    # 4. FAQ
    print(f"📦 Processing table: public_faq")
    conn = get_db_connection()
    c = conn.cursor()
    
    faq_cols = []
    for lang in target_langs:
        faq_cols.append(f"question_{lang}")
        faq_cols.append(f"answer_{lang}")
    add_missing_columns(conn, "public_faq", faq_cols)
    
    c.execute("SELECT * FROM public_faq")
    rows = c.fetchall()
    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='public_faq'")
    col_names = [row[0] for row in c.fetchall()]
    
    total = len(rows)
    updates = 0
    
    for i, row in enumerate(rows):
        row_dict = dict(zip(col_names, row))
        row_id = row_dict['id']
        row_updates = {}
        
        q_source = row_dict.get('question_ru') or row_dict.get('question_en')
        a_source = row_dict.get('answer_ru') or row_dict.get('answer_en')
        
        if not q_source: continue

        for lang in target_langs:
            target_q = f"question_{lang}"
            if not row_dict.get(target_q):
                trans_q = translate_text(q_source, lang)
                if trans_q: row_updates[target_q] = trans_q
            
            target_a = f"answer_{lang}"
            if not row_dict.get(target_a):
                trans_a = translate_text(a_source, lang)
                if trans_a: row_updates[target_a] = trans_a
        
        if row_updates:
            set_clause = ", ".join([f"{k} = %s" for k in row_updates.keys()])
            values = list(row_updates.values()) + [row_id]
            c.execute(f"UPDATE public_faq SET {set_clause} WHERE id = %s", values)
            updates += 1
            if i % 5 == 0: conn.commit()
    
    conn.commit()
    conn.close()
    print(f"  ✅ Finished public_faq. Updated {updates} rows.\n")

    # 5. Gallery
    print(f"📦 Processing table: gallery_images")
    conn = get_db_connection()
    c = conn.cursor()
    
    gallery_cols = []
    for lang in target_langs:
        gallery_cols.append(f"title_{lang}")
        gallery_cols.append(f"description_{lang}")
    add_missing_columns(conn, "gallery_images", gallery_cols)

    c.execute("SELECT * FROM gallery_images")
    rows = c.fetchall()
    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='gallery_images'")
    col_names = [row[0] for row in c.fetchall()]
    
    total = len(rows)
    updates = 0
    
    for i, row in enumerate(rows):
        row_dict = dict(zip(col_names, row))
        row_id = row_dict['id']
        row_updates = {}
        
        t_source = row_dict.get('title')
        d_source = row_dict.get('description')
        
        if not t_source: continue

        for lang in target_langs:
            target_t = f"title_{lang}"
            if not row_dict.get(target_t):
                trans_t = translate_text(t_source, lang)
                if trans_t: row_updates[target_t] = trans_t
            
            target_d = f"description_{lang}"
            if d_source and not row_dict.get(target_d):
                trans_d = translate_text(d_source, lang)
                if trans_d: row_updates[target_d] = trans_d
        
        if row_updates:
            set_clause = ", ".join([f"{k} = %s" for k in row_updates.keys()])
            values = list(row_updates.values()) + [row_id]
            c.execute(f"UPDATE gallery_images SET {set_clause} WHERE id = %s", values)
            updates += 1
            if i % 5 == 0: conn.commit()

    conn.commit()
    conn.close()
    print(f"  ✅ Finished gallery_images. Updated {updates} rows.\n")
    
    print("✨ All done! Database content translated.")

if __name__ == "__main__":
    main()
