import os
import json
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# Load env
env_path = Path(__file__).parent.parent.parent / 'backend' / '.env'
load_dotenv(env_path)

DB_NAME = os.getenv('DB_NAME', 'beauty_crm')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASS = os.getenv('DB_PASS', 'postgres')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')

LANGUAGES_TO_CLEAR = ["ar", "de", "es", "fr", "hi", "kk", "pt"]

def clear_json_locales():
    print("🧹 Clearing JSON locale files...")
    locales_dir = Path(__file__).parent.parent.parent / 'frontend' / 'src' / 'locales'
    
    for lang in LANGUAGES_TO_CLEAR:
        lang_dir = locales_dir / lang
        if lang_dir.exists():
            print(f"  Cleaning {lang}...")
            for json_file in lang_dir.glob('**/*.json'):
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump({}, f)
    print("✅ JSON locales cleared.")

def clear_db_translations():
    print("🧹 Clearing DB translations (non-ru/en columns)...")
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT
        )
        cur = conn.cursor()
        
        tables_configs = {
            "services": ["name", "description"],
            "public_faq": ["question", "answer"],
            "public_reviews": ["text", "author_name", "employee_name", "employee_position"],
            "users": ["full_name", "position", "bio"],
            "public_banners": ["title", "subtitle"],
            "gallery_images": ["title", "description"]
        }
        
        for table, fields in tables_configs.items():
            print(f"  Processing table: {table}")
            set_clauses = []
            for field in fields:
                for lang in LANGUAGES_TO_CLEAR:
                    col_name = f"{field}_{lang}"
                    # Check if column exists
                    cur.execute(f"SELECT count(*) FROM information_schema.columns WHERE table_name='{table}' AND column_name='{col_name}'")
                    if cur.fetchone()[0] > 0:
                        set_clauses.append(f"{col_name} = NULL")
            
            if set_clauses:
                query = f"UPDATE {table} SET {', '.join(set_clauses)}"
                cur.execute(query)
                print(f"    ✅ Updated {table}")
                
        conn.commit()
        cur.close()
        conn.close()
        print("✅ DB translations cleared.")
    except Exception as e:
        print(f"❌ Error clearing DB: {e}")

def clear_cache():
    print("🧹 Clearing translation cache...")
    cache_file = Path(__file__).parent.parent.parent / 'backend' / 'scripts' / 'translations' / '.cache' / 'translations_cache.json'
    if cache_file.exists():
        os.remove(cache_file)
        print("✅ Cache file removed.")
    else:
        print("ℹ️ Cache file not found.")

if __name__ == "__main__":
    clear_json_locales()
    clear_db_translations()
    clear_cache()
    print("\n✨ All non-RU/EN translations cleared! Now run 'npm run db:i18n:auto' to re-translate.")
