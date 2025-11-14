"""
Добавление колонок hours_weekdays и hours_weekends в salon_settings
"""
import sqlite3
import os

# Get database path
DATABASE_NAME = "salon_bot.db"

def add_hours_weekdays_weekends():
    """Добавить колонки для часов работы будни/выходные"""

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем есть ли уже эти колонки
        c.execute("PRAGMA table_info(salon_settings)")
        columns = [row[1] for row in c.fetchall()]

        if 'hours_weekdays' not in columns:
            print("  ➕ Добавляю колонку hours_weekdays...")
            c.execute("ALTER TABLE salon_settings ADD COLUMN hours_weekdays TEXT")
            # Копируем данные из hours если они есть
            c.execute("UPDATE salon_settings SET hours_weekdays = hours WHERE hours_weekdays IS NULL")
            print("     ✅ hours_weekdays добавлена")
        else:
            print("  ✓ hours_weekdays уже существует")

        if 'hours_weekends' not in columns:
            print("  ➕ Добавляю колонку hours_weekends...")
            c.execute("ALTER TABLE salon_settings ADD COLUMN hours_weekends TEXT")
            # По умолчанию выходные = будни
            c.execute("UPDATE salon_settings SET hours_weekends = hours WHERE hours_weekends IS NULL")
            print("     ✅ hours_weekends добавлена")
        else:
            print("  ✓ hours_weekends уже существует")

        conn.commit()
        print("✅ Миграция завершена успешно")
        return True

    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    add_hours_weekdays_weekends()
