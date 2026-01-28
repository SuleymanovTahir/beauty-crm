#!/usr/bin/env python3
"""
Extract translatable content from database
Identifies all text fields that need translation and checks against JSON files
"""

import json
import sys
import os
import hashlib
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection

from config import (
    TRANSLATION_CONFIG, 
    LANGUAGES, 
    SOURCE_LANGUAGE, 
    EXTRACT_OUTPUT,
    SKIP_TRANSLATION_FIELDS
)

FRONTEND_LOCALES_DIR = backend_dir.parent / "frontend" / "src" / "locales"

def load_existing_translations():
    """Load existing dynamic.json files for all languages"""
    translations = {}
    for lang in LANGUAGES:
        # Don't skip source language, we need to check if keys exist there too
            
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
    
    conn = get_db_connection()
    conn.row_factory = True # Enable DictCursor for dict(row) support
    cursor = conn.cursor()
    
    existing_translations = load_existing_translations()
    results = {}
    total_missing = 0
    
    for table_name, config in TRANSLATION_CONFIG.items():
        print(f"\n📋 Processing table: {table_name}")
        
        id_field = config["id_field"]
        logical_fields = config["fields"]
        where_clause = config.get("where", None)
        
        # 1. Fetch table schema to resolve logical fields to real columns
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table_name,))
        actual_columns = {col[0] for col in cursor.fetchall()}
        
        # 2. Map logical fields to actual columns for querying
        # And keep track of which logical field corresponds to which actual columns
        query_columns = [id_field]
        field_to_cols = {} # field -> [col1, col2, ...]
        
        for field in logical_fields:
            mapped_cols = []
            # Priority: 
            # a) Exact match (e.g. 'address')
            # b) SOURCE_LANGUAGE match (e.g. 'name' -> 'name_ru')
            # c) Any other language match (e.g. 'name' -> 'name_en')
            
            if field in actual_columns:
                mapped_cols.append(field)
            
            # Check for _ru, _en, etc
            best_source_col = f"{field}_{SOURCE_LANGUAGE}"
            if best_source_col in actual_columns:
                mapped_cols.append(best_source_col)
                
            for lang in LANGUAGES:
                lang_col = f"{field}_{lang}"
                if lang_col in actual_columns and lang_col not in mapped_cols:
                    mapped_cols.append(lang_col)
            
            if not mapped_cols:
                print(f"  ⚠️  Warning: Could not find any column for logical field '{field}' in table '{table_name}'")
                continue
                
            field_to_cols[field] = mapped_cols
            for col in mapped_cols:
                if col not in query_columns:
                    query_columns.append(col)
        
        if not field_to_cols:
            print(f"  ⚠️  No translatable fields found for {table_name}, skipping")
            continue
            
        # Build SELECT query
        query = f"SELECT {', '.join(query_columns)} FROM {table_name}"
        if where_clause:
            query += f" WHERE {where_clause}"
        
        try:
            cursor.execute(query)
            rows = cursor.fetchall()
            
            table_results = []
            table_missing = 0
            
            # Lazy instantiation of translator for detection
            if 'translator' not in locals():
                from translator import Translator
                translator = Translator(use_cache=True)
            
            for row in rows:
                row_dict = dict(row)
                record_id = row_dict[id_field]
                
                record_data = {
                    "id": record_id,
                    "fields": {}
                }
                
                # Process each logical field
                for logical_field, cols in field_to_cols.items():
                    # Find the best source value from available columns
                    source_value = None
                    actual_source_col = None
                    
                    # Try SOURCE_LANGUAGE column first (e.g. name_ru)
                    ru_col = f"{logical_field}_{SOURCE_LANGUAGE}"
                    if ru_col in cols and row_dict.get(ru_col):
                        source_value = row_dict.get(ru_col)
                        actual_source_col = ru_col
                    
                    # If not found, try base column (e.g. name)
                    if not source_value and logical_field in cols and row_dict.get(logical_field):
                        source_value = row_dict.get(logical_field)
                        actual_source_col = logical_field
                        
                    # Still not found? Try any other language
                    if not source_value:
                        for col in cols:
                            if row_dict.get(col):
                                source_value = row_dict.get(col)
                                actual_source_col = col
                                break
                    
                    # Skip if absolutely no content found in any related column
                    if not source_value or not str(source_value).strip():
                        continue
                    
                    # Generate key: table.id.field.hash
                    hash_val = hashlib.md5(str(source_value).encode()).hexdigest()[:8]
                    key = f"{table_name}.{record_id}.{logical_field}.{hash_val}"
                    
                    field_data = {
                        "source_col": actual_source_col, # Audit info
                        SOURCE_LANGUAGE: source_value,
                        "key": key
                    }
                    
                    field_has_missing = False
                    
                    # Verify ALL languages
                    for lang in LANGUAGES:
                        # Check if key exists in existing translations
                        existing_val = existing_translations.get(lang, {}).get(key)
                        
                        # Check if the translation is actually present in JSON
                        if existing_val and str(existing_val).strip() != "":
                            field_data[lang] = existing_val
                        else:
                            # If not in JSON, check if it's already in the DB (for newly added columns)
                            db_col = f"{logical_field}_{lang}"
                            if lang == 'en': # English can be the base field
                                db_col = logical_field
                                
                            db_val = row_dict.get(db_col) if db_col in cols else None
                            
                            if db_val and str(db_val).strip() != "" and db_val != source_value:
                                # Data exists in DB and is different from source, so it's likely a valid translation
                                field_data[lang] = db_val
                            else:
                                if lang == SOURCE_LANGUAGE:
                                    field_data[lang] = source_value
                                else:
                                    field_data[lang] = None
                                    field_has_missing = True
                                    table_missing += 1
                                    total_missing += 1
                    
                    # Check if source language itself needs a "correction" or re-translation
                    skip_fields = SKIP_TRANSLATION_FIELDS.get(table_name, [])
                    if not field_has_missing and logical_field not in skip_fields:
                        try:
                            # Use mass translator if available, else standard
                            detected = translator.detect_language(source_value)
                            # If detected language is clearly different from SOURCE_LANGUAGE (e.g. EN in RU column)
                            # We only flag if content is long enough to be sure (>10 chars)
                            if detected == 'en' and SOURCE_LANGUAGE == 'ru' and len(str(source_value)) > 10:
                                 print(f"    ⚠️  Correction detected for {key}: '{detected}' instead of '{SOURCE_LANGUAGE}'")
                                 field_has_missing = True
                        except: pass
                    
                    if field_has_missing:
                        record_data["fields"][logical_field] = field_data
                
                # Only include record if it has fields needing translation
                if record_data["fields"]:
                    table_results.append(record_data)
            
            if table_results:
                results[table_name] = table_results
                print(f"  ✅ Found {len(table_results)} records with {table_missing} missing translations")
            else:
                print(f"  ✅ All translations complete!")
        

        
        except Exception as e:
            conn.rollback()
            print(f"  ⚠️  Error processing {table_name}: {e}")
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
