#!/usr/bin/env python3
"""
Скрипт для удаления критичных хардкодов-дефолтов из проекта

Удаляет дезинформирующие дефолтные значения:
- Телефоны (+971526961100)
- Email (mladiamontuae@gmail.com)
- Названия салона (M Le Diamant)
- Адреса (JBR, Dubai)

После удаления эти значения ДОЛЖНЫ быть в БД, иначе будет ошибка.
"""
import sys
import os
import re

# Добавляем backend в путь
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def remove_hardcoded_defaults():
    """Удалить все критичные дефолты"""
    
    changes = []
    
    # 1. db/settings.py - удалить дефолты в get_salon_settings()
    print("=" * 80)
    print("1. Обработка db/settings.py")
    print("=" * 80)
    
    file_path = "db/settings.py"
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Удаляем дефолты из get_salon_settings
    replacements = [
        # Телефон
        (r'"phone":\s*"\+971526961100"', '"phone": row_dict.get("phone")'),
        (r'row_dict\.get\("phone",\s*"\+971526961100"\)', 'row_dict.get("phone")'),
        
        # Email
        (r'"email":\s*"mladiamontuae@gmail\.com"', '"email": row_dict.get("email")'),
        (r'row_dict\.get\("email",\s*"mladiamontuae@gmail\.com"\)', 'row_dict.get("email")'),
        
        # Название салона
        (r'"name":\s*"M\.Le Diamant Beauty Lounge"', '"name": row_dict.get("name")'),
        (r'row_dict\.get\("name",\s*"M\.Le Diamant Beauty Lounge"\)', 'row_dict.get("name")'),
        
        # Bot name
        (r'row_dict\.get\("bot_name",\s*"M\.Le Diamant Assistant"\)', 'row_dict.get("bot_name")'),
        
        # Часы работы (оставляем как есть - это разумный дефолт)
        # (r'row_dict\.get\("hours_weekdays",\s*"10:30 - 21:00"\)', 'row_dict.get("hours_weekdays")'),
    ]
    
    for pattern, replacement in replacements:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            changes.append(f"  ✅ {file_path}: {pattern[:40]}... → {replacement[:40]}...")
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Обновлён {file_path}")
    else:
        print(f"ℹ️  {file_path} - изменений не требуется")
    
    # 2. scheduler/birthday_checker.py
    print("\n" + "=" * 80)
    print("2. Обработка scheduler/birthday_checker.py")
    print("=" * 80)
    
    file_path = "scheduler/birthday_checker.py"
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    replacements = [
        (r"salon_settings\.get\('name',\s*'M\.Le Diamant Beauty Lounge'\)", "salon_settings.get('name')"),
        (r"salon_settings\.get\('address',\s*'JBR, Dubai'\)", "salon_settings.get('address')"),
    ]
    
    for pattern, replacement in replacements:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            changes.append(f"  ✅ {file_path}: удалён дефолт")
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Обновлён {file_path}")
    else:
        print(f"ℹ️  {file_path} - изменений не требуется")
    
    # 3. scheduler/booking_reminder_checker.py
    print("\n" + "=" * 80)
    print("3. Обработка scheduler/booking_reminder_checker.py")
    print("=" * 80)
    
    file_path = "scheduler/booking_reminder_checker.py"
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    replacements = [
        (r"salon_settings\.get\('name',\s*'M\.Le Diamant Beauty Lounge'\)", "salon_settings.get('name')"),
        (r"salon_settings\.get\('address',\s*'JBR, Dubai'\)", "salon_settings.get('address')"),
        (r"salon_settings\.get\('phone',\s*'\+971 52 696 1100'\)", "salon_settings.get('phone')"),
    ]
    
    for pattern, replacement in replacements:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            changes.append(f"  ✅ {file_path}: удалён дефолт")
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Обновлён {file_path}")
    else:
        print(f"ℹ️  {file_path} - изменений не требуется")
    
    # 4. seo_metadata.py
    print("\n" + "=" * 80)
    print("4. Обработка seo_metadata.py")
    print("=" * 80)

    seo_candidates = [
        "crm_api/seo_metadata.py",
        "api/seo_metadata.py",
    ]
    file_path = None
    for candidate in seo_candidates:
        if os.path.exists(candidate):
            file_path = candidate
            break

    if file_path is None:
        print("ℹ️  seo_metadata.py не найден - этап пропущен")
    else:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Удаляем дефолт для phone
        pattern = r'"phone":\s*salon\.get\(\'phone\',\s*\'\+971526961100\'\)'
        replacement = '"phone": salon.get(\'phone\')'

        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            changes.append(f"  ✅ {file_path}: удалён дефолт phone")

        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Обновлён {file_path}")
        else:
            print(f"ℹ️  {file_path} - изменений не требуется")
    
    # Итоги
    print("\n" + "=" * 80)
    print("ИТОГИ")
    print("=" * 80)
    print(f"Всего изменений: {len(changes)}")
    for change in changes:
        print(change)
    
    print("\n" + "=" * 80)
    print("✅ ВСЕ КРИТИЧНЫЕ ДЕФОЛТЫ УДАЛЕНЫ!")
    print("=" * 80)
    print()
    print("⚠️  ВАЖНО:")
    print("   Теперь эти значения ДОЛЖНЫ быть в БД salon_settings:")
    print("   - name")
    print("   - phone")
    print("   - email")
    print("   - address")
    print("   - bot_name")
    print()
    print("   Если их нет - будет ошибка (это правильно!)")
    print()

if __name__ == "__main__":
    # Проверяем что запускаем из backend/
    if not os.path.exists("db/settings.py"):
        print("❌ Ошибка: запустите скрипт из директории backend/")
        print("   cd backend && python3 scripts/maintenance/remove_hardcoded_defaults.py")
        sys.exit(1)
    
    print("🔧 Удаление критичных хардкодов-дефолтов")
    print()
    
    # Подтверждение
    response = input("Продолжить? (yes/no): ")
    if response.lower() not in ['yes', 'y', 'да']:
        print("Отменено")
        sys.exit(0)
    
    remove_hardcoded_defaults()
