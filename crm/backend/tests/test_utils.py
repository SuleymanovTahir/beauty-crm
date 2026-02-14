"""
Утилиты для тестов
"""
import uuid
from datetime import datetime
from db.connection import get_db_connection


def create_test_user(username_prefix, full_name, role="employee", position="Stylist", is_service_provider=True):
    """
    Создает тестового пользователя с уникальным username.
    Автоматически очищает старых тестовых пользователей с таким префиксом и их связанные данные.

    Args:
        username_prefix: префикс для username (например, "test_master")
        full_name: полное имя пользователя
        role: роль (employee, admin, director и т.д.)
        position: должность
        is_service_provider: является ли сервис провайдером

    Returns:
        user_id: ID созданного пользователя
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Генерируем уникальный username
        unique_username = f"{username_prefix}_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"

        # Получаем ID старых тестовых пользователей для очистки связанных данных
        c.execute(f"SELECT id FROM users WHERE username LIKE '{username_prefix}_%'")
        old_user_ids = [row[0] for row in c.fetchall()]

        if old_user_ids:
            _cleanup_user_data(c, old_user_ids)

        # Создаем пользователя
        c.execute("""
            INSERT INTO users (username, password_hash, full_name, role, position, is_active, is_service_provider)
            VALUES (%s, 'dummy_hash', %s, %s, %s, TRUE, %s)
            RETURNING id
        """, (unique_username, full_name, role, position, is_service_provider))

        user_id = c.fetchone()[0]
        conn.commit()

        return user_id

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def _cleanup_user_data(c, user_ids):
    """Вспомогательная функция для удаления данных пользователя из всех таблиц"""
    if not user_ids:
        return
    
    user_ids_str = ','.join(map(str, user_ids))
    
    # Список таблиц для очистки в правильном порядке (сначала зависимые)
    tables = [
        "user_schedule",
        "schedule_breaks",
        "user_time_off",
        "user_permissions",
        "notification_settings",
        "user_services",
        "payroll_payments",
        "notifications",
        "activity_log",
        "sessions"
    ]
    
    for table in tables:
        try:
            # Use SAVEPOINT to prevent transaction abortion if table doesn't exist
            # or if other errors occur during cleanup
            c.execute(f"SAVEPOINT cleanup_{table}")
            c.execute(f"DELETE FROM {table} WHERE user_id IN ({user_ids_str})")
            c.execute(f"RELEASE SAVEPOINT cleanup_{table}")
        except Exception:
            # If error (e.g. table not found), rollback to savepoint and continue
            c.execute(f"ROLLBACK TO SAVEPOINT cleanup_{table}")
            pass
            
    # После удаления всех зависимостей удаляем самих пользователей
    c.execute(f"DELETE FROM users WHERE id IN ({user_ids_str})")


def cleanup_test_users(username_prefix):
    """
    Удаляет всех тестовых пользователей с заданным префиксом.
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Находим всех пользователей с префиксом
        c.execute(f"SELECT id FROM users WHERE username LIKE '{username_prefix}_%'")
        user_ids = [row[0] for row in c.fetchall()]
        
        if user_ids:
            _cleanup_user_data(c, user_ids)
            
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def cleanup_all_test_users():
    """
    Удаляет всех пользователей, начинающихся с 'test_'
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("SELECT id FROM users WHERE username LIKE 'test_%'")
        user_ids = [row[0] for row in c.fetchall()]
        
        deleted_count = len(user_ids)
        if user_ids:
            _cleanup_user_data(c, user_ids)
            
        conn.commit()
        return deleted_count
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
