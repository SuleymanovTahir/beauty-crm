#!/usr/bin/env python3
"""
Auto-translate frontend locale files in /public/locales
Uses the hybrid translator (LibreTranslate for short, Google for long)
Tracks source value changes to decide when to re-translate
"""

import json
import sys
from pathlib import Path
import hashlib

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

def translate_json_file(source_file: Path, target_file: Path, source_lang: str, target_lang: str, translator: Translator, source_map: dict):
    """Translate a JSON file from source to target language"""
    
    file_rel_path = str(source_file.relative_to(LOCALES_DIR / SOURCE_LANG))
    if target_lang not in source_map: source_map[target_lang] = {}
    if file_rel_path not in source_map[target_lang]: source_map[target_lang][file_rel_path] = {}
    
    file_source_map = source_map[target_lang][file_rel_path]

    def is_russian_text(text: str) -> bool:
        """Check if text contains Cyrillic characters (Russian)"""
        if not text or not isinstance(text, str): return False
        cyrillic_count = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
        alpha_count = sum(1 for c in text if c.isalpha())
        if alpha_count == 0: return False
        return cyrillic_count / alpha_count > 0.3
    
    def needs_translation(key_path: str, source_value: str, target_value: str) -> bool:
        """Check if a value needs translation based on source change or broken target"""
        # 1. Source value changed! (Force re-translation)
        saved_source = file_source_map.get(key_path)
        if saved_source and saved_source != source_value:
            return True
            
        # 2. Key exists in source but not in target
        if not target_value:
            return True
            
        # 3. Target is broken (contains source language text)
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

    def process_node(source_node, target_node, path=""):
        nonlocal translated_count
        
        if isinstance(source_node, dict):
            for k, v in source_node.items():
                curr_path = f"{path}.{k}" if path else k
                if k not in target_node or not isinstance(target_node[k], (dict if isinstance(v, dict) else str)):
                    target_node[k] = {} if isinstance(v, dict) else ""
                process_node(v, target_node[k], curr_path)
        elif isinstance(source_node, str):
            if needs_translation(path, source_node, target_node):
                if source_node.strip():
                    translated = translator.translate(source_node, source_lang, target_lang)
                    # Preserve capitalization if the translator failed to
                    if source_node and source_node[0].isupper() and translated and not translated[0].isupper():
                        translated = translated[0].upper() + translated[1:]
                    
                    target_node = translated
                    file_source_map[path] = source_node
                    translated_count += 1
                    print(f"    {path}: RU change detected or missing → {target_lang}")
                else:
                    target_node = source_node
            return target_node
        return target_node

    # Helper to traverse and update target_data
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
                        print(f"    {k}: RU ({v[:20]}) → {target_lang} ({translated[:20]})")
                    else:
                        t_dict[k] = v
                        file_source_map[cp] = v
                else:
                    # Even if not translating, ensure it's in the source map if it exists
                    if cp not in file_source_map and existing:
                        file_source_map[cp] = v
            else:
                t_dict[k] = v
    
    update_dict(source_data, target_data)
    
    # Save target
    if translated_count > 0:
        target_file.parent.mkdir(parents=True, exist_ok=True)
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(target_data, f, ensure_ascii=False, indent=2, sort_keys=True)
    
    return translated_count

def main():
    print("🌍 Auto-translating frontend locale files (Smart Mode)...")
    translator = Translator(use_cache=True)
    source_map = load_source_map()
    
    ru_dir = LOCALES_DIR / SOURCE_LANG
    if not ru_dir.exists():
        print(f"❌ Russian locale directory not found: {ru_dir}")
        return
    
    ru_files = list(ru_dir.rglob("*.json"))
    total_translated = 0
    
    for ru_file in ru_files:
        rel_path = ru_file.relative_to(ru_dir)
        print(f"📄 Processing: {rel_path}")
        
        for lang in LANGUAGES:
            target_file = LOCALES_DIR / lang / rel_path
            count = translate_json_file(ru_file, target_file, SOURCE_LANG, lang, translator, source_map)
            if count > 0:
                total_translated += count
        
    save_source_map(source_map)
    translator.save_cache_to_disk()
    print(f"\n✅ Done! Translated {total_translated} keys across all languages.")

if __name__ == "__main__":
    main()
