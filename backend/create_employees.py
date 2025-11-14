"""
Создание сотрудников с должностями и учетными записями
Сохраняет логины и пароли в файл employees_credentials.txt
"""
import sqlite3
import hashlib
import random
import string
from datetime import datetime

DATABASE_NAME = "salon_bot.db"
CREDENTIALS_FILE = "employees_credentials.txt"

def generate_password(length=8):
    """Генерация случайного пароля"""
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def create_employees_with_users():
    """Создать сотрудников и пользователей"""

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Сотрудники для создания
    employees_data = [
        {
            'full_name': 'Диана Иванова',
            'position_id': 1,  # Мастер маникюра
            'username': 'diana',
            'role': 'employee',
            'email': 'diana@mlediamant.ae'
        },
        {
            'full_name': 'Наталья Петрова',
            'position_id': 1,  # Мастер маникюра
            'username': 'natasha',
            'role': 'employee',
            'email': 'natalia@mlediamant.ae'
        },
        {
            'full_name': 'Мария Смирнова',
            'position_id': 2,  # Мастер педикюра
            'username': 'maria',
            'role': 'employee',
            'email': 'maria@mlediamant.ae'
        },
        {
            'full_name': 'Анна Козлова',
            'position_id': 3,  # Мастер бровист
            'username': 'anna',
            'role': 'employee',
            'email': 'anna@mlediamant.ae'
        },
        {
            'full_name': 'Елена Соколова',
            'position_id': 4,  # Косметолог
            'username': 'elena',
            'role': 'employee',
            'email': 'elena@mlediamant.ae'
        },
        {
            'full_name': 'Светлана Морозова',
            'position_id': 6,  # Парикмахер
            'username': 'svetlana',
            'role': 'employee',
            'email': 'svetlana@mlediamant.ae'
        },
        {
            'full_name': 'Ольга Новикова',
            'position_id': 7,  # Менеджер по продажам
            'username': 'olga',
            'role': 'sales',
            'email': 'olga@mlediamant.ae'
        },
        {
            'full_name': 'Ирина Волкова',
            'position_id': 10,  # Администратор
            'username': 'irina',
            'role': 'admin',
            'email': 'irina@mlediamant.ae'
        },
    ]

    credentials = []
    now = datetime.now().isoformat()

    print("=" * 70)
    print("👥 СОЗДАНИЕ СОТРУДНИКОВ")
    print("=" * 70)
    print()

    for emp_data in employees_data:
        # 1. Создаем employee
        try:
            c.execute("""
                INSERT INTO employees (full_name, position_id, is_active, created_at, updated_at)
                VALUES (?, ?, 1, ?, ?)
            """, (emp_data['full_name'], emp_data['position_id'], now, now))
            employee_id = c.lastrowid

            # 2. Генерируем пароль
            password = generate_password(10)
            password_hash = hashlib.sha256(password.encode()).hexdigest()

            # 3. Создаем user
            c.execute("""
                INSERT INTO users (username, password_hash, full_name, email, role, employee_id, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            """, (
                emp_data['username'],
                password_hash,
                emp_data['full_name'],
                emp_data['email'],
                emp_data['role'],
                employee_id,
                now
            ))
            user_id = c.lastrowid

            # Получаем название должности
            c.execute("SELECT name FROM positions WHERE id = ?", (emp_data['position_id'],))
            position_name = c.fetchone()[0]

            credentials.append({
                'full_name': emp_data['full_name'],
                'username': emp_data['username'],
                'password': password,
                'email': emp_data['email'],
                'role': emp_data['role'],
                'position': position_name
            })

            print(f"✅ {emp_data['full_name']}")
            print(f"   Логин: {emp_data['username']} | Пароль: {password}")
            print(f"   Должность: {position_name} | Роль: {emp_data['role']}")
            print()

        except sqlite3.IntegrityError as e:
            print(f"⚠️  {emp_data['full_name']} уже существует")
            print()

    conn.commit()

    # Сохраняем учетные данные в файл
    with open(CREDENTIALS_FILE, 'w', encoding='utf-8') as f:
        f.write("=" * 70 + "\n")
        f.write("УЧЕТНЫЕ ДАННЫЕ СОТРУДНИКОВ M.LE DIAMANT BEAUTY LOUNGE\n")
        f.write(f"Создано: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 70 + "\n\n")
        f.write("⚠️  КОНФИДЕНЦИАЛЬНО! Не передавайте этот файл третьим лицам.\n\n")

        for cred in credentials:
            f.write(f"👤 {cred['full_name']}\n")
            f.write(f"   Должность: {cred['position']}\n")
            f.write(f"   Роль в системе: {cred['role']}\n")
            f.write(f"   Логин: {cred['username']}\n")
            f.write(f"   Пароль: {cred['password']}\n")
            f.write(f"   Email: {cred['email']}\n")
            f.write(f"   URL для входа: http://localhost:5173/login\n")
            f.write("\n" + "-" * 70 + "\n\n")

    conn.close()

    print("=" * 70)
    print(f"✅ СОЗДАНО СОТРУДНИКОВ: {len(credentials)}")
    print(f"📄 Учетные данные сохранены в: {CREDENTIALS_FILE}")
    print("=" * 70)
    print()

    return len(credentials)

if __name__ == "__main__":
    create_employees_with_users()
