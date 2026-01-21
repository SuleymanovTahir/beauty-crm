"""
Consolidated Other Tables Schema Migration
All schema changes for other tables (notifications, chat, permissions, etc.)
"""
from db.connection import get_db_connection

def migrate_other_schema():
    """
    Apply all other table schema changes
    """
    print("\n" + "="*60)
    print("🔧 OTHER TABLES SCHEMA MIGRATION")
    print("="*60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Create notification_settings table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS notification_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                email_notifications BOOLEAN DEFAULT TRUE,
                sms_notifications BOOLEAN DEFAULT FALSE,
                booking_notifications BOOLEAN DEFAULT TRUE,
                chat_notifications BOOLEAN DEFAULT TRUE,
                daily_report BOOLEAN DEFAULT TRUE,
                report_time TEXT DEFAULT '09:00',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            )
        """)
        print("  ✅ notification_settings table ensured")
        
        # Create internal_chat table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS internal_chat (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                type TEXT DEFAULT 'text',
                edited BOOLEAN DEFAULT FALSE,
                edited_at TEXT,
                deleted_for_sender BOOLEAN DEFAULT FALSE,
                deleted_for_receiver BOOLEAN DEFAULT FALSE,
                reactions JSONB,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (receiver_id) REFERENCES users(id)
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_internal_chat_receiver_unread ON internal_chat(receiver_id, is_read)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_internal_chat_sender_receiver ON internal_chat(sender_id, receiver_id)")
        print("  ✅ internal_chat table ensured with indexes")

        
        # Create permissions table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS permissions (
                id SERIAL PRIMARY KEY,
                role TEXT NOT NULL,
                resource TEXT NOT NULL,
                action TEXT NOT NULL,
                allowed BOOLEAN DEFAULT TRUE,
                UNIQUE(role, resource, action)
            )
        """)
        print("  ✅ permissions table ensured")
        
        # Create broadcast_history table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS broadcast_history (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                subscription_type TEXT,
                channels TEXT,
                subject TEXT,
                target_role TEXT,
                recipients_count INTEGER DEFAULT 0,
                total_sent INTEGER DEFAULT 0,
                results TEXT,
                sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id)
            )
        """)
        print("  ✅ broadcast_history table ensured")
        
        # Create director_approvals table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS director_approvals (
                id SERIAL PRIMARY KEY,
                request_type TEXT NOT NULL,
                requested_by INTEGER NOT NULL,
                request_data TEXT,
                status TEXT DEFAULT 'pending',
                approved_by INTEGER,
                approved_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (requested_by) REFERENCES users(id),
                FOREIGN KEY (approved_by) REFERENCES users(id)
            )
        """)
        print("  ✅ director_approvals table ensured")
        
        # Create positions table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS positions (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                name_ru TEXT,
                name_en TEXT,
                name_ar TEXT,
                name_fr TEXT,
                name_de TEXT,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ positions table ensured")
        
        # Create plans table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                metric_type TEXT DEFAULT 'revenue',
                target_value REAL,
                period_type TEXT DEFAULT 'monthly',
                start_date TEXT,
                end_date TEXT,
                created_by INTEGER,
                role_key TEXT,
                user_id INTEGER,
                visible_to_positions TEXT,
                can_edit_positions TEXT,
                is_position_plan BOOLEAN DEFAULT FALSE,
                is_individual_plan BOOLEAN DEFAULT FALSE,
                price REAL NOT NULL,
                features TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT,
                UNIQUE(name, role)
            )
        """)
        print("  ✅ plans table ensured")
        
        # Create messenger_settings table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS messenger_settings (
                id SERIAL PRIMARY KEY,
                messenger_type TEXT NOT NULL UNIQUE,
                is_enabled BOOLEAN DEFAULT FALSE,
                display_name TEXT NOT NULL,
                api_token TEXT,
                webhook_url TEXT,
                config_json TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ messenger_settings table ensured")

        # Create messenger_messages table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS messenger_messages (
                id SERIAL PRIMARY KEY,
                messenger_type TEXT NOT NULL,
                client_id TEXT NOT NULL,
                external_message_id TEXT,
                sender_type TEXT NOT NULL,
                message_text TEXT,
                attachments_json TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
            )
        """)
        print("  ✅ messenger_messages table ensured")

        # Create messenger indexes
        c.execute("CREATE INDEX IF NOT EXISTS idx_messenger_messages_client ON messenger_messages(client_id, messenger_type, created_at DESC)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_messenger_messages_unread ON messenger_messages(messenger_type, is_read, created_at DESC)")
        
        # Insert default messenger settings
        messengers = [
            ('instagram', 'Instagram', True),
            ('whatsapp', 'WhatsApp', False),
            ('telegram', 'Telegram', False),
            ('tiktok', 'TikTok', False)
        ]

        for messenger_type, display_name, is_enabled in messengers:
            c.execute("""
                INSERT INTO messenger_settings (messenger_type, display_name, is_enabled) VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING
    """, (messenger_type, display_name, is_enabled))
        print("  ✅ default messenger settings ensured")
        
        # Create visitor_tracking table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS visitor_tracking (
                id SERIAL PRIMARY KEY,
                ip_address VARCHAR(45),
                ip_hash VARCHAR(64),
                latitude REAL,
                longitude REAL,
                city VARCHAR(100),
                country VARCHAR(100),
                distance_km REAL,
                is_local BOOLEAN,
                user_agent TEXT,
                page_url TEXT,
                visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for better query performance
        c.execute("CREATE INDEX IF NOT EXISTS idx_visitor_visited_at ON visitor_tracking(visited_at)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_visitor_country ON visitor_tracking(country)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_visitor_is_local ON visitor_tracking(is_local)")
        # Optimization indexes for analytics
        c.execute("CREATE INDEX IF NOT EXISTS idx_visitor_city ON visitor_tracking(city)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_visitor_page_url ON visitor_tracking(page_url)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_visitor_distance ON visitor_tracking(distance_km)")
        print("  ✅ visitor_tracking table ensured with optimized indexes")
        
        print("\n✅ All other tables ensured")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_other_schema()
