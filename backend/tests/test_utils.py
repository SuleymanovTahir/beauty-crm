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

        # Удаляем расписание и другие связанные данные для старых тестовых пользователей
        if old_user_ids:
            user_ids_str = ','.join(map(str, old_user_ids))
            # Удаляем все связанные данные в правильном порядке
            c.execute(f"DELETE FROM user_schedule WHERE user_id IN ({user_ids_str})")
            c.execute(f"DELETE FROM schedule_breaks WHERE user_id IN ({user_ids_str})")
            c.execute(f"DELETE FROM user_time_off WHERE user_id IN ({user_ids_str})")
            c.execute(f"DELETE FROM user_permissions WHERE user_id IN ({user_ids_str})")
            c.execute(f"DELETE FROM notification_settings WHERE user_id IN ({user_ids_str})")
            c.execute(f"DELETE FROM user_services WHERE user_id IN ({user_ids_str})")
            
            # Теперь можно безопасно удалить самих пользователей по их ID
            c.execute(f"DELETE FROM users WHERE id IN ({user_ids_str})")

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


def cleanup_test_users(username_prefix):
    """
    Удаляет всех тестовых пользователей с заданным префиксом.

    Args:
        username_prefix: префикс username для удаления (например, "test_master")
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute(f"DELETE FROM users WHERE username LIKE '{username_prefix}_%'")
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
        c.execute("DELETE FROM users WHERE username LIKE 'test_%'")
        deleted_count = c.rowcount
        conn.commit()
        return deleted_count
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
