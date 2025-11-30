#!/usr/bin/env python3
"""
Translate extracted content using Argos Translate
Reads translations_needed.json and creates translations_completed.json
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    LANGUAGES,
    SOURCE_LANGUAGE,
    EXTRACT_OUTPUT,
    TRANSLATE_OUTPUT
)
from translator import Translator


def translate_content():
    """
    Translate all missing translations from extracted data
    """
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
    
    # Process each table
    total_translated = 0
    
    for table_name, records in data.items():
        print(f"\n📋 Translating {table_name}...")
        
        for record in records:
            record_id = record["id"]
            print(f"  🔄 Record ID {record_id}:")
            
            for field_name, field_data in record["fields"].items():
                source_text = field_data.get(SOURCE_LANGUAGE)
                
                if not source_text:
                    continue
                
                print(f"    • {field_name}: '{source_text}'")
                
                # Translate to each missing language
                for lang in LANGUAGES:
                    if lang == SOURCE_LANGUAGE:
                        continue
                    
                    if field_data.get(lang) is None:
                        # Translate
                        translated = translator.translate(source_text, SOURCE_LANGUAGE, lang)
                        field_data[lang] = translated
                        total_translated += 1
                        print(f"      → {lang}: '{translated}'")
    
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
    print(f"\n💡 Next step: Sync translations to database")
    print(f"   npm run db:i18n:sync")


if __name__ == "__main__":
    translate_content()
