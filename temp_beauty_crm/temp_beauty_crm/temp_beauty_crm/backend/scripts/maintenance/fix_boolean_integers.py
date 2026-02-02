#!/usr/bin/env python3
"""
Скрипт для автоматического исправления boolean integers в SQL запросах
"""
import os
import re
from pathlib import Path

def fix_boolean_integers(file_path):
    """Исправить boolean integers в файле"""
    
    # Известные boolean поля
    boolean_fields = [
        'is_active', 'is_service_provider', 'is_online_booking_enabled',
        'is_calendar_enabled', 'email_verified', 'is_read', 'is_subscribed',
        'manager_consultation_enabled', 'show_on_public_page', 'privacy_accepted',
        'newsletter_subscribed', 'is_confirmed', 'is_cancelled', 'is_completed'
    ]
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes = []
        
        # Заменяем = 1 на = TRUE
        for field in boolean_fields:
            pattern1 = re.compile(rf'(\b{field}\s*=\s*)1\b')
            pattern2 = re.compile(rf'(\b{field}\s*=\s*)0\b')
            
            # Считаем замены
            count1 = len(pattern1.findall(content))
            count2 = len(pattern2.findall(content))
            
            if count1 > 0:
                content = pattern1.sub(r'\1TRUE', content)
                changes.append(f"{field} = 1 → TRUE ({count1}x)")
            
            if count2 > 0:
                content = pattern2.sub(r'\1FALSE', content)
                changes.append(f"{field} = 0 → FALSE ({count2}x)")
        
        # Если были изменения - сохраняем
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return changes
        
        return []
        
    except Exception as e:
        print(f"❌ Ошибка в {file_path}: {e}")
        return []

def main():
    backend_dir = Path(__file__).parent.parent.parent
    
    # Файлы для исправления (исключаем уже исправленные)
    files_to_fix = [
        'db/employees.py',
        'notifications/master_notifications.py',
        'scripts/diagnostics/check_db.py',
        'scripts/diagnostics/debug_availability.py',
        'scripts/testing/data/seed_full_data.py',
        'scripts/testing/data/seed_test_data.py',
        'scripts/translations/review_translations.py',
        'tests/comprehensive_test.py',
        'tests/test_gender_avatars.py',
        'tests/verify_bot_logic.py'
    ]
    
    print("🔧 Автоматическое исправление boolean integers...")
    print("=" * 80)
    
    total_files = 0
    total_changes = 0
    
    for file_rel in files_to_fix:
        file_path = backend_dir / file_rel
        if not file_path.exists():
            print(f"⚠️  Файл не найден: {file_rel}")
            continue
        
        changes = fix_boolean_integers(file_path)
        if changes:
            total_files += 1
            total_changes += len(changes)
            print(f"\n✅ {file_rel}")
            for change in changes:
                print(f"   • {change}")
    
    print("\n" + "=" * 80)
    print(f"📊 Итого: исправлено {total_changes} мест в {total_files} файлах")

if __name__ == '__main__':
    main()
