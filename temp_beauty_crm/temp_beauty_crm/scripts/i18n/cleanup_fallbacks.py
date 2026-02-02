#!/usr/bin/env python3
"""
Скрипт для очистки файлов переводов от хардкодных значений и фоллбэков.
Удаляет ключи, содержащие '_fallback', а также специфичные ключи с хардкодными данными.
"""

import os
import json

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')
KEYS_TO_REMOVE = [
    'email_fallback',
    'phone_fallback',
    'working_hours_fallback',
    'address_fallback',
    'instagram_fallback'
]

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

def cleanup_fallbacks():
    print(f"🧹 Очистка переводов от хардкодных фоллбэков...")
    
    files_processed = 0
    keys_removed = 0
    
    for root, dirs, files in os.walk(LOCALES_DIR):
        for file in files:
            if not file.endswith('.json'):
                continue
                
            path = os.path.join(root, file)
            data = load_json(path)
            
            if not data:
                continue
                
            flat_data = flatten_dict(data)
            updated = False
            
            keys_to_delete = []
            for key in flat_data.keys():
                # Проверяем, заканчивается ли ключ на один из запрещенных суффиксов
                # или полностью совпадает
                for remove_key in KEYS_TO_REMOVE:
                    if key.endswith(remove_key) or key == remove_key:
                        keys_to_delete.append(key)
                        break
            
            if keys_to_delete:
                for key in keys_to_delete:
                    del flat_data[key]
                    keys_removed += 1
                    # print(f"  🗑️ {file}: удален {key}")
                
                updated = True
                
            if updated:
                nested_data = unflatten_dict(flat_data)
                save_json(path, nested_data)
                files_processed += 1
                print(f"  ✨ {file}: удалено {len(keys_to_delete)} ключей")

    print("\n" + "="*80)
    print("📊 ИТОГИ")
    print("="*80)
    print(f"✅ Обработано файлов: {files_processed}")
    print(f"✅ Удалено ключей: {keys_removed}")

if __name__ == '__main__':
    cleanup_fallbacks()
