#!/usr/bin/env python3
"""
Скрипт для поиска всех мест где используется 1/0 вместо TRUE/FALSE в SQL запросах
"""
import os
import re
from pathlib import Path

def find_boolean_integer_comparisons(root_dir):
    """Найти все SQL запросы с = 1 или = 0 для boolean полей"""
    
    # Известные boolean поля в базе данных
    boolean_fields = [
        'is_active', 'is_service_provider', 'is_online_booking_enabled',
        'is_calendar_enabled', 'email_verified', 'is_read', 'is_subscribed',
        'manager_consultation_enabled', 'show_on_public_page', 'privacy_accepted',
        'newsletter_subscribed', 'is_confirmed', 'is_cancelled', 'is_completed'
    ]
    
    # Паттерны для поиска
    patterns = []
    for field in boolean_fields:
        patterns.append((
            re.compile(rf'{field}\s*=\s*1\b', re.IGNORECASE),
            f'{field} = TRUE'
        ))
        patterns.append((
            re.compile(rf'{field}\s*=\s*0\b', re.IGNORECASE),
            f'{field} = FALSE'
        ))
    
    results = []
    
    # Поиск в Python файлах
    for py_file in Path(root_dir).rglob('*.py'):
        # Пропускаем виртуальное окружение и кеш
        if 'venv' in str(py_file) or '__pycache__' in str(py_file) or '.git' in str(py_file):
            continue
            
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
                
                for line_num, line in enumerate(lines, 1):
                    # Пропускаем комментарии
                    if line.strip().startswith('#'):
                        continue
                    
                    for pattern, suggestion in patterns:
                        if pattern.search(line):
                            # Проверяем что это SQL запрос (содержит WHERE, SET, VALUES и т.д.)
                            if any(keyword in line.upper() for keyword in ['WHERE', 'SET', 'AND', 'OR', 'VALUES', 'SELECT']):
                                results.append({
                                    'file': str(py_file.relative_to(root_dir)),
                                    'line': line_num,
                                    'content': line.strip(),
                                    'suggestion': suggestion
                                })
        except Exception as e:
            pass
    
    return results

def main():
    backend_dir = Path(__file__).parent.parent.parent
    
    print("🔍 Поиск boolean полей с integer значениями (1/0)...")
    print("=" * 80)
    
    results = find_boolean_integer_comparisons(backend_dir)
    
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
            print(f"   Строка {issue['line']}:")
            print(f"   ❌ {issue['content'][:100]}")
            print(f"   ✅ Предложение: заменить на '{issue['suggestion']}'")
            print()
    
    print("=" * 80)
    print(f"\n📊 Итого: {len(results)} мест требуют проверки")
    print("\n⚠️  ВАЖНО: Проверьте каждое место вручную!")
    print("   Не все '= 1' означают boolean - может быть ID или счётчик!")

if __name__ == '__main__':
    main()
