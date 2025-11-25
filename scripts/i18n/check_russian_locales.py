#!/usr/bin/env python3
"""
Скрипт для проверки русских файлов локализации на пустые значения
"""

import os
import json

LOCALES_DIR = '/Users/tahir/Desktop/beauty-crm/frontend/src/locales'
SOURCE_LANG = 'ru'

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Ошибка загрузки {path}: {e}")
        return {}

def flatten_dict(d, parent_key='', sep='.'):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def check_russian_files():
    print("🔍 Проверка русских файлов локализации...\n")
    
    source_dir = os.path.join(LOCALES_DIR, SOURCE_LANG)
    
    empty_values = []
    files_by_category = {
        'admin': [],
        'manager': [],
        'employee': [],
        'public': [],
        'auth': [],
        'layouts': [],
        'components': [],
        'other': []
    }
    
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, source_dir)
                
                # Определяем категорию
                category = 'other'
                for cat in ['admin', 'manager', 'employee', 'public', 'auth', 'layouts', 'components']:
                    if rel_path.startswith(cat):
                        category = cat
                        break
                
                data = load_json(file_path)
                flat = flatten_dict(data)
                
                empty_in_file = []
                for key, value in flat.items():
                    if not value or (isinstance(value, str) and not value.strip()):
                        empty_in_file.append(key)
                
                if empty_in_file:
                    empty_values.append({
                        'file': rel_path,
                        'category': category,
                        'empty_keys': empty_in_file,
                        'total_keys': len(flat)
                    })
                
                files_by_category[category].append({
                    'file': rel_path,
                    'total_keys': len(flat),
                    'empty_keys': len(empty_in_file)
                })
    
    # Выводим результаты по категориям
    print("="*80)
    print("📊 СТАТИСТИКА ПО КАТЕГОРИЯМ")
    print("="*80)
    
    for category, files in files_by_category.items():
        if not files:
            continue
        
        total_files = len(files)
        total_keys = sum(f['total_keys'] for f in files)
        total_empty = sum(f['empty_keys'] for f in files)
        
        status = "✅" if total_empty == 0 else "⚠️"
        print(f"\n{status} {category.upper()}: {total_files} файлов, {total_keys} ключей, {total_empty} пустых")
        
        if total_empty > 0:
            print(f"   Файлы с пустыми значениями:")
            for f in files:
                if f['empty_keys'] > 0:
                    print(f"   - {f['file']}: {f['empty_keys']} пустых из {f['total_keys']}")
    
    # Детальный список пустых значений
    if empty_values:
        print("\n" + "="*80)
        print("📝 ДЕТАЛЬНЫЙ СПИСОК ПУСТЫХ ЗНАЧЕНИЙ")
        print("="*80)
        
        for item in empty_values:
            print(f"\n📄 {item['file']} ({item['category']})")
            print(f"   Пустых ключей: {len(item['empty_keys'])} из {item['total_keys']}")
            for key in item['empty_keys'][:10]:  # Показываем первые 10
                print(f"   - {key}")
            if len(item['empty_keys']) > 10:
                print(f"   ... и еще {len(item['empty_keys']) - 10} ключей")
    else:
        print("\n" + "="*80)
        print("✅ ВСЕ РУССКИЕ ФАЙЛЫ ПОЛНОСТЬЮ ЗАПОЛНЕНЫ!")
        print("="*80)
    
    return len(empty_values) == 0

if __name__ == '__main__':
    all_complete = check_russian_files()
    
    if all_complete:
        print("\n✨ Можно запускать скрипт перевода!")
        print("   python3 translate_from_russian.py")
    else:
        print("\n⚠️  Сначала заполните пустые значения в русских файлах")
        print("   Затем запустите: python3 translate_from_russian.py")
