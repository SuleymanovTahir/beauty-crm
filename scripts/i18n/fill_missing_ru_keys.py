#!/usr/bin/env python3
"""
Скрипт для заполнения пропущенных ключей в русской локали (ru).
Берет ключи, которые есть в английской локали (en), но отсутствуют в русской.
"""

import os
import json

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')
SOURCE_LANG = 'ru'
REF_LANG = 'en'

def load_json(path):
    try:
        if not os.path.exists(path):
            return {}
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Ошибка загрузки {path}: {e}")
        return {}

def save_json(path, data):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        return True
    except Exception as e:
        print(f"❌ Ошибка сохранения {path}: {e}")
        return False

def flatten_dict(d, parent_key='', sep='.'):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def unflatten_dict(d, sep='.'):
    result = {}
    for key, value in d.items():
        parts = key.split(sep)
        current = result
        for i, part in enumerate(parts[:-1]):
            if part not in current:
                current[part] = {}
            if not isinstance(current[part], dict):
                current[part] = {} 
            current = current[part]
        current[parts[-1]] = value
    return result

def fill_missing_keys():
    print(f"🚀 Заполнение пропущенных ключей в {SOURCE_LANG} из {REF_LANG}...")
    
    ref_dir = os.path.join(LOCALES_DIR, REF_LANG)
    source_dir = os.path.join(LOCALES_DIR, SOURCE_LANG)
    
    files_processed = 0
    keys_added = 0
    
    # Проходим по всем файлам в английской локали
    for root, dirs, files in os.walk(ref_dir):
        for file in files:
            if not file.endswith('.json'):
                continue
                
            rel_path = os.path.relpath(os.path.join(root, file), ref_dir)
            ref_path = os.path.join(ref_dir, rel_path)
            source_path = os.path.join(source_dir, rel_path)
            
            ref_data = load_json(ref_path)
            source_data = load_json(source_path)
            
            if not ref_data:
                continue
                
            ref_flat = flatten_dict(ref_data)
            source_flat = flatten_dict(source_data)
            
            updated = False
            file_keys_added = 0
            
            for key, value in ref_flat.items():
                if key not in source_flat:
                    # Добавляем ключ в русскую локаль
                    # Значение берем из английской (как заглушку) или помечаем
                    source_flat[key] = value # Копируем английский текст
                    updated = True
                    file_keys_added += 1
                    print(f"  ➕ {rel_path}: добавлен ключ '{key}' (значение: '{value}')")
            
            if updated:
                source_nested = unflatten_dict(source_flat)
                save_json(source_path, source_nested)
                keys_added += file_keys_added
                files_processed += 1
                
    print("\n" + "="*80)
    print("📊 ИТОГИ")
    print("="*80)
    print(f"✅ Обновлено файлов: {files_processed}")
    print(f"✅ Добавлено ключей: {keys_added}")
    print("\nТеперь запустите npm run i18n:sync для перевода этих ключей на другие языки.")

if __name__ == '__main__':
    fill_missing_keys()
