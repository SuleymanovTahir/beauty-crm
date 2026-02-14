"""
Модуль для работы с PostgreSQL
"""
import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from utils.logger import log_info, log_error

# Connection pool для эффективного управления подключениями
connection_pool = None

def init_connection_pool():
    """Инициализировать пул подключений к PostgreSQL"""
    global connection_pool
    
    try:
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            1,  # минимум подключений
            20,  # максимум подключений
            host=os.getenv('POSTGRES_HOST', 'localhost'),
            port=os.getenv('POSTGRES_PORT', '5432'),
            database=os.getenv('POSTGRES_DB', 'beauty_crm'),
            user=os.getenv('POSTGRES_USER', 'beauty_crm_user'),
            password=os.getenv('POSTGRES_PASSWORD', '')
        )
        log_info("✅ PostgreSQL connection pool initialized", "postgres")
        return True
    except Exception as e:
        log_error(f"❌ Failed to initialize PostgreSQL connection pool: {e}", "postgres")
        return False

def get_connection():
    """Получить подключение из пула"""
    global connection_pool
    
    if connection_pool is None:
        if not init_connection_pool():
            raise Exception("Failed to initialize connection pool")
    
    try:
        conn = connection_pool.getconn()
        return conn
    except Exception as e:
        log_error(f"❌ Failed to get connection from pool: {e}", "postgres")
        raise

def release_connection(conn):
    """Вернуть подключение в пул"""
    global connection_pool
    
    if connection_pool and conn:
        connection_pool.putconn(conn)

def close_all_connections():
    """Закрыть все подключения в пуле"""
    global connection_pool
    
    if connection_pool:
        connection_pool.closeall()
        log_info("✅ All PostgreSQL connections closed", "postgres")

def execute_query(query, params=None, fetch=False, fetch_one=False):
    """
    Выполнить SQL запрос
    
    Args:
        query: SQL запрос
        params: Параметры запроса
        fetch: Вернуть все результаты
        fetch_one: Вернуть один результат
    
    Returns:
        Результаты запроса или None
    """
    conn = None
    cursor = None
    
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute(query, params or ())
        
        if fetch:
            result = cursor.fetchall()
        elif fetch_one:
            result = cursor.fetchone()
        else:
            result = None
        
        conn.commit()
        return result
        
    except Exception as e:
        if conn:
            conn.rollback()
        log_error(f"❌ Query execution failed: {e}", "postgres")
        raise
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_connection(conn)

def test_connection():
    """Проверить подключение к PostgreSQL"""
    try:
        result = execute_query("SELECT version()", fetch_one=True)
        if result:
            log_info(f"✅ PostgreSQL connection successful: {result['version']}", "postgres")
            return True
        return False
    except Exception as e:
        log_error(f"❌ PostgreSQL connection test failed: {e}", "postgres")
        return False
