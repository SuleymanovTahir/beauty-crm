#!/usr/bin/env python3
"""
Запуск миграции link_employees_positions
"""
import sys
import os

# Убеждаемся что мы в правильной директории
os.chdir(os.path.dirname(__file__))

from db.migrations.schema.employees.link_employees_positions import link_employees_positions

if __name__ == "__main__":
    print("=" * 70)
    print("🔧 МИГРАЦИЯ: Связывание employees и positions")
    print("=" * 70)
    result = link_employees_positions()
    print("=" * 70)
    if result:
        print("✅ Миграция успешно выполнена!")
    else:
        print("❌ Миграция завершилась с ошибками")
    print("=" * 70)
