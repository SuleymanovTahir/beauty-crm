#!/usr/bin/env python3
"""
Import services, FAQ, and banners from locale files to database.
This is the reverse of export_db_to_locales.py - locales are the source of truth.

This script:
1. Reads translations from frontend/src/locales/{lang}/public_landing/*.json
2. Updates corresponding database tables with those translations
3. Should be run after DB recreation to restore translated content
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

# All supported languages
LANGUAGES = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']


def import_services():
    """Import services translations from locale files to database"""
    print("📦 Importing services from locales...")
    
    # Read Russian file as base (source of truth for keys)
    ru_file = LOCALES_DIR / 'ru' / 'public_landing' / 'services.json'
    if not ru_file.exists():
        print("   ⚠️  No Russian services.json found, skipping")
        return
    
    with open(ru_file, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)
    
    service_keys = list(ru_data.get('items', {}).keys())
    if not service_keys:
        print("   ⚠️  No services in locale files, skipping")
        return
    
    # Collect translations for each language
    translations = {lang: {} for lang in LANGUAGES}
    
    for lang in LANGUAGES:
        lang_file = LOCALES_DIR / lang / 'public_landing' / 'services.json'
        if lang_file.exists():
            with open(lang_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                translations[lang] = data.get('items', {})
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        updated = 0
        for key in service_keys:
            # Check if service exists
            cursor.execute("SELECT id FROM services WHERE service_key = %s", (key,))
            result = cursor.fetchone()
            
            if not result:
                print(f"   ⚠️  Service '{key}' not in DB, skipping")
                continue
            
            service_id = result[0]
            
            # Build UPDATE query for all languages
            updates = []
            values = []
            
            for lang in LANGUAGES:
                service_data = translations[lang].get(key, {})
                name = service_data.get('name')
                desc = service_data.get('description')
                
                if name:
                    updates.append(f"name_{lang} = %s")
                    values.append(name)
                if desc:
                    updates.append(f"description_{lang} = %s")
                    values.append(desc)
            
            if updates:
                values.append(service_id)
                query = f"UPDATE services SET {', '.join(updates)} WHERE id = %s"
                cursor.execute(query, values)
                updated += 1
        
        conn.commit()
        print(f"   ✅ Updated {updated} services with translations from locales")
        
    finally:
        cursor.close()
        conn.close()


def import_faq():
    """Import FAQ translations from locale files to database"""
    print("\n❓ Importing FAQ from locales...")
    
    # Read Russian file as base
    ru_file = LOCALES_DIR / 'ru' / 'public_landing' / 'faq.json'
    if not ru_file.exists():
        print("   ⚠️  No Russian faq.json found, skipping")
        return
    
    with open(ru_file, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)
    
    ru_items = ru_data.get('items', [])
    if not ru_items:
        print("   ⚠️  No FAQ items in locale files, skipping")
        return
    
    # Collect translations for each language
    translations = {lang: [] for lang in LANGUAGES}
    
    for lang in LANGUAGES:
        lang_file = LOCALES_DIR / lang / 'public_landing' / 'faq.json'
        if lang_file.exists():
            with open(lang_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                translations[lang] = data.get('items', [])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get existing FAQ items ordered by display_order
        cursor.execute("SELECT id FROM public_faq ORDER BY display_order")
        existing_ids = [row[0] for row in cursor.fetchall()]
        
        updated = 0
        inserted = 0
        
        for idx, ru_item in enumerate(ru_items):
            # Build translations for this FAQ item
            updates = []
            values = []
            
            for lang in LANGUAGES:
                lang_items = translations.get(lang, [])
                if idx < len(lang_items):
                    item = lang_items[idx]
                    question = item.get('question')
                    answer = item.get('answer')
                    
                    if question:
                        updates.append(f"question_{lang} = %s")
                        values.append(question)
                    if answer:
                        updates.append(f"answer_{lang} = %s")
                        values.append(answer)
            
            if idx < len(existing_ids):
                # Update existing
                if updates:
                    values.append(existing_ids[idx])
                    query = f"UPDATE public_faq SET {', '.join(updates)} WHERE id = %s"
                    cursor.execute(query, values)
                    updated += 1
            else:
                # Insert new
                ru_question = ru_item.get('question', '')
                ru_answer = ru_item.get('answer', '')
                
                cursor.execute("""
                    INSERT INTO public_faq (question_ru, answer_ru, display_order, is_active)
                    VALUES (%s, %s, %s, TRUE)
                """, (ru_question, ru_answer, idx + 1))
                inserted += 1
        
        conn.commit()
        print(f"   ✅ Updated {updated}, inserted {inserted} FAQ items from locales")
        
    finally:
        cursor.close()
        conn.close()


def import_banners():
    """Import banner translations from locale files to database"""
    print("\n🖼  Importing banners from locales...")
    
    # Read Russian file as base
    ru_file = LOCALES_DIR / 'ru' / 'public_landing' / 'banners.json'
    if not ru_file.exists():
        print("   ⚠️  No Russian banners.json found, skipping")
        return
    
    with open(ru_file, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)
    
    ru_items = ru_data.get('items', [])
    if not ru_items:
        print("   ⚠️  No banner items in locale files, skipping")
        return
    
    # Collect translations for each language
    translations = {lang: [] for lang in LANGUAGES}
    
    for lang in LANGUAGES:
        lang_file = LOCALES_DIR / lang / 'public_landing' / 'banners.json'
        if lang_file.exists():
            with open(lang_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                translations[lang] = data.get('items', [])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get existing banners ordered by display_order
        cursor.execute("SELECT id FROM public_banners ORDER BY display_order")
        existing_ids = [row[0] for row in cursor.fetchall()]
        
        updated = 0
        inserted = 0
        
        for idx, ru_item in enumerate(ru_items):
            # Build translations for this banner
            updates = []
            values = []
            
            for lang in LANGUAGES:
                lang_items = translations.get(lang, [])
                if idx < len(lang_items):
                    item = lang_items[idx]
                    title = item.get('title')
                    subtitle = item.get('subtitle')
                    
                    if title:
                        updates.append(f"title_{lang} = %s")
                        values.append(title)
                    if subtitle:
                        updates.append(f"subtitle_{lang} = %s")
                        values.append(subtitle)
            
            if idx < len(existing_ids):
                # Update existing
                if updates:
                    values.append(existing_ids[idx])
                    query = f"UPDATE public_banners SET {', '.join(updates)} WHERE id = %s"
                    cursor.execute(query, values)
                    updated += 1
            else:
                # Insert new banner with all data from Russian locale
                title = ru_item.get('title', '')
                subtitle = ru_item.get('subtitle', '')
                image_url = ru_item.get('image_url', '')
                link_url = ru_item.get('link_url', '')
                bg_pos_desktop_x = ru_item.get('bg_pos_desktop_x', 50)
                bg_pos_desktop_y = ru_item.get('bg_pos_desktop_y', 50)
                bg_pos_mobile_x = ru_item.get('bg_pos_mobile_x', 50)
                bg_pos_mobile_y = ru_item.get('bg_pos_mobile_y', 50)
                is_flipped_horizontal = ru_item.get('is_flipped_horizontal', False)
                is_flipped_vertical = ru_item.get('is_flipped_vertical', False)
                
                cursor.execute("""
                    INSERT INTO public_banners (
                        title_ru, subtitle_ru, image_url, link_url, display_order, is_active,
                        bg_pos_desktop_x, bg_pos_desktop_y, bg_pos_mobile_x, bg_pos_mobile_y,
                        is_flipped_horizontal, is_flipped_vertical
                    )
                    VALUES (%s, %s, %s, %s, %s, TRUE, %s, %s, %s, %s, %s, %s)
                """, (title, subtitle, image_url, link_url, idx + 1,
                      bg_pos_desktop_x, bg_pos_desktop_y, bg_pos_mobile_x, bg_pos_mobile_y,
                      is_flipped_horizontal, is_flipped_vertical))
                inserted += 1
        
        conn.commit()
        print(f"   ✅ Updated {updated}, inserted {inserted} banners from locales")
        
    finally:
        cursor.close()
        conn.close()


def main():
    """Import all public content from locale files to database"""
    print("🔄 Importing locale files content to database...\n")
    print("ℹ️  Locales are the source of truth. DB will be updated.\n")
    
    import_services()
    import_faq()
    import_banners()
    
    print("\n✅ Import complete!")
    print("📁 Translations from locales are now in the database.")


if __name__ == "__main__":
    main()
