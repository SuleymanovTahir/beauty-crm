#!/usr/bin/env python3
"""
Export services, FAQ, and banners from database to ALL locale files.
Uses existing translations from database columns (name_ru, name_en, name_ar, etc.)

SAFETY: By default, this script will SKIP exporting if:
  - Locale files already exist AND
  - Database has empty/missing translations (would result in fallback to Russian)
  
Use --force to override this safety check and always export.
"""

import sys
import os
import json
import argparse
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


def has_proper_translations(db_value, lang, default_value):
    """
    Check if database has a proper translation, not just a Russian fallback.
    Returns True if the value exists and is different from Russian default for non-ru languages.
    """
    if not db_value:
        return False
    if lang == 'ru':
        return True
    # If the translated value equals Russian default, it's probably not translated
    return db_value != default_value


def should_skip_export(output_file, force=False):
    """
    Check if we should skip exporting to this file.
    Skip if file exists and we're not forcing.
    """
    if force:
        return False
    return output_file.exists()


def export_services(force=False):
    """Export services from database to all language files"""
    print("📦 Exporting services...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all active services with ALL language columns
        cursor.execute("""
            SELECT service_key, 
                   name_ru, name_en, name_ar, name_es, name_de, name_fr, name_pt, name_hi, name_kk,
                   description_ru, description_en, description_ar, description_es, description_de, 
                   description_fr, description_pt, description_hi, description_kk,
                   price, min_price, max_price, currency, category, duration
            FROM services
            WHERE is_active = TRUE
            ORDER BY category, name_ru
        """)
        
        services = cursor.fetchall()
        
        if not services:
            print("   ⚠️  No services in database, skipping export")
            return
        
        # Process each language
        for lang_idx, lang in enumerate(LANGUAGES):
            output_file = LOCALES_DIR / lang / 'public_landing' / 'services.json'
            
            if should_skip_export(output_file, force):
                print(f"   ⏭️  {lang}: Skipped (file exists, use --force to overwrite)")
                continue
            
            categories = {}
            items = {}
            
            for row in services:
                key = row[0]
                # Names: ru=1, en=2, ar=3, es=4, de=5, fr=6, pt=7, hi=8, kk=9
                name = row[1 + lang_idx] or row[1]  # Fallback to Russian
                # Descriptions: ru=10, en=11, ar=12, es=13, de=14, fr=15, pt=16, hi=17, kk=18
                desc = row[10 + lang_idx] or row[10] or ""  # Fallback to Russian
                
                price, min_price, max_price, currency, category, duration = row[19:25]
                
                # Add category translation
                if category and category not in categories:
                    categories[category.lower().replace(' ', '_')] = category
                
                # Add service
                items[key] = {
                    "name": name,
                    "description": desc,
                    "price": float(price) if price else None,
                    "min_price": float(min_price) if min_price else None,
                    "max_price": float(max_price) if max_price else None,
                    "currency": currency or "AED",
                    "duration": duration or "",
                    "category": category.lower().replace(' ', '_') if category else "other"
                }
            
            # Create JSON structure
            data = {
                "categories": categories,
                "items": items
            }
            
            # Write to file
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"   ✅ {lang}: {len(items)} services")
        
    finally:
        cursor.close()
        conn.close()

