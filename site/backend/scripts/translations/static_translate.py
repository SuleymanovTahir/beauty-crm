#!/usr/bin/env python3
"""
Static File Translator
Automatically translates JSON files in frontend/src/locales/
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import LANGUAGES, SOURCE_LANGUAGE
from translator import Translator

# Path to locales directory
def get_locales_dir():
    if os.environ.get("TEST_LOCALES_DIR"):
        path = Path(os.environ["TEST_LOCALES_DIR"])
        print(f"🧪 Using TEST_LOCALES_DIR: {path}")
        return path
    return Path(__file__).parent.parent.parent.parent / "frontend" / "src" / "locales"

def load_json(path: Path) -> Dict[str, Any]:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️  Error loading {path}: {e}")
        return {}

def save_json(path: Path, data: Dict[str, Any]):
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"❌ Error saving {path}: {e}")

def set_nested_value(d: Dict[str, Any], keys: list, value: Any):
    for key in keys[:-1]:
        d = d.setdefault(key, {})
    d[keys[-1]] = value

def get_nested_value(d: Dict[str, Any], keys: list) -> Any:
    for key in keys:
        if isinstance(d, dict) and key in d:
            d = d[key]
        else:
            return None
    return d

def process_file(file_path: Path, translator: Translator, source_dir: Path, locales_dir: Path):
    relative_path = file_path.relative_to(source_dir)
    print(f"\n📄 Processing {relative_path}...")
    
    # Load source file
    source_data = load_json(file_path)
    if not source_data:
        return

    # Load existing translations
    file_translations = {}
    for lang in LANGUAGES:
        lang_file = locales_dir / lang / relative_path
        if lang_file.exists():
            file_translations[lang] = load_json(lang_file)
        else:
            file_translations[lang] = {}

    source_changed = False
    
    # Recursive function to traverse and translate
    def traverse_and_translate(current_data, current_keys):
        nonlocal source_changed
        
        if isinstance(current_data, dict):
            for k, v in current_data.items():
                traverse_and_translate(v, current_keys + [k])
        elif isinstance(current_data, str) and current_data.strip():
            # Process string value
            source_text = current_data
            detected_lang = translator.detect_language(source_text)
            
            # 1. Handle Source File Update (Back-translation)
            # SAFETY: Only back-translate if detected language is English ('en')
            # This prevents false positives where short Russian strings are detected as bg/uk/kk
            if detected_lang == 'en':
                print(f"  🔄 Detected {detected_lang} for '{'.'.join(current_keys)}': '{source_text[:30]}...'")
                ru_translation = translator.translate(source_text, detected_lang, SOURCE_LANGUAGE)
                
                # Update source data in memory
                parent = source_data
                for key in current_keys[:-1]:
                    parent = parent[key]
                parent[current_keys[-1]] = ru_translation
                source_changed = True
                print(f"      → {SOURCE_LANGUAGE}: '{ru_translation}' (Updated source file)")
            
            # 2. Handle Target Languages
            for lang in LANGUAGES:
                if lang == SOURCE_LANGUAGE:
                    continue # Already handled above
                
                # Check if translation missing or empty
                existing_val = get_nested_value(file_translations[lang], current_keys)
                
                if not existing_val:
                    # Translate
                    # Use detected language as source if it's reliable (en), otherwise assume it's source language
                    src_lang = detected_lang if detected_lang == 'en' else SOURCE_LANGUAGE
                    
                    if lang == src_lang:
                        translated = source_text
                    else:
                        translated = translator.translate(source_text, src_lang, lang)
                    
                    # Set value
                    set_nested_value(file_translations[lang], current_keys, translated)
                    print(f"      → {lang}: '{translated}'")

    traverse_and_translate(source_data, [])
    
    # Save files
    if source_changed:
        save_json(file_path, source_data)
        print(f"  💾 Updated source file: {relative_path}")
        
    for lang in LANGUAGES:
        if lang == SOURCE_LANGUAGE:
            continue
        
        target_path = locales_dir / lang / relative_path
        save_json(target_path, file_translations[lang])

def main():
    print("🌍 Starting Static File Translation...")
    
    locales_dir = get_locales_dir()
    source_dir = locales_dir / SOURCE_LANGUAGE
    
    print(f"📂 Scanning: {source_dir}")
    
    if not source_dir.exists():
        print(f"❌ Source directory not found: {source_dir}")
        return
    
    translator = Translator(use_cache=True)
    
    # Walk through all files in source directory
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            if file.endswith('.json'):
                file_path = Path(root) / file
                process_file(file_path, translator, source_dir, locales_dir)
    
    # Save cache
    translator.save_cache_to_disk()
    print("\n✨ Static translation complete!")

if __name__ == "__main__":
    main()
