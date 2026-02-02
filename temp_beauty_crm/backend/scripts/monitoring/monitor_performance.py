"""
Скрипт для мониторинга размера таблицы sessions и производительности БД
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_warning
from datetime import datetime

def monitor_sessions():
    """Мониторинг таблицы sessions"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Общее количество сессий
        c.execute("SELECT COUNT(*) FROM sessions")
        total_sessions = c.fetchone()[0]
        
        # Активные сессии (не истекшие)
        now = datetime.now().isoformat()
        c.execute("SELECT COUNT(*) FROM sessions WHERE expires_at > %s", (now,))
        active_sessions = c.fetchone()[0]
        
        # Истекшие сессии
        expired_sessions = total_sessions - active_sessions
        
        # Размер таблицы
        c.execute("""
            SELECT pg_size_pretty(pg_total_relation_size('sessions')) as size
        """)
        table_size = c.fetchone()[0]
        
        log_info("=" * 60, "monitor")
        log_info("📊 МОНИТОРИНГ СЕССИЙ", "monitor")
        log_info("=" * 60, "monitor")
        log_info(f"📈 Всего сессий: {total_sessions}", "monitor")
        log_info(f"✅ Активных: {active_sessions}", "monitor")
        log_info(f"⏰ Истекших: {expired_sessions}", "monitor")
        log_info(f"💾 Размер таблицы: {table_size}", "monitor")
        
        # Предупреждения
        if expired_sessions > 1000:
            log_warning(f"⚠️ Много истекших сессий ({expired_sessions}). Рекомендуется очистка.", "monitor")
        
        if total_sessions > 10000:
            log_warning(f"⚠️ Таблица sessions содержит {total_sessions} записей. Рассмотрите Redis для кэширования.", "monitor")
        
        log_info("=" * 60, "monitor")
        
        return {
            "total": total_sessions,
            "active": active_sessions,
            "expired": expired_sessions,
            "size": table_size
        }
        
    except Exception as e:
        log_warning(f"❌ Ошибка мониторинга: {e}", "monitor")
        return None
    finally:
        conn.close()

def monitor_database_performance():
    """Мониторинг производительности базы данных"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        log_info("=" * 60, "monitor")
        log_info("🔍 МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ БД", "monitor")
        log_info("=" * 60, "monitor")
        
        # Размер базы данных
        c.execute("""
            SELECT pg_size_pretty(pg_database_size(current_database())) as size
        """)
        db_size = c.fetchone()[0]
        log_info(f"💾 Размер БД: {db_size}", "monitor")
        
        # Топ-5 самых больших таблиц
        c.execute("""
            SELECT 
                schemaname || '.' || tablename as table_name,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
            FROM pg_tables
            WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 5
        """)
        
        log_info("\n📊 Топ-5 самых больших таблиц:", "monitor")
        for row in c.fetchall():
            log_info(f"  • {row[0]}: {row[1]}", "monitor")
        
        # Неиспользуемые индексы
        c.execute("""
            SELECT 
                schemaname || '.' || tablename as table_name,
                indexname,
                pg_size_pretty(pg_relation_size(indexrelid)) as size
            FROM pg_stat_user_indexes
            WHERE idx_scan = 0
            AND schemaname NOT IN ('pg_catalog', 'information_schema')
            ORDER BY pg_relation_size(indexrelid) DESC
            LIMIT 5
        """)
        
        unused_indexes = c.fetchall()
        if unused_indexes:
            log_warning("\n⚠️ Неиспользуемые индексы (можно удалить):", "monitor")
            for row in unused_indexes:
                log_warning(f"  • {row[0]}.{row[1]}: {row[2]}", "monitor")
        
        # Статистика по индексам sessions
        c.execute("""
            SELECT 
                indexname,
                idx_scan as scans,
                idx_tup_read as tuples_read,
                idx_tup_fetch as tuples_fetched
            FROM pg_stat_user_indexes
            WHERE tablename = 'sessions'
        """)
        
        log_info("\n📈 Статистика индексов sessions:", "monitor")
        for row in c.fetchall():
            log_info(f"  • {row[0]}: {row[1]} сканирований, {row[2]} прочитано", "monitor")
        
        log_info("=" * 60, "monitor")
        
    except Exception as e:
        log_warning(f"❌ Ошибка мониторинга производительности: {e}", "monitor")
    finally:
        conn.close()

if __name__ == "__main__":
    monitor_sessions()
    monitor_database_performance()
