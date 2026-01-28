#!/usr/bin/env python3
"""
Normalized and optimized export script.
Exports services, FAQ, banners, pipeline stages, and invoice stages from DB to JSON.
Loads translations from dynamic.json to keep DB schema clean.
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
LANGUAGES = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']

def load_dynamic_translations(lang):
    """Load translations from dynamic.json for a specific language"""
    file_path = LOCALES_DIR / lang / 'dynamic.json'
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def get_translation(translations, table, id, field, fallback_value):
    """Find translation in dynamic.json context"""
    # Keys look like: table.id.field.hash
    # Since we don't know the hash here easily, we search for prefix: table.id.field.
    prefix = f"{table}.{id}.{field}."
    for key, value in translations.items():
        if key.startswith(prefix) and value:
            return value
    return fallback_value

def export_services(cursor, all_translations):
    print("📦 Exporting services...")
    cursor.execute("""
        SELECT id, service_key, name_ru, description_ru, price, min_price, max_price, currency, category, duration
        FROM services WHERE is_active = TRUE ORDER BY category, name_ru
    """)
    services = cursor.fetchall()
    if not services: return
    
    for lang in LANGUAGES:
        translations = all_translations.get(lang, {})
        output_file = LOCALES_DIR / lang / 'public_landing' / 'services.json'
        
        categories, items = {}, {}
        for row in services:
            id_db, key, name_ru, desc_ru, p, min_p, max_p, curr, cat, dur = row
            
            # Lookup translations
            name = get_translation(translations, "services", id_db, "name_ru", name_ru)
            desc = get_translation(translations, "services", id_db, "description_ru", desc_ru) or ""
            
            if cat: categories[cat.lower().replace(' ', '_')] = cat
            items[key] = {
                "name": name, "description": desc, "price": float(p) if p else None,
                "min_price": float(min_p) if min_p else None, "max_price": float(max_p) if max_p else None,
                "currency": curr or "AED", "duration": dur or "",
                "category": cat.lower().replace(' ', '_') if cat else "other"
            }
        
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({"categories": categories, "items": items}, f, ensure_ascii=False, indent=2)
        print(f"   ✅ {lang}: {len(items)} services")

def export_faq(cursor, all_translations):
    print("\n❓ Exporting FAQ...")
    cursor.execute("""
        SELECT id, question_ru, answer_ru FROM public_faq WHERE is_active = TRUE ORDER BY display_order
    """)
    faqs = cursor.fetchall()
    if not faqs: return
    
    for lang in LANGUAGES:
        translations = all_translations.get(lang, {})
        output_file = LOCALES_DIR / lang / 'public_landing' / 'faq.json'
        
        items = []
        for r in faqs:
            id_db, q_ru, a_ru = r
            question = get_translation(translations, "public_faq", id_db, "question_ru", q_ru)
            answer = get_translation(translations, "public_faq", id_db, "answer_ru", a_ru)
            items.append({"question": question, "answer": answer or ""})
            
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({"items": items}, f, ensure_ascii=False, indent=2)
        print(f"   ✅ {lang}: {len(items)} FAQ items")

def export_banners(cursor, all_translations):
    print("\n🖼  Exporting banners...")
    cursor.execute("""
        SELECT id, title_ru, subtitle_ru, image_url, link_url, bg_pos_desktop_x, bg_pos_desktop_y, 
               bg_pos_mobile_x, bg_pos_mobile_y, is_flipped_horizontal, is_flipped_vertical
        FROM public_banners WHERE is_active = TRUE ORDER BY display_order
    """)
    banners = cursor.fetchall()
    if not banners: return
    
    for lang in LANGUAGES:
        translations = all_translations.get(lang, {})
        output_file = LOCALES_DIR / lang / 'public_landing' / 'banners.json'
        
        items = []
        for r in banners:
            id_db, t_ru, s_ru = r[:3]
            title = get_translation(translations, "public_banners", id_db, "title_ru", t_ru)
            subtitle = get_translation(translations, "public_banners", id_db, "subtitle_ru", s_ru)
            
            items.append({
                "title": title, "subtitle": subtitle or "",
                "image_url": r[3] or "", "link_url": r[4] or "",
                "bg_pos_desktop_x": r[5], "bg_pos_desktop_y": r[6],
                "bg_pos_mobile_x": r[7], "bg_pos_mobile_y": r[8],
                "is_flipped_horizontal": r[9], "is_flipped_vertical": r[10]
            })
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({"items": items}, f, ensure_ascii=False, indent=2)
        print(f"   ✅ {lang}: {len(items)} banners")

def export_stages(cursor, all_translations, entity_type):
    print(f"\n📊 Exporting {entity_type} stages...")
    cursor.execute("""
        SELECT id, name, name_ru FROM workflow_stages 
        WHERE entity_type = %s ORDER BY sort_order
    """, (entity_type,))
    stages = cursor.fetchall()
    if not stages: return
    
    file_map = {'pipeline': 'funnel.json', 'invoice': 'invoices.json'}
    target_key = {'pipeline': 'stages', 'invoice': 'statuses'}
    
    for lang in LANGUAGES:
        translations = all_translations.get(lang, {})
        output_file = LOCALES_DIR / lang / 'admin' / file_map[entity_type]
        
        data = {}
        if output_file.exists():
            try:
                with open(output_file, 'r', encoding='utf-8') as f: data = json.load(f)
            except: pass
            
        if target_key[entity_type] not in data: data[target_key[entity_type]] = {}
        
        for r in stages:
            id_db, name_en, name_ru = r
            translated_name = get_translation(translations, "workflow_stages", id_db, "name_ru", name_ru)
            key = name_en.lower().replace(' ', '_')
            data[target_key[entity_type]][key] = translated_name
            
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ {lang}: {len(stages)} {entity_type} stages")

def main():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Load all translations first
        all_translations = {lang: load_dynamic_translations(lang) for lang in LANGUAGES}
        
        export_services(cur, all_translations)
        export_faq(cur, all_translations)
        export_banners(cur, all_translations)
        export_stages(cur, all_translations, 'pipeline')
        export_stages(cur, all_translations, 'invoice')
        print("\n✅ Export complete!")
    finally:
        cur.close(); conn.close()

if __name__ == "__main__": main()
