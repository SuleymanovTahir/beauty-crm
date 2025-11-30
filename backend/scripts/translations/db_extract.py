#!/usr/bin/env python3
"""
Extract translatable content from database
Identifies all text fields that need translation and checks against JSON files
"""

import sqlite3
import json
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    TRANSLATION_CONFIG, 
    LANGUAGES, 
    SOURCE_LANGUAGE, 
    DATABASE_PATH,
    EXTRACT_OUTPUT
)

FRONTEND_LOCALES_DIR = Path(__file__).parent.parent.parent.parent / "frontend" / "src" / "locales"

def load_existing_translations():
    """Load existing dynamic.json files for all languages"""
    translations = {}
    for lang in LANGUAGES:
        if lang == SOURCE_LANGUAGE:
            continue
            
        file_path = FRONTEND_LOCALES_DIR / lang / "dynamic.json"
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    translations[lang] = json.load(f)
            except json.JSONDecodeError:
                print(f"⚠️  Warning: Could not parse {file_path}, treating as empty")
                translations[lang] = {}
        else:
            translations[lang] = {}
    return translations

def extract_translatable_content():
    """
    Extract all content from database that needs translation
    Creates a JSON file with missing translations
    """
    print("🔍 Extracting translatable content from database...")
    
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    existing_translations = load_existing_translations()
    results = {}
    total_missing = 0
    
    for table_name, config in TRANSLATION_CONFIG.items():
        print(f"\n📋 Processing table: {table_name}")
        
        id_field = config["id_field"]
        fields = config["fields"]
        where_clause = config.get("where", None)
        
        # Build SELECT query
        query = f"SELECT {id_field}, {', '.join(fields)} FROM {table_name}"
        if where_clause:
            query += f" WHERE {where_clause}"
        
        try:
            cursor.execute(query)
            rows = cursor.fetchall()
            
            table_results = []
            table_missing = 0
            
            for row in rows:
                row_dict = dict(row)
                record_id = row_dict[id_field]
                
                record_data = {
                    "id": record_id,
                    "fields": {}
                }
                
                # Process each field
                for field in fields:
                    source_value = row_dict.get(field)
                    
                    # Skip if source is empty
                    if not source_value or not str(source_value).strip():
                        continue
                    
                    # Generate key: table.id.field
                    key = f"{table_name}.{record_id}.{field}"
                    
                    field_data = {
                        SOURCE_LANGUAGE: source_value,
                        "key": key
                    }
                    
                    field_has_missing = False
                    
                    # Check translations in JSON files
                    for lang in LANGUAGES:
                        if lang == SOURCE_LANGUAGE:
                            continue
                        
                        # Check if key exists in existing translations
                        existing_val = existing_translations.get(lang, {}).get(key)
                        
                        if existing_val:
                            field_data[lang] = existing_val
                        else:
                            field_data[lang] = None
                            field_has_missing = True
                            table_missing += 1
                            total_missing += 1
                    
                    # NEW: Check if source language itself needs translation (correction)
                    # This happens if we detected that source text is NOT in source language (e.g. EN text in RU field)
                    # We can't easily detect here without instantiating Translator, which might be slow for all records
                    # But we can check if we have a "detected_language" stored? No, we don't store it in DB yet.
                    # So we rely on db_translate.py to do the actual detection and correction.
                    # BUT db_translate.py only runs on items in this list.
                    # So we MUST include items here if they look suspicious?
                    
                    # Actually, let's instantiate Translator here. It uses cache so it should be fast for repeated runs.
                    # We'll do it only if we haven't already flagged this field as missing
                    if not field_has_missing:
                        # Lazy instantiation
                        if 'translator' not in locals():
                            from translator import Translator
                            translator = Translator(use_cache=True)
                        
                        detected = translator.detect_language(source_value)
                        # Only flag if detected is 'en' (reliable) and source is 'ru'
                        if detected == 'en' and SOURCE_LANGUAGE == 'ru':
                             print(f"    ⚠️  Language mismatch for {key}: detected '{detected}', expected '{SOURCE_LANGUAGE}'")
                             field_has_missing = True
                             # We don't increment total_missing here to avoid double counting if we re-run
                             # But effectively this forces it into the output list
                    
                    # Only include field if it has missing translations
                    if field_has_missing:
                        record_data["fields"][field] = field_data
                
                # Only include record if it has fields needing translation
                if record_data["fields"]:
                    table_results.append(record_data)
            
            if table_results:
                results[table_name] = table_results
                print(f"  ✅ Found {len(table_results)} records with {table_missing} missing translations")
            else:
                print(f"  ✅ All translations complete!")
        
        except sqlite3.OperationalError as e:
            print(f"  ⚠️  Error: {e}")
            print(f"  💡 Hint: Check table/column names in config")
    
    conn.close()
    
    # Save cache if translator was used
    if 'translator' in locals():
        translator.save_cache_to_disk()
    
    # Save results
    output_path = Path(EXTRACT_OUTPUT)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n📝 Extraction complete!")
    print(f"   Total missing translations: {total_missing}")
    print(f"   Output saved to: {EXTRACT_OUTPUT}")
    
    if total_missing == 0:
        print("\n✨ All translations are complete! Nothing to do.")
    else:
        print(f"\n💡 Next step: Run translation script")
        print(f"   npm run db:i18n:translate")
    
    return results


if __name__ == "__main__":
    extract_translatable_content()
