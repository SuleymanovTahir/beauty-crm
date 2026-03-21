"""
Инициализация единой базы данных системы
Единый источник истины (SSOT) для схемы CRM
"""
from core.config import SALON_CURRENCY_DEFAULT
from db.connection import get_db_connection
from utils.logger import log_info, log_error
import os

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
            c.execute("ALTER TABLE {} ADD COLUMN IF NOT EXISTS {} {}".format(table, column, definition))
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

    stage_aliases = {
        'pipeline': {
            'новое': 'new',
            'новый_лид': 'new',
            'new_lead': 'new',
            'переговоры': 'negotiation',
            'отправленное_предложение': 'sent_offer',
            'предложение_отправлено': 'sent_offer',
            'закрыто_выиграно': 'closed_won',
            'успешно_реализовано': 'closed_won',
            'закрыто_проиграно': 'closed_lost',
            'закрыто_не_реализовано': 'closed_lost',
        },
        'invoice': {
            'черновик': 'draft',
            'отправлено': 'sent',
            'оплачено': 'paid',
            'частично_оплачено': 'partial',
            'частично': 'partial',
            'просрочено': 'overdue',
            'отменено': 'cancelled',
        },
        'task': {
            'все': 'todo',
            'к_выполнению': 'todo',
            'в_прогрессе': 'in_progress',
            'в_работе': 'in_progress',
            'готово': 'done',
            'завершено': 'done',
        },
    }

    canonical_stage_order = {
        'pipeline': {
            'new': 0,
            'negotiation': 1,
            'sent_offer': 2,
            'closed_won': 3,
            'closed_lost': 4,
        },
        'invoice': {
            'draft': 0,
            'sent': 1,
            'paid': 2,
            'partial': 3,
            'overdue': 4,
            'cancelled': 5,
        },
        'task': {
            'todo': 0,
            'in_progress': 1,
            'done': 2,
        },
    }

    def normalize_stage_key(entity_type: str, stage_name: str) -> str:
        normalized = str(stage_name or '').strip().lower().replace(' ', '_')
        return stage_aliases.get(entity_type, {}).get(normalized, normalized)

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
            template_name TEXT, -- Reference to notification_templates
            medium TEXT NOT NULL, -- email, telegram, instagram, whatsapp, in_app
            trigger_type TEXT, -- automated, manual, broadcast
            title TEXT,
            content TEXT,
            status TEXT DEFAULT 'sent', -- sent, failed, pending, scheduled
            is_read BOOLEAN DEFAULT FALSE,
            action_url TEXT,
            error_message TEXT,
            scheduled_at TIMESTAMP, -- For delayed sending
            sent_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        # Migrations for unified_communication_log
        add_column_if_not_exists('unified_communication_log', 'trigger_type', 'TEXT')
        add_column_if_not_exists('unified_communication_log', 'title', 'TEXT')
        add_column_if_not_exists('unified_communication_log', 'content', 'TEXT')
        add_column_if_not_exists('unified_communication_log', 'is_read', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('unified_communication_log', 'action_url', 'TEXT')
        add_column_if_not_exists('unified_communication_log', 'error_message', 'TEXT')
        add_column_if_not_exists('unified_communication_log', 'template_name', 'TEXT')
        add_column_if_not_exists('unified_communication_log', 'scheduled_at', 'TIMESTAMP')
        add_column_if_not_exists('unified_communication_log', 'sent_at', 'TIMESTAMP')

        # Notification Templates System (Master Repository for all messages)
        c.execute('''CREATE TABLE IF NOT EXISTS notification_templates (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL, -- e.g. "booking_confirmation"
            category TEXT DEFAULT 'transactional', -- transactional, marketing, alert
            subject TEXT,
            body TEXT,
            variables JSONB DEFAULT '[]', -- List of allowed variables like ["name", "time"]
            is_system BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('notification_templates', 'subject', 'TEXT')
        add_column_if_not_exists('notification_templates', 'body', 'TEXT')

        # Backward-safe migration: fill canonical subject/body from any legacy subject_*/body_* columns.
        try:
            c.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'notification_templates'
            """)
            notification_template_columns = [row[0] for row in c.fetchall()]
            legacy_subject_columns = sorted([
                column_name
                for column_name in notification_template_columns
                if column_name.startswith('subject_')
            ])
            legacy_body_columns = sorted([
                column_name
                for column_name in notification_template_columns
                if column_name.startswith('body_')
            ])

            if 'subject' in notification_template_columns and len(legacy_subject_columns) > 0:
                legacy_subject_sql = ", ".join([
                    f'NULLIF("{column_name}", \'\')'
                    for column_name in legacy_subject_columns
                ])
                c.execute(f"""
                    UPDATE notification_templates
                    SET subject = COALESCE(NULLIF(subject, ''), {legacy_subject_sql}, '')
                    WHERE subject IS NULL OR subject = ''
                """)

            if 'body' in notification_template_columns and len(legacy_body_columns) > 0:
                legacy_body_sql = ", ".join([
                    f'NULLIF("{column_name}", \'\')'
                    for column_name in legacy_body_columns
                ])
                c.execute(f"""
                    UPDATE notification_templates
                    SET body = COALESCE(NULLIF(body, ''), {legacy_body_sql}, '')
                    WHERE body IS NULL OR body = ''
                """)
        except Exception as e:
            log_error(f"Ошибка синхронизации колонок notification_templates: {e}", "db")

        # Add indexes for speed (Unread count queries and scheduling)
        c.execute("CREATE INDEX IF NOT EXISTS idx_unified_log_user_unread ON unified_communication_log (user_id, is_read, medium)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_unified_log_status_scheduled ON unified_communication_log (status, scheduled_at) WHERE status = 'scheduled'")
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
        add_column_if_not_exists('users', 'preferred_language', "TEXT DEFAULT 'en'")


        # Soft Delete Tracking (Trash) - REQUIRED by housekeeping
        c.execute('''CREATE TABLE IF NOT EXISTS deleted_items (
            id SERIAL PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            data JSONB,
            reason TEXT,
            deleted_by INTEGER REFERENCES users(id),
            deleted_by_role TEXT,
            can_restore BOOLEAN DEFAULT TRUE,
            restored_at TIMESTAMP,
            restored_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('deleted_items', 'deleted_by', 'INTEGER REFERENCES users(id)')
        add_column_if_not_exists('deleted_items', 'deleted_by_role', 'TEXT')
        add_column_if_not_exists('deleted_items', 'restored_by', 'INTEGER REFERENCES users(id)')

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
        
        # Startup must not auto-fill catalog data.

        # --- END BASE COLUMNS (MOVED TO END) ---
        
        # Schema initialization for salon_settings
        salon_settings_sql = '''CREATE TABLE IF NOT EXISTS salon_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT,
            address TEXT, 
            google_maps TEXT,
            hours_weekdays TEXT,
            hours_weekends TEXT,
            hours TEXT,
            lunch_start TEXT,
            lunch_end TEXT,
            phone TEXT, email TEXT,
            whatsapp TEXT, instagram TEXT,
            booking_url TEXT, timezone TEXT DEFAULT 'UTC',
            timezone_offset INTEGER DEFAULT 0,
            currency TEXT DEFAULT '{SALON_CURRENCY_DEFAULT}',
            business_type TEXT DEFAULT 'other',
            product_mode TEXT DEFAULT 'crm',
            crm_enabled BOOLEAN DEFAULT TRUE,
            site_enabled BOOLEAN DEFAULT FALSE,
            city TEXT, country TEXT,
            latitude REAL, longitude REAL,
            logo_url TEXT, base_url TEXT,
            main_location TEXT,
            bot_name TEXT, bot_config JSONB DEFAULT '{}',
            messenger_config JSONB DEFAULT '[]',
            menu_config JSONB DEFAULT '{}',
            custom_settings JSONB DEFAULT '{}',
            feature_flags JSONB DEFAULT '{}',
            loyalty_points_conversion_rate REAL DEFAULT 0,
            points_expiration_days INTEGER DEFAULT 365,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )'''
        salon_settings_sql = salon_settings_sql.replace('{SALON_CURRENCY_DEFAULT}', SALON_CURRENCY_DEFAULT)
        c.execute(salon_settings_sql)
        add_column_if_not_exists('salon_settings', 'lunch_start', 'TEXT')
        add_column_if_not_exists('salon_settings', 'lunch_end', 'TEXT')
        add_column_if_not_exists('salon_settings', 'timezone_offset', 'INTEGER DEFAULT 0')
        add_column_if_not_exists('salon_settings', 'main_location', 'TEXT')
        add_column_if_not_exists('salon_settings', 'loyalty_points_conversion_rate', 'REAL DEFAULT 0')
        add_column_if_not_exists('salon_settings', 'points_expiration_days', 'INTEGER DEFAULT 365')
        add_column_if_not_exists('salon_settings', 'business_type', "TEXT DEFAULT 'other'")
        add_column_if_not_exists('salon_settings', 'product_mode', "TEXT DEFAULT 'crm'")
        add_column_if_not_exists('salon_settings', 'crm_enabled', 'BOOLEAN DEFAULT TRUE')
        add_column_if_not_exists('salon_settings', 'site_enabled', 'BOOLEAN DEFAULT FALSE')


        # Registration Audit Log
        c.execute('''CREATE TABLE IF NOT EXISTS registration_audit (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            action TEXT, -- 'approved', 'rejected', 'deleted'
            approved_by INTEGER,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS notification_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) NOT NULL UNIQUE,
            email_notifications BOOLEAN DEFAULT TRUE,
            telegram_notifications BOOLEAN DEFAULT TRUE,
            whatsapp_notifications BOOLEAN DEFAULT FALSE,
            push_notifications BOOLEAN DEFAULT TRUE,
            sms_notifications BOOLEAN DEFAULT FALSE,
            booking_notifications BOOLEAN DEFAULT TRUE,
            notify_on_new_booking BOOLEAN DEFAULT TRUE,
            notify_on_booking_change BOOLEAN DEFAULT TRUE,
            notify_on_booking_cancel BOOLEAN DEFAULT TRUE,
            chat_notifications BOOLEAN DEFAULT TRUE,
            daily_report BOOLEAN DEFAULT TRUE,
            report_time TEXT DEFAULT '21:00',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('notification_settings', 'telegram_notifications', 'BOOLEAN DEFAULT TRUE')
        add_column_if_not_exists('notification_settings', 'whatsapp_notifications', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('notification_settings', 'push_notifications', 'BOOLEAN DEFAULT TRUE')
        add_column_if_not_exists('notification_settings', 'notify_on_new_booking', 'BOOLEAN DEFAULT TRUE')
        add_column_if_not_exists('notification_settings', 'notify_on_booking_change', 'BOOLEAN DEFAULT TRUE')
        add_column_if_not_exists('notification_settings', 'notify_on_booking_cancel', 'BOOLEAN DEFAULT TRUE')
        add_column_if_not_exists('notification_settings', 'report_time', "TEXT DEFAULT '21:00'")

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
        c.execute(f'''CREATE TABLE IF NOT EXISTS services (
            id SERIAL PRIMARY KEY,
            parent_id INTEGER REFERENCES services(id), -- For sub-services
            category TEXT DEFAULT 'general',
            service_key TEXT UNIQUE,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            min_price REAL,
            max_price REAL,
            currency TEXT DEFAULT '{SALON_CURRENCY_DEFAULT}',
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
        add_column_if_not_exists('services', 'category', "TEXT DEFAULT 'general'")
        add_column_if_not_exists('services', 'service_key', 'TEXT')
        add_column_if_not_exists('services', 'recommended_interval_days', 'INTEGER DEFAULT 30')

        # Ensure service_key is always present and unique for ON CONFLICT(service_key)
        c.execute("""
            UPDATE services
            SET service_key = 'service_' || id::TEXT
            WHERE service_key IS NULL OR TRIM(service_key) = ''
        """)
        c.execute("""
            WITH duplicated AS (
                SELECT id, service_key,
                       ROW_NUMBER() OVER (PARTITION BY service_key ORDER BY id) AS rn
                FROM services
                WHERE service_key IS NOT NULL AND TRIM(service_key) <> ''
            )
            UPDATE services s
            SET service_key = s.service_key || '_' || s.id::TEXT
            FROM duplicated d
            WHERE s.id = d.id AND d.rn > 1
        """)
        c.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_services_service_key_unique ON services(service_key)")

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
            type TEXT DEFAULT 'vacation',
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('user_time_off', 'type', "TEXT DEFAULT 'vacation'")

        # Clients and CRM Profiles
        c.execute('''CREATE TABLE IF NOT EXISTS clients (
            instagram_id TEXT PRIMARY KEY,
            username TEXT, phone TEXT, name TEXT, email TEXT,
            password_hash TEXT, status TEXT DEFAULT 'new',
            language TEXT DEFAULT 'en',
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
        add_column_if_not_exists('clients', 'user_id', 'INTEGER')  # Связь с зарегистрированным пользователем

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
        add_column_if_not_exists('bookings', 'master_user_id', 'INTEGER REFERENCES users(id)')
        add_column_if_not_exists('bookings', 'promo_code', 'TEXT')
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_master_user_id_datetime ON bookings (master_user_id, datetime)")
        # Дополнительные индексы для ускорения частых запросов
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_datetime ON bookings (datetime)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_client_phone ON bookings (client_phone)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients (phone)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients (created_at)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings (created_at)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_ratings_instagram_id ON ratings (instagram_id)")

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
        c.execute(f'''CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            invoice_number TEXT UNIQUE,
            client_id TEXT REFERENCES clients(instagram_id),
            booking_id INTEGER REFERENCES bookings(id),
            status TEXT DEFAULT 'draft',
            stage_id INTEGER REFERENCES workflow_stages(id),
            total_amount REAL DEFAULT 0,
            paid_amount REAL DEFAULT 0,
            currency TEXT DEFAULT '{SALON_CURRENCY_DEFAULT}',
            items JSONB DEFAULT '[]',
            notes TEXT,
            due_date TIMESTAMP,
            pdf_path TEXT,
            sent_at TIMESTAMP,
            paid_at TIMESTAMP,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('invoices', 'invoice_number', 'TEXT')
        add_column_if_not_exists('invoices', 'status', "TEXT DEFAULT 'draft'")
        add_column_if_not_exists('invoices', 'due_date', 'TIMESTAMP')
        add_column_if_not_exists('invoices', 'sent_at', 'TIMESTAMP')
        add_column_if_not_exists('invoices', 'paid_at', 'TIMESTAMP')

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

        # --- 6. LOYALTY AND PROMOTIONS (New) ---
        c.execute('''CREATE TABLE IF NOT EXISTS promo_codes (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            discount_type TEXT NOT NULL, -- 'fixed' or 'percent'
            value REAL NOT NULL,
            min_amount REAL DEFAULT 0,
            valid_from TIMESTAMP,
            valid_until TIMESTAMP,
            max_uses INTEGER,
            current_uses INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            category TEXT, -- 'birthday', 'general', 'referral'
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('promo_codes', 'target_scope', "TEXT DEFAULT 'all'")
        add_column_if_not_exists('promo_codes', 'target_category_names', 'TEXT')
        add_column_if_not_exists('promo_codes', 'target_service_ids', 'TEXT')
        add_column_if_not_exists('promo_codes', 'target_client_ids', 'TEXT')
        
        c.execute('''CREATE TABLE IF NOT EXISTS promo_code_usage (
            id SERIAL PRIMARY KEY,
            promo_id INTEGER REFERENCES promo_codes(id) ON DELETE CASCADE,
            client_id TEXT, -- instagram_id or telegram_id
            user_id INTEGER REFERENCES users(id),
            booking_id INTEGER,
            used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS special_packages (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            original_price REAL NOT NULL DEFAULT 0,
            special_price REAL NOT NULL DEFAULT 0,
            currency TEXT,
            discount_percent INTEGER DEFAULT 0,
            services_included TEXT,
            promo_code TEXT,
            keywords TEXT,
            valid_from TIMESTAMP,
            valid_until TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            usage_count INTEGER DEFAULT 0,
            max_usage INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            scheduled BOOLEAN DEFAULT FALSE,
            schedule_date DATE,
            schedule_time TIME,
            auto_activate BOOLEAN DEFAULT FALSE,
            auto_deactivate BOOLEAN DEFAULT FALSE
        )''')
        add_column_if_not_exists('special_packages', 'description', 'TEXT')
        add_column_if_not_exists('special_packages', 'services_included', 'TEXT')
        add_column_if_not_exists('special_packages', 'promo_code', 'TEXT')
        add_column_if_not_exists('special_packages', 'keywords', 'TEXT')
        add_column_if_not_exists('special_packages', 'is_active', 'BOOLEAN DEFAULT TRUE')
        add_column_if_not_exists('special_packages', 'usage_count', 'INTEGER DEFAULT 0')
        add_column_if_not_exists('special_packages', 'max_usage', 'INTEGER')
        add_column_if_not_exists('special_packages', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        add_column_if_not_exists('special_packages', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        add_column_if_not_exists('special_packages', 'scheduled', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('special_packages', 'schedule_date', 'DATE')
        add_column_if_not_exists('special_packages', 'schedule_time', 'TIME')
        add_column_if_not_exists('special_packages', 'auto_activate', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('special_packages', 'auto_deactivate', 'BOOLEAN DEFAULT FALSE')
        c.execute("CREATE INDEX IF NOT EXISTS idx_special_packages_active_period ON special_packages (is_active, valid_from, valid_until)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_special_packages_promo_code ON special_packages (promo_code)")

        c.execute('''CREATE TABLE IF NOT EXISTS marketing_unsubscriptions (
            id SERIAL PRIMARY KEY,
            client_id TEXT, -- instagram_id or telegram_id
            user_id INTEGER REFERENCES users(id),
            email TEXT,
            mailing_type TEXT NOT NULL, -- 'promotional', 'newsletter', 'birthday', 'all'
            reason TEXT,
            unsubscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(client_id, mailing_type),
            UNIQUE(user_id, mailing_type),
            UNIQUE(email, mailing_type)
        )''')
        
        # Add index for unsubscriptions
        c.execute("CREATE INDEX IF NOT EXISTS idx_unsub_client ON marketing_unsubscriptions (client_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_unsub_email ON marketing_unsubscriptions (email)")

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
            name TEXT,
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
            instagram_id TEXT,
            data JSONB DEFAULT '{}',
            master TEXT,
            master_user_id INTEGER REFERENCES users(id),
            service_id INTEGER,
            datetime TIMESTAMP,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('booking_drafts', 'instagram_id', 'TEXT')
        add_column_if_not_exists('booking_drafts', 'data', "JSONB DEFAULT '{}'")
        add_column_if_not_exists('booking_drafts', 'master_user_id', 'INTEGER REFERENCES users(id)')
        add_column_if_not_exists('booking_drafts', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        c.execute("""
            UPDATE booking_drafts
            SET instagram_id = client_id
            WHERE instagram_id IS NULL AND client_id IS NOT NULL
        """)
        c.execute("""
            DELETE FROM booking_drafts d1
            USING booking_drafts d2
            WHERE d1.id < d2.id
              AND COALESCE(d1.instagram_id, d1.client_id, '') = COALESCE(d2.instagram_id, d2.client_id, '')
              AND COALESCE(d1.instagram_id, d1.client_id, '') <> ''
        """)
        c.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_drafts_instagram_id_unique ON booking_drafts (instagram_id) WHERE instagram_id IS NOT NULL")

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

        c.execute('''CREATE TABLE IF NOT EXISTS loyalty_tiers (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            min_points INTEGER DEFAULT 0,
            discount REAL DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            color TEXT DEFAULT '#CD7F32',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('loyalty_tiers', 'name', 'TEXT')
        add_column_if_not_exists('loyalty_tiers', 'min_points', 'INTEGER DEFAULT 0')
        add_column_if_not_exists('loyalty_tiers', 'discount', 'REAL DEFAULT 0')
        add_column_if_not_exists('loyalty_tiers', 'is_active', 'BOOLEAN DEFAULT TRUE')
        add_column_if_not_exists('loyalty_tiers', 'color', "TEXT DEFAULT '#CD7F32'")
        add_column_if_not_exists('loyalty_tiers', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')

        c.execute('''CREATE TABLE IF NOT EXISTS loyalty_category_rules (
            id SERIAL PRIMARY KEY,
            category TEXT UNIQUE NOT NULL,
            points_multiplier REAL DEFAULT 1.0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('loyalty_category_rules', 'is_active', 'BOOLEAN DEFAULT TRUE')

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

        # User-specific permission overrides
        c.execute('''CREATE TABLE IF NOT EXISTS user_permissions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            permission_key TEXT NOT NULL,
            granted BOOLEAN DEFAULT TRUE,
            granted_by INTEGER REFERENCES users(id),
            granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, permission_key)
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
            call_status TEXT DEFAULT 'available',
            current_call_peer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            ws_connection_count INTEGER DEFAULT 0,
            call_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('user_status', 'is_dnd', 'BOOLEAN DEFAULT FALSE')
        add_column_if_not_exists('user_status', 'call_status', "TEXT DEFAULT 'available'")
        add_column_if_not_exists('user_status', 'current_call_peer_id', 'INTEGER REFERENCES users(id) ON DELETE SET NULL')
        add_column_if_not_exists('user_status', 'ws_connection_count', 'INTEGER DEFAULT 0')
        add_column_if_not_exists('user_status', 'call_updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')

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

        c.execute(f'''CREATE TABLE IF NOT EXISTS salary_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            base_salary REAL DEFAULT 0,
            commission_rate REAL DEFAULT 0,
            bonus_rate REAL DEFAULT 0,
            kpi_settings JSONB,
            currency TEXT DEFAULT '{SALON_CURRENCY_DEFAULT}',
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
            share_token TEXT,
            target_type TEXT DEFAULT 'all', -- all, specific_users, by_master, by_service, by_inactivity
            target_criteria JSONB,          -- {user_ids: [], master_id: int, service_ids: [], days_inactive: int}
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        add_column_if_not_exists('referral_campaigns', 'share_token', 'TEXT')
        c.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_campaigns_share_token_unique
            ON referral_campaigns(share_token)
            WHERE share_token IS NOT NULL
        """)

        c.execute('''CREATE TABLE IF NOT EXISTS referral_campaign_users (
            id SERIAL PRIMARY KEY,
            campaign_id INTEGER REFERENCES referral_campaigns(id),
            client_id TEXT REFERENCES clients(instagram_id),
            share_token TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(campaign_id, client_id)
        )''')
        add_column_if_not_exists('referral_campaign_users', 'share_token', 'TEXT')
        c.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_campaign_users_share_token_unique
            ON referral_campaign_users(share_token)
            WHERE share_token IS NOT NULL
        """)

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
            ('task', 'in_progress', 'В работе', '#3b82f6', 1),
            ('task', 'done', 'Завершено', '#22c55e', 2)
        ]
        for ent, nm, ru, clr, ord in default_stages:
            c.execute("""
                INSERT INTO workflow_stages (entity_type, name, color, sort_order)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (entity_type, name) DO NOTHING
            """, (ent, nm, clr, ord))

        stage_reference_map = {
            'pipeline': ('clients', 'pipeline_stage_id'),
            'invoice': ('invoices', 'stage_id'),
            'task': ('tasks', 'stage_id'),
        }

        for entity_type, (ref_table, ref_column) in stage_reference_map.items():
            c.execute("""
                SELECT id, name, color, sort_order
                FROM workflow_stages
                WHERE entity_type = %s
                ORDER BY sort_order, id
            """, (entity_type,))
            stage_rows = c.fetchall()

            grouped_by_key = {}
            for stage_id, stage_name, stage_color, sort_order in stage_rows:
                canonical_key = normalize_stage_key(entity_type, stage_name)
                if len(canonical_key) == 0:
                    continue

                grouped_by_key.setdefault(canonical_key, []).append({
                    "id": stage_id,
                    "name": stage_name,
                    "color": stage_color,
                    "sort_order": sort_order,
                })

            for canonical_key, variants in grouped_by_key.items():
                winner = next(
                    (
                        stage
                        for stage in variants
                        if str(stage["name"]).strip().lower().replace(' ', '_') == canonical_key
                    ),
                    variants[0]
                )

                for stage in variants:
                    if stage["id"] == winner["id"]:
                        continue

                    c.execute(
                        f"UPDATE {ref_table} SET {ref_column} = %s WHERE {ref_column} = %s",
                        (winner["id"], stage["id"])
                    )
                    c.execute("DELETE FROM workflow_stages WHERE id = %s", (stage["id"],))

                current_winner_name = str(winner["name"]).strip().lower().replace(' ', '_')
                if current_winner_name != canonical_key:
                    c.execute("UPDATE workflow_stages SET name = %s WHERE id = %s", (canonical_key, winner["id"]))

                expected_sort_order = canonical_stage_order.get(entity_type, {}).get(canonical_key)
                if expected_sort_order is not None and winner["sort_order"] != expected_sort_order:
                    c.execute(
                        "UPDATE workflow_stages SET sort_order = %s WHERE id = %s",
                        (expected_sort_order, winner["id"])
                    )

        for source_status, canonical_status in stage_aliases['invoice'].items():
            c.execute(
                """
                UPDATE invoices
                SET status = %s
                WHERE LOWER(REPLACE(COALESCE(status, ''), ' ', '_')) = %s
                """,
                (canonical_status, source_status)
            )

        # CRM-only bootstrap without business/demo auto-fill.
        requested_name = (os.getenv("SALON_NAME") or "").strip()
        salon_name = requested_name if len(requested_name) > 0 else "ST CRM"
        c.execute(
            """
            INSERT INTO salon_settings (id, name, product_mode, crm_enabled, site_enabled, custom_settings)
            VALUES (1, %s, 'crm', TRUE, FALSE, '{}'::jsonb)
            ON CONFLICT (id) DO UPDATE SET
                name = CASE
                    WHEN salon_settings.name IS NULL
                        OR TRIM(salon_settings.name) = ''
                        OR LOWER(salon_settings.name) LIKE '%le diamant%'
                    THEN EXCLUDED.name
                    ELSE salon_settings.name
                END,
                product_mode = 'crm',
                crm_enabled = TRUE,
                site_enabled = FALSE,
                updated_at = CURRENT_TIMESTAMP
            """,
            (salon_name,),
        )
        c.execute(
            """
            UPDATE salon_settings
            SET bot_name = 'ST CRM Assistant'
            WHERE id = 1
                AND (
                    bot_name IS NULL
                    OR TRIM(bot_name) = ''
                    OR LOWER(bot_name) LIKE '%le diamant%'
                )
            """
        )

        # Universal CRM runtime: remove image-based prefilled content and photo links.
        c.execute("UPDATE users SET photo = NULL WHERE photo IS NOT NULL")
        c.execute(
            """
            UPDATE salon_settings
            SET logo_url = NULL
            WHERE id = 1
              AND logo_url IS NOT NULL
              AND TRIM(logo_url) <> ''
            """
        )
        c.execute("DELETE FROM public_gallery")
        c.execute("DELETE FROM public_banners")

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
        add_column_if_not_exists('salon_settings', 'business_type', "TEXT DEFAULT 'other'")
        add_column_if_not_exists('salon_settings', 'product_mode', "TEXT DEFAULT 'crm'")
        add_column_if_not_exists('salon_settings', 'crm_enabled', 'BOOLEAN DEFAULT TRUE')
        add_column_if_not_exists('salon_settings', 'site_enabled', 'BOOLEAN DEFAULT FALSE')

        c.execute("""
            UPDATE salon_settings
            SET business_type = 'other'
            WHERE business_type IS NULL OR TRIM(business_type) = ''
        """)
        c.execute("""
            UPDATE salon_settings
            SET product_mode = 'crm'
            WHERE product_mode IS NULL OR TRIM(product_mode) = ''
        """)
        c.execute("""
            UPDATE salon_settings
            SET crm_enabled = TRUE
            WHERE crm_enabled IS NULL
        """)
        c.execute("""
            UPDATE salon_settings
            SET site_enabled = FALSE
            WHERE site_enabled IS NULL
        """)
        c.execute("""
            UPDATE salon_settings
            SET custom_settings = jsonb_set(
                COALESCE(custom_settings, '{}'::jsonb),
                '{business_profile_config}',
                COALESCE(custom_settings -> 'business_profile_config', '{"schema_version": 1}'::jsonb),
                TRUE
            )
            WHERE custom_settings IS NULL
               OR (custom_settings ? 'business_profile_config') = FALSE
        """)
        add_column_if_not_exists('newsletter_subscribers', 'name', 'TEXT')

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

        # Startup must not auto-fill reference catalogs.

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
