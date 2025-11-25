import sqlite3
from core.config import DATABASE_NAME

def update_max_message_chars():
    """
    Обновление настройки max_message_chars до 300 символов (но без жесткого обрезания)
    """
    print(f"🔄 Запуск миграции: update_max_message_chars")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Проверяем существование таблицы
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='bot_settings'")
        if not c.fetchone():
            print("⚠️ Таблица bot_settings не найдена, пропускаем")
            return True

        # Обновляем значение на 300 (стандарт)
        c.execute("UPDATE bot_settings SET max_message_chars = 300")
        
        if c.rowcount > 0:
            print(f"✅ Обновлено {c.rowcount} записей: max_message_chars -> 300")
        else:
            print("ℹ️ Обновление не требуется")
            
        conn.commit()
        return True
        
    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        return False
    finally:
        conn.close()
