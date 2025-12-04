
import sys
import os
from pathlib import Path
from datetime import datetime

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(backend_dir))

from db.connection import get_db_connection
from core.subscriptions import get_all_subscription_types

def fix_users_data():
    print("🔧 Fixing Users Data for Broadcasts...")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Set email_verified = TRUE for all users
        print("  Setting email_verified = TRUE...")
        c.execute("UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE OR email_verified IS NULL")
        print(f"  ✅ Updated {c.rowcount} users")
        
        # 2. Populate user_subscriptions
        print("  Populating user_subscriptions...")
        c.execute("SELECT id FROM users")
        users = c.fetchall()
        
        all_types = get_all_subscription_types()
        added_count = 0
        
        for user in users:
            user_id = user[0]
            for sub_type in all_types.keys():
                c.execute("""
                    INSERT INTO user_subscriptions
                    (user_id, subscription_type, is_subscribed, email_enabled, telegram_enabled, instagram_enabled, updated_at)
                    VALUES (%s, %s, TRUE, TRUE, TRUE, TRUE, %s)
                    ON CONFLICT (user_id, subscription_type) DO NOTHING
                """, (user_id, sub_type, datetime.now().isoformat()))
                if c.rowcount > 0:
                    added_count += 1
                    
        print(f"  ✅ Added {added_count} missing subscriptions")
        
        conn.commit()
        print("✅ Successfully fixed user data")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_users_data()
