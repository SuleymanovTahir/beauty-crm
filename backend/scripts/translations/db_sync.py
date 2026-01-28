#!/usr/bin/env python3
"""
Sync translated content to JSON files
Updates frontend/src/locales/{lang}/dynamic.json with new translations
"""

import json
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    TRANSLATE_OUTPUT,
    LANGUAGES,
    SOURCE_LANGUAGE
)

FRONTEND_LOCALES_DIR = backend_dir.parent / "frontend" / "src" / "locales"

def sync_translations():
    """
    Update dynamic.json files with completed translations
    """
    print("💾 Syncing translations to JSON files...")
    
    # Load completed translations
    input_path = Path(TRANSLATE_OUTPUT)
    if not input_path.exists():
        print(f"❌ Error: {TRANSLATE_OUTPUT} not found.")
        print("   Run 'npm run db:i18n:translate' first.")
        return
    
    with open(input_path, 'r', encoding='utf-8') as f:
        completed_translations = json.load(f)
    
    if not completed_translations:
        print("✨ No new translations to sync.")
        return

    # Organize translations by language
    # Structure: { lang: { key: value } }
    updates_by_lang = {lang: {} for lang in LANGUAGES}
    
    total_updates = 0
    
    for table_name, records in completed_translations.items():
        for record in records:
            record_id = record['id']
            fields = record['fields']
            
            for field_name, translations in fields.items():
                key = translations.get('key')
                if not key:
                    # Fallback if key missing in older extract
                    key = f"{table_name}.{record_id}.{field_name}"
                
                if key:
                    # Strip language suffix and hash (e.g. _ru.4d6731dd) to keep keys stable and clean for frontend
                    import re
                    # Match _xx.hash or just _xx or just .hash
                    clean_key = re.sub(r'(_[a-z]{2})?(\.[a-f0-9]{8})?$', '', key)
                    
                    for lang, value in translations.items():
                        if lang in ['key', 'detected_language', 'source_col']:
                            continue
                            
                        if value:
                            updates_by_lang[lang][clean_key] = value
                            total_updates += 1

    # Update JSON files
    for lang, updates in updates_by_lang.items():
        if not updates:
            continue
            
        file_path = FRONTEND_LOCALES_DIR / lang / "dynamic.json"
        
        # Load existing
        current_data = {}
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    current_data = json.load(f)
            except json.JSONDecodeError:
                print(f"⚠️  Warning: Could not parse {file_path}, starting fresh")
        
        # Merge updates
        current_data.update(updates)
        
        # Ensure directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(current_data, f, ensure_ascii=False, indent=2)
            
        print(f"  ✅ Updated {lang}/dynamic.json with {len(updates)} translations")

    print(f"\n✨ Sync complete! {total_updates} translations saved.")

if __name__ == "__main__":
    sync_translations()
