#!/usr/bin/env python3
"""
Скрипт для заполнения пустых ключей в русской локали (ru).
Преобразует ключ (например "contact_information") в текст ("Contact information")
и переводит его с английского на русский.
"""

import os
import json
import urllib.parse
import urllib.request
import time
import re

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')
SOURCE_LANG = 'ru'

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

def translate_en_to_ru(text):
    """Перевод с английского на русский"""
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            'client': 'gtx',
            'sl': 'en',
            'tl': 'ru',
            'dt': 't',
            'q': text
        }
        
        query_string = urllib.parse.urlencode(params)
        full_url = f"{url}?{query_string}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0'
        }
        
        req = urllib.request.Request(full_url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as response:
            result = response.read().decode('utf-8')
            data = json.loads(result)
            if data and len(data) > 0 and data[0]:
                return ''.join([part[0] for part in data[0] if part[0]])
        return None
    except Exception as e:
        # print(f"Error translating {text}: {e}")
        return None

def key_to_text(key):
    """Преобразует ключ в текст (contact_information -> Contact information)"""
    # Берем последнюю часть ключа если есть точки (хотя у нас flatten с точками, но ключи могут быть сами по себе)
    # Но здесь key это полный путь. Нам нужно только последнее слово?
    # Нет, часто ключ это целая фраза.
    # Если ключ nested (auth.login), то мы хотим перевести "login".
    # Но flatten_dict дает нам полные ключи.
    # Если ключ "admin_can_change...", то это предложение.
    
    # Разбиваем по точкам, берем последнюю часть
    last_part = key.split('.')[-1]
    
    # Заменяем подчеркивания и дефисы на пробелы
    text = last_part.replace('_', ' ').replace('-', ' ')
    
    # Делаем первую букву заглавной
    text = text.capitalize()
    
    return text

def fill_empty_keys():
    print(f"🚀 Заполнение пустых ключей в {SOURCE_LANG} (перевод ключей с EN на RU)...")
    
    source_dir = os.path.join(LOCALES_DIR, SOURCE_LANG)
    
    files_processed = 0
    keys_filled = 0
    
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
            updated = False
            file_keys_filled = 0
            
            for key, value in source_flat.items():
                if not value or (isinstance(value, str) and not value.strip()):
                    # Пустой ключ!
                    english_text = key_to_text(key)
                    russian_text = translate_en_to_ru(english_text)
                    
                    if russian_text:
                        source_flat[key] = russian_text
                        updated = True
                        file_keys_filled += 1
                        print(f"  📝 {rel_path}: {key} -> {russian_text}")
                        time.sleep(0.2)
                    else:
                        print(f"  ⚠️ {rel_path}: Не удалось перевести {english_text}")
            
            if updated:
                source_nested = unflatten_dict(source_flat)
                save_json(source_path, source_nested)
                keys_filled += file_keys_filled
                files_processed += 1
                
    print("\n" + "="*80)
    print("📊 ИТОГИ")
    print("="*80)
    print(f"✅ Обновлено файлов: {files_processed}")
    print(f"✅ Заполнено ключей: {keys_filled}")
    print("\nТеперь запустите npm run i18n:sync для перевода этих ключей на другие языки.")

if __name__ == '__main__':
    fill_empty_keys()
