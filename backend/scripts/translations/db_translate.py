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
    Translate all missing translations from extracted data
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
        """Check if this field should skip translation"""
        # Check if field is in skip list for this table
        if table_name in SKIP_TRANSLATION_FIELDS:
            if field_name in SKIP_TRANSLATION_FIELDS[table_name]:
                return True
        
        # Check if text matches any skip patterns
        for pattern in SKIP_TRANSLATION_PATTERNS:
            if re.match(pattern, text.strip()):
                return True
        
        return False
    
    # Process each table
    total_translated = 0
    
    for table_name, records in data.items():
        print(f"\n📋 Translating {table_name}...")
        
        for record in records:
            record_id = record["id"]
            print(f"  🔄 Record ID {record_id}:")
            
            for field_name, field_data in record["fields"].items():
                # Get the source text (from _ru field or base field)
                source_text = field_data.get(SOURCE_LANGUAGE)
                
                if not source_text or not source_text.strip():
                    continue
                
                # Check if this field should be skipped
                if should_skip_translation(table_name, field_name, source_text):
                    print(f"    ⏭️  {field_name}: '{source_text}' [SKIPPED - technical field or proper noun]")
                    # Copy source text to all languages as-is
                    for lang in LANGUAGES:
                        if field_data.get(lang) is None:
                            field_data[lang] = source_text
                    continue
                
                # Detect actual language of the source text
                detected_lang = translator.detect_language(source_text)
                print(f"    • {field_name}: '{source_text}' [detected: {detected_lang}]")
                
                # Store detected language in field data
                field_data['detected_language'] = detected_lang
                
                # Translate to ALL languages
                for lang in LANGUAGES:
                    should_translate = False
                    
                    if field_data.get(lang) is None:
                        should_translate = True
                    elif lang == SOURCE_LANGUAGE and detected_lang != SOURCE_LANGUAGE:
                        # If target is RU but detected is EN, we must translate EN -> RU
                        # and OVERWRITE the existing value (which is EN)
                        should_translate = True
                         # elif field_data.get(lang) == source_text and lang != detected_lang:
                         #      # If the target language field has the SAME content as the source text
                         #      # but the language is different (e.g. title_en == title_ru (Russian text))
                         #      # then it's likely a copy-paste error or untranslated content. Force translate.
                         #      print(f"      ⚠️  Force translating {lang} because it matches source text...")
                         #      should_translate = True
                    
                    if should_translate:
                        # Use context injection NO MORE - user requested removal for all fields
                        use_context = False
                        
                        # Special handling for names (transliteration)
                        if table_name == 'users' and field_name == 'full_name':
                            # Ensure source is title cased first
                            source_clean = source_text.title()
                            
                            # For Latin languages, use transliteration
                            if lang in ['en', 'de', 'es', 'fr', 'pt']:
                                translated = translator.transliterate_ru_to_latin(source_clean)
                                print(f"      → {lang}: '{translated}' (transliterated)")
                            else:
                                # For non-Latin (ar, hi, kk), use translation (phonetic)
                                translated = translator.translate(source_clean, detected_lang, lang, use_context=False)
                                print(f"      → {lang}: '{translated}'")
                            
                            # Ensure result is title cased
                            if translated:
                                translated = translated.title()
                        else:
                            # Standard translation for other fields
                            translated = translator.translate(source_text, detected_lang, lang, use_context=use_context)
                            print(f"      → {lang}: '{translated}'")
                        
                        field_data[lang] = translated
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
    print(f"\n💡 Next step: Sync translations to database")
    print(f"   npm run db:i18n:sync")

if __name__ == "__main__":
    translate_content()
