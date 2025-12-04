"""
Миграция: Добавление таблицы user_permissions для индивидуальных прав пользователей

Дата: 2025-11-22
Описание: Создаёт таблицу для хранения индивидуальных прав пользователей,
          которые переопределяют базовые права из роли
"""

from db.connection import get_db_connection
from utils.logger import log_info, log_error, log_warning

def migrate():
    """Создать таблицу user_permissions"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем существует ли таблица
        c.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='user_permissions'
        """)
        
        if c.fetchone():
            log_warning("⚠️ Таблица user_permissions уже существует", "migration")
            conn.close()
            return True
        
        # Создаём таблицу
        c.execute("""
            CREATE TABLE user_permissions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                permission_key TEXT NOT NULL,
                granted BOOLEAN DEFAULT 1,
                granted_by INTEGER,
                granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (granted_by) REFERENCES users(id),
                UNIQUE(user_id, permission_key)
            )
        """)
        
        # Создаём индексы для быстрого поиска
        c.execute("""
            CREATE INDEX idx_user_permissions_user_id 
            ON user_permissions(user_id)
        """)
        
        c.execute("""
            CREATE INDEX idx_user_permissions_permission_key 
            ON user_permissions(permission_key)
        """)
        
        conn.commit()
        log_info("✅ Таблица user_permissions создана успешно", "migration")
        log_info("✅ Индексы созданы", "migration")
        
        return True
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка создания таблицы user_permissions: {e}", "migration")
        import traceback
        log_error(traceback.format_exc(), "migration")
        return False
    finally:
        conn.close()

def rollback():
    """Откатить миграцию (удалить таблицу)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("DROP TABLE IF EXISTS user_permissions")
        conn.commit()
        log_info("✅ Таблица user_permissions удалена", "migration")
        return True
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка отката миграции: {e}", "migration")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("МИГРАЦИЯ: Создание таблицы user_permissions")
    print("=" * 70)
    
    if migrate():
        print("✅ Миграция выполнена успешно")
    else:
        print("❌ Миграция не выполнена")
