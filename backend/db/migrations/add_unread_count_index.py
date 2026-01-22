#!/usr/bin/env python3
"""
Добавление частичного индекса для быстрого подсчета непрочитанных сообщений
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from db.connection import get_db_connection
from utils.logger import log_info, log_error

def add_unread_count_index():
    """Добавляет частичный индекс для оптимизации подсчета непрочитанных сообщений"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        log_info("🔧 Добавление частичного индекса для unread count...", "migration")
        
        # Частичный индекс только для непрочитанных сообщений от клиентов
        # Это значительно ускорит COUNT(*) запрос
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_unread_count_optimized
            ON chat_history(sender)
            WHERE is_read = FALSE AND sender = 'client';
        """)
        
        log_info("✅ Частичный индекс для unread count создан", "migration")
        
        conn.commit()
        return True
    except Exception as e:
        log_error(f"❌ Ошибка при создании индекса: {e}", "migration")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    add_unread_count_index()
