"""
Consolidated Other Tables Schema Migration
All schema changes for other tables (notifications, chat, permissions, etc.)
"""
import sqlite3


def migrate_other_schema(db_path="salon_bot.db"):
    """
    Apply all other table schema changes
    """
    print("\n" + "="*60)
    print("🔧 OTHER TABLES SCHEMA MIGRATION")
    print("="*60)
    
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    try:
        # Create notification_settings table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS notification_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                email_notifications INTEGER DEFAULT 1,
                sms_notifications INTEGER DEFAULT 0,
                booking_notifications INTEGER DEFAULT 1,
                chat_notifications INTEGER DEFAULT 1,
                daily_report INTEGER DEFAULT 1,
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
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (receiver_id) REFERENCES users(id)
            )
        """)
        print("  ✅ internal_chat table ensured")
        
        # Create permissions table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                resource TEXT NOT NULL,
                action TEXT NOT NULL,
                allowed INTEGER DEFAULT 1,
                UNIQUE(role, resource, action)
            )
        """)
        print("  ✅ permissions table ensured")
        
        # Create broadcast_history table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS broadcast_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                recipients_count INTEGER DEFAULT 0,
                sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        print("  ✅ broadcast_history table ensured")
        
        # Create director_approvals table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS director_approvals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                name_ru TEXT,
                name_en TEXT,
                name_ar TEXT,
                name_fr TEXT,
                name_de TEXT,
                description TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ positions table ensured")
        
        # Create plans table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                price REAL NOT NULL,
                features TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(name, role)
            )
        """)
        print("  ✅ plans table ensured")
        
        # Create messenger_settings table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS messenger_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                messenger_type TEXT NOT NULL UNIQUE,
                is_enabled INTEGER DEFAULT 0,
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
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                messenger_type TEXT NOT NULL,
                client_id TEXT NOT NULL,
                external_message_id TEXT,
                sender_type TEXT NOT NULL,
                message_text TEXT,
                attachments_json TEXT,
                is_read INTEGER DEFAULT 0,
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
            ('instagram', 'Instagram', 1),
            ('whatsapp', 'WhatsApp', 0),
            ('telegram', 'Telegram', 0),
            ('tiktok', 'TikTok', 0)
        ]

        for messenger_type, display_name, is_enabled in messengers:
            c.execute("""
                INSERT OR IGNORE INTO messenger_settings (messenger_type, display_name, is_enabled)
                VALUES (?, ?, ?)
            """, (messenger_type, display_name, is_enabled))
        print("  ✅ default messenger settings ensured")
        
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
