#!/usr/bin/env python3
"""
Скрипт для полного пересоздания базы данных beauty_crm.
Подключается к системной базе 'postgres' и выполняет DROP/CREATE DATABASE.
Автоматически выдаёт права пользователю приложения для предотвращения ошибок доступа.
"""
import os
import sys
from pathlib import Path
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

import shutil

# Добавляем путь к корню проекта для импорта модулей
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def clean_static_uploads():
    """
    Очистить папку static/uploads, сохраняя структуру каталогов.
    Вызывается при пересоздании базы данных для удаления старых медиа-файлов.
    """
    root_dir = Path(__file__).parent.parent.parent
    static_uploads_dir = root_dir / 'static' / 'uploads'
    
    print(f"🧹 Очистка папки {static_uploads_dir}...")
    
    if static_uploads_dir.exists():
        try:
            # Удаляем все содержимое
            for item in static_uploads_dir.iterdir():
                if item.name.startswith('.'): continue # Пропускаем скрытые файлы (.gitkeep)
                
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()
            
            print("✅ Содержимое static/uploads удалено")
            
            # Восстанавливаем структуру папок
            folders = [
                'audio', 
                'files', 
                'images', 
                'videos', 
                'voice',
                'images/banners',
                'images/clients',
                'images/employees',
                'images/faces',
                'images/other',
                'images/portfolio',
                'images/salon',
                'images/services'
            ]
            
            for folder in folders:
                (static_uploads_dir / folder).mkdir(parents=True, exist_ok=True)
                
            print("✅ Структура папок восстановлена")
            
        except Exception as e:
            print(f"❌ Ошибка при очистке static/uploads: {e}")
    else:
        print("⚠️ Папка static/uploads не найдена, создаем новую с подкаталогами...")
        static_uploads_dir.mkdir(parents=True, exist_ok=True)
        # Создаем структуру, если папки вообще не было
        folders = ['audio', 'files', 'images', 'videos', 'voice', 
                   'images/banners', 'images/clients', 'images/employees', 
                   'images/faces', 'images/other', 'images/portfolio', 
                   'images/salon', 'images/services']
        for folder in folders:
            (static_uploads_dir / folder).mkdir(parents=True, exist_ok=True)


def grant_permissions_to_user(db_name, db_host, db_port, superuser, superuser_password, target_user, grant_superuser=True):
    """
    Выдать полные права пользователю на базу данных и схему public.
    
    Args:
        db_name: Имя базы данных
        db_host: Хост PostgreSQL
        db_port: Порт PostgreSQL
        superuser: Суперпользователь для подключения
        superuser_password: Пароль суперпользователя
        target_user: Пользователь, которому выдаём права
        grant_superuser: Выдать ли SUPERUSER роль (True для development)
    """
    try:
        # Подключаемся к postgres для выдачи роли SUPERUSER
        conn = psycopg2.connect(
            dbname='postgres',
            user=superuser,
            password=superuser_password,
            host=db_host,
            port=db_port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Проверяем существует ли пользователь
        cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (target_user,))
        user_exists = cursor.fetchone()
        
        if not user_exists:
            # Создаём пользователя если его нет
            password = os.getenv('POSTGRES_PASSWORD', 'local_password')
            cursor.execute(f"CREATE USER {target_user} WITH PASSWORD '{password}'")
            print(f"✅ Создан пользователь '{target_user}'")
        
        # Выдаём SUPERUSER роль для упрощения разработки
        if grant_superuser:
            cursor.execute(f"ALTER USER {target_user} WITH SUPERUSER")
            print(f"🔐 Выдана роль SUPERUSER пользователю '{target_user}'")
        
        cursor.close()
        conn.close()
        
        # Подключаемся к целевой БД для выдачи прав на схему
        conn = psycopg2.connect(
            dbname=db_name,
            user=superuser,
            password=superuser_password,
            host=db_host,
            port=db_port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print(f"🔐 Выдача прав пользователю '{target_user}' на схему public...")
        
        # Выдаём права на схему
        cursor.execute(f"GRANT ALL PRIVILEGES ON SCHEMA public TO {target_user}")
        cursor.execute(f"GRANT CREATE ON SCHEMA public TO {target_user}")
        cursor.execute(f"GRANT USAGE ON SCHEMA public TO {target_user}")
        
        # Выдаём права на все существующие таблицы и последовательности
        cursor.execute(f"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {target_user}")
        cursor.execute(f"GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {target_user}")
        
        # Выдаём права на будущие таблицы и последовательности
        cursor.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {target_user}")
        cursor.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {target_user}")
        
        # Делаем пользователя владельцем схемы
        cursor.execute(f"ALTER SCHEMA public OWNER TO {target_user}")
        
        print(f"✅ Права выданы пользователю '{target_user}'")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"⚠️  Предупреждение при выдаче прав пользователю '{target_user}': {e}")


