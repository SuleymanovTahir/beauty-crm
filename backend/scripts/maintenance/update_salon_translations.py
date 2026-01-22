"""
Script to update salon settings translations (address, hours)
"""
from db.connection import get_db_connection
import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.config import DATABASE_NAME
from utils.logger import log_info

async def update_salon_translations():
    """Update salon settings with Russian and Arabic translations"""
    print("🔧 Updating salon translations...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Update Address
        address_ru = "Shop 13, Amwaj 3 Plaza Level, JBR, Дубай, ОАЭ"
        address_ar = "متجر 13، مستوى بلازا أمواج 3، جي بي آر، دبي، الإمارات العربية المتحدة"
        
        # 2. Update Hours
        hours_ru = "Ежедневно 10:30 - 21:00"
        hours_ar = "يوميًا 10:30 - 21:00"
        
        c.execute("""
            UPDATE salon_settings
            SET 
                address_ru = %s,
                address_ar = %s,
                hours_ru = %s,
                hours_ar = %s
            WHERE id = 1
        """, (address_ru, address_ar, hours_ru, hours_ar))
        
        if c.rowcount > 0:
            print("✅ Salon translations updated successfully")
        else:
            print("⚠️ Salon settings not found (id=1)")
            
        conn.commit()
        
    except Exception as e:
        print(f"❌ Error updating salon translations: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(update_salon_translations())
