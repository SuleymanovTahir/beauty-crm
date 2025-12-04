#!/usr/bin/env python3
"""
Скрипт для удаления неиспользуемых импортов sqlite3 из всех файлов
"""
import os
import re
from pathlib import Path

def remove_sqlite3_imports(root_dir: str):
    """Удалить неиспользуемые импорты sqlite3"""
    
    backend_dir = Path(root_dir)
    py_files = list(backend_dir.rglob('*.py'))
    
    # Исключаем некоторые директории
    excluded = ['venv', '__pycache__', '.git', 'node_modules', 'scripts/maintenance']
    
    modified_files = []
    
    for filepath in py_files:
        # Пропускаем excluded директории
        if any(part in filepath.parts for part in excluded):
            continue
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Удаляем строку import sqlite3 (только если это отдельная строк а импорта)
            # Паттерн: начало строки + возможные пробелы + import sqlite3 + возможный комментарий + конец строки
            content = re.sub(r'^(\s*)import sqlite3(\s*#.*)?$', '', content, flags=re.MULTILINE)
            
            # Удаляем пустые строки которые остались после удаления импорта (но только если их несколько подряд)
            content = re.sub(r'\n\n\n+', '\n\n', content)
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                modified_files.append(str(filepath.relative_to(backend_dir)))
                print(f"✅ Удален импорт sqlite3 из: {filepath.relative_to(backend_dir)}")
        
        except Exception as e:
            print(f"❌ Ошибка при обработке {filepath}: {e}")
    
    print(f"\n📊 ИТОГО:")
    print(f"Обработано файлов: {len(py_files)}")
    print(f"Изменено файлов: {len(modified_files)}")
    
    if modified_files:
        print(f"\n📝 Измененные файлы:")
        for f in modified_files:
            print(f"  - {f}")

if __name__ == '__main__':
    backend_dir = Path(__file__).parent.parent.parent
    print(f"🔍 Сканирование: {backend_dir}\n")
    remove_sqlite3_imports(backend_dir)
    print(f"\n✅ Готово!")