def recreate_database():
    """Создать базу данных beauty_crm если её не существует"""
    import fcntl
    import time as time_module

    # Shared lock file for all DB operations (blocking - workers wait for each other)
    lock_file = Path(__file__).parent / '.db_operations.lock'
    lock_fd = open(lock_file, 'w')

    # Try to get lock with timeout (blocking)
    max_wait = 60  # Wait up to 60 seconds
    waited = 0
    got_lock = False
    while waited < max_wait:
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            got_lock = True
            break  # Got the lock
        except (IOError, OSError):
            print(f"⏳ Ожидание завершения операций с БД... ({waited}s)")
            time_module.sleep(2)
            waited += 2

    if not got_lock:
        print("⚠️ Таймаут ожидания блокировки, продолжаем без блокировки...")

    try:
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
        app_user = os.getenv('POSTGRES_USER', 'beauty_crm_user')
        superuser_password = os.getenv('POSTGRES_SUPERUSER_PASSWORD', os.getenv('POSTGRES_PASSWORD', ''))

        # ВАЖНО: Для операций CREATE DATABASE нужны права владельца БД или суперюзера
        # На production используем 'ubuntu', на macOS - текущий пользователь
        superuser = os.getenv('POSTGRES_SUPERUSER', 'postgres')

        print(f"⚙️  Параметры подключения: host={db_host}, superuser={superuser}, db={db_name}")
        print(f"⚙️  Пользователь приложения: {app_user}")

        print(f"🔄 Проверка базы данных '{db_name}'...")

        try:
            # Подключаемся к системной базе 'postgres'
            conn = psycopg2.connect(
                dbname='postgres',
                user=superuser,
                password=superuser_password,
                host=db_host,
                port=db_port
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()

            # Проверяем существует ли база
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
            exists = cursor.fetchone()

            if not exists:
                # Создаем базу только если её нет
                cursor.execute(f"CREATE DATABASE {db_name}")
                print(f"✅ База данных '{db_name}' создана")
            else:
                print(f"✅ База данных '{db_name}' уже существует")

            cursor.close()
            conn.close()

            # Выдаём права пользователю приложения
            # Всегда выдаём SUPERUSER для упрощения (выбор пользователя: вариант B)
            grant_permissions_to_user(db_name, db_host, db_port, superuser, superuser_password, app_user, grant_superuser=True)

            # Также выдаём права суперпользователю
            if superuser != app_user:
                grant_permissions_to_user(db_name, db_host, db_port, superuser, superuser_password, superuser, grant_superuser=True)


        except Exception as e:
            print(f"❌ Ошибка: {e}")
            # Пробуем альтернативный вариант подключения (если пользователь отличается)
            if "role" in str(e) and "does not exist" in str(e):
                print("⚠️  Попытка подключения с пользователем 'postgres'...")
                try:
                    conn = psycopg2.connect(
                        dbname='postgres',
                        user='postgres',
                        password=superuser_password,
                        host=db_host,
                        port=db_port
                    )
                    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                    cursor = conn.cursor()

                    cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
                    exists = cursor.fetchone()

                    if not exists:
                        cursor.execute(f"CREATE DATABASE {db_name}")
                        print(f"✅ База данных '{db_name}' создана (через user='postgres')")
                    else:
                        print(f"✅ База данных '{db_name}' уже существует")

                    cursor.close()
                    conn.close()

                    # Выдаём права через postgres суперпользователя
                    # Всегда выдаём SUPERUSER (выбор пользователя: вариант B)
                    grant_permissions_to_user(db_name, db_host, db_port, 'postgres', superuser_password, app_user, grant_superuser=True)
                    grant_permissions_to_user(db_name, db_host, db_port, 'postgres', superuser_password, 'postgres', grant_superuser=True)


                except Exception as e2:
                    print(f"❌ Критическая ошибка: {e2}")
    finally:
        # Release the lock
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_UN)
            lock_fd.close()
        except:
            pass


