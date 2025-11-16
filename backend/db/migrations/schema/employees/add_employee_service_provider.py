"""
Миграция: Добавление поля is_service_provider для фильтрации мастеров
Это нужно чтобы исключить админов, директоров и других не обслуживающих клиентов
"""
import sqlite3
from core.config import DATABASE_NAME

def add_service_provider_fields():
    """Добавить поле is_service_provider в таблицу employees"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем есть ли уже поле
        c.execute("PRAGMA table_info(employees)")
        columns = [row[1] for row in c.fetchall()]

        if 'is_service_provider' not in columns:
            print("➕ Добавляю поле is_service_provider...")
            c.execute("ALTER TABLE employees ADD COLUMN is_service_provider INTEGER DEFAULT 1")

            # Отмечаем Турсунай как не обслуживающий персонал (владелец/админ)
            c.execute("""
                UPDATE employees
                SET is_service_provider = 0
                WHERE full_name = 'Tursunay'
            """)

            print("✅ Поле is_service_provider добавлено!")
            print("✅ Турсунай отмечена как администратор (не мастер)")
        else:
            print("ℹ️  Поле is_service_provider уже существует")

        conn.commit()

    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("🔧 МИГРАЦИЯ: Фильтрация обслуживающего персонала")
    print("=" * 70)
    add_service_provider_fields()
    print("=" * 70)
