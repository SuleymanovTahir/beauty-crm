
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(backend_dir))

from db.connection import get_db_connection

def check_users_data():
    print("🔍 Checking Users Data...")
    conn = get_db_connection()
    c = conn.cursor()
    
    # Check users count and email_verified
    c.execute("SELECT count(*), count(*) FILTER (WHERE email_verified = TRUE) FROM users")
    total, verified = c.fetchone()
    print(f"👥 Total Users: {total}")
    print(f"✅ Verified Emails: {verified}")
    
    # Check user_subscriptions
    c.execute("SELECT count(*) FROM user_subscriptions")
    subs_count = c.fetchone()[0]
    print(f"📬 User Subscriptions: {subs_count}")
    
    if subs_count == 0:
        print("⚠️ No user subscriptions found! Broadcasts will not work.")
        
    if verified == 0:
        print("⚠️ No verified emails found! Broadcasts will not work.")
        
    conn.close()

if __name__ == "__main__":
    check_users_data()
