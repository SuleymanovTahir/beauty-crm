#!/usr/bin/env python3
"""
Auto-translate frontend locale files in /public/locales
Uses the hybrid translator (LibreTranslate for short, Google for long)
Tracks source value changes to decide when to re-translate
Optimized for speed: Parallel processing of files and languages
"""

import json
import sys
from pathlib import Path
import concurrent.futures
import threading

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).parent))

from translator import Translator

# Frontend locales directory
FRONTEND_DIR = backend_dir.parent / "frontend"
LOCALES_DIR = FRONTEND_DIR / "src" / "locales"
SOURCE_MAP_FILE = Path(__file__).parent / "translations_source_map.json"

# Languages to translate to
LANGUAGES = ['en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']
SOURCE_LANG = 'ru'

# Thread-safe lock for source_map and cache
map_lock = threading.Lock()

def load_source_map():
    if SOURCE_MAP_FILE.exists():
        try:
            with open(SOURCE_MAP_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_source_map(source_map):
    with open(SOURCE_MAP_FILE, 'w', encoding='utf-8') as f:
        json.dump(source_map, f, ensure_ascii=False, indent=2)

def translate_json_file(source_file: Path, target_file: Path, source_lang: str, target_lang: str, translator: Translator, source_map: dict, force: bool = False):
    """Translate a JSON file from source to target language"""
    
    file_rel_path = str(source_file.relative_to(LOCALES_DIR / SOURCE_LANG))
    
    with map_lock:
        if target_lang not in source_map: source_map[target_lang] = {}
        if file_rel_path not in source_map[target_lang]: source_map[target_lang][file_rel_path] = {}
        file_source_map = source_map[target_lang][file_rel_path]

    def is_russian_text(text: str) -> bool:
        if not text or not isinstance(text, str): return False
        cyrillic_count = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
        alpha_count = sum(1 for c in text if c.isalpha())
        if alpha_count == 0: return False
        return cyrillic_count / alpha_count > 0.3
    
    def needs_translation(path: str, source_value: str, target_value: str) -> bool:
        if force: return True
        saved_source = file_source_map.get(path)
        if saved_source and saved_source != source_value:
            return True
        if not target_value:
            return True
        if target_lang != 'ru' and is_russian_text(target_value) and not is_russian_text(source_value):
            return True
        if target_lang != 'ru' and is_russian_text(target_value):
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
        except: pass
    
    translated_count = 0

    def update_dict(s_dict, t_dict, p=""):
        nonlocal translated_count
        for k, v in s_dict.items():
            cp = f"{p}.{k}" if p else k
            if isinstance(v, dict):
                if k not in t_dict or not isinstance(t_dict[k], dict): t_dict[k] = {}
                update_dict(v, t_dict[k], cp)
            elif isinstance(v, str):
                existing = t_dict.get(k, "")
                if needs_translation(cp, v, existing):
                    if v.strip():
                        translated = translator.translate(v, source_lang, target_lang)
                        # Case matching
                        if v and v[0].isupper() and translated and not translated[0].isupper():
                            translated = translated[0].upper() + translated[1:]
                        elif v and v[0].islower() and translated and translated[0].isupper():
                            translated = translated[0].lower() + translated[1:]
                            
                        t_dict[k] = translated
                        file_source_map[cp] = v
                        translated_count += 1
                    else:
                        t_dict[k] = v
                        file_source_map[cp] = v
                else:
                    if cp not in file_source_map and existing:
                        file_source_map[cp] = v
            else:
                t_dict[k] = v
    
    update_dict(source_data, target_data)
    
    if translated_count > 0:
        target_file.parent.mkdir(parents=True, exist_ok=True)
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(target_data, f, ensure_ascii=False, indent=2, sort_keys=True)
        print(f"    {target_lang}: Translated {translated_count} keys in {file_rel_path}")
    
    return translated_count

def process_task(task):
    source_file, target_file, source_lang, target_lang, translator, source_map, force = task
    return translate_json_file(source_file, target_file, source_lang, target_lang, translator, source_map, force)

def main():
    force = "--force" in sys.argv
    print(f"🌍 Auto-translating frontend locale files ({'FORCE' if force else 'Smart'} Mode)...")
    print(f"🚀 Using Parallel Processing (16 threads)")
    
    translator = Translator(use_cache=True)
    source_map = load_source_map() if not force else {}
    
    ru_dir = LOCALES_DIR / SOURCE_LANG
    if not ru_dir.exists():
        print(f"❌ Russian locale directory not found: {ru_dir}")
        return
    
    ru_files = list(ru_dir.rglob("*.json"))
    tasks = []
    
    for ru_file in ru_files:
        rel_path = ru_file.relative_to(ru_dir)
        for lang in LANGUAGES:
            target_file = LOCALES_DIR / lang / rel_path
            tasks.append((ru_file, target_file, SOURCE_LANG, lang, translator, source_map, force))
    
    total_translated = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
        results = list(executor.map(process_task, tasks))
        total_translated = sum(results)
        
    save_source_map(source_map)
    translator.save_cache_to_disk()
    print(f"\n✅ Total translations performed: {total_translated}")

if __name__ == "__main__":
    main()
