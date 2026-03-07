import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import DictCursor, RealDictCursor
from utils.logger import log_info, log_error, log_warning

# Global connection pool
_connection_pool = None


def _read_int_env(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        return int(str(raw_value).strip())
    except (TypeError, ValueError):
        return default


def _clamp_int(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))


def _resolve_worker_count() -> int:
    explicit_workers = _read_int_env("BACKEND_WORKERS", 0)
    if explicit_workers <= 0:
        explicit_workers = _read_int_env("WEB_CONCURRENCY", 0)

    if explicit_workers > 0:
        return max(1, explicit_workers)

    if os.getenv("UVICORN_RELOAD", "").strip().lower() in {"1", "true", "yes", "on"}:
        return 1

    if os.getenv("ENVIRONMENT") == "production":
        cpu_count = os.cpu_count() or 2
        return max(2, min(8, cpu_count))

    return 1


def _resolve_pool_bounds() -> tuple[int, int]:
    explicit_min = _read_int_env("DB_POOL_MIN", 0)
    explicit_max = _read_int_env("DB_POOL_MAX", 0)
    if explicit_min > 0 or explicit_max > 0:
        maxconn = max(1, explicit_max or explicit_min)
        minconn = max(1, min(explicit_min or maxconn, maxconn))
        return minconn, maxconn

    worker_count = _resolve_worker_count()
    total_target = max(32, _read_int_env("DB_POOL_MAX_TOTAL", 160))
    per_worker_max = _clamp_int(total_target // max(1, worker_count), 12, 80)
    per_worker_min = _clamp_int(max(4, per_worker_max // 4), 4, per_worker_max)
    return per_worker_min, per_worker_max

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
                minconn, maxconn = _resolve_pool_bounds()
                _connection_pool = pool.ThreadedConnectionPool(
                    minconn=minconn,
                    maxconn=maxconn,
                    host=os.getenv('POSTGRES_HOST', 'localhost'),
                    port=os.getenv('POSTGRES_PORT', '5432'),
                    database=os.getenv('POSTGRES_DB', 'beauty_crm'),
                    user=os.getenv('POSTGRES_USER', 'beauty_crm_user'),
                    password=os.getenv('POSTGRES_PASSWORD', ''),
                    # Оптимизация производительности
                    connect_timeout=5,  # Таймаут подключения
                    options='-c statement_timeout=30000'  # 30 секунд на запрос
                )
                log_info(
                    f"✅ Database connection pool initialized ({minconn}-{maxconn} per worker, workers={_resolve_worker_count()})",
                    "db"
                )
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
