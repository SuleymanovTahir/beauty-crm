#!/usr/bin/env python3
"""
Auto-translate frontend locale files in /public/locales
Uses the hybrid translator (LibreTranslate for short, Google for long)
"""

import json
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).parent))

from translator import Translator

# Frontend locales directory
FRONTEND_DIR = backend_dir.parent / "frontend"
LOCALES_DIR = FRONTEND_DIR / "src" / "locales"

# Languages to translate to
LANGUAGES = ['en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']
SOURCE_LANG = 'ru'

def translate_json_file(source_file: Path, target_file: Path, source_lang: str, target_lang: str, translator: Translator):
    """Translate a JSON file from source to target language"""
    
    def is_russian_text(text: str) -> bool:
        """Check if text contains Cyrillic characters (Russian)"""
        if not text or not isinstance(text, str):
            return False
        # Count Cyrillic characters
        cyrillic_count = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
        # If more than 30% of alpha chars are Cyrillic, consider it Russian
        alpha_count = sum(1 for c in text if c.isalpha())
        if alpha_count == 0:
            return False
        return cyrillic_count / alpha_count > 0.3
    
    def needs_translation(key: str, source_value: str, target_value: str, target_lang: str) -> bool:
        """Check if a value needs translation"""
        # No target value - needs translation
        if not target_value:
            return True
        # Target lang is Russian - no translation needed
        if target_lang == 'ru':
            return False
        # Target has Russian text when it shouldn't - needs retranslation
        if is_russian_text(target_value) and not is_russian_text(source_value):
            # Source is not Russian but target is Russian = broken translation
            return True
        if is_russian_text(target_value):
            # Target is Russian but lang is not ru = broken translation
            return True
        return False
    
    # Load source
    with open(source_file, 'r', encoding='utf-8') as f:
        source_data = json.load(f)
    
    # Load existing target (if exists) to preserve existing translations
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
            # Handle nested dict
            if key not in target_dict or not isinstance(target_dict.get(key), dict):
                target_dict[key] = {}
            for nested_key, nested_value in value.items():
                translate_value(nested_key, nested_value, target_dict[key])
        elif isinstance(value, list):
            # Handle lists (like FAQ items, banner items)
            if key not in target_dict or not isinstance(target_dict.get(key), list):
                target_dict[key] = []
            
            # Ensure target list has same length
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
                            # Non-string values (numbers, bools) - just copy
                            if not isinstance(target_dict[key][i], dict):
                                target_dict[key][i] = {}
                            if item_key not in target_dict[key][i]:
                                target_dict[key][i][item_key] = item_value
        elif isinstance(value, str):
            # Handle string
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
            # Handle other types (numbers, bools, etc) - just copy
            if key not in target_dict:
                target_dict[key] = value
    
    # Translate missing keys
    translated_count = 0
    for key, value in source_data.items():
        translate_value(key, value, target_data)
    
    # Save target
    target_file.parent.mkdir(parents=True, exist_ok=True)
    with open(target_file, 'w', encoding='utf-8') as f:
        json.dump(target_data, f, ensure_ascii=False, indent=2)
    
    return translated_count

def main():
    print("🌍 Auto-translating frontend locale files...")
    print(f"📁 Locales directory: {LOCALES_DIR}\n")
    
    translator = Translator(use_cache=True)
    
    # Find all Russian JSON files
    ru_dir = LOCALES_DIR / SOURCE_LANG
    if not ru_dir.exists():
        print(f"❌ Russian locale directory not found: {ru_dir}")
        return
    
    # Find all JSON files recursively
    ru_files = list(ru_dir.rglob("*.json"))
    
    if not ru_files:
        print(f"❌ No JSON files found in {ru_dir}")
        return
    
    print(f"📋 Found {len(ru_files)} Russian locale file(s)\n")
    
    total_translated = 0
    
    for ru_file in ru_files:
        # Get relative path from ru directory
        rel_path = ru_file.relative_to(ru_dir)
        print(f"📄 Processing: {rel_path}")
        
        # Translate to all languages
        for lang in LANGUAGES:
            target_file = LOCALES_DIR / lang / rel_path
            
            print(f"  → {lang}:")
            count = translate_json_file(ru_file, target_file, SOURCE_LANG, lang, translator)
            
            if count == 0:
                print(f"    ✅ All translations up to date")
            else:
                print(f"    ✅ Translated {count} keys")
                total_translated += count
        
        print()
    
    # Save cache
    translator.save_cache_to_disk()
    
    print(f"\n✅ Translation complete!")
    print(f"   Total new translations: {total_translated}")
    
    if total_translated == 0:
        print("   All locale files are up to date!")

if __name__ == "__main__":
    main()
