#!/usr/bin/env python3
"""
Скрипт для восстановления структуры папок локалей.
Перемещает файлы из корня языковой папки в соответствующие подпапки (admin, public, etc.),
основываясь на известной структуре.
"""

import os
import shutil
import json

# Конфигурация
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend/src/locales')
LANGUAGES = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']

# Карта соответствия файлов и папок (lowercase filename -> folder)
# Мы знаем правильную структуру из i18n.ts или просто хардкодим основные
FILE_MAPPING = {
    # Admin
    'analytics.json': 'admin',
    'bookingdetail.json': 'admin',
    'bookings.json': 'admin',
    'botsettings.json': 'admin',
    'calendar.json': 'admin',
    'clientdetail.json': 'admin',
    'clients.json': 'admin',
    'createuser.json': 'admin',
    'dashboard.json': 'admin', # Конфликт с manager/dashboard и employee/dashboard?
    'edituser.json': 'admin',
    'permissionmanagement.json': 'admin',
    'permissionstab.json': 'admin',
    'plans.json': 'admin',
    'services.json': 'admin',
    'settings.json': 'admin', # Конфликт с manager/settings
    'specialpackages.json': 'admin',
    'users.json': 'admin',
    'broadcasts.json': 'admin',

    # Manager
    'chat.json': 'manager',
    'funnel.json': 'manager',
    'messages.json': 'manager',
    
    # Auth
    'forgotpassword.json': 'auth',
    'login.json': 'auth',
    'register.json': 'auth',
    
    # Public
    'about.json': 'public',
    'contacts.json': 'public',
    'cooperation.json': 'public',
    'datadeletion.json': 'public',
    'faq.json': 'public',
    'home.json': 'public',
    'pricelist.json': 'public',
    'privacypolicy.json': 'public',
    'public.json': 'public',
    'success.json': 'public',
    'terms.json': 'public',
    'usercabinet.json': 'public',
    
    # Components
    'employeelayout.json': 'components', # Или layouts? В i18n.ts это layouts
    'languageswitcher.json': 'components',
    'publiclanguageswitcher.json': 'components',
    
    # Layouts
    'adminlayout.json': 'layouts',
    'managerlayout.json': 'layouts',
    'publiclayout.json': 'layouts',
    
    # Common
    'common.json': '.', # Оставляем в корне
    'admin-components.json': '.', # Оставляем?
    'components.json': '.',
    'cta.json': '.',
    'stats.json': '.'
}

# Уточнение для конфликтующих имен
# dashboard.json -> admin/Dashboard.json, manager/Dashboard.json, employee/Dashboard.json
# settings.json -> admin/Settings.json, manager/Settings.json
# profile.json -> employee/Profile.json

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}

def save_json(path, data):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
    except Exception as e:
        print(f"Error saving {path}: {e}")

def restore_structure():
    print(f"🔧 Восстановление структуры папок в {LOCALES_DIR}")
    
    for lang in LANGUAGES:
        lang_dir = os.path.join(LOCALES_DIR, lang)
        if not os.path.exists(lang_dir):
            continue
            
        print(f"  🌍 Обработка {lang}...")
        
        # Получаем список файлов в корне языковой папки
        files = [f for f in os.listdir(lang_dir) if os.path.isfile(os.path.join(lang_dir, f)) and f.endswith('.json')]
        
        for filename in files:
            lower_name = filename.lower()
            
            # Пропускаем файлы, которые должны быть в корне
            if lower_name in ['common.json', 'admin-components.json', 'components.json', 'cta.json', 'stats.json']:
                continue
                
            # Определяем целевую папку
            target_folder = FILE_MAPPING.get(lower_name)
            
            # Особая логика для конфликтующих файлов
            if lower_name == 'dashboard.json':
                # Сложный случай. i18n:extract мог свалить все ключи в один файл dashboard.json
                # Или это admin dashboard?
                # По умолчанию считаем admin, но нужно проверить ключи
                target_folder = 'admin' 
                # TODO: Можно анализировать содержимое и раскидывать
            elif lower_name == 'settings.json':
                target_folder = 'admin'
            elif lower_name == 'profile.json':
                target_folder = 'employee'
            elif lower_name == 'employeelayout.json':
                target_folder = 'layouts' # В i18n.ts это layouts/EmployeeLayout
            
            if target_folder:
                # Целевой путь (с учетом PascalCase, если файл уже есть там)
                # Пытаемся найти существующий файл в целевой папке, чтобы узнать правильный регистр имени
                target_dir_path = os.path.join(lang_dir, target_folder)
                if not os.path.exists(target_dir_path):
                    os.makedirs(target_dir_path)
                    
                # Ищем файл в целевой папке (case-insensitive)
                existing_files = os.listdir(target_dir_path)
                target_filename = filename # По умолчанию сохраняем имя
                
                for existing in existing_files:
                    if existing.lower() == lower_name:
                        target_filename = existing
                        break
                
                # Если файл не найден, пробуем PascalCase для известных
                if target_filename == filename:
                    # Простая эвристика: первая буква заглавная
                    # Или используем карту правильных имен
                    pass

                source_path = os.path.join(lang_dir, filename)
                dest_path = os.path.join(target_dir_path, target_filename)
                
                # Если файл уже есть в целевой папке, нужно объединить?
                # i18n:extract мог создать новый файл в корне с новыми ключами, а старый файл в папке остался старым.
                # Или наоборот.
                # Скорее всего, в корне лежит то, что экстрактор нашел.
                # Лучше объединить: взять ключи из корневого файла и добавить/обновить в целевой.
                
                if os.path.exists(dest_path):
                    print(f"    🔄 Объединение {filename} -> {target_folder}/{target_filename}")
                    source_data = load_json(source_path)
                    dest_data = load_json(dest_path)
                    
                    # Обновляем целевой файл данными из корневого (так как экстрактор свежий)
                    # НО: экстрактор мог затереть переводы пустыми строками?
                    # Если в source (root) пусто, а в dest (folder) есть перевод - оставляем dest.
                    # Если в source есть перевод (или ключ), а в dest нет - берем source.
                    
                    updated = False
                    for k, v in source_data.items():
                        if k not in dest_data:
                            dest_data[k] = v
                            updated = True
                        elif not dest_data[k] and v: # Если в целевом пусто, а в новом есть
                            dest_data[k] = v
                            updated = True
                        # Если и там и там есть, оставляем старый (вдруг экстрактор затер)
                        
                    if updated:
                        save_json(dest_path, dest_data)
                    
                    # Удаляем корневой файл
                    os.remove(source_path)
                else:
                    print(f"    🚚 Перемещение {filename} -> {target_folder}/{target_filename}")
                    os.rename(source_path, dest_path)

    print("\n✅ Готово!")

if __name__ == '__main__':
    restore_structure()
