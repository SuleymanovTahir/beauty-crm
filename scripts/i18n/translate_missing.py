#!/usr/bin/env python3
"""
Скрипт для автоматического перевода отсутствующих ключей.
Находит пустые или отсутствующие переводы и переводит их с русского на целевой язык.
"""

import os
import json
import httpx
import asyncio
from typing import Dict

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')
SOURCE_LANG = 'ru'  # Исходный язык (русский)
TARGET_LANGS = ['ar', 'de', 'en', 'es', 'fr', 'hi', 'kk', 'pt']

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

def unflatten_dict(d, sep='.'):
    """Преобразует плоский словарь обратно во вложенный"""
    result = {}
    for key, value in d.items():
        parts = key.split(sep)
        current = result
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        current[parts[-1]] = value
    return result

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
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

async def translate_text(text: str, target_lang: str) -> str:
    """Переводит текст используя Google Translate (бесплатный endpoint)"""
    if not text or not isinstance(text, str):
        return text
    
    # Пропускаем переменные и короткие строки
    if len(text) < 2 or text.startswith('{{'):
        return text
    
    url = "https://translate.googleapis.com/translate_a/single"
    params = {
        "client": "gtx",
        "sl": SOURCE_LANG,
        "tl": target_lang,
        "dt": "t",
        "q": text
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                return "".join([x[0] for x in data[0]])
    except Exception as e:
        print(f"  ⚠️  Ошибка перевода: {e}")
    
    return text

async def translate_missing():
    print("🌍 Автоматический перевод отсутствующих ключей...")
    print("=" * 80)
    
    # Загружаем русские переводы (источник)
    source_files = {}
    source_dir = os.path.join(LOCALES_DIR, SOURCE_LANG)
    
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            if not file.endswith('.json'):
                continue
            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, source_dir)
            source_files[relative_path] = load_json(file_path)
    
    print(f"📚 Загружено {len(source_files)} файлов из {SOURCE_LANG}")
    
    # Переводим для каждого целевого языка
    for target_lang in TARGET_LANGS:
        print(f"\n🔄 Перевод на {target_lang.upper()}...")
        target_dir = os.path.join(LOCALES_DIR, target_lang)
        translated_count = 0
        
        for relative_path, source_data in source_files.items():
            if not source_data:
                continue
            
            target_path = os.path.join(target_dir, relative_path)
            target_data = load_json(target_path) or {}
            
            # Преобразуем в плоские словари
            source_flat = flatten_dict(source_data)
            target_flat = flatten_dict(target_data)
            
            # Находим отсутствующие или пустые ключи
            missing_keys = []
            for key, value in source_flat.items():
                if key not in target_flat or not target_flat[key]:
                    missing_keys.append((key, value))
            
            if not missing_keys:
                continue
            
            print(f"  📄 {relative_path}: {len(missing_keys)} ключей")
            
            # Переводим отсутствующие ключи
            for key, value in missing_keys:
                if isinstance(value, str) and value:
                    translated = await translate_text(value, target_lang)
                    target_flat[key] = translated
                    translated_count += 1
                    print(f"     ✅ {key[:50]}...")
                    await asyncio.sleep(0.1)  # Небольшая задержка чтобы не забанили
            
            # Сохраняем обновленный файл
            target_data_updated = unflatten_dict(target_flat)
            save_json(target_path, target_data_updated)
        
        print(f"  ✅ Переведено {translated_count} ключей для {target_lang}")
    
    print("\n" + "=" * 80)
    print("✅ Автоматический перевод завершен!")
    print("   Рекомендуется проверить переводы вручную")

if __name__ == '__main__':
    asyncio.run(translate_missing())
