#!/usr/bin/env python3
"""
Translate missing frontend locale values
"""

import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from translator import Translator
from config import LANGUAGES

FRONTEND_LOCALES_DIR = Path(__file__).parent.parent.parent.parent / "frontend" / "src" / "locales"

def translate_missing_values():
    """Translate empty values in locale files"""
    translator = Translator(use_cache=True)
    
    # Keys to translate
    keys_to_translate = {
        "yearsExperience": "лет опыта",
        "happyClients": "довольных клиентов",
        "qualityGuarantee": "гарантия качества"
    }
    
    for lang in LANGUAGES:
        if lang == "ru":
            continue
            
        file_path = FRONTEND_LOCALES_DIR / lang / "common.json"
        
        if not file_path.exists():
            continue
        
        # Load file
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Translate missing keys
        updated = False
        for key, ru_value in keys_to_translate.items():
            if key in data and (not data[key] or data[key].strip() == ""):
                translated = translator.translate(ru_value, "ru", lang)
                data[key] = translated
                print(f"  {lang}/{key}: '{ru_value}' -> '{translated}'")
                updated = True
        
        if updated:
            # Save file
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"✅ Updated {lang}/common.json")
    
    # Save cache
    translator.save_cache_to_disk()

if __name__ == "__main__":
    translate_missing_values()
