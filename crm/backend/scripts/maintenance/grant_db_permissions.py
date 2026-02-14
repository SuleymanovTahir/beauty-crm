#!/usr/bin/env python3
"""
Скрипт для предоставления прав пользователю beauty_crm_user на схему public
"""
import os
import sys
from pathlib import Path
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Добавляем путь к корню проекта
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

def grant_permissions():
    """Предоставить права пользователю на базу данных"""
    
    # Загружаем .env
    env = os.getenv('ENVIRONMENT', 'development')
    env_file = '.env.production' if env == 'production' else '.env.local'
    root_dir = Path(__file__).parent.parent.parent
    dotenv_path = root_dir / env_file
    
    print(f"🔍 Загрузка конфигурации из: {env_file}")
    load_dotenv(dotenv_path)
    
    db_name = os.getenv('POSTGRES_DB', 'beauty_crm')
    db_user = os.getenv('POSTGRES_USER', 'beauty_crm_user')
    db_host = os.getenv('POSTGRES_HOST', 'localhost')
    db_port = os.getenv('POSTGRES_PORT', '5432')
    
    # Для предоставления прав нужно подключиться как суперпользователь
    # На macOS с Postgres.app обычно используется текущий пользователь системы
    superuser = os.getenv('USER', 'postgres')  # Текущий пользователь macOS
    
    print(f"⚙️  База данных: {db_name}")
    print(f"⚙️  Пользователь для прав: {db_user}")
    print(f"⚙️  Подключение как: {superuser}")
    
    try:
        # Подключаемся к базе данных как суперпользователь
        conn = psycopg2.connect(
            dbname=db_name,
            user=superuser,
            host=db_host,
            port=db_port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print(f"\n🔐 Предоставление прав пользователю '{db_user}'...")
        
        # Создаем пользователя если его нет
        cursor.execute(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '{db_user}') THEN
                    CREATE USER {db_user};
                END IF;
            END
            $$;
        """)
        print(f"✅ Пользователь '{db_user}' существует")
        
        # Предоставляем все права на базу данных
        cursor.execute(f"GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {db_user}")
        print(f"✅ Права на базу данных предоставлены")
        
        # Предоставляем права на схему public
        cursor.execute(f"GRANT ALL ON SCHEMA public TO {db_user}")
        print(f"✅ Права на схему public предоставлены")
        
        # Предоставляем права на все таблицы в схеме public (если они есть)
        cursor.execute(f"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {db_user}")
        print(f"✅ Права на существующие таблицы предоставлены")
        
        # Предоставляем права на все последовательности (sequences)
        cursor.execute(f"GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {db_user}")
        print(f"✅ Права на последовательности предоставлены")
        
        # Устанавливаем права по умолчанию для будущих объектов
        cursor.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {db_user}")
        cursor.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {db_user}")
        print(f"✅ Права по умолчанию установлены")
        
        cursor.close()
        conn.close()
        
        print(f"\n✅ Все права успешно предоставлены пользователю '{db_user}'!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        print(f"\n💡 Попробуйте выполнить вручную:")
        print(f"   psql -d {db_name} -c \"GRANT ALL ON SCHEMA public TO {db_user};\"")
        sys.exit(1)

if __name__ == '__main__':
    grant_permissions()