def drop_database():
    """Удалить базу данных beauty_crm (использовать с осторожностью!)"""
    import fcntl
    import time as time_module

    # Shared lock file for all DB operations (blocking - workers wait for each other)
    lock_file = Path(__file__).parent / '.db_operations.lock'
    lock_fd = open(lock_file, 'w')

    # Try to get lock with timeout (blocking)
    max_wait = 60  # Wait up to 60 seconds
    waited = 0
    got_lock = False
    while waited < max_wait:
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            got_lock = True
            break  # Got the lock
        except (IOError, OSError):
            print(f"⏳ Ожидание завершения операций с БД... ({waited}s)")
            time_module.sleep(2)
            waited += 2

    if not got_lock:
        print("⚠️ Таймаут ожидания блокировки, продолжаем без блокировки...")

    try:
        # 1. Определяем окружение и загружаем правильный .env файл
        env = os.getenv('ENVIRONMENT', 'development')
        env_file = '.env.production' if env == 'production' else '.env.local'

        # Путь к .env файлу
        root_dir = Path(__file__).parent.parent.parent
        dotenv_path = root_dir / env_file

        print(f"🔍 Загрузка конфигурации из: {env_file}")
        load_dotenv(dotenv_path)

        # 2. Читаем переменные
        db_name = os.getenv('POSTGRES_DB', 'beauty_crm')
        db_host = os.getenv('POSTGRES_HOST', 'localhost')
        db_port = os.getenv('POSTGRES_PORT', '5432')
        # ВАЖНО: Не использовать os.getenv('USER') - на сервере это вернет 'ubuntu' без доступа к PostgreSQL
        superuser = os.getenv('POSTGRES_SUPERUSER', 'postgres')
        superuser_password = os.getenv('POSTGRES_SUPERUSER_PASSWORD', os.getenv('POSTGRES_PASSWORD', ''))

        print(f"⚠️  ВНИМАНИЕ: Удаление базы данных '{db_name}'...")

        try:
            conn = psycopg2.connect(
                dbname='postgres',
                user=superuser,
                password=superuser_password,
                host=db_host,
                port=db_port
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()

            # Принудительно отключаем всех пользователей
            cursor.execute(f"""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '{db_name}'
                AND pid <> pg_backend_pid();
            """)

            # Удаляем базу
            cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
            print(f"✅ База данных '{db_name}' удалена")

            cursor.close()
            conn.close()

        except Exception as e:
            print(f"❌ Ошибка при удалении БД: {e}")
            # Пробуем через postgres
            try:
                conn = psycopg2.connect(
                    dbname='postgres',
                    user='postgres',
                    password=superuser_password,
                    host=db_host,
                    port=db_port
                )
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                cursor = conn.cursor()

                cursor.execute(f"""
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = '{db_name}'
                    AND pid <> pg_backend_pid();
                """)

                cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
                print(f"✅ База данных '{db_name}' удалена (через user='postgres')")

                cursor.close()
                conn.close()
            except Exception as e2:
                print(f"❌ Критическая ошибка при удалении: {e2}")
    finally:
        # Release the lock
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_UN)
            lock_fd.close()
        except:
            pass


if __name__ == '__main__':
    # Очищаем статику перед пересозданием базы
    clean_static_uploads()
    recreate_database()
