"""
Скрипт для очистки устаревших сессий
Запускается периодически для улучшения производительности
"""
from db.connection import get_db_connection
from datetime import datetime
from utils.logger import log_info

def cleanup_expired_sessions():
    """Удалить все истекшие сессии из базы данных"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        now = datetime.now().isoformat()
        
        # Удаляем истекшие сессии
        c.execute("DELETE FROM sessions WHERE expires_at < %s", (now,))
        deleted_count = c.rowcount
        
        conn.commit()
        
        if deleted_count > 0:
            log_info(f"🧹 Удалено {deleted_count} истекших сессий", "cleanup")
        
        return deleted_count
        
    except Exception as e:
        log_info(f"❌ Ошибка при очистке сессий: {e}", "cleanup")
        conn.rollback()
        return 0
    finally:
        conn.close()

if __name__ == "__main__":
    cleanup_expired_sessions()
