#!/usr/bin/env python3
"""
Скрипт для исправления регистра имен файлов во всех локалях.
Использует русскую локаль (ru) как эталон имен файлов.
Если в другой локали найден файл с тем же именем, но в другом регистре (например, dashboard.json вместо Dashboard.json),
он будет переименован.
"""

import os
import shutil

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')
SOURCE_LANG = 'ru'
TARGET_LANGS = ['en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']

def fix_filenames():
    print(f"🔧 Исправление имен файлов в {LOCALES_DIR}")
    print(f"📏 Эталон: {SOURCE_LANG}")
    
    source_dir = os.path.join(LOCALES_DIR, SOURCE_LANG)
    
    # Собираем эталонные пути
    reference_files = []
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            if file.endswith('.json'):
                rel_path = os.path.relpath(os.path.join(root, file), source_dir)
                reference_files.append(rel_path)
    
    print(f"📄 Найдено {len(reference_files)} эталонных файлов")
    
    renamed_count = 0
    
    for lang in TARGET_LANGS:
        lang_dir = os.path.join(LOCALES_DIR, lang)
        if not os.path.exists(lang_dir):
            continue
            
        print(f"  🌍 Обработка {lang}...")
        
        # Получаем список файлов в целевой папке (для проверки существования без учета регистра)
        # Но os.walk возвращает реальные имена.
        
        # Проходим по эталонным файлам
        for ref_rel_path in reference_files:
            correct_path = os.path.join(lang_dir, ref_rel_path)
            correct_filename = os.path.basename(correct_path)
            dir_path = os.path.dirname(correct_path)
            
            if not os.path.exists(dir_path):
                continue
                
            # Ищем файл в папке, который совпадает по имени без учета регистра, но отличается регистром
            try:
                actual_files = os.listdir(dir_path)
            except FileNotFoundError:
                continue
                
            for actual_file in actual_files:
                if actual_file.lower() == correct_filename.lower() and actual_file != correct_filename:
                    # Нашли файл с неправильным регистром!
                    old_path = os.path.join(dir_path, actual_file)
                    
                    # Переименование на Mac/Windows может требовать промежуточного шага
                    temp_path = os.path.join(dir_path, f"{actual_file}_temp")
                    
                    try:
                        os.rename(old_path, temp_path)
                        os.rename(temp_path, correct_path)
                        print(f"    ✏️ {lang}/{ref_rel_path}: {actual_file} -> {correct_filename}")
                        renamed_count += 1
                    except Exception as e:
                        print(f"    ❌ Ошибка переименования {old_path}: {e}")
                        
    print("\n" + "="*80)
    print("📊 ИТОГИ")
    print("="*80)
    print(f"✅ Переименовано файлов: {renamed_count}")

if __name__ == '__main__':
    fix_filenames()