def export_faq(force=False):
    """Export FAQ from database to all language files"""
    print("\n❓ Exporting FAQ...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT question_ru, question_en, question_ar, question_es, question_de, 
                   question_fr, question_pt, question_hi, question_kk,
                   answer_ru, answer_en, answer_ar, answer_es, answer_de,
                   answer_fr, answer_pt, answer_hi, answer_kk,
                   display_order
            FROM public_faq
            WHERE is_active = TRUE
            ORDER BY display_order
        """)
        
        faqs = cursor.fetchall()
        
        if not faqs:
            print("   ⚠️  No FAQ items in database, skipping export")
            return
        
        for lang_idx, lang in enumerate(LANGUAGES):
            output_file = LOCALES_DIR / lang / 'public_landing' / 'faq.json'
            
            if should_skip_export(output_file, force):
                print(f"   ⏭️  {lang}: Skipped (file exists, use --force to overwrite)")
                continue
            
            items = []
            for row in faqs:
                question = row[lang_idx] or row[0]  # Fallback to Russian
                answer = row[9 + lang_idx] or row[9] or ""  # Fallback to Russian
                
                items.append({
                    "question": question,
                    "answer": answer
                })
            
            data = {"items": items}
            
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"   ✅ {lang}: {len(items)} FAQ items")
        
    finally:
        cursor.close()
        conn.close()

def export_banners(force=False):
    """Export banners from database to all language files"""
    print("\n🖼  Exporting banners...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT title_ru, title_en, title_ar, title_es, title_de, title_fr, title_pt, title_hi, title_kk,
                   subtitle_ru, subtitle_en, subtitle_ar, subtitle_es, subtitle_de, 
                   subtitle_fr, subtitle_pt, subtitle_hi, subtitle_kk,
                   image_url, link_url, display_order, is_active, created_at,
                   bg_pos_desktop_x, bg_pos_desktop_y, bg_pos_mobile_x, bg_pos_mobile_y,
                   is_flipped_horizontal, is_flipped_vertical
            FROM public_banners
            WHERE is_active = TRUE
            ORDER BY display_order
        """)
        
        banners = cursor.fetchall()
        
        if not banners:
            print("   ⚠️  No banners in database, skipping export")
            return
        
        for lang_idx, lang in enumerate(LANGUAGES):
            output_file = LOCALES_DIR / lang / 'public_landing' / 'banners.json'
            
            if should_skip_export(output_file, force):
                print(f"   ⏭️  {lang}: Skipped (file exists, use --force to overwrite)")
                continue
            
            items = []
            for row in banners:
                title = row[lang_idx] or row[0]  # Fallback to Russian
                subtitle = row[9 + lang_idx] or row[9] or ""  # Fallback to Russian
                image_url, link_url, display_order, is_active, created_at, \
                bg_pos_desktop_x, bg_pos_desktop_y, bg_pos_mobile_x, bg_pos_mobile_y, \
                is_flipped_horizontal, is_flipped_vertical = row[18:]
                
                items.append({
                    "title": title,
                    "subtitle": subtitle,
                    "image_url": image_url or "",
                    "link_url": link_url or "",
                    "bg_pos_desktop_x": bg_pos_desktop_x,
                    "bg_pos_desktop_y": bg_pos_desktop_y,
                    "bg_pos_mobile_x": bg_pos_mobile_x,
                    "bg_pos_mobile_y": bg_pos_mobile_y,
                    "is_flipped_horizontal": is_flipped_horizontal,
                    "is_flipped_vertical": is_flipped_vertical
                })
            
            data = {"items": items}
            
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"   ✅ {lang}: {len(items)} banners")
        
    finally:
        cursor.close()
        conn.close()

def main():
    """Export all public content from database to locale files"""
    parser = argparse.ArgumentParser(description='Export DB content to locale files')
    parser.add_argument('--force', action='store_true', 
                        help='Force overwrite existing locale files')
    args = parser.parse_args()
    
    if args.force:
        print("🔄 FORCE MODE: Exporting database content to ALL locale files...\n")
        print("⚠️  WARNING: This will overwrite existing translations!\n")
    else:
        print("🔄 Exporting database content to locale files (safe mode)...\n")
        print("ℹ️  Existing files will be skipped. Use --force to overwrite.\n")
    
    export_services(force=args.force)
    export_faq(force=args.force)
    export_banners(force=args.force)
    
    print("\n✅ Export complete!")
    print(f"📁 Files location: {LOCALES_DIR}/{{lang}}/public_landing/")

if __name__ == "__main__":
    main()
