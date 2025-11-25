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
import concurrent.futures

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')
SOURCE_LANG = 'ru'
TARGET_LANGS = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
MAX_WORDS = 500  # Увеличили лимит слов
RETRY_COUNT = 3
DELAY_MIN = 0.05
DELAY_MAX = 0.1
MAX_WORKERS = 20  # Количество параллельных потоков

# Маппинг языковых кодов
LANG_MAP = {
    'ru': 'ru',
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
    return translate_google_free_custom(text, SOURCE_LANG, target_lang)

def translate_google_free_custom(text: str, source_lang: str, target_lang: str) -> str:
    """
    Перевод текста через бесплатный Google Translate с указанием исходного языка
    """
    if not text or not isinstance(text, str):
        return text

    # Если текст - это URL или путь, не переводим
    if text.startswith('http') or text.startswith('/') or text.startswith('@'):
        return text

    url = "https://translate.googleapis.com/translate_a/single"
    params = {
        'client': 'gtx',
        'sl': LANG_MAP.get(source_lang, source_lang),
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

def process_translation_item(args):
    """Функция для обработки одного перевода в потоке"""
    key, source_value, target_lang, current_value, is_russian_empty = args
    
    # Если значения совпадают и это не русский язык (где мы заполняем пустые), пропускаем
    if current_value == source_value and target_lang != 'ru':
        return None
        
    # Если списки разной длины - переводим заново
    if isinstance(source_value, list) and isinstance(current_value, list) and len(source_value) != len(current_value):
        pass # needs translation
    elif current_value: # Если значение есть и оно не совпадает с исходным (и не список), считаем что уже переведено
        # Но если мы переводим на русский и исходное было пустым (взяли из EN), то нужно проверить, не пустое ли текущее
        if target_lang == 'ru' and is_russian_empty:
             if current_value: return None
        else:
             return None

    result = None
    
    # Обработка списков
    if isinstance(source_value, list):
        if all(isinstance(x, str) for x in source_value):
            new_list = []
            translated_any = False
            for item in source_value:
                tr = translate_google_free_custom(item, 'en' if is_russian_empty else SOURCE_LANG, target_lang)
                if tr and tr != item:
                    new_list.append(tr)
                    translated_any = True
                else:
                    new_list.append(item)
            
            if translated_any:
                result = (key, new_list, 'translated')
            else:
                result = (key, source_value, 'filled')
        else:
            result = (key, source_value, 'filled')
            
    # Обработка строк
    elif isinstance(source_value, str):
        source_lang_code = 'en' if is_russian_empty else SOURCE_LANG
        translated = translate_google_free_custom(source_value, source_lang_code, target_lang)
        
        if translated and translated != source_value:
            # Небольшая задержка, чтобы не спамить API слишком быстро даже в потоках
            time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
            result = (key, translated, 'translated')
        else:
            result = (key, source_value, 'filled')
            
    # Другие типы
    else:
        result = (key, source_value, 'filled')
        
    return result

def auto_translate():
    """Основная функция автоперевода (Многопоточная версия)"""
    print("🚀 Начинаем умный перевод локалей (Многопоточный)...")
    print(f"📁 Директория: {LOCALES_DIR}")
    print(f"🌍 Исходный язык: {SOURCE_LANG}")
    print(f"🎯 Целевые языки: {', '.join(TARGET_LANGS)}")
    print(f"⚡️ Потоков: {MAX_WORKERS}")
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
        
        source_flat = flatten_dict(source_data)
        
        # Предварительно загружаем английский файл, если он понадобится для фоллбэка
        en_flat_cache = None
        
        # Подготавливаем эффективные исходные значения (RU или EN fallback)
        effective_source = {}
        
        for key, val in source_flat.items():
            is_empty = val is None or (isinstance(val, str) and not val)
            if is_empty:
                if en_flat_cache is None:
                    en_file = os.path.join(LOCALES_DIR, 'en', file_path)
                    if os.path.exists(en_file):
                        en_data = load_json(en_file)
                        en_flat_cache = flatten_dict(en_data)
                    else:
                        en_flat_cache = {}
                
                en_val = en_flat_cache.get(key)
                if en_val:
                    effective_source[key] = (en_val, True) # value, is_from_en_fallback
            else:
                effective_source[key] = (val, False) # value, is_original_ru
        
        if not effective_source:
            continue

        print(f"📝 Обработка: {file_path}")
        
        # Переводим для каждого целевого языка
        for target_lang in TARGET_LANGS:
            if 'terms.json' in file_path and target_lang == 'ar':
                print(f"DEBUG: Inside loop for {target_lang} {file_path}")

            target_file = os.path.join(LOCALES_DIR, target_lang, file_path)
            
            # Загружаем существующие переводы
            target_data = load_json(target_file)
            target_flat = flatten_dict(target_data)
            
            tasks = []
            
            # Формируем задачи для перевода
            for key, (source_val, is_russian_empty) in effective_source.items():
                current_val = target_flat.get(key)
                
                # Простая проверка: если ключа нет или значение пустое - добавляем задачу
                # Более сложная проверка внутри process_translation_item
                if key not in target_flat or not current_val or (target_lang == 'ru' and is_russian_empty and not current_val):
                     tasks.append((key, source_val, target_lang, current_val, is_russian_empty))
            
            if not tasks:
                # Even if no tasks, we might want to save to fix structure
                pass
                
            updated = False
            file_translated_count = 0
            
            if tasks:
                # Запускаем параллельный перевод
                with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                    # map возвращает результаты в том же порядке, но нам порядок не важен, главное результат
                    results = list(executor.map(process_translation_item, tasks))
                    
                for res in results:
                    if res:
                        key, val, status = res
                        target_flat[key] = val
                        updated = True
                        if status == 'translated':
                            total_translated += 1
                            file_translated_count += 1
                        else:
                            total_filled += 1
            
            # Сохраняем обновленный файл, если были изменения или для исправления структуры
            if True: # updated or True to force unflattening
                if 'terms.json' in file_path and target_lang == 'ar':
                     print(f"DEBUG: Saving {target_file}")
                     target_nested = unflatten_dict(target_flat)
                     print(f"DEBUG: Nested keys sample: {list(target_nested.keys())[:5]}")
                     if 'sections' in target_nested:
                         print(f"DEBUG: sections type: {type(target_nested['sections'])}")
                         if isinstance(target_nested['sections'], dict):
                             print(f"DEBUG: sections keys: {list(target_nested['sections'].keys())}")
                else:
                     target_nested = unflatten_dict(target_flat)
                save_json(target_file, target_nested)
                if file_translated_count > 0:
                    print(f"  💾 {target_lang}: Сохранено ({file_translated_count} новых переводов)")
        
        # print() # Меньше спама в консоль
    
    print("\n" + "="*80)
    print("📊 ИТОГИ")
    print("="*80)
    print(f"✅ Переведено фраз: {total_translated}")
    print(f"📥 Заполнено оригиналом (ошибки API): {total_filled}")
    print(f"❌ Ошибок: {total_errors}")
    print("\n✨ Готово! Теперь запустите npm run i18n:check для проверки.")

if __name__ == '__main__':
    auto_translate()
