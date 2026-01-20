#!/usr/bin/env python3
"""
Auto-translate frontend locale files in /src/locales
Optimized for ultra-speed: Groups all translations across all files per language
to minimize HTTP requests.
"""

import json
import sys
from pathlib import Path
import threading
from concurrent.futures import ThreadPoolExecutor
import re

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

def is_russian_text(text: str) -> bool:
    if not text or not isinstance(text, str): return False
    # Check for cyrillic characters
    cyrillic_count = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
    alpha_count = sum(1 for c in text if c.isalpha())
    if alpha_count == 0: return False
    return cyrillic_count / alpha_count > 0.3

def needs_translation(path: str, source_value: str, target_value: str, lang: str, file_rel_path: str, file_source_map: dict, translator: Translator, force: bool) -> bool:
    if force: return True
    
    # Priority 1: Glossary Match (SSOT)
    key_path = f"{file_rel_path}:{path}"
    if lang in translator.key_glossary and key_path in translator.key_glossary[lang]:
        if target_value != translator.key_glossary[lang][key_path]:
            return True
            
    # Priority 2: Source Value Changed
    saved_source = file_source_map.get(path)
    if saved_source and saved_source != source_value:
        return True
        
    # Priority 3: Missing Target or Cyrillic in Target
    if not target_value:
        return True

    if lang != 'ru' and is_russian_text(target_value) and not is_russian_text(source_value):
        return True
        
    # Priority 4: Terminology Correction Check
    if lang in translator.SALON_TERMINOLOGY:
        term_map = translator.SALON_TERMINOLOGY[lang]
        lower_target = target_value.lower().strip()
        if lower_target in term_map:
            # If the current target is an "incorrect" term from our glossary, we must fix it
            return True
            
    return False

def collect_from_dict(source_dict, target_dict, file_rel_path, lang, translator, file_source_map, force, path=""):
    tasks = []
    
    if isinstance(source_dict, dict):
        for k, v in source_dict.items():
            cp = f"{path}.{k}" if path else k
            if isinstance(v, dict):
                if k not in target_dict or not isinstance(target_dict[k], dict): target_dict[k] = {}
                tasks.extend(collect_from_dict(v, target_dict[k], file_rel_path, lang, translator, file_source_map, force, cp))
            elif isinstance(v, list):
                if k not in target_dict or not isinstance(target_dict[k], list): target_dict[k] = [None] * len(v)
                elif len(target_dict[k]) != len(v): target_dict[k] = [None] * len(v)
                tasks.extend(collect_from_dict(v, target_dict[k], file_rel_path, lang, translator, file_source_map, force, cp))
            elif isinstance(v, str):
                existing = target_dict.get(k, "")
                if needs_translation(cp, v, existing, lang, file_rel_path, file_source_map, translator, force):
                    if v.strip():
                        tasks.append({
                            'parent': target_dict,
                            'key': k,
                            'path': cp,
                            'value': v,
                            'file_rel_path': file_rel_path
                        })
                    else:
                        target_dict[k] = v
                        file_source_map[cp] = v
                else:
                    if cp not in file_source_map and existing:
                        file_source_map[cp] = v
            else:
                target_dict[k] = v
    elif isinstance(source_dict, list):
        for i, v in enumerate(source_dict):
            cp = f"{path}[{i}]"
            if isinstance(v, dict):
                if not target_dict[i] or not isinstance(target_dict[i], dict): target_dict[i] = {}
                tasks.extend(collect_from_dict(v, target_dict[i], file_rel_path, lang, translator, file_source_map, force, cp))
            elif isinstance(v, list):
                if not target_dict[i] or not isinstance(target_dict[i], list): target_dict[i] = [None] * len(v)
                tasks.extend(collect_from_dict(v, target_dict[i], file_rel_path, lang, translator, file_source_map, force, cp))
            elif isinstance(v, str):
                existing = target_dict[i] if i < len(target_dict) and target_dict[i] else ""
                if needs_translation(cp, v, existing, lang, file_rel_path, file_source_map, translator, force):
                    if v.strip():
                        tasks.append({
                            'parent': target_dict,
                            'key': i,
                            'path': cp,
                            'value': v,
                            'file_rel_path': file_rel_path
                        })
                    else:
                        target_dict[i] = v
                        file_source_map[cp] = v
                else:
                    if cp not in file_source_map and existing:
                        file_source_map[cp] = v
            else:
                target_dict[i] = v
                
    return tasks

