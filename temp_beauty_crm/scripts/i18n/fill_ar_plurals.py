#!/usr/bin/env python3
"""
Скрипт для заполнения пустых ключей множественного числа в арабских переводах.
Заполняет _zero и _two значениями из _other (или _many/base).
"""

import os
import json

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')
AR_DIR = os.path.join(LOCALES_DIR, 'ar')

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

def fill_plurals():
    print("🔧 Заполнение пустых плюральных форм для Arabic...")
    
    files_fixed = 0
    
    for root, dirs, files in os.walk(AR_DIR):
        for file in files:
            if not file.endswith('.json'):
                continue
                
            path = os.path.join(root, file)
            data = load_json(path)
            
            if not data:
                continue
                
            flat = flatten_dict(data)
            updated = False
            
            # Ищем ключи _zero, _two, которые пусты
            for key, val in flat.items():
                if (key.endswith('_zero') or key.endswith('_two')) and not val:
                    # Пытаемся найти _other или _many
                    base_key = key.rsplit('_', 1)[0]
                    fallback_val = flat.get(f"{base_key}_other") or \
                                   flat.get(f"{base_key}_many") or \
                                   flat.get(f"{base_key}_few") or \
                                   flat.get(f"{base_key}_one")
                                   
                    if fallback_val:
                        flat[key] = fallback_val
                        updated = True
                        # print(f"  ✨ {file}: {key} -> {fallback_val}")
            
            if updated:
                nested = unflatten_dict(flat)
                save_json(path, nested)
                files_fixed += 1
                print(f"  ✅ {file}: исправлено")

    print(f"\nИтог: Исправлено {files_fixed} файлов.")

if __name__ == '__main__':
    fill_plurals()
