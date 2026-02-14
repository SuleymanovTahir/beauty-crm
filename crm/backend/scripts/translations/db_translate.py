#!/usr/bin/env python3
"""
Translate extracted content using Argos Translate
Reads translations_needed.json and creates translations_completed.json
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any

# Add backend directory to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))
# Also add current directory for local imports if needed, but usually backend root is enough if we import as scripts.translations...
# But here imports are `from config` which implies current dir.
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    LANGUAGES,
    SOURCE_LANGUAGE,
    EXTRACT_OUTPUT,
    TRANSLATE_OUTPUT,
    SKIP_TRANSLATION_FIELDS,
    SKIP_TRANSLATION_PATTERNS
)
from translator import Translator

def translate_content():
    """
    Translate all missing translations from extracted data using batch translation
    """
    import re
    
    print("🌍 Starting translation process...")
    
    # Check if extract file exists
    extract_path = Path(EXTRACT_OUTPUT)
    if not extract_path.exists():
        print(f"❌ Error: {EXTRACT_OUTPUT} not found")
        print(f"💡 Run extraction first: npm run db:i18n:extract")
        return
    
    # Load extracted data
    with open(extract_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if not data:
        print("✨ No translations needed!")
        return
    
    # Initialize translator
    translator = Translator(use_cache=True)
    
    # Helper function to check if field should be skipped
    def should_skip_translation(table_name: str, field_name: str, text: str) -> bool:
        if table_name in SKIP_TRANSLATION_FIELDS:
            if field_name in SKIP_TRANSLATION_FIELDS[table_name]:
                return True
        for pattern in SKIP_TRANSLATION_PATTERNS:
            if re.match(pattern, text.strip()):
                return True
        return False
    
    # Collect all missing translations grouped by (detected_lang, target_lang)
    # Map: (source_lang, target_lang) -> list of (text, field_data_ptr, is_name)
    translation_queue = {}
    
    for table_name, records in data.items():
        for record in records:
            for field_name, field_data in record["fields"].items():
                source_text = field_data.get(SOURCE_LANGUAGE)
                if not source_text or not source_text.strip():
                    continue
                
                if should_skip_translation(table_name, field_name, source_text):
                    for lang in LANGUAGES:
                        if field_data.get(lang) is None:
                            field_data[lang] = source_text
                    continue
                
                detected_lang = translator.detect_language(source_text)
                field_data['detected_language'] = detected_lang
                
                is_name_field = field_name in ['full_name', 'author_name', 'employee_name', 'client_name'] or field_name.endswith('_name')
                
                for lang in LANGUAGES:
                    if field_data.get(lang) is None or (lang == SOURCE_LANGUAGE and detected_lang != SOURCE_LANGUAGE):
                        if detected_lang == lang:
                            field_data[lang] = source_text
                            continue
                            
                        pair = (detected_lang, lang)
                        if pair not in translation_queue:
                            translation_queue[pair] = []
                        translation_queue[pair].append({
                            "text": source_text,
                            "field_data": field_data,
                            "lang": lang,
                            "is_name": is_name_field
                        })

    # Process queue using batches
    total_translated = 0
    for (src_lang, tgt_lang), items in translation_queue.items():
        if not items: continue
        
        print(f"\n📋 Batch translating {src_lang} -> {tgt_lang} ({len(items)} strings)...")
        
        # Split into name and non-name groups as names use transliteration
        names = [item for item in items if item["is_name"]]
        others = [item for item in items if not item["is_name"]]
        
        # Translate regular content
        if others:
            texts = [item["text"] for item in others]
            translated_texts = translator.translate_batch(texts, src_lang, tgt_lang)
            for i, item in enumerate(others):
                item["field_data"][tgt_lang] = translated_texts[i]
            total_translated += len(others)
            
        # Transliterate names
        if names:
            for item in names:
                source_clean = item["text"].strip().title()
                translated = translator.transliterate(source_clean, src_lang, tgt_lang)
                if translated:
                    translated = translated.title()
                item["field_data"][tgt_lang] = translated
                total_translated += 1

    # Save translated data
    output_path = Path(TRANSLATE_OUTPUT)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    # Save cache to disk
    translator.save_cache_to_disk()
    
    print(f"\n✅ Translation complete!")
    print(f"   Total translations: {total_translated}")
    print(f"   Output saved to: {TRANSLATE_OUTPUT}")

if __name__ == "__main__":
    translate_content()
