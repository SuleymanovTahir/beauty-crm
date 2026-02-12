#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection

LANGUAGES = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']
TABLES = ['public_faq', 'public_reviews', 'public_banners']


def normalize_field_name(raw_field: str) -> str:
    """Normalize legacy language-suffixed field names to canonical field name."""
    match = re.match(r"^(?P<base>.+)_([a-z]{2})$", raw_field)
    if match is None:
        return raw_field

    language_code = match.group(2)
    if language_code in LANGUAGES:
        return match.group('base')

    return raw_field

def restore_full_content():
    print("🚀 Restoring full public content from locales...")
    
    # 1. Collect all data from dynamic.json (Russian locale for base fields)
    master_data = {}
    
    # Read Russian locale for base fields
    ru_dynamic_file = backend_dir.parent / 'frontend' / 'src' / 'locales' / 'ru' / 'dynamic.json'
    if not ru_dynamic_file.exists():
        print(f"❌ Russian dynamic.json not found at {ru_dynamic_file}")
        return
        
    with open(ru_dynamic_file, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)
        
    for key, value in ru_data.items():
        # Format: table.id.field or table.id.field.<hash>
        parts = key.split('.')
        if len(parts) < 3:
            continue
            
        table = parts[0]
        if table not in TABLES:
            continue
            
        try:
            item_id = int(parts[1])
        except ValueError:
            continue
            
        field_name = normalize_field_name(parts[2])
        
        # Handle special multi-word fields
        if field_name.startswith('employee_position'):
            base_field = 'employee_position'
        elif field_name.startswith('author_name'):
            base_field = 'author_name'
        else:
            base_field = field_name
        
        if table not in master_data:
            master_data[table] = {}
        if item_id not in master_data[table]:
            master_data[table][item_id] = {}
        
        # Store in base field (without language suffix) for Rule 15 compliance
        master_data[table][item_id][base_field] = value

    # 2. Update Database
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        for table in TABLES:
            print(f"📦 Processing {table}...")
            
            # Get table columns
            c.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table,))
            valid_columns = {row[0] for row in c.fetchall()}
            
            items = master_data.get(table, {})
            sorted_ids = sorted(items.keys())
            
            count = 0
            for item_id in sorted_ids:
                fields = items[item_id]
                
                # Filters only columns that actually exist in the table
                filtered_fields = {k: v for k, v in fields.items() if k in valid_columns}
                
                if not filtered_fields:
                    continue
                
                columns = ['id'] + list(filtered_fields.keys())
                placeholders = ['%s'] * len(columns)
                values = [item_id] + list(filtered_fields.values())
                
                # Update part for ON CONFLICT
                update_parts = [f"{col} = EXCLUDED.{col}" for col in filtered_fields.keys()]
                
                query = f"""
                    INSERT INTO {table} ({', '.join(columns)}) 
                    VALUES ({', '.join(placeholders)})
                    ON CONFLICT (id) DO UPDATE SET {', '.join(update_parts)}
                """
                c.execute(query, values)
                count += 1
                
            print(f"   ✅ Restored/Updated {count} items to {table}")
            
            # Reset sequence
            c.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1))")

        conn.commit()
        print("\n✨ Restoration complete!")
        
    except Exception as e:
        print(f"❌ Error during restoration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    restore_full_content()
