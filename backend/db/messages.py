"""
Функции для работы с сообщениями
"""
import sqlite3
from datetime import datetime
from utils.logger import log_info
from core.config import DATABASE_NAME


def save_message(instagram_id: str, message: str, sender: str, 
                language: str = None, message_type: str = 'text'):
    """Сохранить сообщение"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Проверка дубликата (последние 10 секунд)
    c.execute("""
        SELECT id FROM chat_history 
        WHERE instagram_id = ? AND message = ? AND sender = ?
        AND datetime(timestamp) > datetime('now', '-10 seconds')
        LIMIT 1
    """, (instagram_id, message, sender))
    
    if c.fetchone():
        log_info(f"⏭️ Duplicate message skipped: {message[:30]}...", "db")
        conn.close()
        return

    
    now = datetime.now().isoformat()
    is_read = 1 if sender == 'bot' else 0
    
    c.execute("""INSERT INTO chat_history 
                 (instagram_id, message, sender, timestamp, language, is_read, message_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?)""",
              (instagram_id, message, sender, now, language, is_read, message_type))
    message_id = c.lastrowid
    log_info(f"💾 Сообщение сохранено: ID={message_id}, sender={sender}, text={message[:30]}...", "db")
    
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

def save_reaction(message_id: int, emoji: str, user_id: int = None):
    """Сохранить реакцию на сообщение"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Проверяем существует ли таблица reactions
        c.execute("""CREATE TABLE IF NOT EXISTS message_reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            emoji TEXT NOT NULL,
            user_id INTEGER,
            created_at TEXT NOT NULL,
            FOREIGN KEY (message_id) REFERENCES chat_history(id)
        )""")
        
        c.execute("""INSERT INTO message_reactions 
                     (message_id, emoji, user_id, created_at)
                     VALUES (?, ?, ?, ?)""",
                  (message_id, emoji, user_id, datetime.now().isoformat()))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"❌ Ошибка сохранения реакции: {e}")
        return False
    finally:
        conn.close()


def search_messages(query: str, limit: int = 50):
    """Поиск сообщений по тексту"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT m.id, m.instagram_id, c.username, c.name, m.message, 
                   m.sender, m.message_type, m.timestamp
            FROM chat_history m
            LEFT JOIN clients c ON m.instagram_id = c.instagram_id
            WHERE m.message LIKE ?
            ORDER BY m.timestamp DESC
            LIMIT ?
        """, (query, limit))
        
        messages = c.fetchall()
        
        return [
            {
                "id": m[0],
                "instagram_id": m[1],
                "username": m[2],
                "name": m[3],
                "message": m[4],
                "sender": m[5],
                "type": m[6],
                "timestamp": m[7]
            } for m in messages
        ]
    except Exception as e:
        print(f"❌ Ошибка поиска сообщений: {e}")
        return []
    finally:
        conn.close()

