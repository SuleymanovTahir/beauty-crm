
import json
import os
import re
from pathlib import Path

def clean_ansi(text):
    if not isinstance(text, str):
        return text
    # Remove ANSI escape sequences
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)

def clean_dict(d):
    if isinstance(d, dict):
        return {k: clean_dict(v) for k, v in d.items()}
    elif isinstance(d, list):
        return [clean_dict(v) for v in d]
    else:
        return clean_ansi(d)

def fix_json_files():
    locales_dir = Path("frontend/src/locales")
    for lang_dir in locales_dir.iterdir():
        if not lang_dir.is_dir():
            continue
        
        lang = lang_dir.name
        print(f"🧹 Cleaning locales for: {lang}")
        
        for json_file in lang_dir.rglob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                cleaned_data = clean_dict(data)
                
                # Specific fix for funnel.json (RU) - remove English values
                if lang == 'ru' and json_file.name == 'funnel.json':
                    if 'temperature_cold' in cleaned_data:
                        cleaned_data['temperature_cold'] = 'Холодный'
                    if 'temperature_hot' in cleaned_data:
                        cleaned_data['temperature_hot'] = 'Горячий'
                    if 'temperature_warm' in cleaned_data:
                        cleaned_data['temperature_warm'] = 'Теплый'
                
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"❌ Error processing {json_file}: {e}")

if __name__ == "__main__":
    fix_json_files()
