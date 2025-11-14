"""
Проверка переводов имён
"""
import sqlite3
from core.config import DATABASE_NAME

def check_translations():
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT full_name, name_ru, name_ar 
        FROM employees 
        WHERE is_active = 1
    """)

    print("🌍 ПЕРЕВОДЫ ИМЁН МАСТЕРОВ:")
    print("=" * 70)

    has_empty = False
    for name, ru, ar in c.fetchall():
        if not ru or not ar:
            has_empty = True
            print(f"❌ {name}: ru={ru or 'ПУСТО'}, ar={ar or 'ПУСТО'}")
        else:
            print(f"✓ {name}: ru={ru}, ar={ar}")

    conn.close()

    if has_empty:
        print("\n⚠️ ЕСТЬ ПУСТЫЕ ПЕРЕВОДЫ! Запусти миграцию:")
        print("python db/migrations/add_employee_translations.py")
    else:
        print("\n✅ Все переводы заполнены!")

if __name__ == "__main__":
    check_translations()