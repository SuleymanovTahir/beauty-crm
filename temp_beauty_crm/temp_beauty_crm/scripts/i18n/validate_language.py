#!/usr/bin/env python3
"""
Скрипт для проверки правильности языка в переводах.
Проверяет что переводы написаны на правильном языке (не на русском/английском в арабских файлах и т.д.)
Пропускает переменные в {{}} и технические термины.
"""

import os
import json
import re

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')

# Диапазоны Unicode для разных языков
LANGUAGE_RANGES = {
    'ru': (0x0400, 0x04FF),  # Кириллица
    'ar': (0x0600, 0x06FF),  # Арабский
    'de': (0x0041, 0x007A),  # Латиница (немецкий использует латиницу)
    'en': (0x0041, 0x007A),  # Латиница
    'es': (0x0041, 0x007A),  # Латиница
    'fr': (0x0041, 0x007A),  # Латиница
    'hi': (0x0900, 0x097F),  # Деванагари (хинди)
    'kk': (0x0400, 0x04FF),  # Кириллица (казахский)
    'pt': (0x0041, 0x007A),  # Латиница
}

def has_chars_in_range(text, start, end):
    """Проверяет наличие символов в заданном диапазоне Unicode"""
    return any(start <= ord(c) <= end for c in text)

def remove_variables(text):
    """Удаляет переменные {{variable}} из текста"""
    return re.sub(r'\{\{[^}]+\}\}', '', text)

def is_technical_term(text):
    """Проверяет является ли текст техническим термином (email, URL, и т.д.)"""
    technical_patterns = [
        r'^https?://',  # URL
        r'@',  # Email
        r'^\d+$',  # Только цифры
        r'^[A-Z_]+$',  # Константы
    ]
    return any(re.search(pattern, text) for pattern in technical_patterns)

def check_language(text, lang):
    """
    Проверяет соответствие текста ожидаемому языку
    Возвращает True если текст на правильном языке
    """
    if not text or not isinstance(text, str):
        return True
    
    # Убираем переменные
    clean_text = remove_variables(text).strip()
    
    if not clean_text or len(clean_text) < 3:
        return True
    
    # Пропускаем технические термины
    if is_technical_term(clean_text):
        return True
    
    # Для латинских языков сложнее проверить, поэтому проверяем только на отсутствие кириллицы/арабского
    if lang in ['en', 'de', 'es', 'fr', 'pt']:
        # Проверяем что нет кириллицы
        if has_chars_in_range(clean_text, 0x0400, 0x04FF):
            return False
        # Проверяем что нет арабского
        if has_chars_in_range(clean_text, 0x0600, 0x06FF):
            return False
        return True
    
    # Для кириллических и арабского проверяем наличие нужных символов
    if lang in LANGUAGE_RANGES:
        start, end = LANGUAGE_RANGES[lang]
        return has_chars_in_range(clean_text, start, end)
    
    return True

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

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return None

def validate_language():
    print("🔍 Проверка правильности языка в переводах...")
    print("=" * 80)
    
    issues_found = 0
    
    for lang in os.listdir(LOCALES_DIR):
        lang_dir = os.path.join(LOCALES_DIR, lang)
        if not os.path.isdir(lang_dir) or lang == 'en':  # Пропускаем английский (он базовый)
            continue
        
        print(f"\n📁 Проверка языка: {lang.upper()}")
        lang_issues = 0
        
        for root, dirs, files in os.walk(lang_dir):
            for file in files:
                if not file.endswith('.json'):
                    continue
                
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, lang_dir)
                
                data = load_json(file_path)
                if not data:
                    continue
                
                flat = flatten_dict(data)
                
                for key, value in flat.items():
                    if isinstance(value, str) and value:
                        if not check_language(value, lang):
                            print(f"  ⚠️  {relative_path}")
                            print(f"     Ключ: {key}")
                            print(f"     Значение: {value[:100]}...")
                            print()
                            lang_issues += 1
                            issues_found += 1
        
        if lang_issues == 0:
            print(f"  ✅ Все переводы на правильном языке")
    
    print("\n" + "=" * 80)
    if issues_found == 0:
        print("✅ Проверка завершена: все переводы на правильных языках!")
    else:
        print(f"⚠️  Найдено {issues_found} подозрительных переводов")
        print("   Проверьте их вручную и исправьте при необходимости")

if __name__ == '__main__':
    validate_language()
