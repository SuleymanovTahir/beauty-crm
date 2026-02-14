#!/usr/bin/env python3
"""
Скрипт для исправления всех dict(row) на правильный формат для PostgreSQL
"""
import os
import re
from pathlib import Path

# Файлы для исправления
BACKEND_DIR = Path(__file__).resolve().parents[2]
files_to_fix = [
    str(BACKEND_DIR / "api" / "schedule.py"),
    str(BACKEND_DIR / "api" / "salary.py"),
    str(BACKEND_DIR / "api" / "public_admin.py"),
]

def fix_dict_row_in_file(filepath):
    """Исправить dict(row) в файле"""
    print(f"\n🔧 Исправляю {os.path.basename(filepath)}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changes = 0
    
    # Паттерн 1: [dict(row) for row in c.fetchall()]
    pattern1 = r'\[dict\(row\) for row in (c\.fetchall\(\)|rows)\]'
    if re.search(pattern1, content):
        # Нужно добавить получение колонок перед этим
        print("  ⚠️  Найден паттерн [dict(row) for row in ...]")
        print("  ℹ️  Требуется ручное исправление - нужно добавить получение column_names")
        changes += len(re.findall(pattern1, content))
    
    if changes > 0:
        print(f"  ✅ Найдено {changes} мест для исправления")
        return True
    else:
        print("  ✓ Исправлений не требуется")
        return False

if __name__ == "__main__":
    print("=" * 70)
    print("🔍 ПОИСК dict(row) ПРОБЛЕМ")
    print("=" * 70)
    
    total_files_need_fix = 0
    
    for filepath in files_to_fix:
        if os.path.exists(filepath):
            if fix_dict_row_in_file(filepath):
                total_files_need_fix += 1
        else:
            print(f"⚠️  Файл не найден: {filepath}")
    
    print("\n" + "=" * 70)
    print(f"📊 ИТОГО: {total_files_need_fix} файлов требуют исправления")
    print("=" * 70)
    
    print("\n💡 РЕКОМЕНДАЦИЯ:")
    print("Замените [dict(row) for row in c.fetchall()] на:")
    print("  columns = [desc[0] for desc in c.description]")
    print("  rows = c.fetchall()")
    print("  return [dict(zip(columns, row)) for row in rows]")
