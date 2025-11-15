"""
Сохранить Telegram Bot Token в базу данных
"""
import sqlite3
import sys
import os

# Добавляем корневую директорию в PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.config import DATABASE_NAME

TELEGRAM_TOKEN = "6784705707:AAHmgFZ1GwvAZ443DNWd4fgT3s1O3sXkySI"

def save_token():
    """Сохранить токен в БД"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Обновляем токен и включаем Telegram
    c.execute("""
        UPDATE messenger_settings
        SET api_token = ?,
            is_enabled = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE messenger_type = 'telegram'
    """, (TELEGRAM_TOKEN,))

    conn.commit()

    # Проверяем что сохранилось
    c.execute("""
        SELECT messenger_type, is_enabled,
               SUBSTR(api_token, 1, 20) || '...' as token_preview
        FROM messenger_settings
        WHERE messenger_type = 'telegram'
    """)

    result = c.fetchone()
    conn.close()

    if result:
        print(f"✅ Telegram token saved successfully!")
        print(f"   Type: {result[0]}")
        print(f"   Enabled: {bool(result[1])}")
        print(f"   Token: {result[2]}")
    else:
        print("❌ Failed to save token")

if __name__ == '__main__':
    save_token()
