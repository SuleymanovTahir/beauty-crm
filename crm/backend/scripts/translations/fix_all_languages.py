#!/usr/bin/env python3
import json
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).parent))

from translator import Translator

def apply_fixes_to_file(file_path: Path, lang: str, translator: Translator):
    if not file_path.exists():
        return False
        
    print(f"  📄 Processing {file_path.name} ({lang})...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except Exception as e:
            print(f"  ❌ Error loading {file_path}: {e}")
            return False
            
    def process_dict(d):
        fixed = 0
        for k, v in d.items():
            if isinstance(v, dict):
                fixed += process_dict(v)
            elif isinstance(v, str):
                new_v = translator._apply_terminology_corrections(v, lang)
                if new_v != v:
                    d[k] = new_v
                    fixed += 1
        return fixed

    fixed_count = process_dict(data)
    
    if fixed_count > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  ✅ Fixed {fixed_count} terms in {file_path.name}")
        return True
    return False

def main():
    print("🚀 Starting global terminology fix for all 9 languages...")
    translator = Translator(use_cache=False)
    locales_dir = backend_dir.parent / "frontend" / "src" / "locales"
    
    languages = ['en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk', 'ru']
    
    total_files_fixed = 0
    for lang in languages:
        lang_dir = locales_dir / lang
        if not lang_dir.exists():
            continue
            
        print(f"\n🌍 Language: {lang.upper()}")
        for json_file in lang_dir.rglob("*.json"):
            if apply_fixes_to_file(json_file, lang, translator):
                total_files_fixed += 1
                
    print(f"\n✨ Done! Fixed terminology in {total_files_fixed} files.")

if __name__ == "__main__":
    main()
