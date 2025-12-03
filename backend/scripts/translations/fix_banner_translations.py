#!/usr/bin/env python3
"""
Fix banner translations - translate Russian banner text to all languages
"""
from db.connection import get_db_connection
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from translator import Translator
from config import LANGUAGES, DATABASE_PATH

def fix_banner_translations():
    print("🔧 Fixing banner translations...")
    
    translator = Translator(use_cache=True)
    
    # Русский текст баннера
    title_ru = "Получите скидку до 50% на все услуги в нашем салоне красоты в Дубае"
    
    # Переводим на все языки
    translations = {"ru": title_ru}
    
    for lang in LANGUAGES:
        if lang == "ru":
            continue
        translated = translator.translate(title_ru, "ru", lang)
        translations[lang] = translated
        print(f"  {lang}: {translated}")
    
    # Сохраняем кэш
    translator.save_cache_to_disk()
    
    # Обновляем базу данных
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    
    for lang in LANGUAGES:
        column = f"title_{lang}"
        c.execute(f"UPDATE public_banners SET {column} = %s WHERE id = 4", (translations[lang],))
        print(f"  ✅ Updated {column}")
    
    conn.commit()
    conn.close()
    
    print("\n✅ Banner translations updated!")

if __name__ == "__main__":
    fix_banner_translations()
