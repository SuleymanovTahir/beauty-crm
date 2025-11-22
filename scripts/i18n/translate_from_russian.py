#!/usr/bin/env python3
"""
Скрипт для перевода ЗНАЧЕНИЙ из русских файлов локализации на другие языки.
Использует бесплатный Google Translate для перевода коротких фраз (≤3 слов).
"""

import os
import json
import urllib.parse
import urllib.request
import time
import re

# Конфигурация
LOCALES_DIR = '/Users/tahir/Desktop/beauty-crm/frontend/src/locales'
SOURCE_LANG = 'ru'
TARGET_LANGS = ['en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
MAX_WORDS = 3  # Максимум слов для автоперевода

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
    clean_text = re.sub(r'[^\w\s]', ' ', text)
    return len([w for w in clean_text.split() if w])

def translate_google_free(text: str, target_lang: str) -> str:
    """
    Перевод текста через бесплатный Google Translate
    """
    try:
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
        
        req = urllib.request.Request(full_url, headers=headers)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = response.read().decode('utf-8')
            data = json.loads(result)
            
            if data and len(data) > 0 and data[0]:
                translated = ''.join([part[0] for part in data[0] if part[0]])
                return translated
            
        return None
        
    except Exception as e:
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
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        current[parts[-1]] = value
    return result

def auto_translate():
    """Основная функция автоперевода"""
    print("🚀 Начинаем перевод с русского на другие языки...")
    print(f"📁 Директория: {LOCALES_DIR}")
    print(f"🌍 Исходный язык: {SOURCE_LANG}")
    print(f"🎯 Целевые языки: {', '.join(TARGET_LANGS)}")
    print(f"📏 Макс. слов для автоперевода: {MAX_WORDS}")
    print()
    
    # Собираем все файлы из русской локали
    source_dir = os.path.join(LOCALES_DIR, SOURCE_LANG)
    source_files = []
    
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            if file.endswith('.json'):
                rel_path = os.path.relpath(os.path.join(root, file), source_dir)
                source_files.append(rel_path)
    
    print(f"📄 Найдено {len(source_files)} файлов для обработки\n")
    
    manual_translations_needed = []
    total_translated = 0
    total_skipped = 0
    total_already_translated = 0
    
    # Подсчет общего количества ключей для прогресса
    total_keys = 0
    for file_path in source_files:
        try:
            data = load_json(os.path.join(source_dir, file_path))
            total_keys += len(flatten_dict(data))
        except: pass
        
    print(f"📊 Всего ключей для проверки: {total_keys}\n")
    current_key_index = 0
    
    # Обрабатываем каждый файл
    for file_path in sorted(source_files):
        source_file = os.path.join(source_dir, file_path)
        source_data = load_json(source_file)
        
        if not source_data:
            continue
        
        # Преобразуем в плоский словарь
        source_flat = flatten_dict(source_data)
        
        print(f"📝 Обработка: {file_path}")
        
        # Переводим для каждого целевого языка
        for target_lang in TARGET_LANGS:
            target_file = os.path.join(LOCALES_DIR, target_lang, file_path)
            
            # Загружаем существующие переводы
            target_data = load_json(target_file) if os.path.exists(target_file) else {}
            target_flat = flatten_dict(target_data)
            
            updated = False
            
            # Проверяем каждый ключ
            for key, russian_value in source_flat.items():
                current_key_index += 1
                # progress = (current_key_index / (total_keys * len(TARGET_LANGS))) * 100
                # if current_key_index % 10 == 0:
                #     print(f"   ⏳ Прогресс: {progress:.1f}% ({current_key_index}/{total_keys * len(TARGET_LANGS)})", end="\r")
                
                # Пропускаем только если это английский язык и уже есть перевод
                # Для остальных языков (ar, es, de, fr, hi, kk, pt) - переводим заново
                if target_lang == 'en' and key in target_flat and target_flat[key]:
                    total_already_translated += 1
                    continue
                
                if not isinstance(russian_value, str) or not russian_value:
                    continue
                
                word_count = count_words(russian_value)
                
                if word_count <= MAX_WORDS:
                    # Автоматический перевод для коротких фраз
                    translated = translate_google_free(russian_value, target_lang)
                    
                    if translated and translated != russian_value:
                        target_flat[key] = translated
                        updated = True
                        total_translated += 1
                        print(f"  ✅ {target_lang}/{key}: '{russian_value}' → '{translated}'")
                        time.sleep(0.5)  # Задержка
                    else:
                        # Если перевод не удался, оставляем русский текст
                        target_flat[key] = russian_value
                        total_skipped += 1
                else:
                    # Для длинных фраз оставляем русский текст и логируем
                    target_flat[key] = russian_value
                    manual_translations_needed.append({
                        'file': file_path,
                        'lang': target_lang,
                        'key': key,
                        'text': russian_value,
                        'words': word_count
                    })
                    total_skipped += 1
            
            # Сохраняем обновленный файл (всегда плоская структура для совместимости с i18next-parser)
            if updated or not os.path.exists(target_file):
                save_json(target_file, target_flat)
        
        print()
    
    # Выводим результаты
    print("\n" + "="*80)
    print("📊 РЕЗУЛЬТАТЫ АВТОПЕРЕВОДА")
    print("="*80)
    print(f"✅ Автоматически переведено: {total_translated}")
    print(f"📚 Уже было переведено: {total_already_translated}")
    print(f"⏭️  Пропущено (>3 слов, оставлен русский): {total_skipped}")
    
    if manual_translations_needed:
        print("\n" + "="*80)
        print(f"📝 ДЛИННЫЕ ФРАЗЫ (>{MAX_WORDS} слов) - ОСТАВЛЕН РУССКИЙ ТЕКСТ")
        print("="*80)
        print(f"Всего: {len(manual_translations_needed)} фраз")
        print("Эти фразы скопированы на русском, требуется ручной перевод")
        
        # Показываем первые 20
        for item in manual_translations_needed[:20]:
            print(f"  • {item['lang']}/{item['file']}/{item['key']}: \"{item['text']}\" ({item['words']} слов)")
        
        if len(manual_translations_needed) > 20:
            print(f"  ... и еще {len(manual_translations_needed) - 20} фраз")
    
    print("\n✨ Готово!")
    print("\n💡 Совет: Длинные фразы скопированы на русском языке.")
    print("   Вы можете перевести их вручную позже или использовать платный API.")

if __name__ == '__main__':
    auto_translate()
