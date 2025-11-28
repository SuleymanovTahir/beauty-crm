import sqlite3
import sys
import os
import asyncio
import json

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.config import DATABASE_NAME

async def test_save_settings():
    print("🧪 Testing save settings...")
    
    user_id = 1
    data = {
        'emailNotifications': True,
        'smsNotifications': False,
        'bookingNotifications': True,
        'chatNotifications': True,
        'dailyReport': True,
        'reportTime': '10:00',
        'birthdayReminders': True,
        'birthdayDaysAdvance': 3
    }
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Check if row exists
    c.execute("SELECT id FROM notification_settings WHERE user_id = ?", (user_id,))
    existing = c.fetchone()
    
    if existing:
        print("🔄 Updating existing settings...")
        # Simulate the UPDATE logic from the code
        c.execute("PRAGMA table_info(notification_settings)")
        columns = [row[1] for row in c.fetchall()]
        
        update_fields = []
        params = []
        
        if 'email_notifications' in columns:
            update_fields.append("email_notifications = ?")
            params.append(1)
        if 'chat_notifications' in columns:
            update_fields.append("chat_notifications = ?")
            params.append(1)
        if 'birthday_reminders' in columns:
            update_fields.append("birthday_reminders = ?")
            params.append(1)
            
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(user_id)
        
        sql = f"UPDATE notification_settings SET {', '.join(update_fields)} WHERE user_id = ?"
        try:
            c.execute(sql, params)
            print("✅ Update successful")
        except Exception as e:
            print(f"❌ Update failed: {e}")
            
    else:
        print("🆕 Inserting new settings...")
        try:
            c.execute("""
                INSERT INTO notification_settings (
                    user_id, email_notifications, sms_notifications, booking_notifications,
                    chat_notifications, daily_report, report_time, birthday_reminders, birthday_days_advance
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, 1, 0, 1, 1, 1, '10:00', 1, 3))
            print("✅ Insert successful")
        except Exception as e:
            print(f"❌ Insert failed: {e}")
            
    conn.commit()
    
    # Verify data
    c.execute("SELECT * FROM notification_settings WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    print(f"📊 Saved data: {row}")
    
    conn.close()

if __name__ == "__main__":
    asyncio.run(test_save_settings())
