"""
Миграция: Добавление системы клиентских аккаунтов
- Регистрация/вход для клиентов
- Восстановление пароля
- Дни рождения и уведомления
"""
import sqlite3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from core.config import DATABASE_NAME


def add_client_accounts():
    """Добавить систему клиентских аккаунтов"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    print("=" * 70)
    print("👥 МИГРАЦИЯ: Система клиентских аккаунтов")
    print("=" * 70)

    # Получаем текущие колонки clients
    c.execute("PRAGMA table_info(clients)")
    columns = [row[1] for row in c.fetchall()]

    # Добавляем недостающие колонки в таблицу clients
    new_columns = {
        'email': "TEXT",  # UNIQUE нельзя добавить в ALTER TABLE для существующей таблицы
        'password_hash': "TEXT",
        'birthday': "TEXT",  # Формат: YYYY-MM-DD
        'created_at': "TEXT",
        'last_login': "TEXT",
        'is_verified': "INTEGER DEFAULT 0",  # Email подтвержден
    }

    for column_name, column_type in new_columns.items():
        if column_name not in columns:
            try:
                c.execute(f"ALTER TABLE clients ADD COLUMN {column_name} {column_type}")
                print(f"✅ Добавлена колонка clients.{column_name}")
            except Exception as e:
                print(f"⚠️  Ошибка при добавлении {column_name}: {e}")

    # Создаем таблицу для токенов восстановления пароля
    try:
        c.execute('''CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_email TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0
        )''')
        print("✅ Создана таблица password_reset_tokens")
    except Exception as e:
        print(f"⚠️  Таблица password_reset_tokens уже существует: {e}")

    # Создаем таблицу для уведомлений
    try:
        c.execute('''CREATE TABLE IF NOT EXISTS client_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_instagram_id TEXT,
            client_email TEXT,
            notification_type TEXT NOT NULL,  -- 'birthday', 'news', 'reminder', 'promotion'
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            sent_at TEXT,
            read_at TEXT,
            created_at TEXT NOT NULL
        )''')
        print("✅ Создана таблица client_notifications")
    except Exception as e:
        print(f"⚠️  Таблица client_notifications уже существует: {e}")

    # Создаем таблицу для новостей салона
    try:
        c.execute('''CREATE TABLE IF NOT EXISTS salon_news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title_ru TEXT NOT NULL,
            title_en TEXT,
            title_ar TEXT,
            content_ru TEXT NOT NULL,
            content_en TEXT,
            content_ar TEXT,
            image_url TEXT,
            published_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            is_active INTEGER DEFAULT 1
        )''')
        print("✅ Создана таблица salon_news")
    except Exception as e:
        print(f"⚠️  Таблица salon_news уже существует: {e}")

    conn.commit()
    conn.close()

    print("=" * 70)
    print("✅ Миграция завершена")
    print("=" * 70)


if __name__ == "__main__":
    add_client_accounts()
