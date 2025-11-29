#!/usr/bin/env python3
"""
Sync translated content back to database
Reads translations_completed.json and updates database
"""

import sqlite3
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    TRANSLATION_CONFIG,
    LANGUAGES,
    SOURCE_LANGUAGE,
    DATABASE_PATH,
    TRANSLATE_OUTPUT
)


def sync_translations():
    """
    Sync translated content back to database
    """
    print("💾 Syncing translations to database...")
    
    # Check if translate file exists
    translate_path = Path(TRANSLATE_OUTPUT)
    if not translate_path.exists():
        print(f"❌ Error: {TRANSLATE_OUTPUT} not found")
        print(f"💡 Run translation first: npm run db:i18n:translate")
        return
    
    # Load translated data
    with open(translate_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if not data:
        print("✨ No translations to sync!")
        return
    
    # Connect to database
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    total_updated = 0
    
    for table_name, records in data.items():
        print(f"\n📋 Syncing {table_name}...")
        
        config = TRANSLATION_CONFIG.get(table_name)
        if not config:
            print(f"  ⚠️  Table not in config, skipping")
            continue
        
        id_field = config["id_field"]
        
        for record in records:
            record_id = record["id"]
            fields_to_update = {}
            
            # Collect all fields to update
            for field_name, field_data in record["fields"].items():
                for lang in LANGUAGES:
                    if lang == SOURCE_LANGUAGE:
                        continue
                    
                    lang_value = field_data.get(lang)
                    if lang_value:
                        lang_field = f"{field_name}_{lang}"
                        fields_to_update[lang_field] = lang_value
            
            if not fields_to_update:
                continue
            
            # Build UPDATE query
            set_clause = ", ".join([f"{field} = ?" for field in fields_to_update.keys()])
            values = list(fields_to_update.values())
            values.append(record_id)
            
            query = f"UPDATE {table_name} SET {set_clause} WHERE {id_field} = ?"
            
            try:
                cursor.execute(query, values)
                total_updated += len(fields_to_update)
                print(f"  ✅ Updated record {record_id} ({len(fields_to_update)} fields)")
            except sqlite3.Error as e:
                print(f"  ❌ Error updating record {record_id}: {e}")
    
    # Commit changes
    conn.commit()
    conn.close()
    
    print(f"\n✅ Sync complete!")
    print(f"   Total fields updated: {total_updated}")
    print(f"\n🎉 Translation workflow finished!")
    print(f"   Check your application to see the translations.")


if __name__ == "__main__":
    sync_translations()
