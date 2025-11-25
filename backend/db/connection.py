import sqlite3
from core.config import DATABASE_NAME

def get_db_connection():
    """
    Создает подключение к базе данных с включенными Foreign Keys
    """
    conn = sqlite3.connect(DATABASE_NAME)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn
