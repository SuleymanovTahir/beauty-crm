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
    print("🔧 Creating notifications table...")

    c.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            client_id TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            action_url TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (client_id) REFERENCES clients(instagram_id) ON DELETE CASCADE
        )
    """)
    print("✅ notifications table created")

    # Create index for faster queries
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON notifications(client_id);
    """)
    print("✅ Index created for notifications")

    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    """)
    print("✅ Index created for unread notifications")

    conn.commit()
    print("\n🎉 Notifications table migration completed successfully!")

except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
    raise
finally:
    conn.close()
