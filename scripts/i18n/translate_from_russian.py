#!/usr/bin/env python3
"""
Скрипт для перевода ЗНАЧЕНИЙ из русских файлов локализации на другие языки.
Использует бесплатный Google Translate API.
"""

import os
import json
import urllib.parse
import urllib.request
import time
import re
import random

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')
SOURCE_LANG = 'ru'
TARGET_LANGS = ['en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
MAX_WORDS = 500  # Увеличили лимит слов
RETRY_COUNT = 3
DELAY_MIN = 0.1
DELAY_MAX = 0.3

# Маппинг языковых кодов
LANG_MAP = {
    'en': 'en',
    'ar': 'ar',
    'es': 'es',
    'de': 'de',
    'fr': 'fr',
    'hi': 'hi',
    'kk': 'kk',
    'pt': 'pt'
}

def load_json(path):
    """Загрузка JSON файла"""
    try:
        if not os.path.exists(path):
            return {}
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Ошибка загрузки {path}: {e}")
        return {}

def save_json(path, data):
    """Сохранение JSON файла"""
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        return True
    except Exception as e:
        print(f"❌ Ошибка сохранения {path}: {e}")
        return False

def count_words(text: str) -> int:
    """Подсчет количества слов в тексте"""
    if not isinstance(text, str): return 0
    clean_text = re.sub(r'[^\w\s]', ' ', text)
    return len([w for w in clean_text.split() if w])

def translate_google_free(text: str, target_lang: str) -> str:
    """
    Перевод текста через бесплатный Google Translate с повторными попытками
    """
    if not text or not isinstance(text, str):
        return text

    # Если текст - это URL или путь, не переводим
    if text.startswith('http') or text.startswith('/') or text.startswith('@'):
        return text

    url = "https://translate.googleapis.com/translate_a/single"
    params = {
        'client': 'gtx',
        'sl': SOURCE_LANG,
        'tl': LANG_MAP.get(target_lang, target_lang),
        'dt': 't',
        'q': text
    }
    
    query_string = urllib.parse.urlencode(params)
    full_url = f"{url}?{query_string}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    for attempt in range(RETRY_COUNT):
        try:
            req = urllib.request.Request(full_url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                result = response.read().decode('utf-8')
                data = json.loads(result)
                
                if data and len(data) > 0 and data[0]:
                    translated = ''.join([part[0] for part in data[0] if part[0]])
                    return translated
            break
        except Exception as e:
            if attempt < RETRY_COUNT - 1:
                time.sleep(1 * (attempt + 1))
            else:
                # print(f"   ⚠️ Ошибка перевода '{text[:20]}...': {e}")
                return None
    return None

def flatten_dict(d, parent_key='', sep='.'):
    """Преобразование вложенного словаря в плоский"""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def unflatten_dict(d, sep='.'):
    """Преобразование плоского словаря обратно во вложенный"""
    result = {}
    for key, value in d.items():
        parts = key.split(sep)
        current = result
        for i, part in enumerate(parts[:-1]):
            if part not in current:
                current[part] = {}
            if not isinstance(current[part], dict):
                # Конфликт ключей: если auth="foo" и auth.login="bar"
                # Превращаем auth в {"_self": "foo"} или просто перезаписываем
                current[part] = {} 
            current = current[part]
        current[parts[-1]] = value
    return result

def auto_translate():
    """Основная функция автоперевода"""
    print("🚀 Начинаем умный перевод локалей...")
    print(f"📁 Директория: {LOCALES_DIR}")
    print(f"🌍 Исходный язык: {SOURCE_LANG}")
    print(f"🎯 Целевые языки: {', '.join(TARGET_LANGS)}")
    print()
    
    if not os.path.exists(LOCALES_DIR):
        print(f"❌ Директория {LOCALES_DIR} не найдена!")
        return

    # Собираем все файлы из русской локали
    source_dir = os.path.join(LOCALES_DIR, SOURCE_LANG)
    source_files = []
    
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            if file.endswith('.json'):
                rel_path = os.path.relpath(os.path.join(root, file), source_dir)
                source_files.append(rel_path)
    
    print(f"📄 Найдено {len(source_files)} файлов для обработки\n")
    
    total_translated = 0
    total_filled = 0
    total_errors = 0
    
    # Обрабатываем каждый файл
    for file_path in sorted(source_files):
        source_file = os.path.join(source_dir, file_path)
        source_data = load_json(source_file)
        
        if not source_data:
            continue
        
        # Преобразуем в плоский словарь для удобства сравнения
        source_flat = flatten_dict(source_data)
        
        print(f"📝 Обработка: {file_path}")
        
        # Переводим для каждого целевого языка
        for target_lang in TARGET_LANGS:
            target_file = os.path.join(LOCALES_DIR, target_lang, file_path)
            
            # Загружаем существующие переводы
            target_data = load_json(target_file)
            target_flat = flatten_dict(target_data)
            
            updated = False
            file_translated_count = 0
            
            # Проверяем каждый ключ
            for key, russian_value in source_flat.items():
                # Пропускаем пустые значения (но 0 и False оставляем, если вдруг будут)
                if russian_value is None or (isinstance(russian_value, str) and not russian_value):
                    continue
                
                # Проверяем, нужен ли перевод
                needs_translation = False
                current_value = target_flat.get(key)
                
                if key not in target_flat:
                    needs_translation = True
                elif not current_value:
                    needs_translation = True
                elif current_value == russian_value and target_lang != 'ru':
                    needs_translation = True
                elif isinstance(russian_value, list) and isinstance(current_value, list) and len(russian_value) != len(current_value):
                    needs_translation = True
                
                if needs_translation:
                    # Обработка списков
                    if isinstance(russian_value, list):
                        # Если список строк - переводим каждую
                        if all(isinstance(x, str) for x in russian_value):
                            new_list = []
                            list_translated = False
                            for item in russian_value:
                                tr = translate_google_free(item, target_lang)
                                if tr and tr != item:
                                    new_list.append(tr)
                                    list_translated = True
                                else:
                                    new_list.append(item)
                            
                            target_flat[key] = new_list
                            if list_translated:
                                total_translated += 1
                                file_translated_count += 1
                            else:
                                total_filled += 1
                            updated = True
                        else:
                            # Сложные списки (объекты) просто копируем
                            target_flat[key] = russian_value
                            updated = True
                            total_filled += 1
                    
                    # Обработка строк
                    elif isinstance(russian_value, str):
                        translated = translate_google_free(russian_value, target_lang)
                        
                        if translated and translated != russian_value:
                            target_flat[key] = translated
                            updated = True
                            total_translated += 1
                            file_translated_count += 1
                            time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
                        else:
                            if key not in target_flat or not target_flat[key]:
                                target_flat[key] = russian_value
                                updated = True
                                total_filled += 1
                            else:
                                total_errors += 1
                    
                    # Другие типы (числа, булевы) - просто копируем
                    else:
                        if key not in target_flat:
                            target_flat[key] = russian_value
                            updated = True
            
            # Сохраняем обновленный файл, если были изменения
            if updated:
                # Разворачиваем обратно во вложенную структуру
                target_nested = unflatten_dict(target_flat)
                save_json(target_file, target_nested)
                if file_translated_count > 0:
                    print(f"  💾 {target_lang}: Сохранено ({file_translated_count} новых переводов)")
        
        print()
    
    print("\n" + "="*80)
    print("📊 ИТОГИ")
    print("="*80)
    print(f"✅ Переведено фраз: {total_translated}")
    print(f"📥 Заполнено оригиналом (ошибки API): {total_filled}")
    print(f"❌ Ошибок: {total_errors}")
    print("\n✨ Готово! Теперь запустите npm run i18n:check для проверки.")

if __name__ == '__main__':
    auto_translate()
