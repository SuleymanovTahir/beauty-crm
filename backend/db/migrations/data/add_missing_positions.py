"""
Миграция данных: Добавление недостающих должностей в справочник
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

import sqlite3
from datetime import datetime
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

def add_missing_positions():
    """Добавить недостающие должности в справочник"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        log_info("🔧 Adding missing positions to directory...", "migration")

        now = datetime.now().isoformat()

        # Должности которые нужно добавить
        new_positions = [
            ("HAIR STYLIST", "Hair Stylist", "مصفف شعر", "Мастер-парикмахер, стилист по волосам"),
            ("NAIL MASTER", "Nail Master", "خبير الأظافر", "Мастер маникюра и педикюра"),
            ("NAIL/WAXING", "Nail & Waxing Master", "خبير الأظافر والإزالة", "Мастер маникюра и депиляции"),
            ("NAIL MASTER/MASSAGES", "Nail & Massage Master", "خبير الأظافر والمساج", "Мастер маникюра и массажа"),
            ("Владелец", "Owner", "مالك", "Владелец салона красоты"),
            ("Массажист", "Massage Therapist", "معالج تدليك", "Специалист по массажу"),
        ]

        added_count = 0
        for position in new_positions:
            try:
                # Проверяем существует ли уже
                c.execute("SELECT id FROM positions WHERE name = ?", (position[0],))
                exists = c.fetchone()

                if not exists:
                    # Находим максимальный sort_order
                    c.execute("SELECT MAX(sort_order) FROM positions")
                    max_sort = c.fetchone()[0] or 0

                    c.execute("""INSERT INTO positions
                                 (name, name_en, name_ar, description, sort_order, is_active, created_at, updated_at)
                                 VALUES (?, ?, ?, ?, ?, 1, ?, ?)""",
                              (position[0], position[1], position[2], position[3], max_sort + 1, now, now))

                    log_info(f"✅ Added position: {position[0]}", "migration")
                    added_count += 1
                else:
                    log_info(f"⏭️  Position already exists: {position[0]}", "migration")

            except sqlite3.IntegrityError:
                log_info(f"⏭️  Position already exists: {position[0]}", "migration")
                continue

        conn.commit()

        if added_count > 0:
            log_info(f"✅ Successfully added {added_count} new positions", "migration")
        else:
            log_info("ℹ️  All positions already exist", "migration")

    except Exception as e:
        log_error(f"❌ Error adding positions: {e}", "migration")
        conn.rollback()
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("🔧 МИГРАЦИЯ: Добавление недостающих должностей")
    print("=" * 70)
    add_missing_positions()
    print("=" * 70)
