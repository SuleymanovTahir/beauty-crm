"""
Автоматический бэкап базы данных каждые 3 дня
Отправляет дамп БД директору в Telegram
"""
import os
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from db.connection import get_db_connection
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error
import asyncio

# Telegram Bot API
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_DIRECTOR_CHAT_ID = None  # Будет загружен из БД

async def send_telegram_file(chat_id: str, file_path: str, caption: str):
    """Отправить файл в Telegram"""
    try:
        import aiohttp
        
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendDocument"
        
        with open(file_path, 'rb') as file:
            form_data = aiohttp.FormData()
            form_data.add_field('chat_id', chat_id)
            form_data.add_field('caption', caption)
            form_data.add_field('document', file, filename=os.path.basename(file_path))
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=form_data) as response:
                    if response.status == 200:
                        log_info(f"✅ Backup sent to Telegram chat {chat_id}", "backup")
                        return True
                    else:
                        error_text = await response.text()
                        log_error(f"Failed to send backup to Telegram: {error_text}", "backup")
                        return False
    except Exception as e:
        log_error(f"Error sending backup to Telegram: {e}", "backup")
        return False

def create_database_backup() -> str:
    """Создать бэкап базы данных PostgreSQL"""
    try:
        # Создаем директорию для бэкапов если её нет
        backup_dir = Path("/tmp/beauty_crm_backups")
        backup_dir.mkdir(exist_ok=True)
        
        # Генерируем имя файла с датой
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"beauty_crm_backup_{timestamp}.sql"
        
        # Получаем параметры подключения из переменных окружения
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "5432")
        db_name = os.getenv("DB_NAME", DATABASE_NAME)
        db_user = os.getenv("DB_USER", "postgres")
        db_password = os.getenv("DB_PASSWORD", "")
        
        # Формируем команду pg_dump
        env = os.environ.copy()
        env["PGPASSWORD"] = db_password
        
        cmd = [
            "pg_dump",
            "-h", db_host,
            "-p", db_port,
            "-U", db_user,
            "-d", db_name,
            "-F", "p",  # Plain text format
            "-f", str(backup_file)
        ]
        
        log_info(f"🔧 Creating database backup: {backup_file}", "backup")
        
        # Выполняем команду
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        if result.returncode == 0:
            file_size = os.path.getsize(backup_file) / (1024 * 1024)  # MB
            log_info(f"✅ Database backup created successfully: {backup_file} ({file_size:.2f} MB)", "backup")
            return str(backup_file)
        else:
            log_error(f"pg_dump failed: {result.stderr}", "backup")
            return None
            
    except subprocess.TimeoutExpired:
        log_error("Database backup timed out (>5 minutes)", "backup")
        return None
    except Exception as e:
        log_error(f"Error creating database backup: {e}", "backup")
        return None

def get_director_telegram_id() -> str:
    """Получить Telegram ID директора из БД"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Ищем пользователя с ролью director и telegram_id
        c.execute("""
            SELECT telegram_id 
            FROM users 
            WHERE role = 'director' 
            AND telegram_id IS NOT NULL 
            AND telegram_id != ''
            LIMIT 1
        """)
        
        result = c.fetchone()
        conn.close()
        
        if result and result[0]:
            return result[0]
        else:
            log_error("Director's Telegram ID not found in database", "backup")
            return None
            
    except Exception as e:
        log_error(f"Error getting director's Telegram ID: {e}", "backup")
        return None

def should_run_backup() -> bool:
    """Проверить, нужно ли запускать бэкап (каждые 3 дня)"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Проверяем последний бэкап из таблицы system_tasks или создаем новую запись
        c.execute("""
            CREATE TABLE IF NOT EXISTS system_tasks (
                id SERIAL PRIMARY KEY,
                task_name VARCHAR(100) UNIQUE NOT NULL,
                last_run TIMESTAMP,
                next_run TIMESTAMP,
                status VARCHAR(50),
                metadata JSONB
            )
        """)
        
        c.execute("""
            SELECT last_run, next_run 
            FROM system_tasks 
            WHERE task_name = 'database_backup'
        """)
        
        result = c.fetchone()
        now = datetime.now()
        
        if not result:
            # Первый запуск - создаем запись
            next_run = now + timedelta(days=3)
            c.execute("""
                INSERT INTO system_tasks (task_name, last_run, next_run, status)
                VALUES ('database_backup', %s, %s, 'pending')
            """, (now, next_run))
            conn.commit()
            conn.close()
            return True
        
        last_run, next_run = result
        
        if now >= next_run:
            conn.close()
            return True
        else:
            conn.close()
            log_info(f"⏰ Next backup scheduled for: {next_run}", "backup")
            return False
            
    except Exception as e:
        log_error(f"Error checking backup schedule: {e}", "backup")
        return False

def update_backup_schedule():
    """Обновить расписание следующего бэкапа"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        now = datetime.now()
        next_run = now + timedelta(days=3)
        
        c.execute("""
            UPDATE system_tasks 
            SET last_run = %s, next_run = %s, status = 'completed'
            WHERE task_name = 'database_backup'
        """, (now, next_run))
        
        conn.commit()
        conn.close()
        
        log_info(f"📅 Next backup scheduled for: {next_run}", "backup")
        
    except Exception as e:
        log_error(f"Error updating backup schedule: {e}", "backup")

async def run_database_backup():
    """Основная функция для запуска бэкапа"""
    try:
        if not TELEGRAM_BOT_TOKEN:
            log_error("TELEGRAM_BOT_TOKEN not set in environment", "backup")
            return
        
        # Проверяем, нужно ли запускать бэкап
        if not should_run_backup():
            return
        
        log_info("🔄 Starting database backup process...", "backup")
        
        # Получаем Telegram ID директора
        director_chat_id = get_director_telegram_id()
        if not director_chat_id:
            log_error("Cannot send backup: Director's Telegram ID not found", "backup")
            return
        
        # Создаем бэкап
        backup_file = create_database_backup()
        if not backup_file:
            log_error("Failed to create database backup", "backup")
            return
        
        # Отправляем в Telegram
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        caption = f"🗄️ Автоматический бэкап базы данных\n📅 {timestamp}\n\n⚠️ Конфиденциально: только для директора"
        
        success = await send_telegram_file(director_chat_id, backup_file, caption)
        
        if success:
            # Обновляем расписание
            update_backup_schedule()
            
            # Удаляем локальный файл после отправки
            try:
                os.remove(backup_file)
                log_info(f"🗑️ Local backup file removed: {backup_file}", "backup")
            except Exception as e:
                log_error(f"Error removing backup file: {e}", "backup")
        else:
            log_error("Failed to send backup to Telegram", "backup")
        
    except Exception as e:
        log_error(f"Error in database backup process: {e}", "backup")

def check_database_backup():
    """Синхронная обертка для планировщика"""
    try:
        asyncio.run(run_database_backup())
    except Exception as e:
        log_error(f"Error running database backup: {e}", "backup")
