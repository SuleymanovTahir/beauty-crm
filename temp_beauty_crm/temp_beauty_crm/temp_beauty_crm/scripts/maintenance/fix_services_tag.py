import json
from pathlib import Path

def fix_services_tag():
    locales_dir = Path('/Users/tahir/Desktop/beauty-crm/frontend/src/locales')
    
    # Target value (Title Case)
    translations = {
        'ru': 'Услуги',
        'en': 'Services',
        'es': 'Servicios',
        'fr': 'Services',
        'de': 'Dienstleistungen',
        'ar': 'الخدمات',
        'hi': 'सेवाएं',
        'kk': 'Қызметтер',
        'pt': 'Serviços'
    }
    
    for lang in translations.keys():
        lang_dir = locales_dir / lang
        if not lang_dir.exists(): continue
        
        file_path = lang_dir / 'public_landing.json'
        if not file_path.exists(): continue
        
        print(f"Checking {lang}/public_landing.json...")
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        old_val = data.get('servicesTag')
        new_val = translations[lang]
        
        if old_val != new_val:
            print(f"  Fixing servicesTag: {old_val} -> {new_val}")
            data['servicesTag'] = new_val
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        else:
            print(f"  Already correct: {old_val}")

if __name__ == "__main__":
    fix_services_tag()
