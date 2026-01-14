"""
Performance Indexes Migration
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def run_migration():
    """Add indexes for performance optimization"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        log_info("🔧 Начало миграции: Performance Indexes", "migration")
        
        # 1. bot_analytics
        c.execute("CREATE INDEX IF NOT EXISTS idx_bot_analytics_session_started ON bot_analytics(session_started)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_bot_analytics_outcome ON bot_analytics(outcome)")
        
        # 2. bookings
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_datetime ON bookings(datetime)")
        
        # 3. chat_history
        c.execute("CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_chat_history_instagram_id ON chat_history(instagram_id)")
        
        # 4. notifications
        c.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)")
        
        # 5. clients
        c.execute("CREATE INDEX IF NOT EXISTS idx_clients_instagram_id ON clients(instagram_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status)")
        
        # 6. internal_chat (already has some, but let's be sure)
        c.execute("CREATE INDEX IF NOT EXISTS idx_internal_chat_timestamp ON internal_chat(timestamp)")
        
        conn.commit()
        log_info("✅ Миграция Performance Indexes завершена успешно", "migration")
        return True
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка миграции Performance Indexes: {e}", "migration")
        return False
    finally:
        conn.close()
