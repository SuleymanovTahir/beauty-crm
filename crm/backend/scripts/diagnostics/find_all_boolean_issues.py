#!/usr/bin/env python3
"""
Расширенный скрипт для поиска ВСЕХ boolean integers включая INSERT VALUES
"""
import os
import re
from pathlib import Path

def find_all_boolean_issues(root_dir):
    """Найти ВСЕ проблемы с boolean integers"""
    
    # Boolean поля
    boolean_fields = [
        'is_active', 'is_service_provider', 'is_online_booking_enabled',
        'is_calendar_enabled', 'email_verified', 'is_read', 'is_subscribed',
        'manager_consultation_enabled', 'show_on_public_page', 'privacy_accepted',
        'newsletter_subscribed', 'is_confirmed', 'is_cancelled', 'is_completed',
        'is_enabled', 'is_position_plan', 'approved', 'email_sent',
        'email_notifications', 'sms_notifications', 'booking_notifications',
        'birthday_reminders'
    ]
    
    results = []
    
    for py_file in Path(root_dir).rglob('*.py'):
        if 'venv' in str(py_file) or '__pycache__' in str(py_file):
            continue
            
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
                
                for line_num, line in enumerate(lines, 1):
                    if line.strip().startswith('#'):
                        continue
                    
                    # Паттерн 1: field = 1 или field = 0
                    for field in boolean_fields:
                        if re.search(rf'\b{field}\s*=\s*[01]\b', line):
                            if any(kw in line.upper() for kw in ['WHERE', 'SET', 'AND', 'OR']):
                                results.append({
                                    'file': str(py_file.relative_to(root_dir)),
                                    'line': line_num,
                                    'content': line.strip(),
                                    'type': 'comparison'
                                })
                    
                    # Паттерн 2: VALUES (..., 1, ...) или VALUES (..., 0, ...)
                    if 'VALUES' in line.upper():
                        # Ищем паттерны вроде ", 1)" или ", 0," или ", 1,"
                        if re.search(r',\s*[01]\s*[,)]', line):
                            results.append({
                                'file': str(py_file.relative_to(root_dir)),
                                'line': line_num,
                                'content': line.strip(),
                                'type': 'insert_values'
                            })
        except Exception as e:
            pass
    
    return results

def main():
    backend_dir = Path(__file__).parent.parent.parent
    
    print("🔍 РАСШИРЕННЫЙ ПОИСК boolean integers...")
    print("=" * 80)
    
    results = find_all_boolean_issues(backend_dir)
    
    if not results:
        print("✅ Не найдено проблемных мест!")
        return
    
    print(f"\n⚠️  Найдено {len(results)} потенциальных проблем:\n")
    
    # Группируем по файлам
    by_file = {}
    for r in results:
        if r['file'] not in by_file:
            by_file[r['file']] = []
        by_file[r['file']].append(r)
    
    for file_path, issues in sorted(by_file.items()):
        print(f"\n📄 {file_path}")
        print("-" * 80)
        for issue in issues:
            type_label = "❌ Сравнение" if issue['type'] == 'comparison' else "⚠️  INSERT VALUES"
            print(f"   Строка {issue['line']}: {type_label}")
            print(f"   {issue['content'][:120]}")
            print()
    
    print("=" * 80)
    print(f"\n📊 Итого: {len(results)} мест требуют проверки")

if __name__ == '__main__':
    main()
