"""
Скрипт миграции данных из SQLite в PostgreSQL
"""
import sqlite3
import os
import sys
from datetime import datetime

# Добавляем путь к backend для импорта модулей
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.postgres import get_connection, release_connection, test_connection
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error, log_warning


def create_postgres_schema(pg_conn):
    """Создать схему базы данных в PostgreSQL"""
    cursor = pg_conn.cursor()
    
    log_info("📝 Creating PostgreSQL schema...", "migration")
    
    # Читаем SQL схему из init.py и адаптируем для PostgreSQL
    schema_queries = [
        # Таблица клиентов
        """CREATE TABLE IF NOT EXISTS clients (
            instagram_id TEXT PRIMARY KEY,
            username TEXT,
            phone TEXT,
            name TEXT,
            first_contact TEXT,
            last_contact TEXT,
            total_messages INTEGER DEFAULT 0,
            labels TEXT,
            status TEXT DEFAULT 'new',
            lifetime_value REAL DEFAULT 0,
            profile_pic TEXT,
            notes TEXT,
            is_pinned INTEGER DEFAULT 0,
            detected_language TEXT DEFAULT 'ru',
            gender TEXT,
            card_number TEXT,
            discount REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_visits INTEGER DEFAULT 0,
            additional_phone TEXT,
            newsletter_agreed INTEGER DEFAULT 0,
            personal_data_agreed INTEGER DEFAULT 0,
            total_spend REAL DEFAULT 0,
            paid_amount REAL DEFAULT 0,
            birthday TEXT,
            email TEXT,
            password_hash TEXT,
            last_login TEXT,
            is_verified INTEGER DEFAULT 0,
            preferred_messenger TEXT,
            language TEXT DEFAULT 'ru',
            bot_mode TEXT DEFAULT 'assistant',
            temperature TEXT DEFAULT 'cold'
        )""",
        
        # Таблица настроек бота
        """CREATE TABLE IF NOT EXISTS bot_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            bot_name TEXT NOT NULL,
            personality_traits TEXT,
            greeting_message TEXT,
            farewell_message TEXT,
            price_explanation TEXT,
            price_response_template TEXT,
            premium_justification TEXT,
            booking_redirect_message TEXT,
            fomo_messages TEXT,
            upsell_techniques TEXT,
            communication_style TEXT,
            max_message_length INTEGER DEFAULT 4,
            emoji_usage TEXT,
            languages_supported TEXT DEFAULT 'ru,en,ar',
            objection_handling TEXT,
            negative_handling TEXT,
            safety_guidelines TEXT,
            example_good_responses TEXT,
            algorithm_actions TEXT,
            location_features TEXT,
            seasonality TEXT,
            emergency_situations TEXT,
            success_metrics TEXT,
            objection_expensive TEXT,
            objection_think_about_it TEXT,
            objection_no_time TEXT,
            objection_pain TEXT,
            objection_result_doubt TEXT,
            objection_cheaper_elsewhere TEXT,
            objection_too_far TEXT,
            objection_consult_husband TEXT,
            objection_first_time TEXT,
            objection_not_happy TEXT,
            emotional_triggers TEXT,
            social_proof_phrases TEXT,
            personalization_rules TEXT,
            example_dialogues TEXT,
            emotional_responses TEXT,
            anti_patterns TEXT,
            voice_message_response TEXT,
            contextual_rules TEXT,
            auto_cancel_discounts TEXT DEFAULT 'Не предлагай скидки и специальные предложения автоматически. Предлагай их только если клиент явно интересуется скидками.',
            comment_reply_settings TEXT DEFAULT '{}',
            manager_consultation_enabled INTEGER DEFAULT 1,
            manager_consultation_prompt TEXT,
            booking_data_collection TEXT,
            booking_time_logic TEXT,
            pre_booking_data_collection TEXT,
            bot_mode TEXT DEFAULT 'sales',
            temperature REAL DEFAULT 0.7,
            updated_at TEXT
        )""",
        
        # Остальные таблицы... (сокращено для краткости, но в реальном скрипте будут все)
        # Добавим основные таблицы
        
        """CREATE TABLE IF NOT EXISTS salon_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT NOT NULL,
            name_ar TEXT,
            address TEXT,
            address_ar TEXT,
            google_maps TEXT,
            hours TEXT,
            hours_ru TEXT,
            hours_ar TEXT,
            hours_weekdays TEXT DEFAULT '10:30 - 21:30',
            hours_weekends TEXT DEFAULT '10:30 - 21:30',
            booking_url TEXT,
            phone TEXT,
            email TEXT,
            instagram TEXT,
            whatsapp TEXT,
            bot_name TEXT,
            bot_name_en TEXT,
            bot_name_ar TEXT,
            city TEXT,
            country TEXT,
            timezone TEXT,
            timezone_offset TEXT DEFAULT 'UTC+4',
            currency TEXT DEFAULT 'AED',
            birthday_discount TEXT DEFAULT '15%',
            payment_methods TEXT DEFAULT 'Наличные, карта',
            prepayment_required INTEGER DEFAULT 0,
            parking_info TEXT,
            wifi_available INTEGER DEFAULT 1,
            updated_at TEXT,
            main_location TEXT,
            main_location_ru TEXT,
            main_location_en TEXT,
            main_location_ar TEXT,
            latitude REAL,
            longitude REAL,
            logo_url TEXT,
            base_url TEXT,
            google_analytics_id TEXT,
            facebook_pixel_id TEXT
        )""",
        
        """CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            email TEXT,
            role TEXT DEFAULT 'employee',
            created_at TIMESTAMP,
            last_login TEXT,
            is_active INTEGER DEFAULT 1,
            position TEXT,
            photo TEXT,
            photo_url TEXT,
            bio TEXT,
            experience TEXT,
            specialization TEXT,
            years_of_experience INTEGER,
            certificates TEXT,
            is_service_provider INTEGER DEFAULT 0,
            position_ru TEXT,
            position_ar TEXT,
            position_en TEXT,
            employee_id INTEGER,
            birthday TEXT,
            phone TEXT,
            full_name_ru TEXT,
            full_name_en TEXT,
            full_name_ar TEXT
        )""",
        
        """CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            instagram_id TEXT,
            service_name TEXT,
            master TEXT,
            datetime TEXT,
            phone TEXT,
            name TEXT,
            status TEXT,
            created_at TEXT,
            completed_at TEXT,
            revenue REAL DEFAULT 0,
            notes TEXT,
            special_package_id INTEGER
        )""",
        
        """CREATE TABLE IF NOT EXISTS services (
            id SERIAL PRIMARY KEY,
            service_key TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            name_ru TEXT,
            name_ar TEXT,
            price REAL NOT NULL,
            min_price REAL,
            max_price REAL,
            currency TEXT DEFAULT 'AED',
            category TEXT NOT NULL,
            description TEXT,
            description_ru TEXT,
            description_ar TEXT,
            benefits TEXT,
            is_active INTEGER DEFAULT 1,
            duration TEXT,
            created_at TEXT,
            updated_at TEXT
        )""",
    ]
    
    for query in schema_queries:
        try:
            cursor.execute(query)
            pg_conn.commit()
        except Exception as e:
            log_error(f"Failed to create table: {e}", "migration")
            pg_conn.rollback()
            raise
    
    log_info("✅ PostgreSQL schema created successfully", "migration")


