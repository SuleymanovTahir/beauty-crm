import os
import json
import re

LOCALES_DIR = 'frontend/src/locales'
LANGUAGES = ['ar', 'en', 'es', 'de', 'fr', 'hi', 'kk', 'pt']

def load_json(path):
    if not os.path.exists(path):
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)

def is_corrupted(key, value):
    if not isinstance(value, str):
        return False
        
    # Check if value looks like a placeholder key
    # e.g. "Aboutfeature3title", "Teamdesc", "faqContactSocial"
    if value == key:
        return True
    
    # Check for mixed case camelCase words that look like keys
    if re.match(r'^[A-Z][a-z]+[A-Z][a-z]+', value):
        return True
        
    # Check for specific known bad values
    bad_values = [
        "Aboutfeature3title", "Teamdesc", "Faqcontactsocial", 
        "حولfeature4title", "حولfeature2desc", "شهادةstag",
        "Teamtag", "Portfoliotag"
    ]
    if value in bad_values:
        return True
        
    return False

def main():
    print("🧹 Cleaning corrupted translations...")
    
    for lang in LANGUAGES:
        file_path = os.path.join(LOCALES_DIR, lang, 'common.json')
        if not os.path.exists(file_path):
            continue
            
        data = load_json(file_path)
        cleaned_data = {}
        removed_count = 0
        
        for key, value in data.items():
            if is_corrupted(key, value):
                print(f"  ❌ [{lang}] Removing corrupted: {key} = {value}")
                removed_count += 1
                # Don't add to cleaned_data, effectively deleting it
            else:
                cleaned_data[key] = value
                
        if removed_count > 0:
            save_json(file_path, cleaned_data)
            print(f"  💾 Saved {lang}/common.json (Removed {removed_count} keys)")
            
    print("\n✨ Done! Now run the translation script to fill missing keys.")

if __name__ == "__main__":
    main()
