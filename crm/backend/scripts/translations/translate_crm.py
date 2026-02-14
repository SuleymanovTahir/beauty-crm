#!/usr/bin/env python3
"""
Translate ONLY CRM components:
- Frontend: src/components/** (shared components)
- No database translations
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

FRONTEND_DIR = backend_dir.parent / "frontend"
LOCALES_DIR = FRONTEND_DIR / "src" / "locales"

def translate_json_file(source_file: Path, target_file: Path, source_lang: str, target_lang: str, translator: Translator):
    """Translate a JSON file from source to target language"""
    
    def is_russian_text(text: str) -> bool:
        if not text or not isinstance(text, str):
            return False
        cyrillic_count = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
        alpha_count = sum(1 for c in text if c.isalpha())
        if alpha_count == 0:
            return False
        return cyrillic_count / alpha_count > 0.3
    
    def needs_translation(key: str, source_value: str, target_value: str, target_lang: str) -> bool:
        if not target_value:
            return True
        if target_lang == 'ru':
            return False
        if is_russian_text(target_value):
            return True
        return False
    
    with open(source_file, 'r', encoding='utf-8') as f:
        source_data = json.load(f)
    
    target_data = {}
    if target_file.exists():
        try:
            with open(target_file, 'r', encoding='utf-8') as f:
                target_data = json.load(f)
        except:
            pass
    
    def translate_value(key, value, target_dict):
        nonlocal translated_count
        
        if isinstance(value, dict):
            if key not in target_dict or not isinstance(target_dict.get(key), dict):
                target_dict[key] = {}
            for nested_key, nested_value in value.items():
                translate_value(nested_key, nested_value, target_dict[key])
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
    
    target_file.parent.mkdir(parents=True, exist_ok=True)
    with open(target_file, 'w', encoding='utf-8') as f:
        json.dump(target_data, f, ensure_ascii=False, indent=2)
    
    return translated_count

def main():
    print("🔧 Translating CRM components only...")
    print(f"📁 Locales directory: {LOCALES_DIR}\n")
    
    translator = Translator(use_cache=True)
    
    ru_dir = LOCALES_DIR / SOURCE_LANGUAGE
    if not ru_dir.exists():
        print(f"❌ Russian locale directory not found: {ru_dir}")
        return
    
    ru_files = list(ru_dir.rglob("*.json"))
    
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
    
    translator.save_cache_to_disk()
    
    print(f"\n✅ CRM translation complete!")
    print(f"   Total translations: {total_translated}")

if __name__ == "__main__":
    main()
