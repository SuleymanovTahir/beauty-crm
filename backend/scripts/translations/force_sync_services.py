import json
import sys
import os
import re
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection

FRONTEND_LOCALES_DIR = backend_dir.parent / "frontend" / "src" / "locales"
LANGUAGES = ["ru", "en", "ar", "es", "de", "fr", "hi", "kk", "pt"]

def has_cyrillic(text):
    if not text: return False
    return bool(re.search(r'[а-яА-ЯёЁ]', str(text)))

def force_sync():
    print("🚀 Refined Force syncing services translations from DB...")
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get all active services
        cur.execute("SELECT id, name, name_ru, name_en, name_ar, name_de, name_es, name_fr, name_hi, name_kk, name_pt, "
                    "description, description_ru, description_en, description_ar, description_es, description_de, "
                    "description_fr, description_hi, description_kk, description_pt FROM services WHERE is_active = TRUE")
        services = cur.fetchall()
        
        all_updates = {lang: {} for lang in LANGUAGES}
        
        for s in services:
            s_id = s[0]
            base_en = s[1]
            base_ru = s[2] or base_en
            
            # Names mapping
            names = {
                'ru': base_ru,
                'en': s[3] if s[3] and not (has_cyrillic(s[3]) and s[3] == base_ru) else base_en,
                'ar': s[4],
                'de': s[5],
                'es': s[6],
                'fr': s[7],
                'hi': s[8],
                'kk': s[9] or base_ru,
                'pt': s[10]
            }
            
            # Fallbacks for other languages if missing
            for lang in ['ar', 'de', 'es', 'fr', 'hi', 'pt']:
                if not names[lang] or has_cyrillic(names[lang]):
                    # If missing or accidentally has Russian, fallback to base English
                    names[lang] = base_en
            
            # Descriptions mapping
            base_desc_en = s[11]
            base_desc_ru = s[12] or base_desc_en
            
            descs = {
                'ru': base_desc_ru,
                'en': s[13] if s[13] and not (has_cyrillic(s[13]) and s[13] == base_desc_ru) else base_desc_en,
                'ar': s[14],
                'es': s[15],
                'de': s[16],
                'fr': s[17],
                'hi': s[18],
                'kk': s[19] or base_desc_ru,
                'pt': s[20]
            }
            
            for lang in ['ar', 'de', 'es', 'fr', 'hi', 'pt']:
                if not descs[lang] or has_cyrillic(descs[lang]):
                    descs[lang] = base_desc_en
            
            for lang in LANGUAGES:
                if names.get(lang):
                    all_updates[lang][f"services.{s_id}.name"] = names[lang]
                if descs.get(lang):
                    all_updates[lang][f"services.{s_id}.description"] = descs[lang]
        
        # Update JSON files
        for lang, updates in all_updates.items():
            if not updates: continue
            file_path = FRONTEND_LOCALES_DIR / lang / "dynamic.json"
            data = {}
            if file_path.exists():
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                except: pass
            
            # Cleanup only hashed keys for services
            for key in list(data.keys()):
                if key.startswith("services.") and len(key.split('.')) > 3:
                    del data[key]
            
            data.update(updates)
            
            file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
            print(f"  ✅ Updated {lang}/dynamic.json")

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    force_sync()
