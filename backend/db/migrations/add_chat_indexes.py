#!/usr/bin/env python3
"""
Добавление индексов для ускорения чата и подсчета уведомлений
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from db.connection import get_db_connection

def add_chat_indexes():
    """Добавляет индексы для оптимизации чата"""
    conn = get_db_connection()
    c = conn.cursor()
    
    print("🔧 Добавление индексов для чата...")
    
    # Индекс для подсчета непрочитанных сообщений (GLOBAL)
    try:
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_unread_global
            ON chat_history(sender, is_read);
        """)
        print("✅ Индекс unread_global создан")
    except Exception as e:
        print(f"⚠️  Индекс unread_global: {e}")
    
    # Индекс для подсчета непрочитанных по клиенту
    try:
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_unread_client
            ON chat_history(instagram_id, sender, is_read);
        """)
        print("✅ Индекс unread_client создан")
    except Exception as e:
        print(f"⚠️  Индекс unread_client: {e}")
    
    # Индекс для меню настроек (чтобы не тормозило меню)
    try:
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_menu_settings_user
            ON menu_settings(user_id);
        """)
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_menu_settings_role
            ON menu_settings(role);
        """)
        print("✅ Индексы для menu_settings созданы")
    except Exception as e:
        print(f"⚠️  Индексы menu_settings: {e}")

    conn.commit()
    conn.close()
    
    print("\n✅ Индексы чата и меню успешно созданы!")

if __name__ == "__main__":
    add_chat_indexes()
