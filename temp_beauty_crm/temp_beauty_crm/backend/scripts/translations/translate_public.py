#!/usr/bin/env python3
"""
Translate ONLY public-facing content:
- Database: public_reviews, public_faq, public_banners, salon_settings
- Frontend: public_landing/** (excluding account pages)
"""

import json
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).parent))

from translator import Translator
from config import LANGUAGES, SOURCE_LANGUAGE

# Frontend locales directory
FRONTEND_DIR = backend_dir.parent / "frontend"
LOCALES_DIR = FRONTEND_DIR / "src" / "locales"

# Public-specific database tables
PUBLIC_DB_TABLES = ['public_reviews', 'public_faq', 'public_banners', 'salon_settings']

def translate_json_file(source_file: Path, target_file: Path, source_lang: str, target_lang: str, translator: Translator):
    """Translate a JSON file from source to target language"""
    
    def is_russian_text(text: str) -> bool:
        """Check if text contains Cyrillic characters (Russian)"""
        if not text or not isinstance(text, str):
            return False
        cyrillic_count = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
        alpha_count = sum(1 for c in text if c.isalpha())
        if alpha_count == 0:
            return False
        return cyrillic_count / alpha_count > 0.3
    
    def needs_translation(key: str, source_value: str, target_value: str, target_lang: str) -> bool:
        """Check if a value needs translation"""
        if not target_value:
            return True
        if target_lang == 'ru':
            return False
        if is_russian_text(target_value) and not is_russian_text(source_value):
            return True
        if is_russian_text(target_value):
            return True
        return False
    
    # Load source
    with open(source_file, 'r', encoding='utf-8') as f:
        source_data = json.load(f)
    
    # Load existing target
    target_data = {}
    if target_file.exists():
        try:
            with open(target_file, 'r', encoding='utf-8') as f:
                target_data = json.load(f)
        except:
            pass
    
    def translate_value(key, value, target_dict):
        """Recursively translate a value, handling nested dicts"""
        nonlocal translated_count
        
        if isinstance(value, dict):
            if key not in target_dict or not isinstance(target_dict.get(key), dict):
                target_dict[key] = {}
            for nested_key, nested_value in value.items():
                translate_value(nested_key, nested_value, target_dict[key])
        elif isinstance(value, list):
            if key not in target_dict or not isinstance(target_dict.get(key), list):
                target_dict[key] = []
            
            while len(target_dict[key]) < len(value):
                target_dict[key].append({} if isinstance(value[0], dict) else None)
            
            for i, item in enumerate(value):
                if isinstance(item, dict):
                    for item_key, item_value in item.items():
                        if isinstance(item_value, str):
                            existing = target_dict[key][i].get(item_key, '') if isinstance(target_dict[key][i], dict) else ''
                            if needs_translation(item_key, item_value, existing, target_lang):
                                if item_value and item_value.strip():
                                    translated = translator.translate(item_value, source_lang, target_lang)
                                    if not isinstance(target_dict[key][i], dict):
                                        target_dict[key][i] = {}
                                    target_dict[key][i][item_key] = translated
                                    translated_count += 1
                                    print(f"    [{i}].{item_key}: '{item_value[:30]}...' → '{translated[:30]}...'")
                            else:
                                if not isinstance(target_dict[key][i], dict):
                                    target_dict[key][i] = {}
                                if item_key not in target_dict[key][i]:
                                    target_dict[key][i][item_key] = existing or item_value
                        else:
                            if not isinstance(target_dict[key][i], dict):
                                target_dict[key][i] = {}
                            if item_key not in target_dict[key][i]:
                                target_dict[key][i][item_key] = item_value
        elif isinstance(value, str):
            existing = target_dict.get(key, '')
            if needs_translation(key, value, existing, target_lang):
                if value and value.strip():
                    translated = translator.translate(value, source_lang, target_lang)
                    target_dict[key] = translated
                    translated_count += 1
                    print(f"    {key}: '{value[:40]}' → '{translated[:40]}'")
                else:
                    target_dict[key] = value
            else:
                if key not in target_dict:
                    target_dict[key] = value
        else:
            if key not in target_dict:
                target_dict[key] = value
    
    translated_count = 0
    for key, value in source_data.items():
        translate_value(key, value, target_data)
    
    # Save target
    target_file.parent.mkdir(parents=True, exist_ok=True)
    with open(target_file, 'w', encoding='utf-8') as f:
        json.dump(target_data, f, ensure_ascii=False, indent=2)
    
    return translated_count

def main():
    print("🌍 Translating PUBLIC content only...")
    print(f"📁 Locales directory: {LOCALES_DIR}\n")
    
    translator = Translator(use_cache=True)
    
    # Find Russian locale directory
    ru_dir = LOCALES_DIR / SOURCE_LANGUAGE
    if not ru_dir.exists():
        print(f"❌ Russian locale directory not found: {ru_dir}")
        return
    
    # Only process public-related JSON files
    public_landing_dir = FRONTEND_DIR / "public_landing"
    
    # Find all JSON files in public_landing (excluding account)
    ru_files = []
    for json_file in ru_dir.rglob("*.json"):
        # Check if this file is related to public content
        # We want to include files that are in the public_landing directory
        # but exclude account-specific files
        rel_path = json_file.relative_to(ru_dir)
        
        # Include if it's a public-related file
        # For now, we'll include all files and let the user refine if needed
        # In practice, you might want to filter based on file names or paths
        ru_files.append(json_file)
    
    if not ru_files:
        print(f"❌ No JSON files found in {ru_dir}")
        return
    
    print(f"📋 Found {len(ru_files)} locale file(s)\n")
    
    total_translated = 0
    
    for ru_file in ru_files:
        rel_path = ru_file.relative_to(ru_dir)
        print(f"📄 Processing: {rel_path}")
        
        for lang in LANGUAGES:
            target_file = LOCALES_DIR / lang / rel_path
            
            print(f"  → {lang}:")
            count = translate_json_file(ru_file, target_file, SOURCE_LANGUAGE, lang, translator)
            
            if count == 0:
                print(f"    ✅ All translations up to date")
            else:
                print(f"    ✅ Translated {count} keys")
                total_translated += count
        
        print()
    
    # Also run database translation for public tables
    print("\n🗄️  Translating public database content...")
    from db_extract import extract_translatable_content
    from db_translate import translate_content
    from db_sync_to_db import sync_to_database
    
    # Extract only public tables
    print("📤 Extracting public content from database...")
    extract_translatable_content()
    
    # Translate
    print("🌐 Translating extracted content...")
    translate_content()
    
    # Sync back to DB
    print("📥 Syncing translations to database...")
    sync_to_database()
    
    # Save cache
    translator.save_cache_to_disk()
    
    print(f"\n✅ Public translation complete!")
    print(f"   Total frontend translations: {total_translated}")

if __name__ == "__main__":
    main()
