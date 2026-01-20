#!/usr/bin/env python3
"""
Fix bad translations in frontend locale files.
Detects untranslated keys (containing underscores or English words) and re-translates them.
"""

import json
import sys
import re
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).parent))

from translator import Translator

# Frontend locales directory
FRONTEND_DIR = backend_dir.parent / "frontend"
LOCALES_DIR = FRONTEND_DIR / "src" / "locales"

# Languages to fix (all supported languages)
LANGUAGES = ["ru", "en", "ar", "es", "de", "fr", "hi", "kk", "pt"]
SOURCE_LANG = 'ru'

def is_bad_translation(value: str, target_lang: str) -> bool:
    """
    Detect if a translation is bad (untranslated or poorly translated).
    Bad translations typically contain:
    - Underscores (e.g., "Add_reminder", "14_days")
    - Mixed case English words (e.g., "inay_roles_system")
    - All uppercase English (e.g., "AIOLIONS_FOUND")
    - "Imported from CSV" text
    - Number_word patterns (e.g., "14_days", "3_months")
    """
    if not isinstance(value, str):
        return False
    
    if not value or len(value.strip()) == 0:
        return False  # Empty values are not "bad", just empty
    
    # Check for "Imported from CSV" - always bad
    if "Imported from CSV" in value or "imported from csv" in value.lower():
        return True
    
    # Check for underscores - common in untranslated keys
    # Allow underscores in URLs and technical terms
    if '_' in value and not value.startswith('http'):
        return True
    
    # Check for patterns like "word_word" or "number_word"
    if re.search(r'[a-zA-Z0-9]+_[a-zA-Z0-9]+', value):
        return True
    
    # Check for all caps words (more than 3 chars) - likely untranslated
    # This works for any language using Latin alphabet
    if re.search(r'\b[A-Z]{4,}\b', value):
        return True
    
    # Check for mixed case patterns that suggest untranslated text
    # e.g., "Beauty salon service LYAZZAT" or "Add_reminder"
    if re.search(r'[A-Z]{2,}', value):
        # Has multiple consecutive uppercase letters, likely untranslated
        return True
    
    # NEW: Check for Cyrillic in non-Cyrillic locales (en, es, de, fr, pt, hi, ar)
    if target_lang not in ['ru', 'kk']:
        has_cyrillic = bool(re.search(r'[а-яА-ЯёЁ]', value))
        if has_cyrillic:
            return True # Cyrillic in non-Cyrillic file is bad

    # Check for English residue in non-Latin locales (Arabic, Hindi, etc.)
    if target_lang in ['ar', 'hi']:
        # Exclude common technical terms and currencies
        EXCLUSIONS = {'AED', 'USD', 'EUR', 'SMS', 'API', 'VIP', 'SPA', 'ID', 'URL', 'CSV', 'PDF', 'min', 'h', 'm'}
        if value.strip().upper() in EXCLUSIONS or value.strip().lower() in EXCLUSIONS:
            return False
            
        # If it's purely Latin (English) but should be Arabic/Hindi, it's bad
        has_latin = bool(re.search(r'[a-zA-Z]', value))
        if has_latin:
            if target_lang == 'ar':
                has_arabic = bool(re.search(r'[\u0600-\u06FF]', value))
                if not has_arabic: return True # Pure Latin in Arabic
            elif target_lang == 'hi':
                has_hindi = bool(re.search(r'[\u0900-\u097F]', value))
                if not has_hindi: return True # Pure Latin in Hindi
    
    # NEW: Check for English in Russian files - if no Cyrillic but has Latin words
    if target_lang == 'ru':
        has_cyrillic = bool(re.search(r'[а-яА-ЯёЁ]', value))
        has_latin_words = bool(re.search(r'[a-zA-Z]{3,}', value))
        # If it's English in a Russian file, it's bad
        if has_latin_words and not has_cyrillic:
            # Skip technical terms and placeholders
            if value.startswith('http') or '{{' in value:
                return False
            return True
            
    return False

