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

# Languages to fix
LANGUAGES = ['en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']
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
            translated = translator.translate(source_value, source_lang, target_lang)
            target_dict[key] = translated
            fixed_count += 1
            
            if target_value:
                print(f"    🔧 {current_path}: '{target_value}' → '{translated}'")
            else:
                print(f"    ➕ {current_path}: '{source_value}' → '{translated}'")
    
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
