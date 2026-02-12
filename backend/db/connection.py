import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import DictCursor, RealDictCursor
from utils.logger import log_info, log_error, log_warning

# Global connection pool
_connection_pool = None

def init_connection_pool():
    """Initialize the connection pool if it doesn't exist.

    Includes retry logic to handle race conditions when database is being created
    by another worker during startup.
    """
    import time
    global _connection_pool
    if _connection_pool is None:
        max_retries = 30  # Wait up to 60 seconds (30 retries * 2 seconds)
        retry_delay = 2
        last_error = None

        for attempt in range(max_retries):
            try:
                _connection_pool = pool.ThreadedConnectionPool(
                    minconn=5,  # Минимум соединений - создаются при инициализации (не блокируем старт)
                    maxconn=100,  # Максимум соединений для параллелизма
                    host=os.getenv('POSTGRES_HOST', 'localhost'),
                    port=os.getenv('POSTGRES_PORT', '5432'),
                    database=os.getenv('POSTGRES_DB', 'beauty_crm'),
                    user=os.getenv('POSTGRES_USER', 'beauty_crm_user'),
                    password=os.getenv('POSTGRES_PASSWORD', ''),
                    # Оптимизация производительности
                    connect_timeout=5,  # Таймаут подключения
                    options='-c statement_timeout=30000'  # 30 секунд на запрос
                )
                log_info("✅ Database connection pool initialized (5-100 connections)", "db")
                return  # Success
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                # Check if error is related to database not existing (being created by another worker)
                if "does not exist" in error_str or "connection refused" in error_str:
                    if attempt < max_retries - 1:
                        log_warning(f"⏳ Database not ready, waiting... (attempt {attempt + 1}/{max_retries})", "db")
                        time.sleep(retry_delay)
                        continue
                # For other errors, fail immediately
                log_error(f"❌ Failed to initialize connection pool: {e}", "db")
                raise

        # If we exhausted all retries
        log_error(f"❌ Failed to initialize connection pool after {max_retries} attempts: {last_error}", "db")
        raise last_error

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
    def __init__(self, conn, from_pool=True):
        self._conn = conn
        self._from_pool = from_pool
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
        """Return pool connections to pool; close direct fallback connections."""
        global _connection_pool
        if not self._conn:
            return
        try:
            if self._from_pool and _connection_pool:
                _connection_pool.putconn(self._conn)
            else:
                self._conn.close()
        except Exception as e:
            log_error(f"Error closing connection: {e}", "db")
        finally:
            self._conn = None

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def __del__(self):
        if self._conn:
            self.close()

def get_db_connection():
    """Get a database connection from the pool.

    IMPORTANT: Do NOT wrap pool.getconn() in threads/timeouts.
    If the pool is exhausted, psycopg2 raises PoolError; it does not "hang".
    Thread-based timeouts can leak connections (a background thread may still
    acquire a connection and never return it).
    """
    global _connection_pool
    if _connection_pool is None:
        init_connection_pool()

    import time
    start_time = time.time()
    try:
        conn = _connection_pool.getconn()
        duration = (time.time() - start_time) * 1000
        if duration > 100:
            log_warning(f"🕒 Connection acquisition took {duration:.2f}ms", "db")
        return ConnectionWrapper(conn, from_pool=True)
    except pool.PoolError as e:
        # Pool exhausted - fallback to a direct connection quickly
        duration = (time.time() - start_time) * 1000
        log_warning(f"⚠️ Pool exhausted after {duration:.2f}ms: {e}", "db")
        try:
            direct_conn = psycopg2.connect(
                host=os.getenv('POSTGRES_HOST', 'localhost'),
                port=os.getenv('POSTGRES_PORT', '5432'),
                database=os.getenv('POSTGRES_DB', 'beauty_crm'),
                user=os.getenv('POSTGRES_USER', 'beauty_crm_user'),
                password=os.getenv('POSTGRES_PASSWORD', ''),
                connect_timeout=1,
            )
            log_warning("⚠️ Using direct connection fallback (pool exhausted)", "db")
            return ConnectionWrapper(direct_conn, from_pool=False)
        except Exception as direct_e:
            log_error(f"❌ Direct connection fallback failed: {direct_e}", "db")
            raise
    except Exception as e:
        log_error(f"Failed to get connection from pool: {e}", "db")
        raise

def get_cursor(conn, dict_cursor=False):
    """Get a cursor from connection"""
    if dict_cursor:
        return conn.cursor(cursor_factory=RealDictCursor)
    return conn.cursor()

def close_connection_pool():
    """Close all connections in the pool and reset it.
    
    This should be called before dropping/recreating the database
    to avoid 'database is being accessed by other users' errors.
    """
    global _connection_pool
    if _connection_pool is not None:
        try:
            _connection_pool.closeall()
            log_info("🔌 Connection pool closed", "db")
        except Exception as e:
            log_error(f"Error closing connection pool: {e}", "db")
        finally:
            _connection_pool = None
