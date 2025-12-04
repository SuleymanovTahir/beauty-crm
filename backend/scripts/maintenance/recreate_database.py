#!/usr/bin/env python3
"""
Скрипт для полного пересоздания базы данных beauty_crm.
Подключается к системной базе 'postgres' и выполняет DROP/CREATE DATABASE.
"""
import os
import os
import sys
from pathlib import Path
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Добавляем путь к корню проекта для импорта модулей
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

def recreate_database():
    """Пересоздать базу данных beauty_crm"""
    
    # 1. Определяем окружение и загружаем правильный .env файл
    env = os.getenv('ENVIRONMENT', 'development')
    env_file = '.env.production' if env == 'production' else '.env.local'
    
    # Путь к .env файлу
    root_dir = Path(__file__).parent.parent.parent
    dotenv_path = root_dir / env_file
    
    print(f"🔍 Загрузка конфигурации из: {env_file}")
    load_dotenv(dotenv_path)
    
    # 2. Читаем переменные (теперь они точно загружены)
    db_name = os.getenv('POSTGRES_DB', 'beauty_crm')
    db_host = os.getenv('POSTGRES_HOST', 'localhost')
    db_port = os.getenv('POSTGRES_PORT', '5432')
    
    # ВАЖНО: Для операций DROP/CREATE DATABASE нужны права владельца БД или суперюзера
    # На macOS с Postgres.app обычно используется текущий пользователь системы как суперюзер
    superuser = os.getenv('USER', 'postgres')  # Текущий пользователь macOS
    
    print(f"⚙️  Параметры подключения: host={db_host}, superuser={superuser}, db={db_name}")
    
    print(f"🔄 Пересоздание базы данных '{db_name}'...")
    
    try:
        # Подключаемся к системной базе 'postgres'
        # Важно: подключаемся без пароля или с дефолтными настройками, 
        # так как на локальной машине часто используется trust аутентификация
        conn = psycopg2.connect(
            dbname='postgres',
            user=superuser,
            host=db_host,
            port=db_port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Проверяем существование базы и удаляем её
        # Сначала принудительно отключаем всех пользователей
        cursor.execute(f"""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '{db_name}'
            AND pid <> pg_backend_pid();
        """)
        
        cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
        print(f"✅ База данных '{db_name}' удалена")
        
        # Создаем базу заново
        cursor.execute(f"CREATE DATABASE {db_name}")
        print(f"✅ База данных '{db_name}' создана")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        # Пробуем альтернативный вариант подключения (если пользователь отличается)
        if "role" in str(e) and "does not exist" in str(e):
             print("⚠️ Попытка подключения с пользователем 'postgres'...")
             try:
                conn = psycopg2.connect(dbname='postgres', user='postgres', host=db_host, port=db_port)
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                cursor = conn.cursor()
                cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
                cursor.execute(f"CREATE DATABASE {db_name}")
                print(f"✅ База данных '{db_name}' пересоздана (через user='postgres')")
                cursor.close()
                conn.close()
             except Exception as e2:
                 print(f"❌ Критическая ошибка: {e2}")

if __name__ == '__main__':
    recreate_database()
