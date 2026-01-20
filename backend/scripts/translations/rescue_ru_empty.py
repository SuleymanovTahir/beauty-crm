#!/usr/bin/env python3
import json
import re
from pathlib import Path
import sys

# Add backend to path for translator
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).parent))

from translator import Translator

LOCALES_DIR = backend_dir.parent / "frontend" / "src" / "locales"
RU_DIR = LOCALES_DIR / "ru"

def humanize_key(key: str) -> str:
    """Convert key_name or nested.path.key_name to 'Key name'"""
    # Get the last part of the path
    parts = key.split('.')
    last_part = parts[-1]
    
    # Remove common prefixes/suffixes
    last_part = re.sub(r'^(toasts?|buttons?|dialogs?|stats?|placeholders?|labels?|hints?|titles?|subtitles?|forms?|tables?)\.', '', last_part)
    
    # Replace underscores and hyphens with spaces
    human = last_part.replace('_', ' ').replace('-', ' ')
    
    # Capitalize
    return human.capitalize()

def rescue_ru_file(file_path: Path, translator: Translator):
    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return 0

    rescued_count = 0
    
    def process_dict(d, path=""):
        nonlocal rescued_count
        for k, v in d.items():
            current_path = f"{path}.{k}" if path else k
            if isinstance(v, dict):
                process_dict(v, current_path)
            elif isinstance(v, str) and not v.strip():
                # Empty string found!
                suggested_en = humanize_key(current_path)
                # Translate from simplified EN to RU
                russian_text = translator.translate(suggested_en, source='en', target='ru')
                if russian_text and russian_text != suggested_en:
                    d[k] = russian_text
                    rescued_count += 1
                    print(f"  ✨ Rescued '{current_path}': '{suggested_en}' → '{russian_text}'")
                else:
                    # If translation failed or returned EN, just use capitalized EN as last resort
                    # d[k] = suggested_en
                    pass
    
    process_dict(data)
    
    if rescued_count > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
            
    return rescued_count

def main():
    print("🚀 Rescuing empty Russian translations...")
    translator = Translator(use_cache=True)
    
    ru_files = list(RU_DIR.rglob("*.json"))
    total_rescued = 0
    
    for ru_file in ru_files:
        rel_path = ru_file.relative_to(RU_DIR)
        print(f"📄 Processing {rel_path}...")
        count = rescue_ru_file(ru_file, translator)
        total_rescued += count
        
    translator.save_cache_to_disk()
    print(f"\n✅ Done! Rescued {total_rescued} keys in Russian locale.")

if __name__ == "__main__":
    main()
