"""
Миграция: добавление каналов подписки (email, telegram, instagram) в user_subscriptions
"""
import sqlite3
from core.config import DATABASE_NAME

def add_subscription_channels():
    """Добавить поля для управления каналами подписки"""

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем структуру таблицы
        c.execute("PRAGMA table_info(user_subscriptions)")
        columns = [col[1] for col in c.fetchall()]

        # Добавляем колонки для каждого канала
        if 'email_enabled' not in columns:
            print("📧 Добавление поля email_enabled в таблицу user_subscriptions...")
            c.execute("ALTER TABLE user_subscriptions ADD COLUMN email_enabled INTEGER DEFAULT 1")
            conn.commit()
            print("✅ Поле email_enabled добавлено")
        else:
            print("⏭️  Поле email_enabled уже существует")

        if 'telegram_enabled' not in columns:
            print("💬 Добавление поля telegram_enabled в таблицу user_subscriptions...")
            c.execute("ALTER TABLE user_subscriptions ADD COLUMN telegram_enabled INTEGER DEFAULT 1")
            conn.commit()
            print("✅ Поле telegram_enabled добавлено")
        else:
            print("⏭️  Поле telegram_enabled уже существует")

        if 'instagram_enabled' not in columns:
            print("📷 Добавление поля instagram_enabled в таблицу user_subscriptions...")
            c.execute("ALTER TABLE user_subscriptions ADD COLUMN instagram_enabled INTEGER DEFAULT 1")
            conn.commit()
            print("✅ Поле instagram_enabled добавлено")
        else:
            print("⏭️  Поле instagram_enabled уже существует")

        # Обновляем существующие записи - по умолчанию все каналы включены
        c.execute("""
            UPDATE user_subscriptions
            SET email_enabled = 1, telegram_enabled = 1, instagram_enabled = 1
            WHERE email_enabled IS NULL OR telegram_enabled IS NULL OR instagram_enabled IS NULL
        """)
        conn.commit()
        print("✅ Обновлены существующие подписки - все каналы включены по умолчанию")

    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    add_subscription_channels()
