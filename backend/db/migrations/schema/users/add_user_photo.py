"""
Миграция: добавление поля photo_url в таблицу users
"""
import sqlite3
from core.config import DATABASE_NAME

def add_user_photo_field():
    """Добавить поле photo_url для фото пользователя"""

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем, есть ли уже колонка
        c.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in c.fetchall()]

        if 'photo_url' not in columns:
            print("📸 Добавление поля photo_url в таблицу users...")
            c.execute("ALTER TABLE users ADD COLUMN photo_url TEXT")
            conn.commit()
            print("✅ Поле photo_url добавлено")
        else:
            print("⏭️  Поле photo_url уже существует")

    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    add_user_photo_field()
