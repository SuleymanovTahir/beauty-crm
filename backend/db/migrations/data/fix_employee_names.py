"""
Миграция: Исправление имен сотрудников и назначение должностей
"""
import sqlite3
import os

# Путь к базе данных
DATABASE_NAME = '/home/user/beauty-crm/backend/salon_bot.db'

def fix_employee_names():
    """Исправить имена сотрудников и назначить должности"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        print("=" * 70)
        print("🔧 ИСПРАВЛЕНИЕ ИМЕН И ДОЛЖНОСТЕЙ СОТРУДНИКОВ")
        print("=" * 70)

        # Маппинг старых имен к новым (правильный формат)
        name_mapping = {
            'SIMO': 'Simo',
            'MESTAN': 'Mestan',
            'LYAZZAT': 'Lyazzat',
            'GULYA': 'Gulya',
            'JENNIFER': 'Jennifer'
        }

        # Маппинг должностей (правильный формат)
        position_mapping = {
            'HAIR STYLIST': 'Hair Stylist',
            'NAIL MASTER': 'Nail Master',
            'NAIL/WAXING': 'Nail/Waxing',
            'NAIL MASTER/MASSAGES': 'Nail Master/Massages'
        }

        # 1. Обновить имена в таблице users
        print("\n1️⃣ Обновление имен в таблице users...")
        for old_name, new_name in name_mapping.items():
            c.execute("""
                UPDATE users
                SET full_name = ?
                WHERE full_name = ?
            """, (new_name, old_name))

            if c.rowcount > 0:
                print(f"   ✅ {old_name} → {new_name}")

        # 2. Обновить имена в таблице employees
        print("\n2️⃣ Обновление имен в таблице employees...")
        for old_name, new_name in name_mapping.items():
            c.execute("""
                UPDATE employees
                SET full_name = ?
                WHERE full_name = ?
            """, (new_name, old_name))

            if c.rowcount > 0:
                print(f"   ✅ {old_name} → {new_name}")

        # 3. Обновить должности в таблице employees
        print("\n3️⃣ Обновление должностей в таблице employees...")
        for old_pos, new_pos in position_mapping.items():
            c.execute("""
                UPDATE employees
                SET position = ?
                WHERE position = ?
            """, (new_pos, old_pos))

            if c.rowcount > 0:
                print(f"   ✅ {old_pos} → {new_pos}")

        # 4. Назначить должности пользователям
        print("\n4️⃣ Назначение должностей пользователям...")
        user_positions = {
            'simo': 'Hair Stylist',
            'mestan': 'Hair Stylist',
            'lyazzat': 'Nail Master',
            'gulya': 'Nail/Waxing',
            'jennifer': 'Nail Master/Massages',
            'tursunay': 'Владелец',
            'admin': 'Администратор'
        }

        for username, position_name in user_positions.items():
            c.execute("""
                UPDATE users
                SET position = ?
                WHERE username = ? AND (position IS NULL OR position = '')
            """, (position_name, username))

            if c.rowcount > 0:
                print(f"   ✅ {username}: установлена должность '{position_name}'")

        # 5. Показать результаты
        print("\n5️⃣ Проверка результатов...")
        c.execute("""
            SELECT username, full_name, position, role
            FROM users
            ORDER BY id
        """)
        users = c.fetchall()

        print("\n📋 Все пользователи:")
        print(f"{'Username':<15} {'Full Name':<20} {'Position':<25} {'Role':<10}")
        print("-" * 70)
        for username, full_name, position, role in users:
            print(f"{username:<15} {full_name:<20} {position or 'NULL':<25} {role:<10}")

        conn.commit()
        print("\n✅ Миграция завершена успешно!")

    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        conn.rollback()
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
        print("=" * 70)

if __name__ == "__main__":
    fix_employee_names()
