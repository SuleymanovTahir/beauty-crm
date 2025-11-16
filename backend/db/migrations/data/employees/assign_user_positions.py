"""
Миграция данных: Автоматическая установка должностей пользователям
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

def assign_user_positions():
    """Автоматически назначить должности пользователям на основе их имен"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        log_info("🔧 Назначение должностей пользователям...", "migration")

        # Маппинг пользователей к их должностям
        user_positions = {
            'simo': 'Hair Stylist',
            'mestan': 'Hair Stylist',
            'lyazzat': 'Nail Master',
            'gulya': 'Nail/Waxing',
            'jennifer': 'Nail Master/Massages',
            'tursunay': 'Владелец',
            'admin': 'Администратор'
        }

        updated_count = 0
        for username, position_name in user_positions.items():
            # Проверяем существует ли пользователь
            c.execute("SELECT id, position FROM users WHERE username = ?", (username,))
            user = c.fetchone()

            if user:
                user_id, current_position = user

                # Обновляем только если должность пустая или NULL
                if not current_position:
                    c.execute("""
                        UPDATE users
                        SET position = ?
                        WHERE id = ?
                    """, (position_name, user_id))

                    log_info(f"  ✓ {username}: установлена должность '{position_name}'", "migration")
                    updated_count += 1
                else:
                    log_info(f"  ⏭️  {username}: должность уже установлена ('{current_position}')", "migration")
            else:
                log_info(f"  ⚠️  Пользователь '{username}' не найден", "migration")

        conn.commit()

        if updated_count > 0:
            log_info(f"✅ Обновлено должностей: {updated_count}", "migration")
        else:
            log_info("ℹ️  Все пользователи уже имеют должности", "migration")

    except Exception as e:
        log_error(f"❌ Ошибка назначения должностей: {e}", "migration")
        conn.rollback()
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("🔧 МИГРАЦИЯ: Назначение должностей пользователям")
    print("=" * 70)
    assign_user_positions()
    print("=" * 70)
