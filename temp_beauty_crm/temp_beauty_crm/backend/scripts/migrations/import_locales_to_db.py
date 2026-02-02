#!/usr/bin/env python3
"""
Update base fields in database from Russian locale files.
Compliant with Rule 15: No language-prefixed columns in the database.
Only the base fields (name, address, etc.) are updated from the primary locale (Russian).
"""

import sys
import json
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection

# Frontend locales path
FRONTEND_DIR = backend_dir.parent / 'frontend'
LOCALES_DIR = FRONTEND_DIR / 'src' / 'locales'

def import_services():
    """Update base service fields from Russian locale"""
    print("📦 Updating services from locales (Russian base)...")
    
    ru_file = LOCALES_DIR / 'ru' / 'public_landing' / 'services.json'
    if not ru_file.exists():
        print("   ⚠️  No Russian services.json found, skipping")
        return
    
    with open(ru_file, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)
    
    items = ru_data.get('items', {})
    if not items:
        print("   ⚠️  No services in local file, skipping")
        return
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        updated = 0
        for key, service_data in items.items():
            name = service_data.get('name')
            desc = service_data.get('description')
            
            if name or desc:
                cursor.execute("""
                    UPDATE services 
                    SET name = COALESCE(%s, name), 
                        description = COALESCE(%s, description)
                    WHERE service_key = %s
                """, (name, desc, key))
                if cursor.rowcount > 0:
                    updated += 1
        
        conn.commit()
        print(f"   ✅ Updated {updated} services base fields")
        
    finally:
        cursor.close()
        conn.close()

def import_faq():
    """Update FAQ base fields from Russian locale"""
    print("\n❓ Updating FAQ from locales (Russian base)...")
    
    ru_file = LOCALES_DIR / 'ru' / 'public_landing' / 'faq.json'
    if not ru_file.exists():
        print("   ⚠️  No Russian faq.json found, skipping")
        return
    
    with open(ru_file, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)
    
    ru_items = ru_data.get('items', [])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id FROM public_faq ORDER BY display_order")
        existing_ids = [row[0] for row in cursor.fetchall()]
        
        updated = 0
        for idx, item in enumerate(ru_items):
            if idx < len(existing_ids):
                q = item.get('question')
                a = item.get('answer')
                cursor.execute("""
                    UPDATE public_faq SET question = %s, answer = %s WHERE id = %s
                """, (q, a, existing_ids[idx]))
                updated += 1
        
        conn.commit()
        print(f"   ✅ Updated {updated} FAQ items base fields")
    finally:
        cursor.close()
        conn.close()

def import_banners():
    """Update banner base fields from Russian locale"""
    print("\n🖼  Updating banners from locales (Russian base)...")
    
    ru_file = LOCALES_DIR / 'ru' / 'public_landing' / 'banners.json'
    if not ru_file.exists():
        print("   ⚠️  No Russian banners.json found, skipping")
        return
    
    with open(ru_file, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)
    
    ru_items = ru_data.get('items', [])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id FROM public_banners ORDER BY display_order")
        existing_ids = [row[0] for row in cursor.fetchall()]
        
        updated = 0
        for idx, item in enumerate(ru_items):
            if idx < len(existing_ids):
                t = item.get('title')
                s = item.get('subtitle')
                cursor.execute("""
                    UPDATE public_banners SET title = %s, subtitle = %s WHERE id = %s
                """, (t, s, existing_ids[idx]))
                updated += 1
        
        conn.commit()
        print(f"   ✅ Updated {updated} banners base fields")
    finally:
        cursor.close()
        conn.close()

def main():
    print("🔄 Updating database base fields from Russian locale files...\n")
    import_services()
    import_faq()
    import_banners()
    print("\n✅ Update complete!")

if __name__ == "__main__":
    main()
