#!/usr/bin/env python3
"""
Add category translations to all language services.json files
"""
import json
from pathlib import Path

# Category translations for all languages
CATEGORY_TRANSLATIONS = {
    "hi": {
        "category_permanent_makeup": "स्थायी मेकअप",
        "category_facial": "चेहरे की देखभाल",
        "category_massage": "मालिश",
        "category_nails": "नाखून",
        "category_hair": "बाल",
        "category_lashes": "पलकें",
        "category_brows": "भौंहें",
        "category_waxing": "वैक्सिंग"
    },
    "de": {
        "category_permanent_makeup": "Permanent Make-up",
        "category_facial": "Gesichtsbehandlung",
        "category_massage": "Massage",
        "category_nails": "Nägel",
        "category_hair": "Haare",
        "category_lashes": "Wimpern",
        "category_brows": "Augenbrauen",
        "category_waxing": "Wachsen"
    },
    "fr": {
        "category_permanent_makeup": "Maquillage permanent",
        "category_facial": "Soin du visage",
        "category_massage": "Massage",
        "category_nails": "Ongles",
        "category_hair": "Cheveux",
        "category_lashes": "Cils",
        "category_brows": "Sourcils",
        "category_waxing": "Épilation"
    },
    "ru": {
        "category_permanent_makeup": "Перманентный макияж",
        "category_facial": "Уход за лицом",
        "category_massage": "Массаж",
        "category_nails": "Ногти",
        "category_hair": "Волосы",
        "category_lashes": "Ресницы",
        "category_brows": "Брови",
        "category_waxing": "Депиляция"
    },
    "en": {
        "category_permanent_makeup": "Permanent Makeup",
        "category_facial": "Facial",
        "category_massage": "Massage",
        "category_nails": "Nails",
        "category_hair": "Hair",
        "category_lashes": "Lashes",
        "category_brows": "Brows",
        "category_waxing": "Waxing"
    }
}

def add_category_translations():
    """Add category translations to all language files"""
    frontend_dir = Path(__file__).parent.parent.parent.parent / "frontend"
    locales_dir = frontend_dir / "src" / "locales"
    
    for lang, translations in CATEGORY_TRANSLATIONS.items():
        services_file = locales_dir / lang / "admin" / "services.json"
        
        if not services_file.exists():
            print(f"⚠️  File not found: {services_file}")
            continue
        
        # Load existing content
        with open(services_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Add category translations
        updated = False
        for key, value in translations.items():
            if key not in data:
                data[key] = value
                updated = True
        
        if updated:
            # Save with sorted keys for consistency
            with open(services_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"✅ Updated {lang}/admin/services.json")
        else:
            print(f"ℹ️  {lang}/admin/services.json already has all category translations")

if __name__ == "__main__":
    print("🔧 Adding category translations to all language files...")
    add_category_translations()
    print("✅ Done!")
