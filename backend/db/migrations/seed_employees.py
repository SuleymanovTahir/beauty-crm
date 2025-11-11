import sqlite3
import hashlib
from datetime import datetime
from config import DATABASE_NAME


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

    # 3. Данные сотрудников
    employees = [
        {
            "full_name": "SIMO",
            "name_ru": "Симо",
            "name_ar": "سيمو",
            "position": "HAIR STYLIST",
            "position_ru": "Парикмахер",
            "position_ar": "مصفف شعر",
            "phone": None,
            "email": None,
            "sort_order": 1,
            "role": "employee"
        },
        {
            "full_name": "MESTAN",
            "name_ru": "Местан",
            "name_ar": "ميستان",
            "position": "HAIR STYLIST",
            "position_ru": "Парикмахер",
            "position_ar": "مصفف شعر",
            "phone": "+971 50 180 0346",
            "email": "amandurdyyeva80@gmail.com",
            "sort_order": 2,
            "role": "employee"
        },
        {
            "full_name": "LYAZZAT",
            "name_ru": "Ляззат",
            "name_ar": "ليزات",
            "position": "NAIL MASTER",
            "position_ru": "Мастер маникюра",
            "position_ar": "فني أظافر",
            "phone": None,
            "email": None,
            "sort_order": 3,
            "role": "employee"
        },
        {
            "full_name": "GULYA",
            "name_ru": "Гуля",
            "name_ar": "غوليا",
            "position": "NAIL/WAXING",
            "position_ru": "Маникюр/Эпиляция",
            "position_ar": "أظافر/إزالة الشعر",
            "phone": None,
            "email": None,
            "sort_order": 4,
            "role": "employee"
        },
        {
            "full_name": "JENNIFER",
            "name_ru": "Дженнифер",
            "name_ar": "جينيفر",
            "position": "NAIL MASTER/MASSAGES",
            "position_ru": "Маникюр/Массаж",
            "position_ar": "أظافر/تدليك",
            "phone": "+971 56 420 8308",
            "email": "peradillajennifer47@gmail.com",
            "sort_order": 5,
            "role": "employee"
        },
        {
            "full_name": "Tursunay",
            "name_ru": "Турсунай",
            "name_ar": "تورسوناي",
            "position": "Владелец",
            "position_ru": "Владелец",
            "position_ar": "مالك",
            "phone": "+971 58 208 1188",
            "email": "rakhmattursinay@gmail.com",
            "sort_order": 6,
            "role": "admin"
        }
    ]

    # 4. Создать employees и users
    for emp in employees:
        # Добавить employee
        c.execute("""
        INSERT INTO employees 
        (full_name, name_ru, name_ar, position, position_ru, position_ar, 
        phone, email, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        """, (emp["full_name"], emp["name_ru"], emp["name_ar"],
        emp["position"], emp["position_ru"], emp["position_ar"],
        emp["phone"], emp["email"], emp["sort_order"], now, now))

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
