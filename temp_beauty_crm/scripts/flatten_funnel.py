
import json
import os
import re
from pathlib import Path

def clean_ansi(text):
    if not isinstance(text, str):
        return text
    
    # 1. Real ANSI escapes
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    text = ansi_escape.sub('', text)
    
    # 2. Literal strings like \u001b[31m
    literal_ansi = re.compile(r'\\u001b\[[0-9;]*m')
    text = literal_ansi.sub('', text)
    
    # 3. Other variants
    text = text.replace('\u001b', '')
    
    return text

def process_object(obj):
    if isinstance(obj, dict):
        return {k: process_object(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [process_object(v) for v in obj]
    elif isinstance(obj, str):
        return clean_ansi(obj)
    return obj

def flatten_funnel_json():
    locales_dir = Path("frontend/src/locales")
    defaults = {
        'ru': 'Клиент',
        'en': 'Client',
        'ar': 'عميل',
        'es': 'Cliente',
        'de': 'Kunde',
        'fr': 'Client',
        'pt': 'Cliente',
        'hi': 'ग्राहक',
        'kk': 'Клиент'
    }

    # Find ALL funnel.json files
    all_json = list(locales_dir.rglob("*.json"))
    print(f"🧐 Found {len(all_json)} json files")

    for json_file in all_json:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # Pre-clean the raw content to catch literal \u001b
                content = clean_ansi(content)
                data = json.loads(content)
            
            # Cleanup ANSI in object
            data = process_object(data)

            # Special fix for funnel.json 'client'
            if json_file.name == "funnel.json":
                if 'client' in data:
                    # Always flatten it regardless of type to be safe
                    lang = json_file.parent.parent.name # locales/{lang}/admin/funnel.json or locales/{lang}/funnel.json
                    if len(lang) != 2: # Try other parent if nested
                         lang = json_file.parent.name
                    
                    # Better way to get lang from path
                    parts = json_file.parts
                    lang = 'en' # Default
                    for p in parts:
                        if p in defaults:
                            lang = p
                            break
                            
                    data['client'] = defaults.get(lang, 'Client')
                    print(f"✅ Flattened 'client' in {json_file} (lang: {lang})")
            
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"❌ Error processing {json_file}: {e}")

if __name__ == "__main__":
    flatten_funnel_json()
