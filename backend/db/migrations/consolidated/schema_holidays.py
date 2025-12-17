"""
Миграция схемы для таблицы salon_holidays
"""
from db.connection import get_db_connection
import logging

def migrate_holidays_schema(db_name=None):
    """Создать таблицу праздничных дней салона"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Таблица праздничных дней
        c.execute("""
            CREATE TABLE IF NOT EXISTS salon_holidays (
                id SERIAL PRIMARY KEY,
                date DATE UNIQUE NOT NULL,
                name VARCHAR(200) NOT NULL,
                is_closed BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Индекс для быстрого поиска по дате
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_salon_holidays_date 
            ON salon_holidays(date)
        """)
        
        conn.commit()
        print("✅ Таблица salon_holidays проверена/создана")
        return True
    except Exception as e:
        print(f"❌ Ошибка создания таблицы salon_holidays: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def add_holiday(date: str, name: str, is_closed: bool = True):
    """Добавить праздничный день"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO salon_holidays (date, name, is_closed)
            VALUES (%s, %s, %s)
            ON CONFLICT (date) DO UPDATE 
            SET name = EXCLUDED.name, is_closed = EXCLUDED.is_closed
            RETURNING id
        """, (date, name, is_closed))
        
        holiday_id = c.fetchone()[0]
        conn.commit()
        return holiday_id
    except Exception as e:
        print(f"Ошибка добавления праздника {date}: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()

def delete_holiday(date: str):
    """Удалить праздничный день"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM salon_holidays WHERE date = %s", (date,))
        deleted = c.rowcount > 0
        conn.commit()
        return deleted
    except Exception as e:
        print(f"Ошибка удаления праздника {date}: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def get_holidays(start_date: str = None, end_date: str = None):
    """Получить список праздников"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        if start_date and end_date:
            c.execute("""
                SELECT id, date, name, is_closed, created_at 
                FROM salon_holidays 
                WHERE date BETWEEN %s AND %s
                ORDER BY date
            """, (start_date, end_date))
        elif start_date:
            c.execute("""
                SELECT id, date, name, is_closed, created_at 
                FROM salon_holidays 
                WHERE date >= %s
                ORDER BY date
            """, (start_date,))
        else:
            c.execute("""
                SELECT id, date, name, is_closed, created_at 
                FROM salon_holidays 
                ORDER BY date
            """)
        
        rows = c.fetchall()
        holidays = []
        for row in rows:
            holidays.append({
                'id': row[0],
                'date': str(row[1]),
                'name': row[2],
                'is_closed': row[3],
                'created_at': str(row[4]) if row[4] else None
            })
        return holidays
    except Exception as e:
        print(f"Ошибка получения праздников: {e}")
        return []
    finally:
        conn.close()
