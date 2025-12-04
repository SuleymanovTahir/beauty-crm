"""
Unified database connection module
Provides PostgreSQL connections for the entire application
"""
import os
import psycopg2
from psycopg2.extras import DictCursor, RealDictCursor
from utils.logger import log_info, log_error

# Connection pool
_connection_pool = None

class CursorWrapper:
    """
    Wrapper for psycopg2 cursor to emulate sqlite3 cursor behavior.
    Translates '?' placeholders to '%s'.
    """
    def __init__(self, cursor):
        self._cursor = cursor

    def execute(self, query, params=None):
        if query:
            # Simple replacement of ? with %s
            # Note: This might be risky if ? is used in string literals, 
            # but for this codebase it's likely fine as a migration step.
            query = query.replace('?', '%s')
        return self._cursor.execute(query, params)

    def executemany(self, query, params=None):
        if query:
            query = query.replace('?', '%s')
        return self._cursor.executemany(query, params)

    def __getattr__(self, name):
        return getattr(self._cursor, name)

    def __iter__(self):
        return iter(self._cursor)

class ConnectionWrapper:
    """
    Wrapper for psycopg2 connection to emulate sqlite3 connection behavior.
    Allows setting row_factory (which enables DictCursor) and delegates other methods.
    """
    def __init__(self, conn):
        self._conn = conn
        self.row_factory = None

    def cursor(self, cursor_factory=None):
        # If row_factory is set (usually to sqlite3.Row), use DictCursor
        # DictCursor supports both index access (row[0]) and key access (row['col'])
        if self.row_factory or cursor_factory:
            cursor = self._conn.cursor(cursor_factory=cursor_factory or DictCursor)
        else:
            cursor = self._conn.cursor()
        return CursorWrapper(cursor)

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()

    def __getattr__(self, name):
        return getattr(self._conn, name)

def get_db_connection():
    """
    Get a database connection (PostgreSQL)
    Returns a connection object that can be used with cursor()
    """
    try:
        conn = psycopg2.connect(
            host=os.getenv('POSTGRES_HOST', 'localhost'),
            port=os.getenv('POSTGRES_PORT', '5432'),
            database=os.getenv('POSTGRES_DB', 'beauty_crm'),
            user=os.getenv('POSTGRES_USER', 'beauty_crm_user'),
            password=os.getenv('POSTGRES_PASSWORD', '')
        )
        # Return the wrapper instead of raw connection
        return ConnectionWrapper(conn)
    except Exception as e:
        log_error(f"Failed to connect to PostgreSQL: {e}", "db")
        raise


def get_cursor(conn, dict_cursor=False):
    """
    Get a cursor from connection
    
    Args:
        conn: Database connection
        dict_cursor: If True, returns RealDictCursor (rows as dicts)
    """
    if dict_cursor:
        return conn.cursor(cursor_factory=RealDictCursor)
    return conn.cursor()
