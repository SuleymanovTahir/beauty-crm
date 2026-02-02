#!/usr/bin/env python3
"""
Скрипт для переименования ключа sections.booking.paragraph1 -> sections.booking.booking_requirements
в файлах public/Terms.json для всех языков, кроме en (там уже переименовано).
"""

import os
import json

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')
LANGUAGES = ['ru', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt'] # en пропускаем

def load_json(path):
    try:
        if not os.path.exists(path):
            return None
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Ошибка загрузки {path}: {e}")
        return None

def save_json(path, data):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        return True
    except Exception as e:
        print(f"❌ Ошибка сохранения {path}: {e}")
        return False

def fix_terms():
    print("🔧 Исправление ключей в Terms.json...")
    
    files_fixed = 0
    
    for lang in LANGUAGES:
        path = os.path.join(LOCALES_DIR, lang, 'public/Terms.json')
        data = load_json(path)
        
        if not data:
            print(f"  ⚠️  {lang}: Файл не найден")
            continue
            
        # 1. Пробуем найти во вложенной структуре
        nested_found = False
        try:
            booking_section = data.get('sections', {}).get('booking', {})
            if 'paragraph1' in booking_section:
                val = booking_section.pop('paragraph1')
                booking_section['booking_requirements'] = val
                nested_found = True
        except:
            pass
            
        # 2. Пробуем найти плоский ключ
        flat_found = False
        if 'sections.booking.paragraph1' in data:
            val = data.pop('sections.booking.paragraph1')
            data['sections.booking.booking_requirements'] = val
            flat_found = True
            
        if nested_found or flat_found:
            save_json(path, data)
            print(f"  ✅ {lang}: paragraph1 -> booking_requirements")
            files_fixed += 1
        else:
            # Проверяем, может уже есть новый ключ
            if 'sections.booking.booking_requirements' in data or \
               'booking_requirements' in data.get('sections', {}).get('booking', {}):
                 print(f"  ℹ️  {lang}: Уже исправлено")
            else:
                 print(f"  ⚠️  {lang}: Ключ paragraph1 не найден")

    print(f"\nИтог: Исправлено {files_fixed} файлов.")

if __name__ == '__main__':
    fix_terms()
