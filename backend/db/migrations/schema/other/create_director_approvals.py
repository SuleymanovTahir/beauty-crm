"""
Миграция: создание таблицы director_approvals для подтверждения новых директоров
"""
import sqlite3
from core.config import DATABASE_NAME

def create_director_approvals_table():
    """
    Создать таблицу для хранения заявок на становление директором

    Логика: при создании нового пользователя с ролью director:
    - Если директоров нет - создается сразу
    - Если 1 директор - нужно подтверждение от него
    - Если 2+ директора - нужно подтверждение от всех существующих
    """

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем, есть ли уже таблица
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='director_approvals'")
        if c.fetchone():
            print("⏭️  Таблица director_approvals уже существует")
            conn.close()
            return

        print("🔐 Создание таблицы director_approvals...")

        c.execute("""
            CREATE TABLE IF NOT EXISTS director_approvals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                total_directors_needed INTEGER NOT NULL,
                approved_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                completed_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Таблица для хранения индивидуальных подтверждений от каждого директора
        c.execute("""
            CREATE TABLE IF NOT EXISTS director_approval_votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                approval_id INTEGER NOT NULL,
                director_id INTEGER NOT NULL,
                approved BOOLEAN NOT NULL,
                voted_at TEXT NOT NULL,
                FOREIGN KEY (approval_id) REFERENCES director_approvals(id),
                FOREIGN KEY (director_id) REFERENCES users(id),
                UNIQUE(approval_id, director_id)
            )
        """)

        conn.commit()
        print("✅ Таблицы director_approvals и director_approval_votes созданы")

    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_director_approvals_table()
