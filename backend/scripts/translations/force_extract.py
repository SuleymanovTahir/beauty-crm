#!/usr/bin/env python3
"""
Force extraction of untranslated content for Users and Reviews.
Bypasses db_extract logic and checks fields manually.
"""

import json
import sys
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor

# Setup paths
script_dir = Path(__file__).resolve().parent
backend_dir = script_dir.parent.parent
sys.path.insert(0, str(backend_dir))

from config import LANGUAGES, SOURCE_LANGUAGE, TRANSLATION_CONFIG, EXTRACT_OUTPUT
from db.connection import get_db_connection

def force_extract():
    print("💪 Force extracting Users and Reviews...")
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    output_data = {}
    total_missing = 0
    
    tables_to_check = ['users', 'public_reviews']
    
    for table in tables_to_check:
        print(f"\nScanning table: {table}")
        config = TRANSLATION_CONFIG.get(table)
        if not config:
            print(f"  ⚠️  No config found for {table}")
            continue
            
        fields = config['fields']
        where_clause = config.get('where', 'TRUE')
        
        # Build query to fetch all translation columns
        # e.g. full_name, full_name_en, full_name_kk ...
        select_parts = ["id"]
        for field in fields:
            # Base field name for constructing translated columns
            base_field = field
            if field.endswith(f"_{SOURCE_LANGUAGE}"):
                base_field = field[:-len(SOURCE_LANGUAGE)-1]
                
            select_parts.append(field)  # Source field
            for lang in LANGUAGES:
                if lang != SOURCE_LANGUAGE:
                    select_parts.append(f"{base_field}_{lang}")
        
        query = f"SELECT {', '.join(select_parts)} FROM {table} WHERE {where_clause}"
        cur.execute(query)
        rows = cur.fetchall()
        
        table_records = []
        
        for row in rows:
            record_needs_translation = False
            record_data = {
                "id": row['id'],
                "fields": {}
            }
            
            for field in fields:
                base_field = field
                if field.endswith(f"_{SOURCE_LANGUAGE}"):
                    base_field = field[:-len(SOURCE_LANGUAGE)-1]

                source_val = row.get(field)
                if not source_val:
                    continue
                    
                field_data = {SOURCE_LANGUAGE: source_val}
                missing_for_field = False
                
                for lang in LANGUAGES:
                    if lang == SOURCE_LANGUAGE:
                        continue
                        
                    trans_val = row.get(f"{base_field}_{lang}")
                    
                    # If translation is missing OR it equals source value (and source is long enough to unlikely be same)
                    # For names/positions, they might be same.
                    # But if None, definitely missing.
                    if trans_val is None or trans_val == "":
                        missing_for_field = True
                        field_data[lang] = None
                    else:
                        field_data[lang] = trans_val
                
                if missing_for_field:
                    record_needs_translation = True
                    record_data["fields"][field] = field_data
            
            if record_needs_translation:
                table_records.append(record_data)
                total_missing += 1
        
        if table_records:
            output_data[table] = table_records
            print(f"  Found {len(table_records)} records needing translation")
        else:
            print("  ✅ All good (or empty)")
            
    conn.close()
    
    # Save to translations_needed.json
    output_path = Path(backend_dir) / EXTRACT_OUTPUT
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
        
    print(f"\n💾 Saved extraction to {output_path}")
    print(f"Total records processed: {total_missing}")

if __name__ == "__main__":
    force_extract()
