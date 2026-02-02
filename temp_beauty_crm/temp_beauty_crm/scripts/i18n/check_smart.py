#!/usr/bin/env python3
"""
Умная проверка переводов: показывает только те ключи, которые:
1. Заполнены в русском (не пустые)
2. Отсутствуют или пусты в других языках
"""

import os
import json
from pathlib import Path

LOCALES_DIR = Path(__file__).parent.parent.parent / 'frontend' / 'src' / 'locales'
SOURCE_LANG = 'ru'
TARGET_LANGS = ['en', 'ar', 'de', 'es', 'fr', 'hi', 'kk', 'pt']

def flatten_dict(d, parent_key='', sep='.'):
    """Преобразует вложенный словарь в плоский"""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}

def check_smart():
    print("🔍 УМНАЯ ПРОВЕРКА ПЕРЕВОДОВ")
    print("=" * 80)
    
    # Собираем все файлы из русской локали
    source_dir = LOCALES_DIR / SOURCE_LANG
    source_files = {}
    
    for file_path in source_dir.rglob('*.json'):
        relative_path = file_path.relative_to(source_dir)
        source_files[str(relative_path)] = load_json(file_path)
    
    print(f"📚 Найдено {len(source_files)} файлов в {SOURCE_LANG}\n")
    
    total_missing = 0
    files_with_issues = []
    
    # Проверяем каждый файл
    for relative_path, source_data in sorted(source_files.items()):
        if not source_data:
            continue
        
        source_flat = flatten_dict(source_data)
        
        # Фильтруем только заполненные ключи в русском
        filled_ru_keys = {
            k: v for k, v in source_flat.items() 
            if v and isinstance(v, str) and v.strip()
        }
        
        if not filled_ru_keys:
            continue
        
        file_issues = {}
        
        # Проверяем каждый целевой язык
        for target_lang in TARGET_LANGS:
            target_path = LOCALES_DIR / target_lang / relative_path
            target_data = load_json(target_path)
            target_flat = flatten_dict(target_data)
            
            missing_keys = []
            
            for key, ru_value in filled_ru_keys.items():
                target_value = target_flat.get(key)
                
                # Ключ отсутствует или пустой
                if not target_value or (isinstance(target_value, str) and not target_value.strip()):
                    missing_keys.append((key, ru_value))
            
            if missing_keys:
                file_issues[target_lang] = missing_keys
                total_missing += len(missing_keys)
        
        if file_issues:
            files_with_issues.append((relative_path, file_issues, len(filled_ru_keys)))
    
    # Выводим результаты
    if files_with_issues:
        print(f"❌ НАЙДЕНЫ ПРОБЛЕМЫ В {len(files_with_issues)} ФАЙЛАХ:\n")
        
        for file_path, issues, total_keys in files_with_issues:
            print(f"📄 {file_path} ({total_keys} ключей в RU)")
            
            for lang, missing in sorted(issues.items()):
                print(f"  🌐 {lang.upper()}: отсутствует {len(missing)} переводов")
                
                # Показываем первые 3 примера
                for key, ru_value in missing[:3]:
                    preview = ru_value[:50] + '...' if len(ru_value) > 50 else ru_value
                    print(f"     • {key}")
                    print(f"       RU: {preview}")
                
                if len(missing) > 3:
                    print(f"     ... и еще {len(missing) - 3} ключей")
            
            print()
    else:
        print("✅ ВСЕ ПЕРЕВОДЫ В ПОРЯДКЕ!")
    
    print("=" * 80)
    print(f"📊 ИТОГО: {total_missing} отсутствующих переводов")
    print(f"📁 Файлов с проблемами: {len(files_with_issues)}")
    
    if total_missing > 0:
        print("\n💡 Запустите: python3 scripts/i18n/translate_from_russian.py")
    
    return total_missing

if __name__ == '__main__':
    check_smart()
