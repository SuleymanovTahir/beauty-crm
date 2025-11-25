#!/usr/bin/env python3
"""
Скрипт для очистки массива testimonials.items во всех файлах public/Home.json.
Это нужно, чтобы отзывы подгружались динамически через API (реальные или мок),
а не брались из хардкода в переводах.
"""

import os
import json

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')

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

def clear_testimonials():
    print("🧹 Очистка хардкодных отзывов в public/Home.json...")
    
    files_fixed = 0
    
    # Проходим по всем языковым папкам
    for lang in os.listdir(LOCALES_DIR):
        lang_dir = os.path.join(LOCALES_DIR, lang)
        if not os.path.isdir(lang_dir):
            continue
            
        path = os.path.join(lang_dir, 'public/Home.json')
        if not os.path.exists(path):
            continue
            
        data = load_json(path)
        if not data:
            continue
            
        # Ищем testimonials.items
        updated = False
        
        # Вариант 1: Вложенная структура
        if 'testimonials' in data and isinstance(data['testimonials'], dict):
            if 'items' in data['testimonials'] and data['testimonials']['items']:
                data['testimonials']['items'] = []
                updated = True
                
        # Вариант 2: Плоская структура (если есть)
        if 'testimonials.items' in data and data['testimonials.items']:
             data['testimonials.items'] = []
             updated = True
             
        if updated:
            save_json(path, data)
            print(f"  ✅ {lang}: testimonials.items очищен")
            files_fixed += 1
        else:
            print(f"  ℹ️  {lang}: уже пуст или не найден")

    print(f"\nИтог: Очищено {files_fixed} файлов.")

if __name__ == '__main__':
    clear_testimonials()
