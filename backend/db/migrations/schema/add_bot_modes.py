import sqlite3
from core.config import DATABASE_NAME

def add_bot_mode_fields():
    """Добавить поля для режимов бота"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Режим бота для каждого клиента
        c.execute("""
            ALTER TABLE clients 
            ADD COLUMN bot_mode TEXT DEFAULT 'assistant'
        """)
        print("✅ Добавлено поле bot_mode в clients")
    except:
        print("⚠️ Поле bot_mode уже существует")
    
    try:
        # Глобальное включение/выключение бота
        c.execute("""
            ALTER TABLE salon_settings 
            ADD COLUMN bot_globally_enabled INTEGER DEFAULT 1
        """)
        print("✅ Добавлено поле bot_globally_enabled в salon_settings")
    except:
        print("⚠️ Поле bot_globally_enabled уже существует")
    
    conn.commit()
    conn.close()
    print("\n✅ Миграция завершена!")

if __name__ == "__main__":
    print("=" * 70)
    print("🔧 МИГРАЦИЯ: Добавление полей для режимов бота")
    print("=" * 70)
    response = input("\n⚠️  Выполнить миграцию? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        add_bot_mode_fields()
    else:
        print("\n❌ Миграция отменена")