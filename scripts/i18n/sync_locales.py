#!/usr/bin/env python3
"""
Скрипт для синхронизации файлов локализации с кодом.
Находит все используемые ключи в коде и удаляет неиспользуемые из locale файлов.
"""

import os
import re
import json
from pathlib import Path

# Конфигурация
BASE_DIR = Path(__file__).resolve().parents[2]
FRONTEND_GROUP = os.getenv('FRONTEND_GROUP', 'crm').strip().lower()
if FRONTEND_GROUP not in {'crm', 'site'}:
    FRONTEND_GROUP = 'crm'
FRONTEND_DIR = BASE_DIR / FRONTEND_GROUP / 'frontend' / 'src'
LOCALES_DIR = FRONTEND_DIR / 'locales'
SOURCE_LANG = 'ru'

def find_translation_keys_in_code():
    """Находит все используемые ключи переводов в коде"""
    print("🔍 Сканирование кода на используемые ключи переводов...")
    
    # Паттерны для поиска t('namespace:key') или t("namespace:key")
    patterns = [
        r"t\(['\"]([^'\"]+)['\"]",  # t('key') или t("key")
        r"t\(`([^`]+)`",  # t(`key`)
    ]
    
    used_keys = {}  # {namespace: set(keys)}
    
    # Сканируем все .tsx и .ts файлы
    for root, dirs, files in os.walk(FRONTEND_DIR):
        # Пропускаем node_modules и locales
        if 'node_modules' in root or 'locales' in root:
            continue
            
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                file_path = Path(root) / file
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        for pattern in patterns:
                            matches = re.findall(pattern, content)
                            
                            for match in matches:
                                # Разбираем namespace:key
                                if ':' in match:
                                    namespace, key = match.split(':', 1)
                                    
                                    if namespace not in used_keys:
                                        used_keys[namespace] = set()
                                    
                                    used_keys[namespace].add(key)
                except Exception as e:
                    print(f"⚠️  Ошибка чтения {file_path}: {e}")
    
    return used_keys

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}

def save_json(path, data):
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
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
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        current[parts[-1]] = value
    return result

def map_namespace_to_file(namespace):
    """Маппинг namespace к файлу"""
    # Прямые маппинги
    direct_map = {
        'common': 'common.json',
        'stats': 'public/About.json',
        'cta': 'public/About.json',
    }
    
    if namespace in direct_map:
        return direct_map[namespace]
    
    # Если namespace содержит /, это уже путь к файлу
    if '/' in namespace:
        return f"{namespace}.json"
    
    # Пытаемся найти в admin
    admin_file = f"admin/{namespace.capitalize()}.json"
    if os.path.exists(os.path.join(str(LOCALES_DIR), SOURCE_LANG, admin_file)):
        return admin_file
    
    # Пытаемся найти в других папках
    for folder in ['manager', 'employee', 'public', 'auth', 'layouts', 'components']:
        file_path = f"{folder}/{namespace.capitalize()}.json"
        if os.path.exists(os.path.join(str(LOCALES_DIR), SOURCE_LANG, file_path)):
            return file_path
    
    return None

def sync_locale_files():
    """Синхронизирует файлы локализации с кодом"""
    print("🔄 Синхронизация файлов локализации...\n")
    
    # Находим используемые ключи
    used_keys = find_translation_keys_in_code()
    
    print(f"\n📊 Найдено {len(used_keys)} namespace с ключами:")
    for ns, keys in sorted(used_keys.items()):
        print(f"  • {ns}: {len(keys)} ключей")
    
    print("\n" + "="*80)
    print("🧹 ОЧИСТКА НЕИСПОЛЬЗУЕМЫХ КЛЮЧЕЙ")
    print("="*80)
    
    total_removed = 0
    total_kept = 0
    
    # Обрабатываем каждый namespace
    for namespace, keys in sorted(used_keys.items()):
        file_path = map_namespace_to_file(namespace)
        
        if not file_path:
            print(f"\n⚠️  Namespace '{namespace}' - файл не найден")
            continue
        
        print(f"\n📝 {namespace} → {file_path}")
        
        # Обрабатываем для каждого языка
        for lang_dir in os.listdir(LOCALES_DIR):
            lang_path = os.path.join(str(LOCALES_DIR), lang_dir)
            
            if not os.path.isdir(lang_path):
                continue
            
            locale_file = os.path.join(lang_path, file_path)
            
            if not os.path.exists(locale_file):
                continue
            
            # Загружаем файл
            data = load_json(locale_file)
            flat = flatten_dict(data)
            
            # Фильтруем только используемые ключи
            filtered = {}
            removed_keys = []
            
            for key in keys:
                if key in flat:
                    filtered[key] = flat[key]
                    total_kept += 1
                else:
                    # Ключ используется в коде, но отсутствует в локали
                    if lang_dir == SOURCE_LANG:
                        print(f"   ⚠️  {lang_dir}: ключ '{key}' используется в коде, но отсутствует в файле!")
            
            # Находим удаленные ключи
            for key in flat:
                if key not in keys:
                    removed_keys.append(key)
                    total_removed += 1
            
            if removed_keys:
                print(f"   🗑️  {lang_dir}: удалено {len(removed_keys)} неиспользуемых ключей")
                for key in removed_keys[:5]:  # Показываем первые 5
                    print(f"      - {key}")
                if len(removed_keys) > 5:
                    print(f"      ... и еще {len(removed_keys) - 5}")
            
            # Сохраняем обновленный файл
            if filtered:
                nested = unflatten_dict(filtered)
                save_json(locale_file, nested)
    
    print("\n" + "="*80)
    print("📊 ИТОГИ")
    print("="*80)
    print(f"✅ Сохранено ключей: {total_kept}")
    print(f"🗑️  Удалено неиспользуемых: {total_removed}")
    print("\n✨ Синхронизация завершена!")

if __name__ == '__main__':
    sync_locale_files()