def fix_dict_recursive(source_dict: dict, target_dict: dict, source_lang: str, target_lang: str, translator: Translator, path: str = "") -> int:
    """Recursively fix translations in nested dictionaries"""
    fixed_count = 0
    
    for key, source_value in source_dict.items():
        current_path = f"{path}.{key}" if path else key
        
        # Handle nested dictionaries
        if isinstance(source_value, dict):
            if key not in target_dict or not isinstance(target_dict[key], dict):
                target_dict[key] = {}
            fixed_count += fix_dict_recursive(source_value, target_dict[key], source_lang, target_lang, translator, current_path)
            continue
        
        # Handle lists
        if isinstance(source_value, list):
            if key not in target_dict or not isinstance(target_dict[key], list):
                target_dict[key] = []
            
            # Ensure target list has same length as source
            while len(target_dict[key]) < len(source_value):
                target_dict[key].append("")
            
            # Fix each item in the list
            for i, (s_item, t_item) in enumerate(zip(source_value, target_dict[key])):
                if isinstance(s_item, str) and (not t_item or is_bad_translation(t_item, target_lang)):
                    translated = translator.translate(s_item, source_lang if target_lang != 'ru' else 'en', target_lang)
                    target_dict[key][i] = translated
                    fixed_count += 1
                    print(f"    🔧 {current_path}[{i}]: '{t_item}' → '{translated}'")
            continue

        # Skip non-string values
        if not isinstance(source_value, str):
            target_dict[key] = source_value
            continue
        
        # Skip empty source values
        if not source_value or len(source_value.strip()) == 0:
            target_dict[key] = source_value
            continue
        
        target_value = target_dict.get(key, "")
        
        # Check if translation is missing or bad
        if not target_value or is_bad_translation(target_value, target_lang):
            # Re-translate
            if target_lang == 'ru':
                # If RU, translate FROM EN to RU
                translated = translator.translate(source_value, 'en', 'ru')
            else:
                # If other, translate FROM RU to target
                translated = translator.translate(source_value, source_lang, target_lang)
                
            target_dict[key] = translated
            fixed_count += 1
            
            if target_value:
                print(f"    🔧 {current_path}: '{target_value}' → '{translated}'")
            else:
                print(f"    ➕ {current_path}: '{source_value}' → '{translated}'")
    
    # 🗑️ NEW: Cleanup keys not present in source (Russian)
    keys_to_remove = []
    for key in target_dict.keys():
        if key not in source_dict:
            keys_to_remove.append(key)
    
    for key in keys_to_remove:
        print(f"    🗑️ Removing unused key: {path}.{key}" if path else f"    🗑️ Removing unused key: {key}")
        del target_dict[key]
        fixed_count += 1
            
    return fixed_count

def fix_json_file(source_file: Path, target_file: Path, source_lang: str, target_lang: str, translator: Translator):
    """Fix bad translations in a JSON file"""
    
    # Load source
    with open(source_file, 'r', encoding='utf-8') as f:
        source_data = json.load(f)
    
    # Load existing target
    if not target_file.exists():
        print(f"    ⚠️  Target file doesn't exist, will create: {target_file}")
        target_data = {}
    else:
        try:
            with open(target_file, 'r', encoding='utf-8') as f:
                target_data = json.load(f)
        except Exception as e:
            print(f"    ⚠️  Error loading target file: {e}")
            target_data = {}
    
    # Fix bad translations recursively
    fixed_count = fix_dict_recursive(source_data, target_data, source_lang, target_lang, translator)
    
    # Save target
    target_file.parent.mkdir(parents=True, exist_ok=True)
    with open(target_file, 'w', encoding='utf-8') as f:
        json.dump(target_data, f, ensure_ascii=False, indent=2)
    
    return fixed_count

def main():
    print("🔧 Fixing bad translations in frontend locale files...")
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
    
    total_fixed = 0
    
    for ru_file in ru_files:
        # Get relative path from ru directory
        rel_path = ru_file.relative_to(ru_dir)
        print(f"📄 Processing: {rel_path}")
        
        # Fix translations in all languages
        for lang in LANGUAGES:
            target_file = LOCALES_DIR / lang / rel_path
            
            print(f"  → {lang}:")
            count = fix_json_file(ru_file, target_file, SOURCE_LANG, lang, translator)
            
            if count == 0:
                print(f"    ✅ All translations are good")
            else:
                print(f"    ✅ Fixed {count} translations")
                total_fixed += count
        
        print()
    
    # Save cache
    translator.save_cache_to_disk()
    
    print(f"\n✅ Fix complete!")
    print(f"   Total fixed translations: {total_fixed}")
    
    if total_fixed == 0:
        print("   All locale files are good!")

if __name__ == "__main__":
    main()