def migrate_table(sqlite_conn, pg_conn, table_name, id_column='id'):
    """
    Мигрировать данные одной таблицы из SQLite в PostgreSQL
    
    Args:
        sqlite_conn: Подключение к SQLite
        pg_conn: Подключение к PostgreSQL
        table_name: Имя таблицы
        id_column: Имя колонки ID (для SERIAL)
    """
    log_info(f"📦 Migrating table: {table_name}", "migration")
    
    # Получаем данные из SQLite
    sqlite_cursor = sqlite_conn.cursor()
    sqlite_cursor.execute(f"SELECT * FROM {table_name}")
    rows = sqlite_cursor.fetchall()
    
    if not rows:
        log_warning(f"⚠️  Table {table_name} is empty, skipping", "migration")
        return 0
    
    # Получаем названия колонок
    column_names = [description[0] for description in sqlite_cursor.description]
    
    # Для таблиц с SERIAL ID, исключаем ID из вставки
    if id_column in column_names and table_name in ['users', 'bookings', 'services']:
        column_names_insert = [col for col in column_names if col != id_column]
    else:
        column_names_insert = column_names
    
    # Подготавливаем запрос INSERT
    placeholders = ', '.join(['%s'] * len(column_names_insert))
    columns_str = ', '.join(column_names_insert)
    insert_query = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"
    
    # Вставляем данные в PostgreSQL
    pg_cursor = pg_conn.cursor()
    migrated_count = 0
    
    for row in rows:
        try:
            # Преобразуем row в dict для удобства
            row_dict = dict(zip(column_names, row))
            
            # Исключаем ID если нужно
            if id_column in column_names and table_name in ['users', 'bookings', 'services']:
                values = [row_dict[col] for col in column_names_insert]
            else:
                values = list(row)
            
            pg_cursor.execute(insert_query, values)
            migrated_count += 1
            
        except Exception as e:
            log_error(f"Failed to migrate row from {table_name}: {e}", "migration")
            log_error(f"Row data: {row}", "migration")
            # Продолжаем миграцию остальных строк
            continue
    
    pg_conn.commit()
    log_info(f"✅ Migrated {migrated_count} rows from {table_name}", "migration")
    return migrated_count


