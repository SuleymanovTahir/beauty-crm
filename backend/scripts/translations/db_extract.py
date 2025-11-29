#!/usr/bin/env python3
"""
Extract translatable content from database
Identifies all text fields that need translation
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
    EXTRACT_OUTPUT
)


def extract_translatable_content():
    """
    Extract all content from database that needs translation
    Creates a JSON file with missing translations
    """
    print("🔍 Extracting translatable content from database...")
    
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    results = {}
    total_missing = 0
    
    for table_name, config in TRANSLATION_CONFIG.items():
        print(f"\n📋 Processing table: {table_name}")
        
        id_field = config["id_field"]
        fields = config["fields"]
        where_clause = config.get("where", None)
        
        # Build SELECT query
        select_fields = [id_field]
        for field in fields:
            # Add source language field
            select_fields.append(field)
            # Add all translation fields
            for lang in LANGUAGES:
                if lang != SOURCE_LANGUAGE:
                    select_fields.append(f"{field}_{lang}")
        
        query = f"SELECT {', '.join(select_fields)} FROM {table_name}"
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
                    if not source_value or not source_value.strip():
                        continue
                    
                    field_data = {
                        SOURCE_LANGUAGE: source_value
                    }
                    
                    field_has_missing = False
                    
                    # Check translations
                    for lang in LANGUAGES:
                        if lang == SOURCE_LANGUAGE:
                            continue
                        
                        lang_field = f"{field}_{lang}"
                        lang_value = row_dict.get(lang_field)
                        
                        if lang_value and lang_value.strip():
                            field_data[lang] = lang_value
                        else:
                            field_data[lang] = None
                            field_has_missing = True
                            table_missing += 1
                            total_missing += 1
                    
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
            print(f"  💡 Hint: Table might be missing translation columns")
    
    conn.close()
    
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
