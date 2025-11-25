#!/usr/bin/env python3
"""
Миграция: Добавление связи услуг с должностями
Вместо category теперь services связаны с positions через service_positions
"""
import sqlite3
import sys
import os

# Добавляем путь к backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def add_service_positions():
    """
    Создать таблицу service_positions для связи услуг с должностями
    Мигрировать данные из category в position_id
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        log_info("🔧 Создание таблицы service_positions...", "migration")

        # 1. Создаём таблицу связей услуги ↔ должности
        c.execute("""
            CREATE TABLE IF NOT EXISTS service_positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_id INTEGER NOT NULL,
                position_id INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
                FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
                UNIQUE(service_id, position_id)
            )
        """)

        log_info("✅ Таблица service_positions создана", "migration")

        # 2. Маппинг категорий на должности
        category_to_positions = {
            'Hair': ['Hair Stylist', 'Парикмахер'],
            'Nails': ['Nail Master', 'Мастер маникюра', 'Мастер педикюра', 'Nail/Waxing', 'Nail Master/Massages'],
            'Brows': ['Мастер бровист'],
            'Lashes': ['Мастер бровист'],  # Обычно бровист делает и ресницы
            'Waxing': ['Nail/Waxing'],
            'Massage': ['Массажист', 'Nail Master/Massages'],
            'Facial': ['Косметолог'],
            'Permanent Makeup': ['Визажист', 'Мастер бровист']
        }

        # 3. Получаем все услуги с их категориями
        c.execute("SELECT id, category, name FROM services WHERE category IS NOT NULL")
        services = c.fetchall()

        log_info(f"📊 Найдено {len(services)} услуг для миграции", "migration")

        migrated = 0
        for service_id, category, name in services:
            # Находим должности для этой категории
            position_names = category_to_positions.get(category, [])

            if not position_names:
                log_error(f"⚠️  Неизвестная категория '{category}' для услуги '{name}'", "migration")
                continue

            for position_name in position_names:
                # Находим ID должности
                c.execute("SELECT id FROM positions WHERE name = ?", (position_name,))
                position = c.fetchone()

                if position:
                    position_id = position[0]

                    # Создаём связь услуга ↔ должность
                    try:
                        c.execute("""
                            INSERT OR IGNORE INTO service_positions (service_id, position_id)
                            VALUES (?, ?)
                        """, (service_id, position_id))

                        if c.rowcount > 0:
                            migrated += 1

                    except Exception as e:
                        log_error(f"Ошибка связывания услуги {name} с должностью {position_name}: {e}", "migration")
                else:
                    log_error(f"⚠️  Должность '{position_name}' не найдена", "migration")

        conn.commit()

        log_info(f"✅ Мигрировано {migrated} связей услуг с должностями", "migration")

        # 4. Проверяем результат
        c.execute("""
            SELECT COUNT(DISTINCT s.id) as services_count, COUNT(sp.id) as links_count
            FROM services s
            LEFT JOIN service_positions sp ON s.id = sp.service_id
        """)

        result = c.fetchone()
        log_info(f"📊 Услуг: {result[0]}, Связей с должностями: {result[1]}", "migration")

        return True

    except Exception as e:
        log_error(f"Ошибка миграции: {e}", "migration")
        conn.rollback()
        import traceback
        traceback.print_exc()
        return False

    finally:
        conn.close()


if __name__ == "__main__":
    success = add_service_positions()
    sys.exit(0 if success else 1)
