import json
import os
from pathlib import Path

# Create categories map
categories_ru = {
    "Brows": "Брови",
    "Combo": "Комбо-услуги",
    "Cosmetology": "Косметология",
    "Hair Care": "Уход за волосами",
    "Hair Color": "Окрашивание волос",
    "Hair Cut": "Стрижки",
    "Hair Styling": "Укладки",
    "Lashes": "Ресницы",
    "Manicure": "Маникюр",
    "Massage": "Массаж",
    "Nails": "Ногти",
    "Pedicure": "Педикюр",
    "Permanent Makeup": "Перманентный макияж",
    "SPA": "СПА",
    "Waxing": "Восковая депиляция"
}

# Correct path assuming running from project root or backend dir
backend_dir = Path(__file__).parent.parent.parent
frontend_locales_dir = backend_dir.parent / "frontend" / "src" / "locales"

ru_path = frontend_locales_dir / "ru" / "dynamic.json"

try:
    if not ru_path.exists():
        print(f"File not found: {ru_path}")
        exit(1)

    with open(ru_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for cat, trans in categories_ru.items():
        data[f"categories.{cat}"] = trans
        
    with open(ru_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Updated categories in ru/dynamic.json")
except Exception as e:
    print(f"Error: {e}")
