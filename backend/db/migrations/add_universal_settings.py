"""
Миграция: Добавление универсальных настроек
Делает систему полностью универсальной для любого бизнеса
"""
import sqlite3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from core.config import DATABASE_NAME


def migrate():
    """Добавить универсальные колонки в salon_settings"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    print("=" * 70)
    print("🌍 МИГРАЦИЯ: Универсальные настройки")
    print("=" * 70)

    # Получаем текущие колонки
    c.execute("PRAGMA table_info(salon_settings)")
    columns = [row[1] for row in c.fetchall()]

    # Добавляем недостающие колонки
    new_columns = {
        'currency_name_ru': "TEXT DEFAULT 'дирхам'",
        'currency_name_en': "TEXT DEFAULT 'dirham'",
        'currency_name_ar': "TEXT DEFAULT 'درهم'",
        'location': "TEXT DEFAULT 'JBR'",  # Район/локация (например JBR, Downtown, Marina)
        'currency_symbol': "TEXT DEFAULT 'AED'",  # Символ валюты
    }

    for column_name, column_type in new_columns.items():
        if column_name not in columns:
            try:
                c.execute(f"ALTER TABLE salon_settings ADD COLUMN {column_name} {column_type}")
                print(f"✅ Добавлена колонка: {column_name}")
            except Exception as e:
                print(f"⚠️  Ошибка при добавлении {column_name}: {e}")

    # Устанавливаем дефолтные значения для существующих записей
    try:
        c.execute("""
            UPDATE salon_settings SET
                currency_name_ru = COALESCE(currency_name_ru, 'дирхам'),
                currency_name_en = COALESCE(currency_name_en, 'dirham'),
                currency_name_ar = COALESCE(currency_name_ar, 'درهم'),
                location = COALESCE(location, 'JBR'),
                currency_symbol = COALESCE(currency_symbol, currency)
            WHERE id = 1
        """)
        print("✅ Дефолтные значения установлены")
    except Exception as e:
        print(f"⚠️  Ошибка при установке значений: {e}")

    conn.commit()
    conn.close()

    print("=" * 70)
    print("✅ Миграция завершена")
    print("=" * 70)


if __name__ == "__main__":
    migrate()
