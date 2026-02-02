#!/bin/bash
# Скрипт для настройки пользователя PostgreSQL beauty_crm_user

echo "🔧 Настройка пользователя PostgreSQL beauty_crm_user..."

# Пароль из .env.production
PASSWORD="local_password"

# Создаём пользователя и устанавливаем пароль
sudo -u postgres psql <<EOF
-- Создаём пользователя если не существует
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'beauty_crm_user') THEN
        CREATE USER beauty_crm_user WITH PASSWORD '$PASSWORD';
        RAISE NOTICE 'Пользователь beauty_crm_user создан';
    ELSE
        ALTER USER beauty_crm_user WITH PASSWORD '$PASSWORD';
        RAISE NOTICE 'Пароль для beauty_crm_user обновлён';
    END IF;
END
\$\$;

-- Выдаём SUPERUSER роль
ALTER USER beauty_crm_user WITH SUPERUSER;

-- Выдаём права на базу данных beauty_crm (если она существует)
-- Сначала проверяем существование базы
SELECT 'CREATE DATABASE beauty_crm' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'beauty_crm')\gexec

\c beauty_crm

-- Выдаём права на схему public
GRANT ALL PRIVILEGES ON SCHEMA public TO beauty_crm_user;
GRANT CREATE ON SCHEMA public TO beauty_crm_user;
GRANT USAGE ON SCHEMA public TO beauty_crm_user;

-- Делаем beauty_crm_user владельцем схемы
ALTER SCHEMA public OWNER TO beauty_crm_user;

-- Выдаём права на все существующие таблицы
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO beauty_crm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO beauty_crm_user;

-- Выдаём права на будущие таблицы
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO beauty_crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO beauty_crm_user;

\q
EOF

echo "✅ Пользователь beauty_crm_user настроен!"
echo "   Пароль: $PASSWORD"
echo "   Права: SUPERUSER, владелец схемы public"
echo ""
echo "🔄 Перезапустите сервис: sudo systemctl restart beauty_crm"
