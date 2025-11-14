import sqlite3
import hashlib
from datetime import datetime
from core.config import DATABASE_NAME


def seed_employees():
    """Заполнить employees и создать users для них"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()

    # 1. Добавить employee_id в users если его нет
    c.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in c.fetchall()]
    if 'employee_id' not in columns:
        c.execute("ALTER TABLE users ADD COLUMN employee_id INTEGER")
        print("✅ Добавлено поле employee_id в users")

    # 2. Очистить старых employees
    c.execute("DELETE FROM employees")

    # 3. Данные сотрудников (упрощенная версия - только существующие поля)
    employees = [
        {
            "full_name": "Simo",
            "position": "Hair Stylist",
            "phone": None,
            "email": None,
            "sort_order": 1,
            "role": "employee"
        },
        {
            "full_name": "Mestan",
            "position": "Hair Stylist",
            "phone": "+971 50 180 0346",
            "email": "amandurdyyeva80@gmail.com",
            "sort_order": 2,
            "role": "employee"
        },
        {
            "full_name": "Lyazzat",
            "position": "Nail Master",
            "phone": None,
            "email": None,
            "sort_order": 3,
            "role": "employee"
        },
        {
            "full_name": "Gulya",
            "position": "Nail/Waxing",
            "phone": None,
            "email": None,
            "sort_order": 4,
            "role": "employee"
        },
        {
            "full_name": "Jennifer",
            "position": "Nail Master/Massages",
            "phone": "+971 56 420 8308",
            "email": "peradillajennifer47@gmail.com",
            "sort_order": 5,
            "role": "employee"
        },
        {
            "full_name": "Tursunay",
            "position": "Владелец",
            "phone": "+971 58 208 1188",
            "email": "rakhmattursinay@gmail.com",
            "sort_order": 6,
            "role": "admin"
        }
    ]

    # 4. Создать employees и users
    for emp in employees:
        # Добавить employee (только существующие поля!)
        c.execute("""
        INSERT INTO employees
        (full_name, position, phone, email, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        """, (emp["full_name"], emp["position"], emp["phone"], emp["email"],
              emp["sort_order"], now, now))

        employee_id = c.lastrowid

        # Генерировать username
        username = emp["full_name"].lower().replace(' ', '_')

        # Проверить уникальность
        c.execute("SELECT id FROM users WHERE username = ?", (username,))
        if c.fetchone():
            print(f"⏭️  User {username} уже существует")
            continue

        # Пароль: первые 4 буквы + 123
        temp_password = emp["full_name"][:4].lower() + "123"
        password_hash = hashlib.sha256(temp_password.encode()).hexdigest()

        # Создать user
        c.execute("""
            INSERT INTO users 
            (username, password_hash, full_name, email, role, employee_id, created_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """, (username, password_hash, emp["full_name"], emp["email"],
              emp["role"], employee_id, now))

        print(f"✅ {emp['full_name']}: {username} / {temp_password}")

    conn.commit()
    conn.close()

    print(f"\n🎉 Создано {len(employees)} сотрудников")


if __name__ == "__main__":
    seed_employees()
