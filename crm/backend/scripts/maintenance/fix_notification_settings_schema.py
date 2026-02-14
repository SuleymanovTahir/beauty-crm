"""
Исправление типов полей в notification_settings
Конвертация INTEGER -> BOOLEAN для chat_notifications и daily_report
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.connection import get_db_connection

def fix_notification_settings_schema():
    """Исправить типы полей в notification_settings"""
    conn = get_db_connection()
    c = conn.cursor()
    
    print("🔧 Исправление схемы notification_settings...")
    print("=" * 70)
    
    try:
        # 1. Конвертируем chat_notifications: INTEGER -> BOOLEAN
        print("1. Конвертация chat_notifications...")
        c.execute("""
            ALTER TABLE notification_settings 
            ALTER COLUMN chat_notifications TYPE BOOLEAN 
            USING CASE WHEN chat_notifications = 1 THEN TRUE ELSE FALSE END
        """)
        print("✅ chat_notifications: INTEGER -> BOOLEAN")
        
        # 2. Конвертируем daily_report: INTEGER -> BOOLEAN
        print("2. Конвертация daily_report...")
        c.execute("""
            ALTER TABLE notification_settings 
            ALTER COLUMN daily_report TYPE BOOLEAN 
            USING CASE WHEN daily_report = 1 THEN TRUE ELSE FALSE END
        """)
        print("✅ daily_report: INTEGER -> BOOLEAN")
        
        # 3. Устанавливаем DEFAULT значения
        print("3. Установка DEFAULT значений...")
        c.execute("""
            ALTER TABLE notification_settings 
            ALTER COLUMN chat_notifications SET DEFAULT TRUE
        """)
        c.execute("""
            ALTER TABLE notification_settings 
            ALTER COLUMN daily_report SET DEFAULT TRUE
        """)
        print("✅ DEFAULT значения установлены")
        
        conn.commit()
        
        # 4. Проверяем результат
        print("\n4. Проверка результата...")
        c.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'notification_settings'
              AND column_name IN ('chat_notifications', 'daily_report')
            ORDER BY column_name
        """)
        
        for row in c.fetchall():
            col_name, data_type, default = row
            print(f"   {col_name}: {data_type} (default: {default})")
        
        print("=" * 70)
        print("✅ Схема успешно исправлена!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    fix_notification_settings_schema()
