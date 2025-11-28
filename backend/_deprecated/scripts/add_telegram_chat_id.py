"""
Добавление поля telegram_manager_chat_id в salon_settings
"""
import sqlite3
import sys
import os

# Добавляем родительскую директорию в путь для импорта
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import DATABASE_NAME

def add_telegram_manager_chat_id():
    """Добавить поле для Telegram chat ID менеджера"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Проверяем, есть ли уже это поле
        c.execute("PRAGMA table_info(salon_settings)")
        columns = [row[1] for row in c.fetchall()]
        
        if 'telegram_manager_chat_id' not in columns:
            c.execute("""
                ALTER TABLE salon_settings 
                ADD COLUMN telegram_manager_chat_id TEXT
            """)
            conn.commit()
            print("✅ Поле telegram_manager_chat_id добавлено в salon_settings")
        else:
            print("ℹ️ Поле telegram_manager_chat_id уже существует")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_telegram_manager_chat_id()
