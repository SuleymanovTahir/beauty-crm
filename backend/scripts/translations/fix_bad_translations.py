#!/usr/bin/env python3
"""
Fix bad translations in frontend locale files - HIGH SPEED BATCHING VERSION.
Detects untranslated keys (underscores, English residue, etc.) and re-translates them via batch API.
"""

import json
import sys
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

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
    if not isinstance(value, str) or not value or not value.strip():
        return False
    if "Imported from CSV" in value or "imported from csv" in value.lower():
        return True
    if '_' in value and not value.startswith('http') and not re.search(r'{{|}}', value):
        return True
    if re.search(r'[a-zA-Z0-9]+_[a-zA-Z0-9]+', value) and not value.startswith('http'):
        return True
    if target_lang != 'ru' and re.search(r'\b[A-Z]{4,}\b', value): # All caps words
        return True
    # Cyrillic in non-Cyrillic locales
    if target_lang not in ['ru', 'kk']:
        if bool(re.search(r'[а-яА-ЯёЁ]', value)): return True
    # English residue in non-Latin
    if target_lang in ['ar', 'hi']:
        EXCLUSIONS = {'AED', 'USD', 'EUR', 'SMS', 'API', 'VIP', 'SPA', 'ID', 'URL', 'CSV', 'PDF', 'min', 'h', 'm'}
        if value.strip().upper() not in EXCLUSIONS and not bool(re.search(r'[\u0600-\u06FF]|[\u0900-\u097F]', value)):
             if bool(re.search(r'[a-zA-Z]', value)): return True
    # English in Russian
    if target_lang == 'ru':
        if bool(re.search(r'[a-zA-Z]{4,}', value)) and not bool(re.search(r'[а-яА-ЯёЁ]', value)):
            if not value.startswith('http') and '{{' not in value: return True
    return False

def collect_bad_recursive(source_node, target_node, target_lang, path=""):
    tasks = []
    if isinstance(source_node, dict):
        # 1. Collect bad or missing
        for k, v in source_node.items():
            cp = f"{path}.{k}" if path else k
            if isinstance(v, (dict, list)):
                if k not in target_node or not isinstance(target_node[k], type(v)):
                    target_node[k] = {} if isinstance(v, dict) else []
                tasks.extend(collect_bad_recursive(v, target_node[k], target_lang, cp))
            elif isinstance(v, str) and v.strip():
                tv = target_node.get(k, "")
                if not tv or is_bad_translation(tv, target_lang):
                    tasks.append({'parent': target_node, 'key': k, 'value': v, 'path': cp})
            else:
                target_node[k] = v
        # 2. Cleanup unused keys
        for k in list(target_node.keys()):
            if k not in source_node:
                del target_node[k]
    elif isinstance(source_node, list):
        if not isinstance(target_node, list): target_node[:] = []
        while len(target_node) < len(source_node): target_node.append("")
        while len(target_node) > len(source_node): target_node.pop()
        for i, v in enumerate(source_node):
            cp = f"{path}[{i}]"
            if isinstance(v, (dict, list)):
                if not target_node[i] or not isinstance(target_node[i], type(v)):
                    target_node[i] = {} if isinstance(v, dict) else []
                tasks.extend(collect_bad_recursive(v, target_node[i], target_lang, cp))
            elif isinstance(v, str) and v.strip():
                tv = target_node[i] if i < len(target_node) else ""
                if not tv or is_bad_translation(tv, target_lang):
                    tasks.append({'parent': target_node, 'key': i, 'value': v, 'path': cp})
    return tasks

def process_lang(lang, ru_files, ru_dir, translator):
    print(f"  🌐 {lang.upper()}: Checking for bad translations...")
    all_tasks = []
    file_data = {} # rel_path -> (target_data, target_path)
    
    for ru_file in ru_files:
        rel_path = ru_file.relative_to(ru_dir)
        target_path = LOCALES_DIR / lang / rel_path
        
        with open(ru_file, 'r', encoding='utf-8') as f: source_data = json.load(f)
        target_data = {}
        if target_path.exists():
            try:
                with open(target_path, 'r', encoding='utf-8') as f: target_data = json.load(f)
            except: pass
        
        file_tasks = collect_bad_recursive(source_data, target_data, lang)
        for t in file_tasks: t['rel_path'] = str(rel_path)
        all_tasks.extend(file_tasks)
        file_data[str(rel_path)] = (target_data, target_path)
        
    if not all_tasks:
        print(f"    ✅ {lang.upper()}: Everything looks good")
        return 0
        
    print(f"    🔧 {lang.upper()}: Fixing {len(all_tasks)} bad/missing translations in batch...")
    
    # Batch translate
    texts = [t['value'] for t in all_tasks]
    key_paths = [f"{t['rel_path']}:{t['path']}" for t in all_tasks]
    results = translator.translate_batch(texts, SOURCE_LANG if lang != 'ru' else 'en', lang, key_paths=key_paths)
    
    # Apply
    affected_files = set()
    for i, t in enumerate(all_tasks):
        t['parent'][t['key']] = results[i]
        affected_files.add(t['rel_path'])
        
    # Save
    for rel_path in affected_files:
        data, path = file_data[rel_path]
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
            
    print(f"    ✅ {lang.upper()}: Fixed {len(all_tasks)} issues across {len(affected_files)} files")
    return len(all_tasks)

def main():
    print("🔧 Fixing bad translations in frontend locale files (HIGH SPEED MODE)...")
    translator = Translator(use_cache=True)
    ru_dir = LOCALES_DIR / SOURCE_LANG
    if not ru_dir.exists(): return
    ru_files = list(ru_dir.rglob("*.json"))
    
    total_fixed = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_lang, lang, ru_files, ru_dir, translator): lang for lang in LANGUAGES}
        for f in futures: total_fixed += f.result()
        
    translator.save_cache_to_disk()
    print(f"\n✅ Total fixed: {total_fixed}")

if __name__ == "__main__":
    main()
