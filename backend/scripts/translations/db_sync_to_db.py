#!/usr/bin/env python3
"""
Sync translated content back to database
Updates database columns with translations from JSON files
"""

import json
from db.connection import get_db_connection
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    TRANSLATE_OUTPUT,
    LANGUAGES,
    SOURCE_LANGUAGE,
    DATABASE_PATH,
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
    
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    
    total_updates = 0
    
    try:
        for table_name, records in completed_translations.items():
            print(f"\n📋 Updating table: {table_name}")
            
            # Get table config
            config = TRANSLATION_CONFIG.get(table_name)
            if not config:
                print(f"  ⚠️  No config found for {table_name}, skipping")
                continue
            
            id_field = config["id_field"]
            
            for record in records:
                record_id = record['id']
                fields = record['fields']
                
                for field_name, translations in fields.items():
                    # Get detected language for this field
                    detected_lang = translations.get('detected_language', SOURCE_LANGUAGE)
                    
                    # Build UPDATE query for each language
                    for lang in LANGUAGES:
                        
                        translation = translations.get(lang)
                        if not translation:
                            continue
                        
                        # Determine target column name
                        # For fields like "title_ru", "title_en", "title_ar" - use as is
                        # For fields like "name", "full_name" - append _{lang}
                        
                        # Check if field already has a language suffix
                        has_lang_suffix = False
                        for check_lang in LANGUAGES:
                            if field_name.endswith(f"_{check_lang}"):
                                has_lang_suffix = True
                                # Extract base field name (e.g., "title" from "title_ru")
                                base_field = field_name[:-3]  # Remove "_ru", "_en", etc.
                                target_column = f"{base_field}_{lang}"
                                break
                        
                        if not has_lang_suffix:
                            # Field doesn't have language suffix, add it
                            target_column = f"{field_name}_{lang}"
                        
                        # Check if column exists
                        c.execute(f"PRAGMA table_info({table_name})")
                        columns = {col[0] for col in c.fetchall()}
                        
                        if target_column not in columns:
                            print(f"  ⚠️  Column {target_column} not found in {table_name}, skipping")
                            continue
                        
                        # Update the translation
                        try:
                            query = f"UPDATE {table_name} SET {target_column} = %s WHERE {id_field} = %s"
                            c.execute(query, (translation, record_id))
                            total_updates += 1
                            print(f"  ✅ Updated {table_name}.{target_column} for ID {record_id}")
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
