"""
Миграция: Включить напоминания о записях по умолчанию

Обновляет существующие настройки напоминаний, устанавливая is_enabled=1
"""
import sqlite3
from core.config import DATABASE_NAME


def enable_booking_reminders_by_default():
    """Включить напоминания о записях по умолчанию"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        print("📋 Включаю напоминания о записях по умолчанию...")
        
        # Проверяем, существует ли таблица
        c.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='booking_reminder_settings'
        """)
        
        if not c.fetchone():
            print("  ⚠️ Таблица booking_reminder_settings не существует, пропускаем")
            return True
        
        # Включаем все напоминания
        c.execute("""
            UPDATE booking_reminder_settings
            SET is_enabled = 1
            WHERE is_enabled = 0
        """)
        
        updated_count = c.rowcount
        
        if updated_count > 0:
            print(f"  ✅ Включено {updated_count} напоминаний")
        else:
            print("  ✓ Напоминания уже включены")
        
        conn.commit()
        print("✅ Миграция завершена успешно!")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    enable_booking_reminders_by_default()
