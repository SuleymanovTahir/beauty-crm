#!/usr/bin/env python3
"""
Force translate remaining Russian text in dynamic.json files
"""
import json
import requests
import time
from pathlib import Path

BASE_DIR = Path("frontend/src/locales")
LANGUAGES = ['en', 'es', 'de', 'fr', 'pt', 'hi', 'ar']  # Skip kk (Kazakh uses Cyrillic)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
}

def translate_text(text, target_lang):
    """Translate using Google Translate API"""
    if not text or not text.strip():
        return text
    
    url = "https://translate.googleapis.com/translate_a/single"
    params = {
        "client": "gtx",
        "sl": "auto",
        "tl": target_lang,
        "dt": "t",
        "q": text
    }
    
    try:
        res = requests.get(url, params=params, headers=HEADERS, timeout=15)
        if res.status_code == 200:
            data = res.json()
            return "".join([x[0] for x in data[0] if x and x[0]])
    except Exception as e:
        print(f"    ⚠️  Translation error: {e}")
    
    return None

def has_cyrillic(text):
    """Check if text contains Cyrillic characters"""
    if not isinstance(text, str):
        return False
    return any('\u0400' <= c <= '\u04FF' for c in text)

def main():
    print("🚀 Force translating remaining Russian text in dynamic.json...")
    
    total_fixed = 0
    
    for lang in LANGUAGES:
        file_path = BASE_DIR / lang / "dynamic.json"
        if not file_path.exists():
            print(f"  ⚠️  {lang}/dynamic.json not found, skipping")
            continue
        
        print(f"\n📝 Processing {lang}...")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"  ❌ Error reading file: {e}")
            continue
        
        keys_to_fix = []
        for k, v in data.items():
            if isinstance(v, str) and has_cyrillic(v):
                keys_to_fix.append(k)
        
        if not keys_to_fix:
            print(f"  ✨ No Cyrillic found, skipping")
            continue
        
        print(f"  🔍 Found {len(keys_to_fix)} Russian strings")
        fixed_count = 0
        
        for i, key in enumerate(keys_to_fix, 1):
            original = data[key]
            
            # Show progress every 10 items
            if i % 10 == 0 or i == len(keys_to_fix):
                print(f"    Progress: {i}/{len(keys_to_fix)}...")
            
            translation = translate_text(original, lang)
            
            if translation and translation != original:
                # Preserve capitalization
                if original and original[0].isupper() and translation[0].islower():
                    translation = translation[0].upper() + translation[1:]
                
                data[key] = translation
                fixed_count += 1
            
            # Rate limiting
            time.sleep(0.25)
        
        if fixed_count > 0:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print(f"  ✅ Fixed {fixed_count} translations")
                total_fixed += fixed_count
            except Exception as e:
                print(f"  ❌ Error saving file: {e}")
    
    print(f"\n✅ Complete! Fixed {total_fixed} translations across all languages")

if __name__ == "__main__":
    main()
