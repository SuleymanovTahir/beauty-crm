import sqlite3
import os

DATABASE_NAME = "salon_bot.db"

def fix_database():
    print(f"🔧 Fixing database {DATABASE_NAME}...")
    
    if not os.path.exists(DATABASE_NAME):
        print(f"❌ Database file {DATABASE_NAME} not found!")
        return

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Check existing columns
    try:
        c.execute("PRAGMA table_info(notification_settings)")
        columns = [row[1] for row in c.fetchall()]
        print(f"📊 Current columns: {columns}")
        
        # Add chat_notifications if missing
        if 'chat_notifications' not in columns:
            print("➕ Adding chat_notifications column...")
            try:
                c.execute("ALTER TABLE notification_settings ADD COLUMN chat_notifications INTEGER DEFAULT 1")
                print("✅ chat_notifications added")
            except Exception as e:
                print(f"❌ Error adding chat_notifications: {e}")
        
        # Add daily_report if missing
        if 'daily_report' not in columns:
            print("➕ Adding daily_report column...")
            try:
                c.execute("ALTER TABLE notification_settings ADD COLUMN daily_report INTEGER DEFAULT 1")
                print("✅ daily_report added")
            except Exception as e:
                print(f"❌ Error adding daily_report: {e}")

        # Add report_time if missing
        if 'report_time' not in columns:
            print("➕ Adding report_time column...")
            try:
                c.execute("ALTER TABLE notification_settings ADD COLUMN report_time TEXT DEFAULT '09:00'")
                print("✅ report_time added")
            except Exception as e:
                print(f"❌ Error adding report_time: {e}")

        # Add created_at if missing
        if 'created_at' not in columns:
            print("➕ Adding created_at column...")
            try:
                c.execute("ALTER TABLE notification_settings ADD COLUMN created_at TEXT")
                c.execute("UPDATE notification_settings SET created_at = datetime('now')")
                print("✅ created_at added")
            except Exception as e:
                print(f"❌ Error adding created_at: {e}")

        # Add updated_at if missing
        if 'updated_at' not in columns:
            print("➕ Adding updated_at column...")
            try:
                c.execute("ALTER TABLE notification_settings ADD COLUMN updated_at TEXT")
                c.execute("UPDATE notification_settings SET updated_at = datetime('now')")
                print("✅ updated_at added")
            except Exception as e:
                print(f"❌ Error adding updated_at: {e}")

        # Ensure booking_drafts table exists
        try:
            c.execute('''
                CREATE TABLE IF NOT EXISTS booking_drafts (
                    instagram_id TEXT PRIMARY KEY,
                    data TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            print("✅ booking_drafts table ensured")
        except Exception as e:
            print(f"❌ Error creating booking_drafts table: {e}")

        # Enforce default values for all notification types
        print("🔄 Enforcing default notification settings (all enabled)...")
        try:
            c.execute("""
                UPDATE notification_settings SET
                    email_notifications = 1,
                    sms_notifications = 1,
                    booking_notifications = 1,
                    chat_notifications = 1,
                    daily_report = 1
            """)
            print("✅ All notification columns set to 1")
        except Exception as e:
            print(f"❌ Error updating notification defaults: {e}")

        conn.commit()
        print("✅ Database fix completed!")
        
    except Exception as e:
        print(f"❌ Error inspecting table: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_database()