def process_language(lang, ru_files, ru_dir, translator, source_map, force):
    print(f"  🌐 {lang.upper()}: Collecting strings...")
    all_lang_tasks = []
    file_data_map = {} # path -> (target_data, target_file, file_source_map)
    
    if lang not in source_map: source_map[lang] = {}
    
    for ru_file in ru_files:
        rel_path = ru_file.relative_to(ru_dir)
        file_rel_path_str = str(rel_path)
        target_file = LOCALES_DIR / lang / rel_path
        
        if file_rel_path_str not in source_map[lang]: source_map[lang][file_rel_path_str] = {}
        file_source_map = source_map[lang][file_rel_path_str]
        
        # Load RU
        with open(ru_file, 'r', encoding='utf-8') as f:
            ru_data = json.load(f)
            
        # Load existing target
        target_data = {}
        if target_file.exists():
            try:
                with open(target_file, 'r', encoding='utf-8') as f:
                    target_data = json.load(f)
            except: pass
            
        # Collect tasks
        file_tasks = collect_from_dict(ru_data, target_data, file_rel_path_str, lang, translator, file_source_map, force)
        all_lang_tasks.extend(file_tasks)
        file_data_map[file_rel_path_str] = (target_data, target_file, file_source_map)

    if not all_lang_tasks:
        print(f"    ✅ {lang.upper()}: Nothing to translate")
        return 0

    print(f"    🚀 {lang.upper()}: Translating {len(all_lang_tasks)} strings in mass batch...")
    
    # Extract texts and paths
    texts = [t['value'] for t in all_lang_tasks]
    key_paths = [f"{t['file_rel_path']}:{t['path']}" for t in all_lang_tasks]
    
    # Translate everything for this language in one go
    translated_texts = translator.translate_batch(texts, SOURCE_LANG, lang, key_paths=key_paths)
    
    # Apply back
    affected_files = set()
    for i, task in enumerate(all_lang_tasks):
        v = task['value']
        translated = translated_texts[i]
        
        # Case matching
        if v and v[0].isupper() and translated and not translated[0].isupper():
            translated = translated[0].upper() + translated[1:]
        elif v and v[0].islower() and translated and translated[0].isupper():
            translated = translated[0].lower() + translated[1:]
            
        task['parent'][task['key']] = translated
        # Update source map
        task_file_rel_path = task['file_rel_path']
        file_source_map = file_data_map[task_file_rel_path][2]
        file_source_map[task['path']] = v
        affected_files.add(task_file_rel_path)
        
    # Save affected files
    for file_rel_path in affected_files:
        target_data, target_file, _ = file_data_map[file_rel_path]
        target_file.parent.mkdir(parents=True, exist_ok=True)
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(target_data, f, ensure_ascii=False, indent=2, sort_keys=True)
            
    print(f"    ✅ {lang.upper()}: Done ({len(all_lang_tasks)} strings across {len(affected_files)} files)")
    return len(all_lang_tasks)

def main():
    force = "--force" in sys.argv
    print(f"🌍 Auto-translating frontend locale files ({'FORCE' if force else 'Smart'} Mode)...")
    print(f"🚀 Optimized Mode: Grouping by language for maximum speed")
    
    translator = Translator(use_cache=True)
    source_map = load_source_map() if not force else {}
    
    ru_dir = LOCALES_DIR / SOURCE_LANG
    if not ru_dir.exists():
        print(f"❌ Russian locale directory not found: {ru_dir}")
        return
        
    ru_files = list(ru_dir.rglob("*.json"))
    print(f"📋 Found {len(ru_files)} source files\n")
    
    total_translated = 0
    
    # We process languages in parallel, but collect all strings for each language FIRST
    # 16 threads is good for processing languages
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_lang = {executor.submit(process_language, lang, ru_files, ru_dir, translator, source_map, force): lang for lang in LANGUAGES}
        for future in future_to_lang:
            total_translated += future.result()
            
    save_source_map(source_map)
    translator.save_cache_to_disk()
    print(f"\n✅ Total translations performed: {total_translated}")

if __name__ == "__main__":
    main()
