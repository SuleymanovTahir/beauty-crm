import json
import os
from deep_translator import GoogleTranslator

LOCALES_DIR = "frontend/src/locales"
LANGUAGES = ['ru', 'en', 'ar', 'de', 'es', 'fr', 'hi', 'kk', 'pt']
SOURCE_LANG = 'en'

def load_json(lang):
    path = os.path.join(LOCALES_DIR, lang, "public_landing.json")
    if not os.path.exists(path):
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(lang, data):
    path = os.path.join(LOCALES_DIR, lang, "public_landing.json")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def translate_text(text, target_lang):
    try:
        translator = GoogleTranslator(source='auto', target=target_lang)
        return translator.translate(text)
    except Exception as e:
        print(f"Error translating '{text}' to {target_lang}: {e}")
        return text

def main():
    print("🚀 Starting JSON translation fix...\n")
    
    source_data = load_json(SOURCE_LANG)
    source_keys = set(source_data.keys())
    
    for lang in LANGUAGES:
        if lang == SOURCE_LANG:
            continue
            
        print(f"📦 Processing {lang}...")
        target_data = load_json(lang)
        target_keys = set(target_data.keys())
        
        missing_keys = source_keys - target_keys
        
        if not missing_keys:
            print(f"  ✅ No missing keys for {lang}")
            continue
            
        print(f"  📝 Found {len(missing_keys)} missing keys")
        
        updates = 0
        for key in missing_keys:
            source_text = source_data[key]
            if not source_text:
                continue
                
            print(f"    🔄 Translating key '{key}' -> {lang}...")
            translated = translate_text(source_text, lang)
            target_data[key] = translated
            updates += 1
            
        if updates > 0:
            save_json(lang, target_data)
            print(f"  ✅ Saved {updates} new translations to {lang}/public_landing.json")
            
    print("\n✨ All JSON files updated.")

if __name__ == "__main__":
    main()
