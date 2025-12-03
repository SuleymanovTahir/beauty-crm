# 🐘 Инструкция по установке PostgreSQL на продакшен-сервере

## Локальная настройка (Mac OS)

Если вы хотите протестировать миграцию локально перед деплоем:

1. **Установка PostgreSQL**
   - Скачайте и установите [Postgres.app](https://postgresapp.com/downloads.html)
   - Запустите приложение и нажмите "Initialize"
   - Дважды кликните на созданный сервер, чтобы открыть консоль

2. **Настройка терминала**
   Чтобы команды `psql` работали в терминале VS Code, выполните:
   ```bash
   sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp
   ```
   *(После этого перезапустите терминал)*

3. **Создание базы данных**
   ```bash
   # В терминале (или в консоли Postgres.app):
   createdb beauty_crm
   createuser beauty_crm_user
   psql -c "ALTER USER beauty_crm_user WITH PASSWORD 'local_password';"
   psql -c "GRANT ALL PRIVILEGES ON DATABASE beauty_crm TO beauty_crm_user;"
   ```

4. **Настройка .env**
   В файле `.env.local` (или `.env`):
   ```
   DATABASE_TYPE=postgresql
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=beauty_crm
   POSTGRES_USER=beauty_crm_user
   POSTGRES_PASSWORD=local_password
   ```

---

## Шаг 1: Установка PostgreSQL (на сервере)

```bash
# Подключиться к серверу
ssh ubuntu@91.201.215.32

# Обновить пакеты
sudo apt update

# Установить PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Проверить что PostgreSQL запущен
sudo systemctl status postgresql
```

## Шаг 2: Создание базы данных и пользователя

```bash
# Войти в PostgreSQL как пользователь postgres
sudo -u postgres psql

# В консоли PostgreSQL выполнить:
CREATE DATABASE beauty_crm;
CREATE USER beauty_crm_user WITH PASSWORD 'local_password';
GRANT ALL PRIVILEGES ON DATABASE beauty_crm TO beauty_crm_user;

# Для PostgreSQL 15+ также нужно:
\c beauty_crm
GRANT ALL ON SCHEMA public TO beauty_crm_user;

# Выйти из PostgreSQL
\q
```

## Шаг 3: Настройка переменных окружения

```bash
# Создать файл .env в директории backend
cd /home/ubuntu/beauty_crm/backend
nano .env
```

Добавить в файл `.env`:
```
DATABASE_TYPE=postgresql
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=beauty_crm
POSTGRES_USER=beauty_crm_user
POSTGRES_PASSWORD=local_password
```

Сохранить: `Ctrl+O → Enter → Ctrl+X`

## Шаг 4: Установка зависимостей

```bash
# Активировать виртуальное окружение
cd /home/ubuntu/beauty_crm/backend
source venv/bin/activate

# Установить новые зависимости
pip install -r requirements.txt
```

## Шаг 5: Создание бэкапа SQLite (важно!)

```bash
# Создать папку для бэкапов
mkdir -p /home/ubuntu/beauty_crm/backups

# Скопировать текущую базу данных
cp /home/ubuntu/beauty_crm/backend/salon_bot.db /home/ubuntu/beauty_crm/backups/salon_bot_$(date +%Y%m%d_%H%M%S).db

# Проверить что бэкап создан
ls -lh /home/ubuntu/beauty_crm/backups/
```

## Шаг 6: Миграция данных

```bash
# Убедиться что виртуальное окружение активно
cd /home/ubuntu/beauty_crm/backend
source venv/bin/activate

# Запустить скрипт миграции
python scripts/migrate_to_postgres.py
```

Скрипт покажет прогресс миграции. Ожидаемый вывод:
```
================================================================================
🚀 SQLite to PostgreSQL Migration
================================================================================
✅ Connected to SQLite: /home/ubuntu/beauty_crm/backend/salon_bot.db
✅ Connected to PostgreSQL
📝 Creating PostgreSQL schema...
✅ PostgreSQL schema created successfully
📦 Migrating table: salon_settings
✅ Migrated 1 rows from salon_settings
...
================================================================================
✅ Migration completed successfully!
📊 Total rows migrated: XXX
================================================================================
```

## Шаг 7: Перезапуск сервиса

```bash
# Остановить текущий сервис
sudo systemctl stop beauty_crm

# Перезапустить сервис
sudo systemctl start beauty_crm

# Проверить статус
sudo systemctl status beauty_crm

# Проверить логи
sudo journalctl -u beauty_crm -f --lines 50
```

Должны увидеть в логах:
```
✅ Автоопределение типа БД: postgresql
   PostgreSQL Database: beauty_crm @ localhost:5432
```

## Шаг 8: Проверка работы

```bash
# Проверить что API работает
curl http://localhost:8000/health

# Проверить что сайт работает
curl -I https://mlediamant.com
```

## Откат к SQLite (если что-то пошло не так)

```bash
# Остановить сервис
sudo systemctl stop beauty_crm

# Изменить .env файл
cd /home/ubuntu/beauty_crm/backend
nano .env

# Изменить DATABASE_TYPE на sqlite:
DATABASE_TYPE=sqlite

# Сохранить и выйти: Ctrl+O → Enter → Ctrl+X

# Перезапустить сервис
sudo systemctl start beauty_crm
sudo systemctl status beauty_crm
```

## Настройка автоматических бэкапов PostgreSQL

```bash
# Создать скрипт бэкапа
sudo nano /usr/local/bin/backup_beauty_crm.sh
```

Содержимое скрипта:
```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/beauty_crm/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/beauty_crm_$TIMESTAMP.sql"

# Создать бэкап
sudo -u postgres pg_dump beauty_crm > "$BACKUP_FILE"

# Сжать бэкап
gzip "$BACKUP_FILE"

# Удалить бэкапы старше 30 дней
find "$BACKUP_DIR" -name "beauty_crm_*.sql.gz" -mtime +30 -delete

echo "✅ Backup created: $BACKUP_FILE.gz"
```

Сделать скрипт исполняемым:
```bash
sudo chmod +x /usr/local/bin/backup_beauty_crm.sh
```

Добавить в crontab (ежедневный бэкап в 3:00):
```bash
crontab -e

# Добавить строку:
0 3 * * * /usr/local/bin/backup_beauty_crm.sh >> /home/ubuntu/beauty_crm/backups/backup.log 2>&1
```

## Готово! ✅

Теперь ваша CRM работает на PostgreSQL и больше не будет ошибок "database is locked"!
