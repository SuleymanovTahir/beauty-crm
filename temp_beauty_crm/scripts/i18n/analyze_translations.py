#!/usr/bin/env python3
"""
Скрипт для анализа переводов.
Проверяет:
1. Ключи без значений (пустые строки).
2. Различия в количестве ключей между языками.
3. Отсутствующие ключи (сравнивая с суперсетом всех ключей из всех языков).
Игнорирует суффиксы множественного числа (_zero, _one, _two, etc.) при сравнении ключей.
"""

import os
import json

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')
LANGUAGES = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']

def load_json(path):
    """Загрузка JSON файла"""
    try:
        if not os.path.exists(path):
            return None
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Ошибка загрузки {path}: {e}")
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

def get_base_key(key):
    """Убирает суффиксы множественного числа из ключа."""
    suffixes = ['_zero', '_one', '_two', '_few', '_many', '_other']
    for suffix in suffixes:
        if key.endswith(suffix):
            return key[:-len(suffix)]
    return key

def analyze_file(filename, locales_dir, languages):
    print(f"📄 Файл: {filename}")
    
    file_data = {}
    all_keys = set()
    
    # Загружаем данные и собираем все ключи
    for lang in languages:
        path = os.path.join(locales_dir, lang, filename)
        data = load_json(path)
        file_data[lang] = data
        
        if data:
            flat_keys = flatten_dict(data).keys()
            # Для сравнения используем базовые ключи (без суффиксов множественного числа)
            base_keys = set(get_base_key(k) for k in flat_keys)
            all_keys.update(base_keys)

    if not all_keys:
        print("  ⚠️  Файл пуст или отсутствует во всех языках")
        print("-" * 40)
        return False

    has_issues = False
    
    # Проверка на пустые значения
    for lang in languages:
        data = file_data.get(lang, {})
        if not data:
            continue
            
        flat = flatten_dict(data)
        empty_keys = []
        for k, v in flat.items():
            # Разрешаем пустые списки [], но не пустые строки ""
            if isinstance(v, list) and len(v) == 0:
                continue
            if not v and v != 0 and v != False:
                empty_keys.append(k)
        
        if empty_keys:
            has_issues = True
            print(f"  ⚠️  Пустые значения ({lang}): {len(empty_keys)} ключей")
            # Выводим первые 3 примера
            examples = empty_keys[:3]
            print(f"    Примеры: {', '.join(examples)}...")

    # Проверка на пропущенные ключи
    missing_stats = {}
    for lang in languages:
        data = file_data.get(lang, {})
        if not data:
            missing_stats[lang] = all_keys
            continue
            
        flat_keys = set(get_base_key(k) for k in flatten_dict(data).keys())
        missing = all_keys - flat_keys
        if missing:
            missing_stats[lang] = missing

    if missing_stats:
        has_issues = True
        print(f"  📉 Различия в ключах (сравнение с полным набором):")
        print(f"    Всего уникальных базовых ключей: {len(all_keys)}")
        
        for lang in languages:
            missing = missing_stats.get(lang, set())
            if missing:
                print(f"    - {lang}: не хватает {len(missing)} ключей")
                # Выводим список пропущенных ключей (максимум 10)
                missing_list = sorted(list(missing))
                print(f"      Пропущено: {', '.join(missing_list[:10])}{'...' if len(missing_list) > 10 else ''}")
            else:
                print(f"    - {lang}: ✅ полный набор")
    
    if not has_issues:
        print("  ✅ Всё отлично")
        
    print("-" * 40)
    return has_issues

def analyze():
    print(f"🔍 Анализ переводов в {LOCALES_DIR}")
    print(f"🌍 Языки: {', '.join(LANGUAGES)}\n")
    print(f"ℹ️  Игнорируются суффиксы множественного числа (_zero, _one, etc.)\n")

    # 1. Собираем список всех уникальных относительных путей к файлам
    all_files = set()
    for lang in LANGUAGES:
        lang_dir = os.path.join(LOCALES_DIR, lang)
        if not os.path.exists(lang_dir):
            continue
        
        # Рекурсивный поиск json файлов
        for root, dirs, files in os.walk(lang_dir):
            for file in files:
                if file.endswith('.json'):
                    rel_path = os.path.relpath(os.path.join(root, file), lang_dir)
                    all_files.add(rel_path)

    sorted_files = sorted(list(all_files))
    
    files_with_issues = 0

    for rel_path in sorted_files:
        if analyze_file(rel_path, LOCALES_DIR, LANGUAGES):
            files_with_issues += 1

    print(f"\nИтог: Проблемы найдены в {files_with_issues} из {len(sorted_files)} файлов.")

if __name__ == "__main__":
    analyze()
