#!/usr/bin/env python3
"""
Normalized and optimized export script.
Exports services, FAQ, banners, pipeline stages, and invoice stages from DB to JSON.
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

def should_skip_export(output_file, force=False):
    if force: return False
    return output_file.exists()

def export_services(cursor, force=False):
    print("📦 Exporting services...")
    cursor.execute("""
        SELECT service_key, 
               name_ru, name_en, name_ar, name_es, name_de, name_fr, name_pt, name_hi, name_kk,
               description_ru, description_en, description_ar, description_es, description_de, 
               description_fr, description_pt, description_hi, description_kk,
               price, min_price, max_price, currency, category, duration
        FROM services WHERE is_active = TRUE ORDER BY category, name_ru
    """)
    services = cursor.fetchall()
    if not services: return
    
    for idx, lang in enumerate(LANGUAGES):
        output_file = LOCALES_DIR / lang / 'public_landing' / 'services.json'
        if should_skip_export(output_file, force): continue
        
        categories, items = {}, {}
        for row in services:
            key = row[0]
            name, desc = row[1+idx] or row[1], row[10+idx] or row[10] or ""
            p, min_p, max_p, curr, cat, dur = row[19:25]
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

def export_faq(cursor, force=False):
    print("\n❓ Exporting FAQ...")
    cursor.execute("""
        SELECT question_ru, question_en, question_ar, question_es, question_de, 
               question_fr, question_pt, question_hi, question_kk,
               answer_ru, answer_en, answer_ar, answer_es, answer_de,
               answer_fr, answer_pt, answer_hi, answer_kk
        FROM public_faq WHERE is_active = TRUE ORDER BY display_order
    """)
    faqs = cursor.fetchall()
    if not faqs: return
    
    for idx, lang in enumerate(LANGUAGES):
        output_file = LOCALES_DIR / lang / 'public_landing' / 'faq.json'
        if should_skip_export(output_file, force): continue
        items = [{"question": r[idx] or r[0], "answer": r[9+idx] or r[9] or ""} for r in faqs]
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({"items": items}, f, ensure_ascii=False, indent=2)
        print(f"   ✅ {lang}: {len(items)} FAQ items")

def export_banners(cursor, force=False):
    print("\n🖼  Exporting banners...")
    cursor.execute("""
        SELECT title_ru, title_en, title_ar, title_es, title_de, title_fr, title_pt, title_hi, title_kk,
               subtitle_ru, subtitle_en, subtitle_ar, subtitle_es, subtitle_de, subtitle_fr, subtitle_pt, subtitle_hi, subtitle_kk,
               image_url, link_url, bg_pos_desktop_x, bg_pos_desktop_y, bg_pos_mobile_x, bg_pos_mobile_y,
               is_flipped_horizontal, is_flipped_vertical
        FROM public_banners WHERE is_active = TRUE ORDER BY display_order
    """)
    banners = cursor.fetchall()
    if not banners: return
    
    for idx, lang in enumerate(LANGUAGES):
        output_file = LOCALES_DIR / lang / 'public_landing' / 'banners.json'
        if should_skip_export(output_file, force): continue
        items = [{
            "title": r[idx] or r[0], "subtitle": r[9+idx] or r[9] or "",
            "image_url": r[18] or "", "link_url": r[19] or "",
            "bg_pos_desktop_x": r[20], "bg_pos_desktop_y": r[21],
            "bg_pos_mobile_x": r[22], "bg_pos_mobile_y": r[23],
            "is_flipped_horizontal": r[24], "is_flipped_vertical": r[25]
        } for r in banners]
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({"items": items}, f, ensure_ascii=False, indent=2)
        print(f"   ✅ {lang}: {len(items)} banners")

def export_pipeline_stages(cursor, force=False):
    print("\n📊 Exporting pipeline stages...")
    cursor.execute("""
        SELECT name, name_en, name_ar, name_es, name_de, name_fr, name_pt, name_hi, name_kk, key
        FROM pipeline_stages WHERE is_active = TRUE ORDER BY order_index
    """)
    stages = cursor.fetchall()
    for idx, lang in enumerate(LANGUAGES):
        output_file = LOCALES_DIR / lang / 'admin' / 'funnel.json'
        data = {}
        if output_file.exists():
            try:
                with open(output_file, 'r', encoding='utf-8') as f: data = json.load(f)
            except: pass
        if "stages" not in data: data["stages"] = {}
        for r in stages: data["stages"][r[9] or r[0].lower().replace(' ', '_')] = r[idx] or r[0]
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ {lang}: {len(stages)} pipeline stages")

def export_invoice_stages(cursor, force=False):
    print("\n🧾 Exporting invoice stages...")
    cursor.execute("""
        SELECT name, name_en, name_ar, name_es, name_de, name_fr, name_pt, name_hi, name_kk, key
        FROM invoice_stages WHERE is_active = TRUE ORDER BY order_index
    """)
    stages = cursor.fetchall()
    for idx, lang in enumerate(LANGUAGES):
        output_file = LOCALES_DIR / lang / 'admin' / 'invoices.json'
        data = {}
        if output_file.exists():
            try:
                with open(output_file, 'r', encoding='utf-8') as f: data = json.load(f)
            except: pass
        if "statuses" not in data: data["statuses"] = {}
        for r in stages: data["statuses"][r[9] or r[0].lower().replace(' ', '_')] = r[idx] or r[0]
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ {lang}: {len(stages)} invoice stages")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        export_services(cur, args.force)
        export_faq(cur, args.force)
        export_banners(cur, args.force)
        export_pipeline_stages(cur, args.force)
        export_invoice_stages(cur, args.force)
        print("\n✅ Export complete!")
    finally:
        cur.close(); conn.close()

if __name__ == "__main__": main()
