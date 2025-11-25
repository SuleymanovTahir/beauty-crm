#!/usr/bin/env python3
"""
Скрипт для исправления имен переменных в файлах переводов.
Восстанавливает переменные типа {{name}} из исходного языка (ru),
если в целевом языке они были переведены (например, {{اسم}}).
"""

import os
import json
import re

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')
SOURCE_LANG = 'ru'
TARGET_LANGS = ['en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']

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

def extract_variables(text):
    """Извлекает переменные в формате {{var}} или {{ var }}"""
    if not isinstance(text, str):
        return []
    return re.findall(r'\{\{\s*([^}]+)\s*\}\}', text)

def fix_variables():
    print(f"🔧 Исправление переменных в переводах...")
    
    source_dir = os.path.join(LOCALES_DIR, SOURCE_LANG)
    
    files_processed = 0
    variables_fixed = 0
    
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            if not file.endswith('.json'):
                continue
                
            rel_path = os.path.relpath(os.path.join(root, file), source_dir)
            source_path = os.path.join(source_dir, rel_path)
            source_data = load_json(source_path)
            
            if not source_data:
                continue
                
            source_flat = flatten_dict(source_data)
            
            for lang in TARGET_LANGS:
                target_path = os.path.join(LOCALES_DIR, lang, rel_path)
                if not os.path.exists(target_path):
                    continue
                    
                target_data = load_json(target_path)
                target_flat = flatten_dict(target_data)
                
                updated = False
                
                for key, source_val in source_flat.items():
                    if key not in target_flat:
                        continue
                        
                    target_val = target_flat[key]
                    
                    if not isinstance(source_val, str) or not isinstance(target_val, str):
                        continue
                        
                    source_vars = extract_variables(source_val)
                    target_vars = extract_variables(target_val)
                    
                    if not source_vars:
                        continue
                        
                    # Если количество переменных совпадает, но сами переменные отличаются
                    if len(source_vars) == len(target_vars):
                        # Проверяем, есть ли различия
                        differs = False
                        for sv, tv in zip(source_vars, target_vars):
                            # Очищаем от пробелов и форматирования (например, "date, date" -> "date")
                            sv_clean = sv.split(',')[0].strip()
                            tv_clean = tv.split(',')[0].strip()
                            if sv_clean != tv_clean:
                                differs = True
                                break
                        
                        if differs:
                            # Пытаемся восстановить переменные
                            # Это простая эвристика: заменяем по порядку
                            new_val = target_val
                            for sv, tv in zip(source_vars, target_vars):
                                # Заменяем {{ tv }} на {{ sv }}
                                # Нужно быть аккуратным с regex
                                pattern = r'\{\{\s*' + re.escape(tv) + r'\s*\}\}'
                                replacement = '{{' + sv + '}}'
                                new_val = re.sub(pattern, replacement, new_val, count=1)
                            
                            if new_val != target_val:
                                target_flat[key] = new_val
                                updated = True
                                variables_fixed += 1
                                print(f"  ✨ {lang}/{rel_path}: {key}")
                                print(f"     Было: {target_val}")
                                print(f"     Стало: {new_val}")
                
                if updated:
                    target_nested = unflatten_dict(target_flat)
                    save_json(target_path, target_nested)
                    files_processed += 1

    print("\n" + "="*80)
    print("📊 ИТОГИ")
    print("="*80)
    print(f"✅ Исправлено файлов: {files_processed}")
    print(f"✅ Исправлено переменных: {variables_fixed}")

if __name__ == '__main__':
    fix_variables()
