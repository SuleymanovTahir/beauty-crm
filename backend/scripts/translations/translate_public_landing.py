#!/usr/bin/env python3
"""
Translate public_landing files from Russian to all other languages.
Uses existing translator with universal context, exclusions, and terminology.
"""

import sys
import os
import json
from pathlib import Path

# Setup paths
script_dir = Path(__file__).resolve().parent
backend_dir = script_dir.parent.parent  # backend/scripts/translations -> backend
frontend_dir = backend_dir.parent / 'frontend'

# Add to path
sys.path.insert(0, str(backend_dir))

# Use robust Translator from translator.py instead of pure LibreTranslate
from scripts.translations.translator import Translator

# Locales directory
LOCALES_DIR = frontend_dir / 'src' / 'locales'

# Languages to translate to
TARGET_LANGS = ['en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']

def translate_services(translator):
    """Translate services.json to all languages"""
    print("📦 Translating services...")
    
    # Load Russian version
    ru_file = LOCALES_DIR / 'ru' / 'public_landing' / 'services.json'
    with open(ru_file, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)
    
    for lang in TARGET_LANGS:
        print(f"   → {lang}")
        
        # Translate categories
        categories = {}
        for key, value in ru_data['categories'].items():
            categories[key] = translator.translate(value, 'ru', lang)
        
        # Translate services
        items = {}
        for key, service in ru_data['items'].items():
            items[key] = {
                "name": translator.translate(service['name'], 'ru', lang),
                "description": translator.translate(service['description'], 'ru', lang) if service['description'] else "",
                "price": service['price'],  # Preserve
                "min_price": service.get('min_price'),  # Preserve
                "max_price": service.get('max_price'),  # Preserve
                "currency": service['currency'],  # Preserve (AED won't translate due to exclusions)
                "duration": service['duration'],  # Preserve
                "category": service['category']  # Preserve (key)
            }
        
        # Save translated version
        lang_data = {
            "categories": categories,
            "items": items
        }
        
        output_file = LOCALES_DIR / lang / 'public_landing' / 'services.json'
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(lang_data, f, ensure_ascii=False, indent=2)
    
    print(f"   ✅ Translated services to {len(TARGET_LANGS)} languages")

def translate_faq(translator):
    """Translate faq.json to all languages"""
    print("\n❓ Translating FAQ...")
    
    ru_file = LOCALES_DIR / 'ru' / 'public_landing' / 'faq.json'
    with open(ru_file, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)
    
    for lang in TARGET_LANGS:
        print(f"   → {lang}")
        
        items = []
        for item in ru_data['items']:
            items.append({
                "question": translator.translate(item['question'], 'ru', lang),
                "answer": translator.translate(item['answer'], 'ru', lang)
            })
        
        lang_data = {"items": items}
        
        output_file = LOCALES_DIR / lang / 'public_landing' / 'faq.json'
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(lang_data, f, ensure_ascii=False, indent=2)
    
    print(f"   ✅ Translated FAQ to {len(TARGET_LANGS)} languages")

def translate_banners(translator):
    """Translate banners.json to all languages"""
    print("\n🖼  Translating banners...")
    
    ru_file = LOCALES_DIR / 'ru' / 'public_landing' / 'banners.json'
    with open(ru_file, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)
    
    for lang in TARGET_LANGS:
        print(f"   → {lang}")
        
        items = []
        for item in ru_data['items']:
            items.append({
                "title": translator.translate(item['title'], 'ru', lang),
                "subtitle": translator.translate(item['subtitle'], 'ru', lang),
                "image": item['image'],  # Preserve
                "link": item['link']  # Preserve
            })
        
        lang_data = {"items": items}
        
        output_file = LOCALES_DIR / lang / 'public_landing' / 'banners.json'
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(lang_data, f, ensure_ascii=False, indent=2)
    
    print(f"   ✅ Translated banners to {len(TARGET_LANGS)} languages")

def main():
    """Translate all public_landing content"""
    print("🌍 Translating public_landing content...\n")
    
    # Create LibreTranslate translator (no rate limits)
    # Create robust translator
    print("⏳ Initializing Translator...")
    translator = Translator(use_cache=True)
    print("✅ Translator ready\n")
    
    # translate_services(translator)
    translate_faq(translator)
    # translate_banners(translator)
    
    print("\n✅ Translation complete!")
    print(f"📁 Files created in: {LOCALES_DIR}/{{lang}}/public_landing/")

if __name__ == "__main__":
    print("DEBUG: Script starting...")
    main()
    print("DEBUG: Script finished!")
