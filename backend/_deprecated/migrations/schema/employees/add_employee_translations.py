"""
Миграция: Добавить переводы имён мастеров
"""
import sqlite3
import sys
import os

# Добавляем путь к backend
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..', '..', '..', '..'))
sys.path.insert(0, backend_dir)

from core.config import DATABASE_NAME
from utils.translator import auto_translate_name

def add_employee_translations():
    """Добавить поля name_ru и name_ar для мастеров с автоматическим переводом"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Проверяем существуют ли поля
    c.execute("PRAGMA table_info(employees)")
    columns = [col[1] for col in c.fetchall()]

    if 'name_ru' not in columns:
        print("➕ Добавляем поле name_ru")
        c.execute("ALTER TABLE employees ADD COLUMN name_ru TEXT")

    if 'name_ar' not in columns:
        print("➕ Добавляем поле name_ar")
        c.execute("ALTER TABLE employees ADD COLUMN name_ar TEXT")

    # Получаем всех мастеров
    c.execute("SELECT id, full_name, name_ru, name_ar FROM employees WHERE is_active = 1")
    employees = c.fetchall()

    print("\n🌍 АВТОМАТИЧЕСКИЙ ПЕРЕВОД ИМЁН:")
    print("-" * 70)

    # Автоматически переводим имена для всех мастеров
    for emp_id, full_name, current_ru, current_ar in employees:
        # Если переводы уже есть, пропускаем
        if current_ru and current_ar:
            print(f"   ⏭️  {full_name}: переводы уже существуют")
            continue

        # Получаем автоматический перевод
        translations = auto_translate_name(full_name)

        # Обновляем только если переводов нет
        c.execute("""
            UPDATE employees
            SET name_ru = ?, name_ar = ?
            WHERE id = ? AND (name_ru IS NULL OR name_ar IS NULL)
        """, (translations['ru'], translations['ar'], emp_id))

        if c.rowcount > 0:
            print(f"   ✅ {full_name} → ru={translations['ru']}, ar={translations['ar']}")

    conn.commit()
    
    # Проверяем результат
    c.execute("""
        SELECT full_name, name_ru, name_ar 
        FROM employees 
        WHERE is_active = 1
    """)
    
    print("\n📋 Результат:")
    for name, name_ru, name_ar in c.fetchall():
        print(f"   {name}: ru={name_ru}, ar={name_ar}")
    
    conn.close()
    return True


if __name__ == "__main__":
    print("=" * 70)
    print("🌍 ДОБАВЛЕНИЕ ПЕРЕВОДОВ ИМЁН МАСТЕРОВ")
    print("=" * 70)
    
    success = add_employee_translations()
    
    if success:
        print("\n✅ УСПЕХ! Переводы добавлены")
    else:
        print("\n❌ ОШИБКА!")
    
    print("=" * 70)