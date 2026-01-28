#!/usr/bin/env python3
"""
Sync translated content back to database
Updates database columns with translations from JSON files
"""

import json
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).parent))

from db.connection import get_db_connection

from config import (
    TRANSLATE_OUTPUT,
    LANGUAGES,
    SOURCE_LANGUAGE,
    TRANSLATION_CONFIG
)

def sync_to_database():
    """
    Update database with completed translations
    """
    print("💾 Syncing translations to database...")
    
    # Load completed translations
    input_path = Path(TRANSLATE_OUTPUT)
    if not input_path.exists():
        print(f"❌ Error: {TRANSLATE_OUTPUT} not found.")
        print("   Run 'npm run db:i18n:translate' first.")
        return
    
    with open(input_path, 'r', encoding='utf-8') as f:
        completed_translations = json.load(f)
    
    if not completed_translations:
        print("✨ No translations to sync.")
        return
    
    conn = get_db_connection()
    c = conn.cursor()
    
    total_updates = 0
    
    try:
        table_columns_cache = {}

        for table_name, records in completed_translations.items():
            print(f"\n📋 Updating table: {table_name}")
            
            # Get table config
            config = TRANSLATION_CONFIG.get(table_name)
            if not config:
                print(f"  ⚠️  No config found for {table_name}, skipping")
                continue
            
            id_field = config["id_field"]
            
            # Cache columns for this table
            if table_name not in table_columns_cache:
                c.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table_name,))
                table_columns_cache[table_name] = {col[0] for col in c.fetchall()}
            
            columns = table_columns_cache[table_name]
            if not columns:
                print(f"  ⚠️  Table {table_name} seems to have no columns or doesn't exist")
                continue

            for record in records:
                record_id = record['id']
                fields_data = record['fields']
                
                for field_name, translations in fields_data.items():
                    # Build UPDATE query for each language
                    for lang in LANGUAGES:
                        translation = translations.get(lang)
                        if not translation:
                            continue
                        
                        # Determine target column name
                        has_lang_suffix = False
                        base_field = field_name
                        for check_lang in LANGUAGES:
                            if field_name.endswith(f"_{check_lang}"):
                                has_lang_suffix = True
                                base_field = field_name[:-(len(check_lang)+1)]
                                break
                        
                        # Try potential column names for this language
                        possible_columns = []
                        if lang == 'en':
                            possible_columns.append(base_field) # English is often the base field
                        
                        possible_columns.append(f"{base_field}_{lang}")
                        
                        target_column = None
                        for col in possible_columns:
                            if col in columns:
                                target_column = col
                                break
                        
                        if not target_column:
                            continue
                        
                        # Update the translation
                        try:
                            query = f"UPDATE {table_name} SET {target_column} = %s WHERE {id_field} = %s"
                            c.execute(query, (translation, record_id))
                            total_updates += 1
                        except Exception as e:
                            print(f"  ❌ Error updating {table_name}.{target_column}: {e}")
        
        conn.commit()
        print(f"\n✨ Database sync complete! {total_updates} translations updated.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    sync_to_database()
