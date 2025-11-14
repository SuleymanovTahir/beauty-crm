import sqlite3
from core.config import DATABASE_NAME

def add_language_column():
    """Добавить колонку language в clients (если её нет)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Проверяем существует ли колонка
        c.execute("PRAGMA table_info(clients)")
        columns = [row[1] for row in c.fetchall()]
        
        if 'language' not in columns:
            print("❌ Колонка language не найдена, добавляем...")
            c.execute("ALTER TABLE clients ADD COLUMN language TEXT DEFAULT 'ru'")
            
            # Копируем значения из detected_language
            c.execute("UPDATE clients SET language = detected_language WHERE detected_language IS NOT NULL")
            
            conn.commit()
            print("✅ Колонка language добавлена")
        else:
            print("✅ Колонка language уже существует")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("🔧 МИГРАЦИЯ: Добавление колонки language")
    print("=" * 70)
    response = input("\n⚠️  Выполнить миграцию? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        add_language_column()
    else:
        print("\n❌ Миграция отменена")