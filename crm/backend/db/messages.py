"""
Функции для работы с сообщениями
"""
from datetime import datetime
from utils.logger import log_info
from db.connection import get_db_connection
from utils.tenant_context import get_current_company_id


def _safe_int(value):
    try:
        return int(value)
    except Exception:
        return None


def _load_client_company_id(cursor, instagram_id: str):
    cursor.execute(
        """
        SELECT company_id
        FROM clients
        WHERE instagram_id = %s
        LIMIT 1
        """,
        (instagram_id,),
    )
    row = cursor.fetchone()
    return _safe_int(row[0]) if row else None


def _resolve_message_company_id(cursor, instagram_id: str):
    current_company_id = _safe_int(get_current_company_id())
    if current_company_id is not None:
        return current_company_id
    return _load_client_company_id(cursor, instagram_id)

def save_message(instagram_id: str, message: str, sender: str, 
                language: str = None, message_type: str = 'text'):
    """Сохранить сообщение"""
    conn = get_db_connection()
    c = conn.cursor()
    resolved_company_id = _resolve_message_company_id(c, instagram_id)
    
    # Проверка дубликата (последние 10 секунд)
    c.execute("""
        SELECT id FROM chat_history 
        WHERE instagram_id = %s AND message = %s AND sender = %s
        AND (%s IS NULL OR company_id = %s)
        AND timestamp::timestamp > NOW() - INTERVAL '10 seconds'
        LIMIT 1
    """, (instagram_id, message, sender, resolved_company_id, resolved_company_id))
    
    if c.fetchone():
        log_info(f"⏭️ Duplicate message skipped: {message[:30]}...", "db")
        conn.close()
        return

    
    now = datetime.now().isoformat()
    is_read = True if sender == 'bot' else False
    
    c.execute("""INSERT INTO chat_history 
                 (instagram_id, company_id, message, sender, timestamp, language, is_read, message_type)
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                 RETURNING id""",
              (instagram_id, resolved_company_id, message, sender, now, language, is_read, message_type))
    message_id = c.fetchone()[0]
    log_info(f"💾 Сообщение сохранено: ID={message_id}, sender={sender}, text={message[:30]}...", "db")
    
    conn.commit()
    conn.close()

def get_chat_history(instagram_id: str, limit: int = 10):
    """Получить историю чата"""
    conn = get_db_connection()
    c = conn.cursor()
    resolved_company_id = _resolve_message_company_id(c, instagram_id)
    
    c.execute("""SELECT message, sender, timestamp, message_type, id 
                 FROM chat_history 
                 WHERE instagram_id = %s
                   AND (%s IS NULL OR company_id = %s)
                 ORDER BY timestamp DESC LIMIT %s""",
              (instagram_id, resolved_company_id, resolved_company_id, limit))
    
    history = c.fetchall()
    conn.close()
    
    return list(reversed(history))

def get_all_messages(limit: int = 100):
    """Получить все сообщения"""
    conn = get_db_connection()
    c = conn.cursor()
    current_company_id = _safe_int(get_current_company_id())
    
    c.execute("""SELECT id, instagram_id, message, sender, timestamp 
                 FROM chat_history
                 WHERE (%s IS NULL OR company_id = %s)
                 ORDER BY timestamp DESC LIMIT %s""", (current_company_id, current_company_id, limit))
    
    messages = c.fetchall()
    conn.close()
    return messages

def mark_messages_as_read(instagram_id: str, user_id: int = None):
    """Отметить сообщения как прочитанные"""
    conn = get_db_connection()
    c = conn.cursor()
    resolved_company_id = _resolve_message_company_id(c, instagram_id)
    
    c.execute("""UPDATE chat_history 
                 SET is_read = TRUE 
                 WHERE instagram_id = %s AND sender = 'client' AND is_read = FALSE
                   AND (%s IS NULL OR company_id = %s)""",
              (instagram_id, resolved_company_id, resolved_company_id))
    
    conn.commit()
    conn.close()

def get_unread_messages_count(instagram_id: str) -> int:
    """Получить количество непрочитанных сообщений для конкретного клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    resolved_company_id = _resolve_message_company_id(c, instagram_id)
    
    c.execute("""SELECT COUNT(*) FROM chat_history 
                 WHERE instagram_id = %s AND sender = 'client' AND is_read = FALSE
                   AND (%s IS NULL OR company_id = %s)""",
              (instagram_id, resolved_company_id, resolved_company_id))
    
    count = c.fetchone()[0]
    conn.close()
    
    return count

def get_global_unread_count() -> int:
    """Получить общее количество непрочитанных сообщений (оптимизировано)"""
    import time
    from utils.logger import log_error, log_info
    
    conn_start = time.time()
    conn = get_db_connection()
    conn_duration = (time.time() - conn_start) * 1000
    if conn_duration > 100:
        log_info(f"⚠️ [unread-count] Connection acquisition took {conn_duration:.2f}ms", "db")
    
    c = conn.cursor()
    current_company_id = _safe_int(get_current_company_id())
    
    try:
        query_start = time.time()
        # Optimized query - uses partial index idx_chat_unread_count_optimized
        # This index only contains rows where is_read = FALSE AND sender = 'client'
        # So COUNT(*) will be very fast as it only scans the index, not the table
        c.execute("""SELECT COUNT(*) FROM chat_history 
                     WHERE is_read = FALSE AND sender = 'client'
                       AND (%s IS NULL OR company_id = %s)""", (current_company_id, current_company_id))
        count = c.fetchone()[0]
        query_duration = (time.time() - query_start) * 1000
        
        if query_duration > 500:
            log_info(f"⚠️ [unread-count] Query took {query_duration:.2f}ms - consider optimizing", "db")
        
        return count or 0
    except Exception as e:
        log_error(f"❌ Error getting global unread count: {e}", "db")
        return 0
    finally:
        conn.close()


def save_reaction(message_id: int, emoji: str, user_id: int = None):
    """Сохранить реакцию на сообщение"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute(
            """
            SELECT company_id
            FROM chat_history
            WHERE id = %s
            LIMIT 1
            """,
            (message_id,),
        )
        row = c.fetchone()
        if not row:
            conn.close()
            return False
        company_id = _safe_int(row[0])
        
        c.execute("""INSERT INTO message_reactions 
                     (message_id, company_id, emoji, user_id, created_at)
                     VALUES (%s, %s, %s, %s, %s)""",
                  (message_id, company_id, emoji, user_id, datetime.now().isoformat()))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"❌ Ошибка сохранения реакции: {e}")
        return False
    finally:
        conn.close()

def search_messages(query: str, limit: int = 50):
    """Поиск сообщений по тексту"""
    conn = get_db_connection()
    c = conn.cursor()
    current_company_id = _safe_int(get_current_company_id())
    
    try:
        c.execute("""
            SELECT m.id, m.instagram_id, c.username, c.name, m.message, 
                   m.sender, m.message_type, m.timestamp
            FROM chat_history m
            LEFT JOIN clients c ON m.instagram_id = c.instagram_id
            WHERE m.message LIKE %s
              AND (%s IS NULL OR m.company_id = %s)
            ORDER BY m.timestamp DESC
            LIMIT %s
        """, (query, current_company_id, current_company_id, limit))
        
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
