"""
Миграция: Добавление расширенных полей профиля сотрудника
Дата: 2025-11-24
Описание: Добавляет поля для номера телефона, даты рождения, соцсетей, 
          специализации, опыта работы, описания и сертификатов
"""

import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def add_employee_profile_fields():
    """Добавить новые поля профиля в таблицу employees"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        log_info("=" * 70, "migration")
        log_info("🚀 Добавление расширенных полей профиля сотрудника", "migration")
        log_info("=" * 70, "migration")
        
        # Получаем текущие колонки таблицы employees
        c.execute("PRAGMA table_info(employees)")
        existing_columns = {col[1] for col in c.fetchall()}
        log_info(f"📋 Существующие колонки: {existing_columns}", "migration")
        
        # Список новых полей для добавления
        new_fields = {
            'phone_number': 'TEXT',  # Номер телефона (отдельно от phone)
            'birth_date': 'TEXT',     # Дата рождения
            'whatsapp': 'TEXT',       # WhatsApp
            'telegram': 'TEXT',       # Telegram
            'instagram_link': 'TEXT', # Instagram (отдельно от instagram)
            'about_me': 'TEXT',       # О себе
            'specialization': 'TEXT', # Специализация
            'years_of_experience': 'INTEGER', # Опыт работы (лет)
            'certificates': 'TEXT',   # JSON массив путей к сертификатам
        }
        
        # Добавляем каждое поле, если его еще нет
        for field_name, field_type in new_fields.items():
            if field_name not in existing_columns:
                log_info(f"➕ Добавляю поле: {field_name} ({field_type})", "migration")
                c.execute(f"ALTER TABLE employees ADD COLUMN {field_name} {field_type}")
                log_info(f"✅ Поле {field_name} добавлено", "migration")
            else:
                log_info(f"⏭️  Поле {field_name} уже существует, пропускаю", "migration")
        
        # Создаем таблицу для сертификатов (если нужна отдельная таблица)
        log_info("📝 Создаю таблицу employee_certificates...", "migration")
        c.execute("""
            CREATE TABLE IF NOT EXISTS employee_certificates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                certificate_name TEXT NOT NULL,
                certificate_url TEXT NOT NULL,
                issue_date TEXT,
                issuer TEXT,
                description TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        """)
        log_info("✅ Таблица employee_certificates создана", "migration")
        
        # Создаем индекс для быстрого поиска сертификатов по сотруднику
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_employee_certificates_employee_id 
            ON employee_certificates(employee_id)
        """)
        log_info("✅ Индекс создан", "migration")
        
        conn.commit()
        log_info("=" * 70, "migration")
        log_info("✅ Миграция завершена успешно!", "migration")
        log_info("=" * 70, "migration")
        
        return True
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка миграции: {e}", "migration")
        import traceback
        log_error(traceback.format_exc(), "migration")
        return False
        
    finally:
        conn.close()


if __name__ == "__main__":
    add_employee_profile_fields()
