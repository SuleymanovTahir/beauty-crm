"""
Инициализация единой базы данных системы
Единый источник истины (SSOT) для схемы CRM
"""
from core.config import (
    DATABASE_NAME, 
    SALON_PHONE_DEFAULT, 
    SALON_EMAIL_DEFAULT
)
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from utils.language_utils import SUPPORTED_LANGUAGES
import os
import json

def init_database():
    """Создать всю схему системы с нуля или синхронизировать существующие таблицы."""
    conn = get_db_connection()
    c = conn.cursor()

    # Advisory lock to prevent multiple workers from running migrations simultaneously
    # Lock ID 12345 is arbitrary but must be unique for this operation
    c.execute("SELECT pg_try_advisory_lock(12345)")
    got_lock = c.fetchone()[0]
    if not got_lock:
        log_info("⏳ Другой процесс уже выполняет миграции, пропускаем...", "db")
        conn.close()
        return

    def add_column_if_not_exists(table, column, definition):
        """Add column if it doesn't exist - uses main cursor to see uncommitted tables"""
        try:
            # Use main cursor (c) to see tables created in current transaction
            # Check if column already exists
            c.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = %s AND column_name = %s
                )
            """, (table, column))
            if c.fetchone()[0]:
                return  # Column already exists, skip

            # Check if table exists
            c.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = %s
                )
            """, (table,))
            if not c.fetchone()[0]:
                return  # Table doesn't exist yet, skip

            # Add the column
            c.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {definition}")
        except Exception as e:
            log_error(f"Ошибка при добавлении колонки {column} в {table}: {e}", "db")

    def ensure_fk_cascade(table, column, ref_table, ref_column):
        """Гарантирует, что внешний ключ имеет ON DELETE CASCADE"""
        try:
            # Check if tables exist first
            c.execute("""
                SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = %s)
            """, (table,))
            if not c.fetchone()[0]:
                return
            c.execute("""
                SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = %s)
            """, (ref_table,))
            if not c.fetchone()[0]:
                return

            # Ищем имя существующего ограничения
            c.execute(f"""
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = '{table}'::regclass
                AND confrelid = '{ref_table}'::regclass
                AND contype = 'f'
            """)
            constraints = c.fetchall()
            for con in constraints:
                con_name = con[0]
                c.execute(f"ALTER TABLE {table} DROP CONSTRAINT {con_name}")

            # Создаем новое со стандартным именем
            new_con_name = f"{table}_{column}_fkey"
            c.execute(f"""
                ALTER TABLE {table}
                ADD CONSTRAINT {new_con_name}
                FOREIGN KEY ({column}) REFERENCES {ref_table}({ref_column}) ON DELETE CASCADE
            """)
        except Exception as e:
            # Silently ignore FK cascade errors - not critical
            pass

    log_info("🔌 Инициализация единой схемы базы данных...", "db")
    
    try:
        # --- 1. ЯДРО СИСТЕМЫ ---
        
        # Основной справочник статусов и этапов для всех сущностей
        c.execute('''CREATE TABLE IF NOT EXISTS workflow_stages (
            id SERIAL PRIMARY KEY,
            entity_type TEXT NOT NULL,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#3b82f6',
            sort_order INTEGER DEFAULT 0,
            is_system BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(entity_type, name)
        )''')
        # Migrations for workflow_stages
        add_column_if_not_exists('workflow_stages', 'entity_type', "TEXT NOT NULL DEFAULT 'task'")
        add_column_if_not_exists('workflow_stages', 'color', "TEXT DEFAULT '#3b82f6'")
        add_column_if_not_exists('workflow_stages', 'sort_order', 'INTEGER DEFAULT 0')
        add_column_if_not_exists('workflow_stages', 'is_system', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('workflow_stages', 'is_default', 'BOOLEAN DEFAULT FALSE')

        # Unified Media & Asset Library
        c.execute('''CREATE TABLE IF NOT EXISTS media_library (
            id SERIAL PRIMARY KEY,
            url TEXT NOT NULL,
            context TEXT NOT NULL DEFAULT 'general',
            title TEXT,
            description TEXT,
            category TEXT,
            sort_order INTEGER DEFAULT 0,
            client_id TEXT,
            user_id INTEGER,
            booking_id INTEGER,
            is_public BOOLEAN DEFAULT TRUE,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Unified Communication & Notification Log
        c.execute('''CREATE TABLE IF NOT EXISTS unified_communication_log (
            id SERIAL PRIMARY KEY,
            client_id TEXT,
            user_id INTEGER,
            booking_id INTEGER, -- Link to specific booking
            medium TEXT NOT NULL,
            trigger_type TEXT,
            title TEXT,
            content TEXT,
            status TEXT DEFAULT 'sent',
            is_read BOOLEAN DEFAULT FALSE,
            action_url TEXT,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        # Migrations for unified_communication_log
        add_column_if_not_exists('unified_communication_log', 'trigger_type', 'TEXT')
        add_column_if_not_exists('unified_communication_log', 'title', 'TEXT')
        add_column_if_not_exists('unified_communication_log', 'content', 'TEXT')
        add_column_if_not_exists('unified_communication_log', 'is_read', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('unified_communication_log', 'action_url', 'TEXT')
        add_column_if_not_exists('unified_communication_log', 'error_message', 'TEXT')

        # Add indexes for speed (Unread count queries)
        c.execute("CREATE INDEX IF NOT EXISTS idx_unified_log_user_unread ON unified_communication_log (user_id, is_read, medium)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_unified_log_client_id ON unified_communication_log (client_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_unified_log_booking_id ON unified_communication_log (booking_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_unified_log_user_id ON unified_communication_log (user_id)")

        # Broadcast History (Batches)
        c.execute('''CREATE TABLE IF NOT EXISTS broadcast_history (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER,
            subscription_type TEXT,
            channels TEXT,
            subject TEXT,
            message TEXT,
            target_role TEXT,
            total_sent INTEGER DEFAULT 0,
            results TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Scheduled Notifications Queue
        c.execute('''CREATE TABLE IF NOT EXISTS notification_history (
            id SERIAL PRIMARY KEY,
            title TEXT,
            message TEXT,
            notification_type TEXT,
            recipients_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            scheduled BOOLEAN DEFAULT FALSE,
            schedule_datetime TIMESTAMP,
            repeat_enabled BOOLEAN DEFAULT FALSE,
            repeat_interval TEXT,
            repeat_end_date DATE,
            target_segment TEXT,
            filter_params JSONB,
            sent_at TIMESTAMP,
            sent_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # --- 2. BASE ENTITIES ---

        # Users and Staff
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            email TEXT, phone TEXT, role TEXT DEFAULT 'employee',
            secondary_role TEXT,
            position TEXT,
            position_id INTEGER,
            employee_id TEXT,
            photo TEXT, photo_url TEXT,
            birthday TEXT,
            gender TEXT DEFAULT 'female',
            bio TEXT, experience TEXT, years_of_experience INTEGER,
            specialization TEXT,
            nickname TEXT,
            base_salary REAL DEFAULT 0, commission_rate REAL DEFAULT 0,
            telegram_id TEXT, telegram_chat_id TEXT, telegram_username TEXT, instagram_username TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            is_service_provider BOOLEAN DEFAULT FALSE,
            is_public_visible BOOLEAN DEFAULT TRUE,
            email_verified BOOLEAN DEFAULT FALSE,
            verification_code TEXT,
            verification_code_expires TIMESTAMP,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP, deleted_at TIMESTAMP NULL
        )''')
        
        # Migrations for users
        add_column_if_not_exists('users', 'birthday', 'TEXT')
        add_column_if_not_exists('users', 'gender', "TEXT DEFAULT 'female'")
        add_column_if_not_exists('users', 'secondary_role', 'TEXT')
        add_column_if_not_exists('users', 'position_id', 'INTEGER')
        add_column_if_not_exists('users', 'employee_id', 'TEXT')
        add_column_if_not_exists('users', 'email_verified', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('users', 'verification_code', 'TEXT')
        add_column_if_not_exists('users', 'verification_code_expires', 'TIMESTAMP')
        add_column_if_not_exists('users', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        add_column_if_not_exists('users', 'phone', 'TEXT')
        add_column_if_not_exists('users', 'telegram_username', 'TEXT')
        add_column_if_not_exists('users', 'nickname', 'TEXT')
        add_column_if_not_exists('users', 'email_verification_token', 'TEXT')
        add_column_if_not_exists('users', 'privacy_accepted', 'INTEGER DEFAULT 0')
        add_column_if_not_exists('users', 'privacy_accepted_at', 'TIMESTAMP')
        add_column_if_not_exists('users', 'password_reset_token', 'TEXT')
        add_column_if_not_exists('users', 'password_reset_expires', 'TIMESTAMP')
        add_column_if_not_exists('users', 'assigned_employee_id', 'INTEGER')

        # Soft Delete Tracking (Trash) - REQUIRED by housekeeping
        c.execute('''CREATE TABLE IF NOT EXISTS deleted_items (
            id SERIAL PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            data JSONB,
            reason TEXT,
            deleted_by INTEGER REFERENCES users(id),
            can_restore BOOLEAN DEFAULT TRUE,
            restored_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('deleted_items', 'deleted_by', 'INTEGER REFERENCES users(id)')

        # --- 3. RINGTONES (New) ---
        c.execute('''CREATE TABLE IF NOT EXISTS ringtones (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            is_system BOOLEAN DEFAULT FALSE,
            start_time FLOAT DEFAULT 0.0,
            end_time FLOAT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('ringtones', 'start_time', 'FLOAT DEFAULT 0.0')
        add_column_if_not_exists('ringtones', 'end_time', 'FLOAT DEFAULT NULL')
        
        # Seed default ringtones if empty
        c.execute("SELECT COUNT(*) FROM ringtones")
        if c.fetchone()[0] == 0:
            default_ringtones = [
                ('Apple iOS', '/audio/ringtones/apple_default.mp3'),
                ('iPhone old', '/audio/ringtones/iphone_xylophone.mp3'),
                ('Marimba', '/audio/ringtones/marimba.mp3'),
                ('Samsung Galaxy', '/audio/ringtones/samsung_galaxy.mp3'),
                ('Huawei Tune', '/audio/ringtones/huawei.mp3'),
                ('MIUI 8', '/audio/ringtones/miui.mp3'),
                ('Nokia Guitar', '/audio/ringtones/nokia_guitar.mp3'),
                ('Motorola', '/audio/ringtones/motorola_c350.mp3'),
                ('Sony Ericsson', '/audio/ringtones/sony_ericsson.mp3'),
                ('LG Prada', '/audio/ringtones/lg_prada.mp3'),
                ('Lumia Retro', '/audio/ringtones/lumia_retro.mp3'),
                ('Viber', '/audio/ringtones/viber.mp3'),
                ('Hangouts', '/audio/ringtones/hangouts.mp3'),
                ('Xperia Breeze', '/audio/ringtones/xperia_breeze.mp3'),
                ('Пульс', '/audio/ringtones/standard_7.mp3')
            ]
            for name, url in default_ringtones:
                c.execute("INSERT INTO ringtones (name, url, is_system) VALUES (%s, %s, TRUE)", (name, url))
            log_info("🎵 Ringtone defaults seeded.", "db")

        # --- END BASE COLUMNS (MOVED TO END) ---
        
        # Schema initialization for salon_settings
        c.execute('''CREATE TABLE IF NOT EXISTS salon_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT,
            address TEXT, 
            google_maps TEXT,
            hours_weekdays TEXT DEFAULT '10:30 - 21:00',
            hours_weekends TEXT DEFAULT '10:30 - 21:00',
            hours TEXT,
            lunch_start TEXT,
            lunch_end TEXT,
            phone TEXT, email TEXT,
            whatsapp TEXT, instagram TEXT,
            booking_url TEXT, timezone TEXT DEFAULT 'Asia/Dubai',
            timezone_offset INTEGER DEFAULT 4,
            currency TEXT DEFAULT 'AED',
            city TEXT, country TEXT,
            latitude REAL, longitude REAL,
            logo_url TEXT, base_url TEXT,
            main_location TEXT,
            bot_name TEXT, bot_config JSONB DEFAULT '{}',
            messenger_config JSONB DEFAULT '[]',
            menu_config JSONB DEFAULT '{}',
            custom_settings JSONB DEFAULT '{}',
            feature_flags JSONB DEFAULT '{}',
            loyalty_points_conversion_rate REAL DEFAULT 0.1,
            points_expiration_days INTEGER DEFAULT 365,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('salon_settings', 'lunch_start', 'TEXT')
        add_column_if_not_exists('salon_settings', 'lunch_end', 'TEXT')
        add_column_if_not_exists('salon_settings', 'timezone_offset', 'INTEGER DEFAULT 4')
        add_column_if_not_exists('salon_settings', 'main_location', 'TEXT')
        add_column_if_not_exists('salon_settings', 'loyalty_points_conversion_rate', 'REAL DEFAULT 0.1')
        add_column_if_not_exists('salon_settings', 'points_expiration_days', 'INTEGER DEFAULT 365')


        # Registration Audit Log
        c.execute('''CREATE TABLE IF NOT EXISTS registration_audit (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            action TEXT, -- 'approved', 'rejected', 'deleted'
            approved_by INTEGER,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # User Notification Settings
        c.execute('''CREATE TABLE IF NOT EXISTS notification_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) NOT NULL,
            email_notifications BOOLEAN DEFAULT TRUE,
            sms_notifications BOOLEAN DEFAULT FALSE,
            booking_notifications BOOLEAN DEFAULT TRUE,
            chat_notifications BOOLEAN DEFAULT TRUE,
            daily_report BOOLEAN DEFAULT TRUE,
            report_time TEXT DEFAULT '21:00',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
        )''')

        # Activity Log for user actions
        c.execute('''CREATE TABLE IF NOT EXISTS activity_log (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id TEXT,
            details TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Services and Pricing
        c.execute('''CREATE TABLE IF NOT EXISTS services (
            id SERIAL PRIMARY KEY,
            service_key TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category TEXT,
            price REAL NOT NULL,
            min_price REAL,
            max_price REAL,
            currency TEXT DEFAULT 'AED',
            duration TEXT, -- '60', '30 min', etc.
            description TEXT,
            benefits TEXT, -- '|' separated list
            position_id INTEGER, -- Primary position for this service
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        add_column_if_not_exists('services', 'name', 'TEXT')
        add_column_if_not_exists('services', 'description', 'TEXT')

        # Master-Service Mapping
        c.execute('''CREATE TABLE IF NOT EXISTS user_services (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
            price REAL,
            duration INTEGER,
            price_override REAL, -- Deprecated but kept for compatibility
            is_online_booking_enabled BOOLEAN DEFAULT TRUE,
            is_calendar_enabled BOOLEAN DEFAULT TRUE,
            UNIQUE(user_id, service_id)
        )''')
        
        add_column_if_not_exists('services', 'position_id', 'INTEGER')
        add_column_if_not_exists('user_services', 'price', 'REAL')
        add_column_if_not_exists('user_services', 'price_min', 'REAL')
        add_column_if_not_exists('user_services', 'price_max', 'REAL')
        add_column_if_not_exists('user_services', 'duration', 'INTEGER')
        add_column_if_not_exists('user_services', 'is_online_booking_enabled', 'BOOLEAN DEFAULT TRUE')
        add_column_if_not_exists('user_services', 'is_calendar_enabled', 'BOOLEAN DEFAULT TRUE')

        # Staff Schedules
        c.execute('''CREATE TABLE IF NOT EXISTS user_schedule (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            day_of_week INTEGER NOT NULL,
            start_time TEXT DEFAULT '10:30',
            end_time TEXT DEFAULT '21:00',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, day_of_week)
        )''')

        # Staff Time Off
        c.execute('''CREATE TABLE IF NOT EXISTS user_time_off (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            start_date TIMESTAMP NOT NULL,
            end_date TIMESTAMP NOT NULL,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Clients and CRM Profiles
        c.execute('''CREATE TABLE IF NOT EXISTS clients (
            instagram_id TEXT PRIMARY KEY,
            username TEXT, phone TEXT, name TEXT, email TEXT,
            password_hash TEXT, status TEXT DEFAULT 'new',
            language TEXT DEFAULT 'ru',
            pipeline_stage_id INTEGER REFERENCES workflow_stages(id),
            loyalty_points INTEGER DEFAULT 0,
            lifetime_value REAL DEFAULT 0,
            total_visits INTEGER DEFAULT 0,
            total_spend REAL DEFAULT 0,
            birthday TEXT, gender TEXT, profile_pic TEXT, notes TEXT,
            temperature TEXT DEFAULT 'cold',
            is_verified BOOLEAN DEFAULT FALSE,
            assigned_employee_id INTEGER REFERENCES users(id),
            reminder_date TIMESTAMP,
            first_contact TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP NULL
        )''')

        add_column_if_not_exists('clients', 'first_contact', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        add_column_if_not_exists('clients', 'last_contact', 'TIMESTAMP')
        add_column_if_not_exists('clients', 'total_messages', 'INTEGER DEFAULT 0')
        add_column_if_not_exists('clients', 'labels', 'TEXT')
        add_column_if_not_exists('clients', 'is_pinned', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('clients', 'phone', 'TEXT')
        add_column_if_not_exists('clients', 'source', 'TEXT')
        add_column_if_not_exists('clients', 'detected_language', 'TEXT')
        add_column_if_not_exists('clients', 'card_number', 'TEXT')
        add_column_if_not_exists('clients', 'discount', 'REAL DEFAULT 0')
        add_column_if_not_exists('clients', 'age', 'INTEGER')
        add_column_if_not_exists('clients', 'birth_date', 'TEXT')
        add_column_if_not_exists('clients', 'referral_code', 'TEXT')
        add_column_if_not_exists('clients', 'telegram_id', 'TEXT')
        add_column_if_not_exists('clients', 'pipeline_stage_id', 'INTEGER')

        # --- 3. OPERATIONAL LOGIC ---

        # Bookings and Appointments
        c.execute('''CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            instagram_id TEXT REFERENCES clients(instagram_id) ON DELETE SET NULL,
            service_id INTEGER REFERENCES services(id),
            service_name TEXT, master TEXT,
            datetime TIMESTAMP NOT NULL,
            status TEXT DEFAULT 'pending',
            revenue REAL DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP NULL
        )''')

        add_column_if_not_exists('bookings', 'source', "TEXT DEFAULT 'manual'")
        add_column_if_not_exists('bookings', 'phone', 'TEXT')
        add_column_if_not_exists('bookings', 'name', 'TEXT')
        add_column_if_not_exists('bookings', 'feedback_requested', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('bookings', 'reminder_sent_24h', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('bookings', 'reminder_sent_2h', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('bookings', 'special_package_id', 'INTEGER')
        add_column_if_not_exists('bookings', 'user_id', 'INTEGER')

        # Tasks and Project Management
        c.execute('''CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            stage_id INTEGER REFERENCES workflow_stages(id),
            priority TEXT DEFAULT 'medium',
            due_date TIMESTAMP,
            assignee_id INTEGER REFERENCES users(id),
            created_by INTEGER REFERENCES users(id),
            client_id TEXT REFERENCES clients(instagram_id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP NULL
        )''')

        # Multiple task assignees support
        c.execute('''CREATE TABLE IF NOT EXISTS task_assignees (
            task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            PRIMARY KEY(task_id, user_id)
        )''')

        # --- 4. DOCUMENTS & FINANCE ---

        # Invoices
        c.execute('''CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            invoice_number TEXT UNIQUE NOT NULL,
            client_id TEXT REFERENCES clients(instagram_id),
            booking_id INTEGER REFERENCES bookings(id),
            status TEXT DEFAULT 'draft',
            stage_id INTEGER REFERENCES workflow_stages(id),
            total_amount REAL DEFAULT 0,
            paid_amount REAL DEFAULT 0,
            currency TEXT DEFAULT 'AED',
            items JSONB DEFAULT '[]',
            notes TEXT, pdf_path TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Contracts
        c.execute('''CREATE TABLE IF NOT EXISTS contracts (
            id SERIAL PRIMARY KEY,
            contract_number TEXT UNIQUE NOT NULL,
            client_id TEXT REFERENCES clients(instagram_id),
            booking_id INTEGER REFERENCES bookings(id),
            contract_type TEXT DEFAULT 'service',
            template_name TEXT DEFAULT 'default',
            status TEXT DEFAULT 'draft',
            stage_id INTEGER REFERENCES workflow_stages(id),
            data JSONB DEFAULT '{}',
            pdf_path TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            signed_at TIMESTAMP
        )''')

        # --- 5. LOGS & ANALYTICS ---

        # Audit Trial
        c.execute('''CREATE TABLE IF NOT EXISTS audit_log (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            user_role TEXT,
            username TEXT,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id TEXT,
            old_data JSONB,
            new_data JSONB,
            ip_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        add_column_if_not_exists('audit_log', 'user_role', 'TEXT')
        add_column_if_not_exists('audit_log', 'username', 'TEXT')

        # Critical Actions (Actions that require director notification)
        c.execute('''CREATE TABLE IF NOT EXISTS critical_actions (
            id SERIAL PRIMARY KEY,
            audit_log_id INTEGER REFERENCES audit_log(id) ON DELETE CASCADE,
            notified BOOLEAN DEFAULT FALSE,
            notification_sent_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        c.execute("CREATE INDEX IF NOT EXISTS idx_critical_actions_notified ON critical_actions (notified)")

        # Visitor Tracking
        c.execute('''CREATE TABLE IF NOT EXISTS visitor_tracking (
            id SERIAL PRIMARY KEY,
            ip_address TEXT,
            ip_hash TEXT,
            latitude REAL,
            longitude REAL,
            city TEXT,
            country TEXT,
            distance_km REAL,
            is_local BOOLEAN,
            user_agent TEXT,
            page_url TEXT,
            referrer TEXT,
            device_type TEXT,
            browser TEXT,
            visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        add_column_if_not_exists('visitor_tracking', 'ip_hash', 'TEXT')
        add_column_if_not_exists('visitor_tracking', 'latitude', 'REAL')
        add_column_if_not_exists('visitor_tracking', 'longitude', 'REAL')
        add_column_if_not_exists('visitor_tracking', 'city', 'TEXT')
        add_column_if_not_exists('visitor_tracking', 'country', 'TEXT')
        add_column_if_not_exists('visitor_tracking', 'distance_km', 'REAL')
        add_column_if_not_exists('visitor_tracking', 'is_local', 'BOOLEAN')
        add_column_if_not_exists('visitor_tracking', 'visited_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        
        # Rename created_at to visited_at if it exists (use separate connection)
        try:
            rename_conn = get_db_connection()
            rename_conn._conn.autocommit = True
            rc = rename_conn.cursor()
            rc.execute("""
                SELECT count(*)
                FROM information_schema.columns
                WHERE table_name = 'visitor_tracking' AND column_name = 'created_at'
            """)
            if rc.fetchone()[0] > 0:
                rc.execute("ALTER TABLE visitor_tracking RENAME COLUMN created_at TO visited_at")
            rename_conn.close()
        except Exception as e:
            print(f"⚠️ Could not rename created_at: {e}")

        # Bot Analytics
        c.execute('''CREATE TABLE IF NOT EXISTS bot_analytics (
            id SERIAL PRIMARY KEY,
            instagram_id TEXT NOT NULL,
            session_started TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            session_ended TIMESTAMP,
            messages_count INTEGER DEFAULT 0,
            outcome TEXT DEFAULT 'in_progress',
            booking_created BOOLEAN DEFAULT FALSE,
            escalated_to_manager BOOLEAN DEFAULT FALSE,
            cancellation_requested BOOLEAN DEFAULT FALSE,
            booking_id INTEGER,
            language_detected TEXT,
            last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            context TEXT,
            reminder_sent BOOLEAN DEFAULT FALSE,
            metric_key TEXT, -- Compatibility
            metric_value REAL DEFAULT 0 -- Compatibility
        )''')

        add_column_if_not_exists('bot_analytics', 'context', 'TEXT')
        add_column_if_not_exists('bot_analytics', 'reminder_sent', 'BOOLEAN DEFAULT FALSE')

        # Drop NotNull if exists from old schema
        try:
            c.execute("ALTER TABLE bot_analytics ALTER COLUMN metric_key DROP NOT NULL")
        except:
            pass

        add_column_if_not_exists('bot_analytics', 'instagram_id', 'TEXT')

        add_column_if_not_exists('bot_analytics', 'instagram_id', 'TEXT')
        add_column_if_not_exists('bot_analytics', 'session_started', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        add_column_if_not_exists('bot_analytics', 'session_ended', 'TIMESTAMP')
        add_column_if_not_exists('bot_analytics', 'messages_count', 'INTEGER DEFAULT 0')
        add_column_if_not_exists('bot_analytics', 'outcome', "TEXT DEFAULT 'in_progress'")
        add_column_if_not_exists('bot_analytics', 'booking_created', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('bot_analytics', 'escalated_to_manager', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('bot_analytics', 'cancellation_requested', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('bot_analytics', 'booking_id', 'INTEGER')
        add_column_if_not_exists('bot_analytics', 'language_detected', 'TEXT')
        add_column_if_not_exists('bot_analytics', 'last_message_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')

        # Должности (Positions)
        c.execute('''CREATE TABLE IF NOT EXISTS positions (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Связь Услуги - Должности (Service-Position mapping)
        c.execute('''CREATE TABLE IF NOT EXISTS service_positions (
            service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
            position_id INTEGER REFERENCES positions(id) ON DELETE CASCADE,
            PRIMARY KEY (service_id, position_id)
        )''')

        # Предпочтения клиентов (Client Preferences)
        c.execute('''CREATE TABLE IF NOT EXISTS client_preferences (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id) ON DELETE CASCADE UNIQUE,
            preferred_master TEXT,
            preferred_service TEXT,
            preferred_day_of_week TEXT,
            preferred_time_of_day TEXT,
            allergies TEXT,
            special_notes TEXT,
            auto_book_enabled BOOLEAN DEFAULT FALSE,
            auto_book_interval_weeks INTEGER DEFAULT 4,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Паттерны поведения клиентов (Client Interaction Patterns)
        c.execute('''CREATE TABLE IF NOT EXISTS client_interaction_patterns (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            interaction_type TEXT NOT NULL,
            pattern_data JSONB,
            confidence_score REAL DEFAULT 0,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(client_id, interaction_type)
        )''')

        # Conversation Context
        c.execute('''CREATE TABLE IF NOT EXISTS conversation_context (
            id SERIAL PRIMARY KEY,
            client_id TEXT NOT NULL,
            context_type TEXT NOT NULL,
            context_data TEXT, -- Changed from JSONB to TEXT to allow raw strings as in tests
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP -- Made nullable
        )''')

        # Sync changes if table exists
        try:
            c.execute("ALTER TABLE conversation_context ALTER COLUMN expires_at DROP NOT NULL")
            c.execute("ALTER TABLE conversation_context ALTER COLUMN context_data TYPE TEXT")
        except:
            pass

        # Notification Logs
        c.execute('''CREATE TABLE IF NOT EXISTS notification_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            client_id TEXT REFERENCES clients(instagram_id),
            type TEXT,
            message TEXT,
            status TEXT DEFAULT 'sent',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Reminder Logs
        c.execute('''CREATE TABLE IF NOT EXISTS reminder_logs (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            booking_id INTEGER REFERENCES bookings(id),
            type TEXT,
            status TEXT DEFAULT 'sent',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # NEW: Public Website Content tables (FAQ, Reviews, etc.)
        c.execute('''CREATE TABLE IF NOT EXISTS public_faq (
            id SERIAL PRIMARY KEY,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            display_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        # Migrations for public_faq
        add_column_if_not_exists('public_faq', 'question', 'TEXT')
        add_column_if_not_exists('public_faq', 'answer', 'TEXT')
        add_column_if_not_exists('public_faq', 'category', "TEXT DEFAULT 'general'")
        add_column_if_not_exists('public_faq', 'display_order', 'INTEGER DEFAULT 0')

        c.execute('''CREATE TABLE IF NOT EXISTS public_reviews (
            id SERIAL PRIMARY KEY,
            author_name TEXT NOT NULL,
            author_photo TEXT,
            employee_name TEXT,
            employee_position TEXT,
            rating INTEGER DEFAULT 5,
            text TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        # Migrations for public_reviews (add missing columns)
        add_column_if_not_exists('public_reviews', 'avatar_url', 'TEXT')
        add_column_if_not_exists('public_reviews', 'author_photo', 'TEXT')

        # Challenges and Gamification
        c.execute('''CREATE TABLE IF NOT EXISTS active_challenges (
            id SERIAL PRIMARY KEY,
            challenge_id TEXT UNIQUE,
            title TEXT NOT NULL,
            description TEXT,
            reward_type TEXT,
            points_reward INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Loyalty and Rewards
        c.execute('''CREATE TABLE IF NOT EXISTS loyalty_levels (
            id SERIAL PRIMARY KEY,
            level_name TEXT UNIQUE NOT NULL,
            min_points INTEGER DEFAULT 0,
            discount_percent INTEGER DEFAULT 0,
            points_multiplier REAL DEFAULT 1.0,
            benefits TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Newsletter Subscribers
        c.execute('''CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Cookies Consent
        c.execute('''CREATE TABLE IF NOT EXISTS cookie_consents (
            id SERIAL PRIMARY KEY,
            ip_address TEXT,
            accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            preferences JSONB DEFAULT '{}'
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS public_gallery (
            id SERIAL PRIMARY KEY,
            image_url TEXT NOT NULL,
            title TEXT,
            description TEXT,
            category TEXT DEFAULT 'works',
            display_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Migrations for public_gallery
        add_column_if_not_exists('public_gallery', 'title', 'TEXT')
        add_column_if_not_exists('public_gallery', 'description', 'TEXT')
        add_column_if_not_exists('public_gallery', 'is_active', 'BOOLEAN DEFAULT TRUE')

        c.execute('''CREATE TABLE IF NOT EXISTS public_banners (
            id SERIAL PRIMARY KEY,
            title TEXT,
            subtitle TEXT,
            image_url TEXT,
            link_url TEXT,
            bg_pos_desktop_x INTEGER DEFAULT 50,
            bg_pos_desktop_y INTEGER DEFAULT 50,
            bg_pos_mobile_x INTEGER DEFAULT 50,
            bg_pos_mobile_y INTEGER DEFAULT 50,
            is_flipped_horizontal BOOLEAN DEFAULT FALSE,
            is_flipped_vertical BOOLEAN DEFAULT FALSE,
            display_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Migrations for public_banners
        add_column_if_not_exists('public_banners', 'is_flipped_horizontal', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('public_banners', 'is_flipped_vertical', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('public_banners', 'bg_pos_desktop_x', 'INTEGER DEFAULT 50')
        add_column_if_not_exists('public_banners', 'bg_pos_desktop_y', 'INTEGER DEFAULT 50')
        add_column_if_not_exists('public_banners', 'bg_pos_mobile_x', 'INTEGER DEFAULT 50')
        add_column_if_not_exists('public_banners', 'bg_pos_mobile_y', 'INTEGER DEFAULT 50')
        add_column_if_not_exists('public_banners', 'is_active', 'BOOLEAN DEFAULT TRUE')


        c.execute('''CREATE TABLE IF NOT EXISTS client_notes (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            content TEXT NOT NULL,
            author_id INTEGER REFERENCES users(id),
            is_pinned BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS client_gallery (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            before_photo TEXT,
            after_photo TEXT,
            category TEXT,
            notes TEXT,
            master_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS client_favorite_masters (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            master_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(client_id, master_id)
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS client_email_verifications (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS client_notifications (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            title TEXT,
            message TEXT,
            type TEXT DEFAULT 'info',
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS booking_drafts (
            id SERIAL PRIMARY KEY,
            client_id TEXT,
            master TEXT,
            service_id INTEGER,
            datetime TIMESTAMP,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS funnel_stages (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            color TEXT,
            is_static BOOLEAN DEFAULT FALSE
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS client_loyalty_points (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id) UNIQUE,
            total_points INTEGER DEFAULT 0,
            available_points INTEGER DEFAULT 0,
            spent_points INTEGER DEFAULT 0,
            loyalty_level TEXT DEFAULT 'bronze',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        add_column_if_not_exists('client_loyalty_points', 'total_points', 'INTEGER DEFAULT 0')
        add_column_if_not_exists('client_loyalty_points', 'available_points', 'INTEGER DEFAULT 0')
        add_column_if_not_exists('client_loyalty_points', 'spent_points', 'INTEGER DEFAULT 0')
        add_column_if_not_exists('client_loyalty_points', 'loyalty_level', "TEXT DEFAULT 'bronze'")
        add_column_if_not_exists('client_loyalty_points', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        add_column_if_not_exists('client_loyalty_points', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')

        c.execute('''CREATE TABLE IF NOT EXISTS loyalty_category_rules (
            id SERIAL PRIMARY KEY,
            category TEXT UNIQUE NOT NULL,
            points_multiplier REAL DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS loyalty_transactions (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            points INTEGER NOT NULL,
            transaction_type TEXT NOT NULL, -- earn, spend, adjust
            reason TEXT,
            booking_id INTEGER REFERENCES bookings(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        )''')
        
        add_column_if_not_exists('loyalty_transactions', 'expires_at', 'TIMESTAMP')

        c.execute('''CREATE TABLE IF NOT EXISTS client_achievements (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            achievement_type TEXT NOT NULL,
            title TEXT,
            icon TEXT,
            points_awarded INTEGER DEFAULT 0,
            unlocked_at TIMESTAMP,
            progress REAL DEFAULT 0,
            max_progress REAL DEFAULT 1,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS invoice_payments (
            id SERIAL PRIMARY KEY,
            invoice_id INTEGER REFERENCES invoices(id),
            amount REAL NOT NULL,
            payment_method TEXT,
            payment_date DATE DEFAULT CURRENT_DATE,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS marketplace_reviews (
            id SERIAL PRIMARY KEY,
            provider TEXT NOT NULL,
            external_id TEXT,
            author_name TEXT,
            rating REAL,
            text TEXT,
            created_at TIMESTAMP,
            raw_data JSONB
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            setting_key TEXT UNIQUE, -- Alias for key to support both naming conventions
            setting_value JSONB
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS client_tags (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            tag_id INTEGER, -- Link to tags table if exists, or just use text
            tag_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')


        # Salon Holidays
        c.execute('''CREATE TABLE IF NOT EXISTS salon_holidays (
            id SERIAL PRIMARY KEY,
            date DATE UNIQUE NOT NULL,
            name TEXT,
            is_closed BOOLEAN DEFAULT TRUE,
            master_exceptions JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        add_column_if_not_exists('salon_holidays', 'master_exceptions', "JSONB DEFAULT '[]'")

        # Booking Reminder Settings
        c.execute('''CREATE TABLE IF NOT EXISTS booking_reminder_settings (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            days_before INTEGER DEFAULT 0,
            hours_before INTEGER DEFAULT 0,
            notification_type TEXT DEFAULT 'email',
            is_enabled BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Индивидуальные напоминания (Client Specific Reminders)
        c.execute('''CREATE TABLE IF NOT EXISTS reminders (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            reminder_date TIMESTAMP NOT NULL,
            reminder_type TEXT DEFAULT 'general',
            is_completed BOOLEAN DEFAULT FALSE,
            created_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP
        )''')

        # Conversations (Cleanup support)
        c.execute('''CREATE TABLE IF NOT EXISTS conversations (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            last_message TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Funnel Advanced
        c.execute('''CREATE TABLE IF NOT EXISTS funnel_checkpoints (
            id SERIAL PRIMARY KEY,
            stage_id INTEGER REFERENCES funnel_stages(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            is_required BOOLEAN DEFAULT FALSE,
            sort_order INTEGER DEFAULT 0,
            auto_complete_conditions JSONB,
            notification_settings JSONB,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS client_checkpoint_progress (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            checkpoint_id INTEGER REFERENCES funnel_checkpoints(id),
            status TEXT DEFAULT 'pending',
            notes TEXT,
            is_completed BOOLEAN DEFAULT FALSE,
            completed_at TIMESTAMP,
            completed_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(client_id, checkpoint_id)
        )''')

        # Products & Inventory
        c.execute('''CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            price REAL DEFAULT 0, cost_price REAL DEFAULT 0,
            weight REAL, weight_unit TEXT DEFAULT 'g',
            volume REAL, volume_unit TEXT DEFAULT 'ml',
            expiry_date DATE,
            stock_quantity INTEGER DEFAULT 0,
            min_stock_level INTEGER DEFAULT 0,
            sku TEXT, barcode TEXT, supplier TEXT,
            notes TEXT, is_active BOOLEAN DEFAULT TRUE,
            photos TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS product_movements (
            id SERIAL PRIMARY KEY,
            product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
            movement_type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL,
            reason TEXT,
            booking_id INTEGER REFERENCES bookings(id),
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Customization & Roles
        c.execute('''CREATE TABLE IF NOT EXISTS custom_statuses (
            status_key TEXT PRIMARY KEY,
            status_label TEXT NOT NULL,
            status_color TEXT NOT NULL,
            status_icon TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS custom_roles (
            role_key TEXT PRIMARY KEY,
            role_name TEXT NOT NULL,
            role_description TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS role_permissions (
            id SERIAL PRIMARY KEY,
            role_key TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            can_view BOOLEAN DEFAULT FALSE,
            can_create BOOLEAN DEFAULT FALSE,
            can_edit BOOLEAN DEFAULT FALSE,
            can_delete BOOLEAN DEFAULT FALSE,
            UNIQUE(role_key, permission_key)
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS menu_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            role TEXT,
            menu_order JSONB,
            hidden_items JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id),
            UNIQUE(role)
        )''')

        # Communication & Chat
        c.execute('''CREATE TABLE IF NOT EXISTS internal_chat (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER REFERENCES users(id),
            receiver_id INTEGER REFERENCES users(id),
            message TEXT,
            type TEXT DEFAULT 'text',
            is_read BOOLEAN DEFAULT FALSE,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            edited BOOLEAN DEFAULT FALSE,
            edited_at TIMESTAMP,
            deleted_for_sender BOOLEAN DEFAULT FALSE,
            deleted_for_receiver BOOLEAN DEFAULT FALSE,
            reactions JSONB DEFAULT '[]'
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS chat_recordings (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER REFERENCES users(id),
            receiver_id INTEGER REFERENCES users(id),
            recording_type TEXT DEFAULT 'audio',
            recording_file TEXT,
            recording_url TEXT,
            custom_name TEXT,
            file_size INTEGER,
            file_format TEXT,
            duration INTEGER,
            folder_id INTEGER,
            tags JSONB,
            is_archived BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS user_status (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            is_online BOOLEAN DEFAULT FALSE,
            is_dnd BOOLEAN DEFAULT FALSE, -- Режим "Не беспокоить"
            last_seen TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('user_status', 'is_dnd', 'BOOLEAN DEFAULT FALSE')

        c.execute('''CREATE TABLE IF NOT EXISTS user_call_logs (
            id SERIAL PRIMARY KEY,
            caller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            callee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            transferred_from INTEGER REFERENCES users(id) ON DELETE SET NULL,
            type TEXT DEFAULT 'audio', -- 'audio', 'video'
            status TEXT DEFAULT 'missed', -- 'completed', 'missed', 'rejected', 'busy', 'transferred'
            duration INTEGER DEFAULT 0, -- в секундах
            recording_url TEXT,
            metadata JSONB, -- дополнительные данные (например, список участников конференции)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS user_subscriptions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            subscription_type TEXT NOT NULL,
            is_subscribed BOOLEAN DEFAULT TRUE,
            email_enabled BOOLEAN DEFAULT TRUE,
            telegram_enabled BOOLEAN DEFAULT TRUE,
            instagram_enabled BOOLEAN DEFAULT TRUE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, subscription_type)
        )''')

        add_column_if_not_exists('user_subscriptions', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')

        c.execute('''CREATE TABLE IF NOT EXISTS user_push_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL,
            device_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used_at TIMESTAMP,
            UNIQUE(user_id, token)
        )''')

        # Public Content
        c.execute('''CREATE TABLE IF NOT EXISTS public_reviews (
            id SERIAL PRIMARY KEY,
            author_name TEXT,
            rating INTEGER DEFAULT 5,
            text TEXT,
            avatar_url TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            display_order INTEGER DEFAULT 0,
            employee_name TEXT,
            employee_position TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Migrations for author_name
        add_column_if_not_exists('public_reviews', 'author_name', 'TEXT')

        c.execute('''CREATE TABLE IF NOT EXISTS public_faq (
            id SERIAL PRIMARY KEY,
            question TEXT,
            answer TEXT,
            category TEXT DEFAULT 'general',
            is_active BOOLEAN DEFAULT TRUE,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Integrations
        c.execute('''CREATE TABLE IF NOT EXISTS marketplace_providers (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            api_key TEXT,
            api_secret TEXT,
            settings JSONB DEFAULT '{}',
            is_active BOOLEAN DEFAULT FALSE,
            last_sync_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        add_column_if_not_exists('marketplace_providers', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')

        c.execute('''CREATE TABLE IF NOT EXISTS marketplace_bookings (
            id SERIAL PRIMARY KEY,
            provider TEXT NOT NULL,
            external_id TEXT UNIQUE NOT NULL,
            booking_id INTEGER REFERENCES bookings(id),
            raw_data JSONB,
            synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        add_column_if_not_exists('marketplace_bookings', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')

        c.execute('''CREATE TABLE IF NOT EXISTS payment_providers (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            api_key TEXT,
            secret_key TEXT,
            is_test_mode BOOLEAN DEFAULT TRUE,
            settings JSONB DEFAULT '{}',
            is_active BOOLEAN DEFAULT FALSE
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS payment_transactions (
            id SERIAL PRIMARY KEY,
            provider TEXT NOT NULL,
            transaction_id TEXT,
            amount REAL,
            currency TEXT,
            status TEXT,
            booking_id INTEGER REFERENCES bookings(id),
            invoice_id INTEGER REFERENCES invoices(id),
            raw_response JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS payroll_payments (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            amount REAL NOT NULL,
            period_start DATE,
            period_end DATE,
            payment_date DATE DEFAULT CURRENT_DATE,
            type TEXT DEFAULT 'salary',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS user_salary_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            salary_type TEXT DEFAULT 'commission',
            hourly_rate REAL DEFAULT 0,
            monthly_rate REAL DEFAULT 0,
            commission_rate REAL DEFAULT 0,
            bonus_rate REAL DEFAULT 0,
            kpi_settings JSONB,
            currency TEXT DEFAULT 'AED',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS salary_calculations (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            period_start DATE,
            period_end DATE,
            total_services REAL,
            commission_amount REAL,
            base_salary REAL,
            total_payout REAL,
            details JSONB,
            is_paid BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS service_change_requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            service_id INTEGER REFERENCES services(id),
            request_type TEXT DEFAULT 'update',
            requested_price REAL,
            requested_price_min REAL,
            requested_price_max REAL,
            requested_duration TEXT,
            requested_is_online_booking_enabled BOOLEAN,
            requested_is_calendar_enabled BOOLEAN,
            employee_comment TEXT,
            status TEXT DEFAULT 'pending',
            admin_comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Migrations for service_change_requests
        add_column_if_not_exists('service_change_requests', 'request_type', "TEXT DEFAULT 'update'")
        add_column_if_not_exists('service_change_requests', 'requested_price', 'REAL')
        add_column_if_not_exists('service_change_requests', 'requested_price_min', 'REAL')
        add_column_if_not_exists('service_change_requests', 'requested_price_max', 'REAL')
        add_column_if_not_exists('service_change_requests', 'requested_duration', 'TEXT')
        add_column_if_not_exists('service_change_requests', 'requested_is_online_booking_enabled', 'BOOLEAN')
        add_column_if_not_exists('service_change_requests', 'requested_is_calendar_enabled', 'BOOLEAN')
        add_column_if_not_exists('service_change_requests', 'employee_comment', 'TEXT')

        # Advanced Loyalty
        c.execute('''CREATE TABLE IF NOT EXISTS referral_campaigns (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            bonus_points INTEGER DEFAULT 0,
            referrer_bonus INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            target_type TEXT DEFAULT 'all', -- all, specific_users, by_master, by_service, by_inactivity
            target_criteria JSONB,          -- {user_ids: [], master_id: int, service_ids: [], days_inactive: int}
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS referral_campaign_users (
            id SERIAL PRIMARY KEY,
            campaign_id INTEGER REFERENCES referral_campaigns(id),
            client_id TEXT REFERENCES clients(instagram_id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(campaign_id, client_id)
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS client_referrals (
            id SERIAL PRIMARY KEY,
            referrer_id TEXT REFERENCES clients(instagram_id),
            referred_id TEXT REFERENCES clients(instagram_id),
            campaign_id INTEGER REFERENCES referral_campaigns(id),
            status TEXT DEFAULT 'pending',
            points_awarded INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS referrals (
            id SERIAL PRIMARY KEY,
            referrer_id TEXT REFERENCES clients(instagram_id),
            referred_id TEXT REFERENCES clients(instagram_id),
            campaign_id INTEGER REFERENCES referral_campaigns(id),
            status TEXT DEFAULT 'pending',
            reward_paid BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS challenge_progress (
            id SERIAL PRIMARY KEY,
            challenge_id INTEGER REFERENCES active_challenges(id),
            client_id TEXT REFERENCES clients(instagram_id),
            current_value REAL DEFAULT 0,
            target_value REAL,
            is_completed BOOLEAN DEFAULT FALSE,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(challenge_id, client_id)
        )''')

        # Telephony & Call Logs
        c.execute('''CREATE TABLE IF NOT EXISTS call_logs (
            id SERIAL PRIMARY KEY,
            client_id TEXT REFERENCES clients(instagram_id),
            booking_id INTEGER REFERENCES bookings(id),
            phone TEXT NOT NULL,
            direction TEXT DEFAULT 'outbound',
            status TEXT DEFAULT 'completed',
            duration INTEGER DEFAULT 0,
            recording_url TEXT,
            recording_file TEXT,
            transcription TEXT,
            notes TEXT,
            external_id TEXT,
            manual_client_name TEXT,
            manual_manager_name TEXT,
            manual_service_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Currencies
        c.execute('''CREATE TABLE IF NOT EXISTS currencies (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT,
            symbol TEXT,
            exchange_rate REAL DEFAULT 1.0,
            is_default BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Broadcast Subscription Types
        c.execute('''CREATE TABLE IF NOT EXISTS broadcast_subscription_types (
            id SERIAL PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            target_role TEXT DEFAULT 'all',
            name TEXT,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Messenger Settings & Messages
        c.execute('''CREATE TABLE IF NOT EXISTS messenger_settings (
            id SERIAL PRIMARY KEY,
            messenger_type TEXT UNIQUE NOT NULL,
            is_enabled BOOLEAN DEFAULT FALSE,
            api_token TEXT,
            webhook_url TEXT,
            config_json TEXT,
            display_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS messenger_messages (
            id SERIAL PRIMARY KEY,
            messenger_type TEXT NOT NULL,
            client_id TEXT REFERENCES clients(instagram_id),
            sender_type TEXT DEFAULT 'client',
            message_text TEXT,
            message_type TEXT DEFAULT 'text',
            attachments_json TEXT,
            external_message_id TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Temporary booking storage for bot conversation
        c.execute('''CREATE TABLE IF NOT EXISTS booking_temp (
            id SERIAL PRIMARY KEY,
            instagram_id TEXT NOT NULL,
            service_id INTEGER,
            service_name TEXT,
            master_id INTEGER,
            master_name TEXT,
            booking_date DATE,
            booking_time TIME,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # --- 7. DEFAULT DATA SYNC ---

        # Stages
        default_stages = [
            ('pipeline', 'new', 'Новый лид', '#3b82f6', 0),
            ('pipeline', 'negotiation', 'Переговоры', '#eab308', 1),
            ('pipeline', 'sent_offer', 'Предложение отправлено', '#a855f7', 2),
            ('pipeline', 'closed_won', 'Успешно реализовано', '#22c55e', 3),
            ('pipeline', 'closed_lost', 'Закрыто не реализовано', '#ef4444', 4),
            ('invoice', 'draft', 'Черновик', '#94a3b8', 0),
            ('invoice', 'sent', 'Отправлен', '#3b82f6', 1),
            ('invoice', 'paid', 'Оплачен', '#22c55e', 2),
            ('task', 'todo', 'Сделать', '#94a3b8', 0),
            ('task', 'done', 'Завершено', '#22c55e', 3)
        ]
        for ent, nm, ru, clr, ord in default_stages:
            c.execute("""
                INSERT INTO workflow_stages (entity_type, name, color, sort_order)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (entity_type, name) DO NOTHING
            """, (ent, nm, clr, ord))

        # Настройки салона (Архитектура v2.2 - REAL DATA)
        salon_name = os.getenv('SALON_NAME', 'M.Le Diamant')
        salon_google_maps = os.getenv('SALON_GOOGLE_MAPS', 'https://www.google.ru/maps/place/M+Le+Diamant+-+Best+Beauty+Salon+in+Jumeirah+Beach+Dubai/@25.0738739,55.1315886,17z')
        salon_phone = os.getenv('SALON_PHONE', SALON_PHONE_DEFAULT)
        salon_whatsapp = os.getenv('SALON_WHATSAPP', SALON_PHONE_DEFAULT)
        salon_instagram = os.getenv('SALON_INSTAGRAM', 'mlediamant')
        salon_email = os.getenv('SALON_EMAIL', SALON_EMAIL_DEFAULT)
        salon_base_url = os.getenv('BASE_URL', 'https://mlediamant.com')
        salon_address = os.getenv('SALON_ADDRESS', 'Shop 13, Amwaj 2, Plaza Level, JBR, Dubai')
        salon_hours_weekdays = os.getenv('SALON_HOURS_WEEKDAYS', '10:30 - 21:00')
        salon_hours_weekends = os.getenv('SALON_HOURS_WEEKENDS', '10:30 - 21:00')
        salon_currency = os.getenv('SALON_CURRENCY', 'AED')
        
        custom_settings = {
            "stats": {
                "years_experience": os.getenv('STAT_YEARS_EXP', "10+"),
                "happy_clients": os.getenv('STAT_CLIENTS', "5000+"),
                "quality_guarantee": os.getenv('STAT_QUALITY', "100%")
            }
        }
        
        bot_config = {
            "enabled": True,
            "bot_name": os.getenv('BOT_NAME', "M.Le Diamant Luxury Assistant"),
            "personality_traits": os.getenv('BOT_PERSONALITY', "Professional expert assistant for a high-end luxury salon. Sophisticated, articulate, and dedicated to exceptional service quality. Focuses on premium materials, hygiene standards, and customer comfort."),
            "greeting_message": os.getenv('BOT_GREETING', "Greetings from M.Le Diamant. How may I assist you today with our premium beauty and wellness services?"),
            "farewell_message": os.getenv('BOT_FAREWELL', "Thank you for choosing M.Le Diamant. We look forward to your visit!"),
            "booking_redirect_message": os.getenv('BOT_BOOKING_REDIRECT', "I am your virtual concierge for instant bookings. Please select your preferred time here: {BOOKING_URL}"),
            "communication_style": os.getenv('BOT_COMM_STYLE', "Polite, expert-driven, and internationally professional."),
            "emoji_usage": os.getenv('BOT_EMOJI_USAGE', "Minimal and professional (max 1 per message)."),
            "languages_supported": os.getenv('BOT_LANGUAGES', "ru,en,ar"),
            "voice_message_response": "I apologize, but I am currently unable to process voice messages. Could you please send your request as text? I am here to help. 😊",
            "location_features": "We offer complimentary valet parking, premium beverages, and a quiet, luxurious atmosphere for our selected guests.",
            "safety_guidelines": "Hygiene is our priority. We use medical-grade sterilization for all instruments and single-use supplies for every guest.",
            "booking_availability_instructions": "Please strictly adhere to the 'AVAILABLE MASTERS' section. Do not suggest times not explicitly listed as available."
        }

        # Default messenger integrations configuration
        messenger_config = [
            {
                "messenger_type": "instagram",
                "display_name": "Instagram Direct",
                "is_enabled": False,
                "is_visible_in_chat": True,
                "api_token": "",
                "webhook_url": "",
                "config_json": "{}"
            },
            {
                "messenger_type": "whatsapp",
                "display_name": "WhatsApp Business",
                "is_enabled": False,
                "is_visible_in_chat": True,
                "api_token": "",
                "webhook_url": "",
                "config_json": "{}"
            },
            {
                "messenger_type": "telegram",
                "display_name": "Telegram",
                "is_enabled": False,
                "is_visible_in_chat": True,
                "api_token": "",
                "webhook_url": "",
                "config_json": "{}"
            },
            {
                "messenger_type": "tiktok",
                "display_name": "TikTok",
                "is_enabled": False,
                "is_visible_in_chat": True,
                "api_token": "",
                "webhook_url": "",
                "config_json": "{}"
            }
        ]

        c.execute("""
            INSERT INTO salon_settings (
                id, name, address,
                phone, whatsapp, instagram, email, booking_url, google_maps,
                hours_weekdays, hours_weekends, hours, bot_name, base_url,
                currency, bot_config, custom_settings, messenger_config
            )
            VALUES (
                1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                address = EXCLUDED.address,
                phone = EXCLUDED.phone,
                whatsapp = EXCLUDED.whatsapp,
                instagram = EXCLUDED.instagram,
                email = EXCLUDED.email,
                google_maps = EXCLUDED.google_maps,
                hours_weekdays = EXCLUDED.hours_weekdays,
                hours_weekends = EXCLUDED.hours_weekends,
                hours = EXCLUDED.hours,
                currency = EXCLUDED.currency,
                bot_config = EXCLUDED.bot_config,
                custom_settings = EXCLUDED.custom_settings,
                messenger_config = COALESCE(NULLIF(salon_settings.messenger_config::text, '[]'), EXCLUDED.messenger_config::text)::jsonb,
                updated_at = CURRENT_TIMESTAMP
        """, (
            salon_name, salon_address,
            salon_phone, salon_phone, salon_instagram, salon_email, f"{salon_base_url}/booking",
            salon_google_maps,
            salon_hours_weekdays, salon_hours_weekends,
            f"Ежедневно: {salon_hours_weekdays}",
            bot_config['bot_name'], salon_base_url,
            salon_currency, json.dumps(bot_config), json.dumps(custom_settings), json.dumps(messenger_config)
        ))

        # Продуктовые сотрудники
        default_employees = [
            ('Kasymova Gulcehre', 'gulcehre', 'employee', 'Nail & Waxing Master', 'female'),
            ('Peradilla Jennifer', 'jennifer', 'employee', 'Universal Beauty Master', 'female'),
            ('Amandurdyyeva Mestan', 'mestan', 'employee', 'Hair Stylist & Permanent Makeup Artist', 'female'),
            ('Mohamed Sabri', 'sabri', 'employee', 'Hair Stylist', 'male'),
            ('Kozhabay Lyazat', 'lyazat', 'employee', 'Nail Master', 'female'),
            ('Турсунай', 'tursunay', 'director', 'Owner / Director', 'female'),
            ('Admin', 'admin', 'director', 'System Admin', 'female')
        ]
        for name, uname, role, pos, gender in default_employees:
            # Сначала проверяем существование пользователя
            c.execute("SELECT id FROM users WHERE username = %s", (uname,))
            user_exists = c.fetchone()
            
            if not user_exists:
                # Создаем только если нет (пароль по умолчанию временный, будет обновлен в seed_test_data)
                c.execute("""
                    INSERT INTO users (full_name, username, password_hash, role, position, gender, is_active, is_service_provider)
                    VALUES (%s, %s, %s, %s, %s, %s, TRUE, TRUE)
                """, (name, uname, 'pbkdf2:sha256:260000$initial_setup_only', role, pos, gender))
            else:
                # Обновляем только роль и позицию, НЕ трогая пароль
                c.execute("""
                    UPDATE users SET 
                        full_name = %s,
                        role = %s,
                        position = %s,
                        gender = %s
                    WHERE username = %s
                """, (name, role, pos, gender, uname))

        # Fix gender for Mohamed and Tahir specifically
        c.execute("UPDATE users SET gender = 'male' WHERE full_name ILIKE '%Mohamed%' OR full_name ILIKE '%Tahir%' OR username ILIKE '%tahir%'")

        # Уровни лояльности
        default_loyalty = [
            ('bronze', 0, 0, 1.0, 'Базовый уровень'),
            ('silver', 1000, 5, 1.1, 'Серебряный уровень'),
            ('gold', 5000, 10, 1.2, 'Золотой уровень'),
            ('platinum', 10000, 15, 1.5, 'Платиновый уровень')
        ]
        for name, min_pts, disc, mult, ben in default_loyalty:
            c.execute("""
                INSERT INTO loyalty_levels (level_name, min_points, discount_percent, points_multiplier, benefits)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (level_name) DO UPDATE SET
                    min_points = EXCLUDED.min_points,
                    discount_percent = EXCLUDED.discount_percent,
                    points_multiplier = EXCLUDED.points_multiplier
            """, (name, min_pts, disc, mult, ben))

        # Дефолтные должности
        default_positions = [
            ('Owner', 'Владелец', 0),
            ('Manager', 'Менеджер', 1),
            ('Senior Stylist', 'Старший стилист', 2),
            ('Stylist', 'Стилист', 3),
            ('Junior Stylist', 'Младший стилист', 4),
            ('Nail Master', 'Мастер маникюра', 5),
            ('Receptionist', 'Администратор', 6)
        ]
        for en, ru, ord in default_positions:
            c.execute("""
                INSERT INTO positions (name, sort_order)
                VALUES (%s, %s)
                ON CONFLICT (name) DO NOTHING
            """, (en, ord))

        # Fix FK for client_preferences to cascade delete
        client_dep_tables = [
            ('bookings', 'instagram_id'),
            ('client_preferences', 'client_id'),
            ('client_loyalty_points', 'client_id'),
            ('conversations', 'client_id'),
            ('reminders', 'client_id'),
            ('client_notes', 'client_id'),
            ('client_gallery', 'client_id'),
            ('client_favorite_masters', 'client_id'),
            ('client_notifications', 'client_id'),
            ('client_tags', 'client_id'),
            ('notification_logs', 'client_id'),
            ('reminder_logs', 'client_id')
        ]
        for tbl, col in client_dep_tables:
            ensure_fk_cascade(tbl, col, 'clients', 'instagram_id')

        # --- 8. POST-INITIALIZATION MIGRATIONS ---
        # Ensure base columns exist for tables that might not have them (for backward compatibility)
        add_column_if_not_exists('salon_settings', 'hours', 'TEXT')
        add_column_if_not_exists('salon_settings', 'address', 'TEXT')
        add_column_if_not_exists('services', 'name', 'TEXT')
        add_column_if_not_exists('services', 'description', 'TEXT')
        add_column_if_not_exists('public_gallery', 'title', 'TEXT')
        add_column_if_not_exists('public_gallery', 'description', 'TEXT')
        add_column_if_not_exists('public_banners', 'title', 'TEXT')
        add_column_if_not_exists('public_banners', 'subtitle', 'TEXT')
        add_column_if_not_exists('public_faq', 'question', 'TEXT')
        add_column_if_not_exists('public_faq', 'answer', 'TEXT')
        add_column_if_not_exists('public_reviews', 'author_name', 'TEXT')
        add_column_if_not_exists('public_reviews', 'text', 'TEXT')
        add_column_if_not_exists('public_reviews', 'employee_name', 'TEXT')
        add_column_if_not_exists('public_reviews', 'employee_position', 'TEXT')
        add_column_if_not_exists('public_reviews', 'avatar_url', 'TEXT')
        add_column_if_not_exists('public_faq', 'category', "TEXT DEFAULT 'general'")
        add_column_if_not_exists('users', 'full_name', 'TEXT')
        add_column_if_not_exists('users', 'position', 'TEXT')
        add_column_if_not_exists('users', 'bio', 'TEXT')
        add_column_if_not_exists('users', 'specialization', 'TEXT')

        # Migrations for payment_transactions
        add_column_if_not_exists('payment_transactions', 'provider_transaction_id', 'TEXT')
        add_column_if_not_exists('payment_transactions', 'completed_at', 'TIMESTAMP')
        add_column_if_not_exists('payment_transactions', 'metadata', 'JSONB')

        # Migrations for payment_providers
        add_column_if_not_exists('payment_providers', 'webhook_secret', 'TEXT')
        add_column_if_not_exists('payment_providers', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')

        # Migrations for marketplace_providers
        add_column_if_not_exists('marketplace_providers', 'webhook_url', 'TEXT')
        add_column_if_not_exists('marketplace_providers', 'sync_enabled', 'BOOLEAN DEFAULT FALSE')

        # Critical migrations for users table
        add_column_if_not_exists('users', 'secondary_role', 'TEXT')

        # Critical migrations for salon_settings
        add_column_if_not_exists('salon_settings', 'bot_config', "JSONB DEFAULT '{}'")
        add_column_if_not_exists('salon_settings', 'messenger_config', "JSONB DEFAULT '[]'")

        # Ensure workflow_stages table exists (critical for tasks)
        c.execute('''CREATE TABLE IF NOT EXISTS workflow_stages (
            id SERIAL PRIMARY KEY,
            entity_type TEXT NOT NULL DEFAULT 'task',
            name TEXT NOT NULL,
            color TEXT DEFAULT '#6366f1',
            sort_order INTEGER DEFAULT 0,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Ensure unified_communication_log table exists (critical for reminders)
        c.execute('''CREATE TABLE IF NOT EXISTS unified_communication_log (
            id SERIAL PRIMARY KEY,
            client_id TEXT,
            channel TEXT,
            message_type TEXT,
            message_preview TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'sent',
            metadata JSONB DEFAULT '{}'
        )''')

        # Default broadcast subscription types
        default_sub_types = [
            ('promotions', 'all', 'Акции и скидки', 'Информация о специальных предложениях'),
            ('news', 'all', 'Новости', 'Новости салона и индустрии'),
            ('appointments', 'all', 'Напоминания', 'Напоминания о записях'),
            ('loyalty', 'client', 'Программа лояльности', 'Обновления бонусной программы')
        ]
        for key, role, name, desc in default_sub_types:
            c.execute("""
                INSERT INTO broadcast_subscription_types (key, target_role, name, description, is_active)
                VALUES (%s, %s, %s, %s, TRUE)
                ON CONFLICT (key) DO NOTHING
            """, (key, role, name, desc))

        conn.commit()
        log_info("✅ Unified schema initialized successfully", "db")
        
    except Exception as e:
        try:
            conn.rollback()
        except:
            pass  # Connection may already be closed
        log_error(f"❌ Failed to initialize schema: {e}", "db")
        raise
    finally:
        # Release advisory lock
        try:
            c.execute("SELECT pg_advisory_unlock(12345)")
        except:
            pass
        try:
            conn.close()
        except:
            pass

if __name__ == "__main__":
    init_database()
