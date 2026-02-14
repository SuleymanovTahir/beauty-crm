#!/usr/bin/env python3
"""
Автоматическое исправление ВСЕХ boolean integer проблем
"""
import os
import re
from pathlib import Path

def fix_file(file_path):
    """Исправить boolean integers в файле"""
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        changes = []
        
        # Boolean поля
        boolean_fields = [
            'is_active', 'is_service_provider', 'is_online_booking_enabled',
            'is_calendar_enabled', 'email_verified', 'is_read', 'is_subscribed',
            'manager_consultation_prompt', 'show_on_public_page', 'privacy_accepted',
            'newsletter_subscribed', 'is_confirmed', 'is_cancelled', 'is_completed',
            'is_enabled', 'is_position_plan', 'approved', 'email_sent',
            'email_notifications', 'sms_notifications', 'booking_notifications',
            'birthday_reminders'
        ]
        
        # Исправляем = 1 и = 0
        for field in boolean_fields:
            pattern1 = re.compile(rf'(\b{field}\s*=\s*)1\b')
            pattern2 = re.compile(rf'(\b{field}\s*=\s*)0\b')
            
            count1 = len(pattern1.findall(content))
            count2 = len(pattern2.findall(content))
            
            if count1 > 0:
                content = pattern1.sub(r'\1TRUE', content)
                changes.append(f"{field} = 1 → TRUE ({count1}x)")
            
            if count2 > 0:
                content = pattern2.sub(r'\1FALSE', content)
                changes.append(f"{field} = 0 → FALSE ({count2}x)")
        
        # Сохраняем если были изменения
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return changes
        
        return []
        
    except Exception as e:
        print(f"❌ Ошибка в {file_path}: {e}")
        return []

def main():
    backend_dir = Path(__file__).parent.parent.parent
    
    # Файлы для исправления (из результатов сканирования)
    files_to_fix = [
        'api/internal_chat.py',
        'api/user_management.py',
        'db/plans.py',
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
        
        changes = fix_file(file_path)
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
