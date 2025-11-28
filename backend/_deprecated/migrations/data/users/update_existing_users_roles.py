"""
Миграция данных: Обновление ролей и должностей для существующих пользователей
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_warning
from datetime import datetime

def update_existing_users_roles():
    """Обновить роли и должности для существующих пользователей"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        log_info("🔄 Обновление ролей и должностей существующих пользователей...", "migration")

        # Получаем всех пользователей без роли или должности
        c.execute("""
            SELECT id, username, full_name, email, role, position
            FROM users
            WHERE role IS NULL OR role = '' OR position IS NULL OR position = ''
        """)

        users_to_update = c.fetchall()

        if not users_to_update:
            log_info("✓ Все пользователи уже имеют роль и должность", "migration")
            conn.close()
            return

        log_info(f"📋 Найдено пользователей для обновления: {len(users_to_update)}", "migration")

        for user in users_to_update:
            user_id, username, full_name, email, role, position = user

            # Устанавливаем роль 'employee' если не указана
            new_role = role if role else 'employee'

            # Устанавливаем дефолтную должность если не указана
            new_position = position if position else 'Администратор'

            c.execute("""
                UPDATE users
                SET role = ?, position = ?
                WHERE id = ?
            """, (new_role, new_position, user_id))

            log_info(f"  ✓ {username}: роль={new_role}, должность={new_position}", "migration")

        conn.commit()
        conn.close()

        log_info(f"✅ Обновлено пользователей: {len(users_to_update)}", "migration")

    except Exception as e:
        log_warning(f"⚠️ Ошибка при обновлении пользователей: {e}", "migration")

if __name__ == "__main__":
    update_existing_users_roles()
