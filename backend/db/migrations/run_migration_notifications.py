#!/usr/bin/env python3
"""
Миграция: Таблица уведомлений для клиентов
"""
import os
import sys

# Add backend to path BEFORE imports
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from db.connection import get_db_connection
from datetime import datetime
from core.config import DATABASE_NAME

conn = get_db_connection()
c = conn.cursor()

try:
    print("🔧 Updating notifications table schema...")

    # Check existing columns
    c.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='notifications'
    """)
    existing_columns = [row[0] for row in c.fetchall()]

    if not existing_columns:
        print("📝 Creating new notifications table...")
        c.execute("""
            CREATE TABLE notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                client_id TEXT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                action_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (client_id) REFERENCES clients(instagram_id) ON DELETE CASCADE
            )
        """)
        print("✅ notifications table created")
    else:
        # Add client_id if missing
        if 'client_id' not in existing_columns:
            print("➕ Adding client_id column...")
            c.execute("ALTER TABLE notifications ADD COLUMN client_id TEXT")
            c.execute("ALTER TABLE notifications ADD CONSTRAINT fk_notifications_client FOREIGN KEY (client_id) REFERENCES clients(instagram_id) ON DELETE CASCADE")
            print("✅ client_id column added")

        # Make user_id nullable if it exists and is NOT NULL
        if 'user_id' in existing_columns:
            c.execute("SELECT is_nullable FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id'")
            is_nullable = c.fetchone()[0]
            if is_nullable == 'NO':
                print("🔓 Making user_id nullable...")
                c.execute("ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL")
                print("✅ user_id is now nullable")

    # Create indexes for faster queries
    print("🚀 Creating indexes...")
    c.execute("CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON notifications(client_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)")
    print("✅ Indexes checked/created")

    conn.commit()
    print("\n🎉 Notifications table migration completed successfully!")

except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
    raise
finally:
    conn.close()