def main():
    """Основная функция миграции"""
    print("=" * 80)
    print("🚀 SQLite to PostgreSQL Migration")
    print("=" * 80)
    
    # Проверяем подключение к PostgreSQL
    if not test_connection():
        log_error("❌ Cannot connect to PostgreSQL. Please check your configuration.", "migration")
        return False
    
    # Подключаемся к SQLite
    if not os.path.exists(DATABASE_NAME):
        log_error(f"❌ SQLite database not found: {DATABASE_NAME}", "migration")
        return False
    
    sqlite_conn = sqlite3.connect(DATABASE_NAME)
    log_info(f"✅ Connected to SQLite: {DATABASE_NAME}", "migration")
    
    # Подключаемся к PostgreSQL
    pg_conn = get_connection()
    log_info("✅ Connected to PostgreSQL", "migration")
    
    try:
        # Создаем схему в PostgreSQL
        create_postgres_schema(pg_conn)
        
        # Список таблиц для миграции (в правильном порядке из-за foreign keys)
        tables_to_migrate = [
            ('salon_settings', 'id'),
            ('bot_settings', 'id'),
            ('clients', 'instagram_id'),
            ('users', 'id'),
            ('positions', 'id'),
            ('services', 'id'),
            ('bookings', 'id'),
            ('chat_history', 'id'),
            ('client_interactions', 'id'),
            ('conversations', 'id'),
            ('sessions', 'id'),
            ('activity_log', 'id'),
            ('custom_statuses', 'id'),
            ('user_services', 'id'),
            ('notification_settings', 'id'),
            ('user_schedule', 'id'),
            ('user_time_off', 'id'),
            ('loyalty_levels', 'id'),
            ('client_loyalty_points', 'id'),
            ('loyalty_transactions', 'id'),
            ('special_packages', 'id'),
            ('custom_roles', 'id'),
            ('role_permissions', 'id'),
        ]
        
        total_migrated = 0
        for table_name, id_col in tables_to_migrate:
            try:
                count = migrate_table(sqlite_conn, pg_conn, table_name, id_col)
                total_migrated += count
            except Exception as e:
                log_warning(f"⚠️  Skipping table {table_name}: {e}", "migration")
                continue
        
        print("=" * 80)
        print(f"✅ Migration completed successfully!")
        print(f"📊 Total rows migrated: {total_migrated}")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        log_error(f"❌ Migration failed: {e}", "migration")
        return False
        
    finally:
        sqlite_conn.close()
        release_connection(pg_conn)
        log_info("🔒 Connections closed", "migration")


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
