"""
Функции для работы с сообщениями
"""
import sqlite3
from datetime import datetime

from config import DATABASE_NAME


def save_message(instagram_id: str, message: str, sender: str, 
                language: str = None, message_type: str = 'text'):
    """Сохранить сообщение"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    is_read = 1 if sender == 'bot' else 0
    
    c.execute("""INSERT INTO chat_history 
                 (instagram_id, message, sender, timestamp, language, is_read, message_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?)""",
              (instagram_id, message, sender, now, language, is_read, message_type))
    
    conn.commit()
    conn.close()


def get_chat_history(instagram_id: str, limit: int = 10):
    """Получить историю чата"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""SELECT message, sender, timestamp, message_type, id 
                 FROM chat_history 
                 WHERE instagram_id = ? 
                 ORDER BY timestamp DESC LIMIT ?""",
              (instagram_id, limit))
    
    history = c.fetchall()
    conn.close()
    
    return list(reversed(history))


def get_all_messages(limit: int = 100):
    """Получить все сообщения"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""SELECT id, instagram_id, message, sender, timestamp 
                 FROM chat_history ORDER BY timestamp DESC LIMIT ?""", (limit,))
    
    messages = c.fetchall()
    conn.close()
    return messages


def mark_messages_as_read(instagram_id: str, user_id: int = None):
    """Отметить сообщения как прочитанные"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""UPDATE chat_history 
                 SET is_read = 1 
                 WHERE instagram_id = ? AND sender = 'client' AND is_read = 0""",
              (instagram_id,))
    
    conn.commit()
    conn.close()


def get_unread_messages_count(instagram_id: str) -> int:
    """Получить количество непрочитанных сообщений"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""SELECT COUNT(*) FROM chat_history 
                 WHERE instagram_id = ? AND sender = 'client' AND is_read = 0""",
              (instagram_id,))
    
    count = c.fetchone()[0]
    conn.close()
    
    return count