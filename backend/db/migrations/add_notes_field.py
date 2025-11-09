"""
Добавление поля notes и таблицы message_templates
"""
import sqlite3
from config import DATABASE_NAME
from logger import log_info, log_error

def migrate():
    """Выполнить миграцию"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        log_info("=" * 60, "migration")
        log_info("🚀 Начинаем миграцию базы данных", "migration")
        log_info("=" * 60, "migration")
        
        # 1. Добавляем поле notes в clients если его нет
        log_info("📝 Проверяем поле notes в таблице clients...", "migration")
        try:
            c.execute("ALTER TABLE clients ADD COLUMN notes TEXT")
            conn.commit()
            log_info("✅ Поле notes добавлено в таблицу clients", "migration")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                log_info("ℹ️  Поле notes уже существует", "migration")
            else:
                log_error(f"❌ Ошибка при добавлении notes: {e}", "migration")
                raise
        
        # 2. Создаем таблицу message_templates
        log_info("📝 Создаем таблицу message_templates...", "migration")
        c.execute("""
            CREATE TABLE IF NOT EXISTS message_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                user_id INTEGER,
                usage_count INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        conn.commit()
        log_info("✅ Таблица message_templates создана", "migration")
        
        # 3. Проверяем структуру таблицы
        log_info("🔍 Проверяем структуру таблицы message_templates...", "migration")
        c.execute("PRAGMA table_info(message_templates)")
        columns = {col[1]: col[2] for col in c.fetchall()}
        
        required_fields = ['id', 'name', 'content', 'category', 'user_id', 'usage_count', 'created_at']
        missing_fields = [f for f in required_fields if f not in columns]
        
        if missing_fields:
            log_error(f"❌ Отсутствуют поля: {', '.join(missing_fields)}", "migration")
        else:
            log_info("✅ Все необходимые поля присутствуют", "migration")
        
        # 4. Добавляем тестовые шаблоны если таблица пустая
        c.execute("SELECT COUNT(*) FROM message_templates")
        count = c.fetchone()[0]
        
        if count == 0:
            log_info("📝 Добавляем начальные шаблоны...", "migration")
            
            templates = [
                ("Приветствие", "Здравствуйте! 👋 Спасибо что написали нам. Чем могу помочь?", "greeting"),
                ("Запись подтверждена", "✅ Отлично! Ваша запись подтверждена.\n📅 Дата: {{date}}\n🕐 Время: {{time}}\n\nЖдем вас! 💖", "booking"),
                ("Напоминание о записи", "⏰ Напоминаем о вашей записи завтра в {{time}}.\n\nБудем рады видеть вас!", "reminder"),
                ("Благодарность", "💕 Спасибо что посетили нас!\n\nБудем рады видеть вас снова.", "thanks"),
                ("Информация о ценах", "📋 Прайс-лист наших услуг:\n\n[Здесь можно указать услуги]\n\nДля записи напишите интересующую услугу.", "info"),
            ]
            
            for name, content, category in templates:
                c.execute("""
                    INSERT INTO message_templates (name, content, category, user_id)
                    VALUES (?, ?, ?, NULL)
                """, (name, content, category))
            
            conn.commit()
            log_info(f"✅ Добавлено {len(templates)} шаблонов", "migration")
        else:
            log_info(f"ℹ️  В таблице уже есть {count} шаблонов", "migration")
        
        # 5. Проверяем таблицу clients
        log_info("🔍 Проверяем структуру таблицы clients...", "migration")
        c.execute("PRAGMA table_info(clients)")
        client_columns = [col[1] for col in c.fetchall()]
        
        if 'notes' in client_columns:
            log_info("✅ Поле notes присутствует в таблице clients", "migration")
        else:
            log_error("❌ Поле notes отсутствует в таблице clients", "migration")
        
        conn.close()
        
        log_info("=" * 60, "migration")
        log_info("✅ Миграция завершена успешно!", "migration")
        log_info("=" * 60, "migration")
        
        return True
        
    except Exception as e:
        log_error(f"❌ Критическая ошибка миграции: {e}", "migration")
        import traceback
        log_error(traceback.format_exc(), "migration")
        return False

if __name__ == "__main__":
    print("=" * 70)
    print("🔧 МИГРАЦИЯ: Добавление поля notes и таблицы message_templates")
    print("=" * 70)
    response = input("\n⚠️  Выполнить миграцию? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        migrate()
    else:
        print("\n❌ Миграция отменена")