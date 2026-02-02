#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection

LANGUAGES = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']
TABLES = ['public_faq', 'public_reviews', 'public_banners']

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
        # Format: table.id.field or table.id.field_ru.hash
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
            
        # Extract field name (remove _ru suffix and hash if present)
        field_with_suffix = parts[2]
        
        # Determine base field name
        if field_with_suffix.endswith('_ru'):
            base_field = field_with_suffix[:-3]  # Remove '_ru'
        else:
            base_field = field_with_suffix
            
        # Handle special multi-word fields
        if field_with_suffix.startswith('employee_position'):
            base_field = 'employee_position'
        elif field_with_suffix.startswith('author_name'):
            base_field = 'author_name'
        
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
            
            # Delete existing data to avoid conflicts and duplicates
            # The user wants to replace "short" with "full"
            c.execute(f"DELETE FROM {table}")
            print(f"   🗑️ Cleared existing {table} data")
            
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
                
                # Add default values for required fields if missing
                if table == 'public_banners' and 'image_url' not in valid_columns:
                    # public_banners usually has image_url as NOT NULL or handled separately
                    pass
                
                query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
                c.execute(query, values)
                count += 1
                
            print(f"   ✅ Restored {count} items to {table}")
            
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
