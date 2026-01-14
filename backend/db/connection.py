import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import DictCursor, RealDictCursor
from utils.logger import log_info, log_error, log_warning

# Global connection pool
_connection_pool = None

def init_connection_pool():
    """Initialize the connection pool if it doesn't exist"""
    global _connection_pool
    if _connection_pool is None:
        try:
            _connection_pool = pool.ThreadedConnectionPool(
                minconn=10,  # Увеличено с 5 для снижения задержек
                maxconn=50,
                host=os.getenv('POSTGRES_HOST', 'localhost'),
                port=os.getenv('POSTGRES_PORT', '5432'),
                database=os.getenv('POSTGRES_DB', 'beauty_crm'),
                user=os.getenv('POSTGRES_USER', 'beauty_crm_user'),
                password=os.getenv('POSTGRES_PASSWORD', ''),
                # Оптимизация производительности
                connect_timeout=5,  # Таймаут подключения
                options='-c statement_timeout=30000'  # 30 секунд на запрос
            )
            log_info("✅ Database connection pool initialized (10-50 connections)", "db")
        except Exception as e:
            log_error(f"❌ Failed to initialize connection pool: {e}", "db")
            raise

class CursorWrapper:
    """Wrapper for psycopg2 cursor to provide consistent interface."""
    def __init__(self, cursor, conn_obj):
        self._cursor = cursor
        self._conn_obj = conn_obj

    def execute(self, query, params=None):
        import time
        from utils.logger import log_warning
        
        if query:
            query = query.replace('%s', '%s')
            
        start_time = time.time()
        try:
            return self._cursor.execute(query, params)
        finally:
            duration = (time.time() - start_time) * 1000
            if duration > 1000:
                # Truncate query for logging
                q_snippet = str(query)[:100].replace('\n', ' ')
                log_warning(f"🐢 SLOW QUERY ({duration:.2f}ms): {q_snippet}...", "db_performance")

    def executemany(self, query, params=None):
        import time
        from utils.logger import log_warning
        
        if query:
            query = query.replace('%s', '%s')
            
        start_time = time.time()
        try:
            return self._cursor.executemany(query, params)
        finally:
            duration = (time.time() - start_time) * 1000
            if duration > 1000:
                q_snippet = str(query)[:100].replace('\n', ' ')
                log_warning(f"🐢 SLOW EXECUTEMANY ({duration:.2f}ms): {q_snippet}...", "db_performance")

    def __getattr__(self, name):
        return getattr(self._cursor, name)

    def __iter__(self):
        return iter(self._cursor)

class ConnectionWrapper:
    """Wrapper for pool connection to handle automatic return to pool"""
    def __init__(self, conn):
        self._conn = conn
        self.row_factory = None

    def cursor(self, cursor_factory=None):
        if self.row_factory or cursor_factory:
            cursor = self._conn.cursor(cursor_factory=cursor_factory or DictCursor)
        else:
            cursor = self._conn.cursor()
        return CursorWrapper(cursor, self._conn)

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        """Returns the connection to the pool instead of closing it"""
        global _connection_pool
        if _connection_pool and self._conn:
            try:
                _connection_pool.putconn(self._conn)
                self._conn = None
            except Exception as e:
                log_error(f"Error returning connection to pool: {e}", "db")

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def __del__(self):
        if self._conn:
            self.close()

def get_db_connection():
    """Get a database connection from the pool"""
    global _connection_pool
    if _connection_pool is None:
        init_connection_pool()
    
    import time
    start_time = time.time()
    try:
        conn = _connection_pool.getconn()
        duration = (time.time() - start_time) * 1000
        if duration > 500:
            log_warning(f"🕒 Connection acquisition took {duration:.2f}ms", "db")
        return ConnectionWrapper(conn)
    except Exception as e:
        log_error(f"Failed to get connection from pool: {e} (Attempt took {(time.time()-start_time)*1000:.2f}ms)", "db")
        # Fallback to direct connection if pool fails
        try:
            direct_conn = psycopg2.connect(
                host=os.getenv('POSTGRES_HOST', 'localhost'),
                port=os.getenv('POSTGRES_PORT', '5432'),
                database=os.getenv('POSTGRES_DB', 'beauty_crm'),
                user=os.getenv('POSTGRES_USER', 'beauty_crm_user'),
                password=os.getenv('POSTGRES_PASSWORD', '')
            )
            log_warning("⚠️ Using direct connection fallback", "db")
            return ConnectionWrapper(direct_conn)
        except:
            raise e

def get_cursor(conn, dict_cursor=False):
    """Get a cursor from connection"""
    if dict_cursor:
        return conn.cursor(cursor_factory=RealDictCursor)
    return conn.cursor()

