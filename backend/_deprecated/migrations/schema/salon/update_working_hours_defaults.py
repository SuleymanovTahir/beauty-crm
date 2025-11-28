#!/usr/bin/env python3
"""
Миграция: Обновление DEFAULT значений часов работы на 10:30 - 21:30
"""
import sqlite3
import sys
import os

# Добавляем путь к backend
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..', '..', '..', '..'))
sys.path.insert(0, backend_dir)

from core.config import DATABASE_NAME


def update_working_hours_defaults():
    """Обновить DEFAULT значения часов работы в salon_settings"""
    print("🔧 Обновление DEFAULT значений часов работы...")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Проверяем существование таблицы
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='salon_settings'")
        if not c.fetchone():
            print("   ⚠️  Таблица salon_settings не существует, пропускаем")
            return True
        
        # SQLite не поддерживает ALTER COLUMN для изменения DEFAULT
        # Поэтому мы просто обновляем существующие данные
        c.execute("""
            UPDATE salon_settings 
            SET hours_weekdays = '10:30 - 21:30',
                hours_weekends = '10:30 - 21:30',
                hours = 'Daily 10:30 - 21:30',
                hours_ru = 'Ежедневно 10:30 - 21:30',
                hours_ar = 'يوميًا 10:30 - 21:30'
            WHERE id = 1
        """)
        
        rows_updated = c.rowcount
        conn.commit()
        
        if rows_updated > 0:
            print(f"   ✅ Обновлено {rows_updated} записей с правильными часами работы (10:30 - 21:30)")
        else:
            print("   ℹ️  Нет записей для обновления")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    success = update_working_hours_defaults()
    sys.exit(0 if success else 1)
