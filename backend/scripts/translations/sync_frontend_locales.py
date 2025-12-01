#!/usr/bin/env python3
"""
Check and add missing translations to frontend locale files
This ensures all locale files have consistent keys across all languages
"""
import json
import sys
from pathlib import Path
from typing import Dict, Set

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from translator import Translator
from config import LANGUAGES

# Frontend locales directory
FRONTEND_LOCALES_DIR = Path(__file__).parent.parent.parent.parent / "frontend" / "src" / "locales"

# Files to check for missing translations
LOCALE_FILES = [
    "public_landing.json",
    "common.json",
    "components.json"
]

def get_all_keys_from_file(file_path: Path) -> Set[str]:
    """Get all keys from a JSON file"""
    if not file_path.exists():
        return set()
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return set(data.keys())


def get_all_keys_across_languages(filename: str) -> Set[str]:
    """Get union of all keys across all language files"""
    all_keys = set()
    
    for lang in LANGUAGES:
        file_path = FRONTEND_LOCALES_DIR / lang / filename
        keys = get_all_keys_from_file(file_path)
        all_keys.update(keys)
    
    return all_keys


def add_missing_translations():
    """Add missing translations to all locale files"""
    translator = Translator(use_cache=True)
    total_added = 0
    
    for filename in LOCALE_FILES:
        print(f"\n📋 Processing {filename}...")
        
        # Get all keys that should exist
        all_keys = get_all_keys_across_languages(filename)
        
        if not all_keys:
            print(f"  ℹ️  No keys found, skipping")
            continue
        
        # For each language, check for missing keys
        for lang in LANGUAGES:
            file_path = FRONTEND_LOCALES_DIR / lang / filename
            
            if not file_path.exists():
                print(f"  ⚠️  {lang}/{filename} does not exist, skipping")
                continue
            
            # Load existing data
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            existing_keys = set(data.keys())
            missing_keys = all_keys - existing_keys
            
            if not missing_keys:
                continue
            
            print(f"  🔍 {lang}: Found {len(missing_keys)} missing keys")
            
            # Add missing translations
            for key in missing_keys:
                # Find the key in another language to translate from
                source_text = None
                source_lang = None
                
                # Try to find in English first, then Russian, then any other language
                for try_lang in ['en', 'ru'] + [l for l in LANGUAGES if l not in ['en', 'ru']]:
                    try_file = FRONTEND_LOCALES_DIR / try_lang / filename
                    if try_file.exists():
                        with open(try_file, 'r', encoding='utf-8') as f:
                            try_data = json.load(f)
                        if key in try_data:
                            source_text = try_data[key]
                            source_lang = try_lang
                            break
                
                if source_text and source_lang:
                    try:
                        # Translate from source language to target language
                        if source_lang == lang:
                            translated = source_text
                        else:
                            translated = translator.translate(source_text, source=source_lang, target=lang)
                        
                        data[key] = translated
                        print(f"    ✅ Added '{key}': {translated}")
                        total_added += 1
                    except Exception as e:
                        print(f"    ⚠️  Failed to translate '{key}': {e}")
                        data[key] = source_text  # Use source text as fallback
            
            # Save updated data with sorted keys
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
    
    # Save translator cache
    translator.save_cache_to_disk()
    
    print(f"\n✨ Added {total_added} missing translations!")
    return total_added


if __name__ == "__main__":
    print("🔍 Checking for missing translations in frontend locale files...")
    add_missing_translations()
    print("✅ Done!")
