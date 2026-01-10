#!/usr/bin/env python3
"""
Скрипт для синхронизации переводов между русским, английским и арабским языками.
Использует русский как эталонный язык.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any

# Переводы для часто используемых терминов
TRANSLATIONS = {
    # Admin section
    "title": {"en": "Title", "ar": "العنوان"},
    "users": {"en": "Users", "ar": "المستخدمون"},
    "clients": {"en": "Clients", "ar": "العملاء"},
    "bookings": {"en": "Bookings", "ar": "الحجوزات"},
    "services": {"en": "Services", "ar": "الخدمات"},
    "calendar": {"en": "Calendar", "ar": "التقويم"},
    "analytics": {"en": "Analytics", "ar": "التحليلات"},
    "dashboard": {"en": "Dashboard", "ar": "لوحة التحكم"},
    "settings": {"en": "Settings", "ar": "الإعدادات"},
    "profile": {"en": "Profile", "ar": "الملف الشخصي"},
    "save": {"en": "Save", "ar": "حفظ"},
    "cancel": {"en": "Cancel", "ar": "إلغاء"},
    "delete": {"en": "Delete", "ar": "حذف"},
    "edit": {"en": "Edit", "ar": "تعديل"},
    "create": {"en": "Create", "ar": "إنشاء"},
    "add": {"en": "Add", "ar": "إضافة"},
    "remove": {"en": "Remove", "ar": "إزالة"},
    "search": {"en": "Search", "ar": "بحث"},
    "filter": {"en": "Filter", "ar": "تصفية"},
    "export": {"en": "Export", "ar": "تصدير"},
    "import": {"en": "Import", "ar": "استيراد"},
    "name": {"en": "Name", "ar": "الاسم"},
    "email": {"en": "Email", "ar": "البريد الإلكتروني"},
    "phone": {"en": "Phone", "ar": "الهاتف"},
    "address": {"en": "Address", "ar": "العنوان"},
    "date": {"en": "Date", "ar": "التاريخ"},
    "time": {"en": "Time", "ar": "الوقت"},
    "status": {"en": "Status", "ar": "الحالة"},
    "active": {"en": "Active", "ar": "نشط"},
    "inactive": {"en": "Inactive", "ar": "غير نشط"},
    "loading": {"en": "Loading...", "ar": "جاري التحميل..."},
    "error": {"en": "Error", "ar": "خطأ"},
    "success": {"en": "Success", "ar": "نجح"},
    "confirm": {"en": "Confirm", "ar": "تأكيد"},
    "close": {"en": "Close", "ar": "إغلاق"},
}

def find_all_json_files(base_path: Path, lang: str) -> list:
    """Найти все JSON файлы для языка"""
    lang_path = base_path / lang
    if not lang_path.exists():
        return []

    json_files = []
    for root, dirs, files in os.walk(lang_path):
        for file in files:
            if file.endswith('.json'):
                full_path = Path(root) / file
                # Получаем относительный путь от папки языка
                rel_path = full_path.relative_to(lang_path)
                json_files.append(rel_path)

    return json_files

def load_json(file_path: Path) -> Dict[str, Any]:
    """Загрузить JSON файл"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        print(f"⚠️  Ошибка JSON в {file_path}")
        return {}

def save_json(file_path: Path, data: Dict[str, Any]):
    """Сохранить JSON файл"""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def translate_value(key: str, value: str, target_lang: str) -> str:
    """
    Попытка перевести значение
    Возвращает переведенное значение или исходное, если перевод не найден
    """
    # Если ключ есть в словаре переводов
    if key.lower() in TRANSLATIONS:
        return TRANSLATIONS[key.lower()].get(target_lang, value)

    # Простая транслитерация для некоторых общих фраз
    if target_lang == "en":
        # Оставляем как есть если уже на русском
        return value
    elif target_lang == "ar":
        # Для арабского пока оставляем оригинал
        return value

    return value

def sync_translations(base_path: Path):
    """Синхронизировать переводы между языками"""
    print("🔄 Начинаем синхронизацию переводов...")

    # Найти все файлы в русской папке (эталон)
    ru_files = find_all_json_files(base_path, 'ru')
    print(f"📁 Найдено {len(ru_files)} файлов переводов в русской версии")

    for rel_path in ru_files:
        ru_file = base_path / 'ru' / rel_path

        # Попробуем разные варианты именования для английского
        en_file_options = [
            base_path / 'en' / rel_path,
            base_path / 'en' / str(rel_path).lower(),
            base_path / 'en' / str(rel_path).replace(str(rel_path.stem), rel_path.stem.lower()),
        ]

        # Попробуем разные варианты именования для арабского
        ar_file_options = [
            base_path / 'ar' / rel_path,
            base_path / 'ar' / str(rel_path).title(),
            base_path / 'ar' / str(rel_path).replace(str(rel_path.stem), rel_path.stem.title()),
        ]

        # Найти существующий английский файл или использовать первый вариант
        en_file = next((f for f in en_file_options if f.exists()), en_file_options[0])
        ar_file = next((f for f in ar_file_options if f.exists()), ar_file_options[0])

        print(f"\n📄 Обрабатываем: {rel_path}")

        # Загрузить данные
        ru_data = load_json(ru_file)
        en_data = load_json(en_file)
        ar_data = load_json(ar_file)

        if not ru_data:
            print(f"  ⚠️  Пропускаем - пустой русский файл")
            continue

        # Синхронизировать английский
        if len(en_data) < len(ru_data):
            print(f"  🇬🇧 EN: {len(en_data)} → {len(ru_data)} ключей")
            for key, value in ru_data.items():
                if key not in en_data:
                    en_data[key] = translate_value(key, value, "en")
            save_json(en_file, en_data)
        else:
            print(f"  ✅ EN: актуально ({len(en_data)} ключей)")

        # Синхронизировать арабский
        if len(ar_data) < len(ru_data):
            print(f"  🇸🇦 AR: {len(ar_data)} → {len(ru_data)} ключей")
            for key, value in ru_data.items():
                if key not in ar_data:
                    ar_data[key] = translate_value(key, value, "ar")
            save_json(ar_file, ar_data)
        else:
            print(f"  ✅ AR: актуально ({len(ar_data)} ключей)")

    print("\n✅ Синхронизация завершена!")

if __name__ == "__main__":
    base_path = Path(__file__).parent.parent.parent.parent / "frontend" / "src" / "locales"
    sync_translations(base_path)
