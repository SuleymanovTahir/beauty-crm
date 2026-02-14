from db.connection import get_db_connection
import sys
import os
import asyncio
import json

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.config import DATABASE_NAME

async def test_save_settings():
    print("🧪 Testing save settings...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Get any existing user to avoid FK violation
    c.execute("SELECT id FROM users WHERE is_active = TRUE LIMIT 1")
    result = c.fetchone()
    if not result:
        # Fallback to any user
        c.execute("SELECT id FROM users LIMIT 1")
        result = c.fetchone()
        
    if not result:
        print("⚠️  SKIP: No users found in database for settings test")
        conn.close()
        return

    user_id = result[0]
    print(f"Using user ID: {user_id}")
    
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
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Check if row exists
    c.execute("SELECT id FROM notification_settings WHERE user_id = %s", (user_id,))
    existing = c.fetchone()
    
    if existing:
        print("🔄 Updating existing settings...")
        # Simulate the UPDATE logic from the code
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'notification_settings\'")
        columns = [row[0] for row in c.fetchall()]
        
        update_fields = []
        params = []
        
        if 'email_notifications' in columns:
            update_fields.append("email_notifications = %s")
            params.append(True)
        if 'chat_notifications' in columns:
            update_fields.append("chat_notifications = %s")
            params.append(True)
            
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(user_id)
        
        sql = f"UPDATE notification_settings SET {', '.join(update_fields)} WHERE user_id = %s"
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
                user_id, email_notifications, sms_notifications,
                booking_notifications, chat_notifications, report_time, daily_report
                ) VALUES (%s, TRUE, FALSE, TRUE, TRUE, '10:00', TRUE)
        """, (user_id,))
            print("✅ Insert successful")
        except Exception as e:
            print(f"❌ Insert failed: {e}")
            
    conn.commit()
    
    # Verify data
    c.execute("SELECT * FROM notification_settings WHERE user_id = %s", (user_id,))
    row = c.fetchone()
    print(f"📊 Saved data: {row}")
    
    conn.close()

if __name__ == "__main__":
    asyncio.run(test_save_settings())
