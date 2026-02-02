#!/usr/bin/env python3
"""
Скрипт для поиска INSERT запросов с неправильными значениями для BOOLEAN полей
"""
import os
import re
from pathlib import Path

def find_boolean_issues():
    """Найти все проблемные INSERT запросы"""
    
    backend_dir = Path(__file__).parent.parent.parent
    
    # Паттерны для поиска
    # Ищем INSERT с is_visible, is_active и другими BOOLEAN полями, где используются числа
    patterns = [
        (r'INSERT INTO.*?is_visible.*?VALUES.*?\(.*?,\s*(\d+)\s*\)', 'is_visible with integer'),
        (r'INSERT INTO.*?is_active.*?VALUES.*?\(.*?,\s*(\d+)\s*\)', 'is_active with integer'),
        (r'VALUES.*?\(.*?,\s*(\d+),\s*(\d+)\s*\)', 'multiple integers in VALUES (possible booleans)'),
    ]
    
    issues = []
    
    # Ищем во всех Python файлах
    for py_file in backend_dir.rglob('*.py'):
        if 'venv' in str(py_file) or '__pycache__' in str(py_file):
            continue
            
        try:
            content = py_file.read_text()
            lines = content.split('\n')
            
            for line_num, line in enumerate(lines, 1):
                # Пропускаем комментарии
                if line.strip().startswith('#'):
                    continue
                    
                for pattern, description in patterns:
                    if re.search(pattern, line, re.IGNORECASE):
                        issues.append({
                            'file': str(py_file.relative_to(backend_dir)),
                            'line': line_num,
                            'content': line.strip(),
                            'issue': description
                        })
        except Exception as e:
            pass
    
    return issues

if __name__ == '__main__':
    print("🔍 Поиск проблемных INSERT запросов с BOOLEAN полями...\n")
    
    issues = find_boolean_issues()
    
    if not issues:
        print("✅ Проблем не найдено!")
    else:
        print(f"⚠️  Найдено {len(issues)} потенциальных проблем:\n")
        
        for issue in issues:
            print(f"📁 {issue['file']}:{issue['line']}")
            print(f"   {issue['issue']}")
            print(f"   {issue['content'][:100]}...")
            print()
