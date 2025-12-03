"""
Unified database connection module
Provides PostgreSQL connections for the entire application
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from utils.logger import log_info, log_error

# Connection pool
_connection_pool = None


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
        return conn
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
