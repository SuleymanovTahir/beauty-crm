from db.connection import get_db_connection
import asyncio
import json
from db.positions import create_position, get_position
import sys
import os
import asyncio

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.config import DATABASE_NAME

async def test_changes():
    print("🧪 Testing changes...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # 1. Verify Notification Defaults
    print("\n1️⃣ Verifying Notification Defaults...")
    c.execute("SELECT * FROM notification_settings")
    rows = c.fetchall()
    
    all_ok = True
    for row in rows:
        if row['booking_notifications'] != 1:
            print(f"❌ User {row['user_id']} has booking_notifications = {row['booking_notifications']}")
            all_ok = False
        else:
            print(f"✅ User {row['user_id']} has booking_notifications = 1")
            
    if not rows:
        print("⚠️ No notification settings found to verify.")
        
    if all_ok and rows:
        print("✅ All existing users have correct defaults.")

    # 2. Verify Positions Translations
    print("\n2️⃣ Verifying Positions Translations...")
    
    # Create a test position with all languages
    pos_id = create_position(
        name="Test Master",
        name_en="Test Master EN",
        name_ar="Test Master AR",
        name_fr="Test Master FR",
        name_de="Test Master DE",
        description="Test Description"
    )
    
    if pos_id:
        print(f"✅ Created position with ID {pos_id}")
        
        # Fetch and verify
        pos = get_position(pos_id)
        if pos:
            print(f"   Name FR: {pos['name_fr']}")
            print(f"   Name DE: {pos['name_de']}")
            
            if pos['name_fr'] == "Test Master FR" and pos['name_de'] == "Test Master DE":
                print("✅ Translations saved correctly!")
            else:
                print("❌ Translations mismatch!")
        else:
            print("❌ Failed to fetch position")
            
        # Cleanup
        # c.execute("DELETE FROM positions WHERE id = %s", (pos_id,))
        # conn.commit()
    else:
        print("❌ Failed to create position (might already exist)")

    conn.close()

if __name__ == "__main__":
    asyncio.run(test_changes())
