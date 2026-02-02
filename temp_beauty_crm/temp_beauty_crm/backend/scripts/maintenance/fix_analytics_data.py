import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../backend'))

from db.connection import get_db_connection
from utils.logger import log_info, log_error

def parse_user_agent(ua_string):
    """Simple heuristic to parse User-Agent string (Duplicate logic to avoid imports if module issues)"""
    if not ua_string:
        return 'Desktop', 'Other'
        
    ua = ua_string.lower()
    browser = 'Other'
    device_type = 'Desktop'
    
    # Detect Browser
    if 'edg/' in ua:
        browser = 'Edge'
    elif 'chrome' in ua and 'edg' not in ua:
        browser = 'Chrome'
    elif 'safari' in ua and 'chrome' not in ua:
        browser = 'Safari'
    elif 'firefox' in ua:
        browser = 'Firefox'
    elif 'opera' in ua or 'opr' in ua:
        browser = 'Opera'
    
    # Detect Device
    if 'mobile' in ua:
        device_type = 'Mobile'
    elif 'tablet' in ua or 'ipad' in ua:
        device_type = 'Tablet'
    elif 'android' in ua:
        device_type = 'Mobile'
        
    return device_type, browser

def fix_analytics_data():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Get count of records to fix
        c.execute("SELECT COUNT(*) FROM visitor_tracking WHERE device_type IS NULL OR device_type = 'Unknown' OR device_type = ''")
        count = c.fetchone()[0]
        
        if count == 0:
            print("✅ Все записи уже имеют данные об устройствах.")
            return

        print(f"🔧 Найдено {count} записей без данных об устройствах. Восстанавливаем из User-Agent...")
        
        # Batch process
        c.execute("SELECT id, user_agent FROM visitor_tracking WHERE device_type IS NULL OR device_type = 'Unknown' OR device_type = ''")
        rows = c.fetchall()
        
        updated_count = 0
        for row in rows:
            record_id = row[0]
            ua = row[1]
            
            if not ua:
                continue
                
            device, browser = parse_user_agent(ua)
            
            c.execute("""
                UPDATE visitor_tracking 
                SET device_type = %s, browser = %s 
                WHERE id = %s
            """, (device, browser, record_id))
            
            updated_count += 1
            
        conn.commit()
        conn.close()
        print(f"✅ Успешно обновлено {updated_count} записей.")
        
    except Exception as e:
        print(f"❌ Ошибка при исправлении данных: {e}")

if __name__ == "__main__":
    fix_analytics_data()
