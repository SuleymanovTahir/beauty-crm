"""
Проверка переводов имён с автоматическим заполнением
"""
import sqlite3
import sys
import os

# Добавляем путь к backend
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..', '..', '..'))
sys.path.insert(0, backend_dir)

from core.config import DATABASE_NAME
from utils.translator import auto_translate_name

def check_translations():
    """Проверяет переводы и автоматически заполняет пустые"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT id, full_name, name_ru, name_ar
        FROM employees
        WHERE is_active = 1
    """)

    print("🌍 ПЕРЕВОДЫ ИМЁН МАСТЕРОВ:")
    print("=" * 70)

    employees = c.fetchall()
    has_empty = False
    auto_filled = 0

    for emp_id, name, ru, ar in employees:
        if not ru or not ar:
            has_empty = True
            # Автоматически заполняем пустые переводы
            translations = auto_translate_name(name)

            c.execute("""
                UPDATE employees
                SET name_ru = COALESCE(name_ru, ?),
                    name_ar = COALESCE(name_ar, ?)
                WHERE id = ?
            """, (translations['ru'], translations['ar'], emp_id))

            print(f"✅ {name}: ru={translations['ru']}, ar={translations['ar']} (автоперевод)")
            auto_filled += 1
        else:
            print(f"✓ {name}: ru={ru}, ar={ar}")

    if auto_filled > 0:
        conn.commit()
        print(f"\n✨ Автоматически заполнено переводов: {auto_filled}")

    conn.close()

    if not has_empty:
        print("\n✅ Все переводы заполнены!")

    return True

if __name__ == "__main__":
    check_translations()