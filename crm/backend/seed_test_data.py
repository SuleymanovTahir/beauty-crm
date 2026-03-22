"""
Скрипт создания тестовых данных: компании, сотрудники разных ролей, super_admin.
Запускать из папки backend с активированным venv:
    python seed_test_data.py
"""
import sys
import os
import hashlib
import secrets
from datetime import datetime

# Добавляем backend в path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.connection import get_db_connection

CREDENTIALS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "staff_credentials.txt")

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    iterations = 50000
    hash_value = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), iterations).hex()
    return f"pbkdf2:sha256:{iterations}${salt}${hash_value}"

# ─────────────────────────── данные ───────────────────────────

COMPANIES = [
    {
        "name": "Салон красоты Аврора",
        "email": "aurora@test.local",
        "phone": "+7 700 000 0001",
        "business_type": "beauty",
        "city": "Алматы",
        "currency": "KZT",
        "timezone": "Asia/Almaty",
        "timezone_offset": 360,
    },
    {
        "name": "МедЦентр Плюс",
        "email": "medcenter@test.local",
        "phone": "+7 700 000 0002",
        "business_type": "clinic",
        "city": "Астана",
        "currency": "KZT",
        "timezone": "Asia/Almaty",
        "timezone_offset": 360,
    },
    {
        "name": "FitLife Gym",
        "email": "fitlife@test.local",
        "phone": "+7 700 000 0003",
        "business_type": "fitness",
        "city": "Шымкент",
        "currency": "KZT",
        "timezone": "Asia/Almaty",
        "timezone_offset": 360,
    },
    {
        "name": "Ресторан Гурман",
        "email": "gurman@test.local",
        "phone": "+7 700 000 0004",
        "business_type": "restaurant",
        "city": "Алматы",
        "currency": "KZT",
        "timezone": "Asia/Almaty",
        "timezone_offset": 360,
    },
]

SUPER_ADMIN = {
    "username": "superadmin",
    "password": "SuperAdmin123!",
    "full_name": "Главный Администратор",
    "email": "superadmin@test.ru",
    "role": "super_admin",
}

# Шаблоны сотрудников — создаются для каждой компании
EMPLOYEE_TEMPLATES = [
    {
        "role": "director",
        "suffix": "director",
        "full_name": "Директор",
        "password": "Director123!",
        "position": "Директор",
    },
    {
        "role": "admin",
        "suffix": "admin",
        "full_name": "Администратор",
        "password": "Admin123!",
        "position": "Администратор",
    },
    {
        "role": "manager",
        "suffix": "manager",
        "full_name": "Менеджер",
        "password": "Manager123!",
        "position": "Менеджер",
    },
    {
        "role": "employee",
        "suffix": "master",
        "full_name": "Мастер",
        "password": "Master123!",
        "position": "Мастер",
        "is_service_provider": True,
    },
    {
        "role": "employee",
        "suffix": "cashier",
        "full_name": "Кассир",
        "password": "Cashier123!",
        "position": "Кассир",
        "is_service_provider": False,
    },
]

# ─────────────────────────── helpers ───────────────────────────

def create_company_raw(conn, company: dict) -> int:
    c = conn.cursor()
    slug = company["name"].lower().replace(" ", "-").replace("'", "")
    # ensure unique slug
    base_slug = slug
    for i in range(1, 20):
        c.execute("SELECT 1 FROM companies WHERE slug = %s", (slug,))
        if not c.fetchone():
            break
        slug = f"{base_slug}-{i}"

    import random, string
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

    c.execute("""
        INSERT INTO companies (
            slug, access_code, name, email, phone, business_type, product_mode,
            currency, timezone, timezone_offset, city, crm_enabled, site_enabled,
            employee_limit, updated_at
        )
        VALUES (%s,%s,%s,%s,%s,%s,'crm',%s,%s,%s,%s,TRUE,FALSE,20,CURRENT_TIMESTAMP)
        RETURNING id
    """, (
        slug, code,
        company["name"], company.get("email"), company.get("phone"),
        company.get("business_type", "beauty"),
        company.get("currency", "KZT"),
        company.get("timezone", "UTC"),
        company.get("timezone_offset", 0),
        company.get("city"),
    ))
    company_id = c.fetchone()[0]

    # tariff subscription (trial)
    c.execute("SELECT id FROM tariff_plans WHERE key = 'trial' LIMIT 1")
    row = c.fetchone()
    if row:
        tariff_id = row[0]
        c.execute("""
            INSERT INTO company_subscriptions (
                company_id, tariff_plan_id, status, is_trial,
                billing_cycle_months, started_at,
                current_period_started_at, current_period_ends_at
            )
            VALUES (%s,%s,'trial',TRUE,1,NOW(),NOW(), NOW() + interval '14 days')
            ON CONFLICT DO NOTHING
        """, (company_id, tariff_id))

    conn.commit()
    return company_id


def create_user_raw(conn, *, username, password, full_name, email=None,
                    role, phone=None, company_id=None, position=None,
                    is_service_provider=False) -> int | None:
    c = conn.cursor()
    # check duplicate
    c.execute("SELECT id FROM users WHERE username = %s AND deleted_at IS NULL", (username,))
    if c.fetchone():
        print(f"  ⚠️  Пользователь {username!r} уже существует, пропуск")
        return None

    ph = hash_password(password)
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO users
            (username, password_hash, full_name, email, role, created_at,
             phone, company_id, position, is_service_provider, is_active)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE)
        RETURNING id
    """, (username, ph, full_name, email, role, now, phone, company_id,
          position, is_service_provider))
    user_id = c.fetchone()[0]

    # Если director — прописать owner_user_id в компании
    if role == "director" and company_id:
        c.execute("""
            UPDATE companies SET owner_user_id = %s WHERE id = %s AND owner_user_id IS NULL
        """, (user_id, company_id))

    conn.commit()
    return user_id


# ─────────────────────────── main ───────────────────────────

def main():
    conn = get_db_connection()
    records = []

    print("\n🌱 Создание тестовых данных...\n")

    # ── Super Admin ──────────────────────────────────────────
    print("👑 Super Admin")
    uid = create_user_raw(
        conn,
        username=SUPER_ADMIN["username"],
        password=SUPER_ADMIN["password"],
        full_name=SUPER_ADMIN["full_name"],
        email=SUPER_ADMIN["email"],
        role=SUPER_ADMIN["role"],
        company_id=None,
    )
    if uid:
        records.append({
            "company": "— (нет компании)",
            "role": "super_admin",
            "full_name": SUPER_ADMIN["full_name"],
            "username": SUPER_ADMIN["username"],
            "password": SUPER_ADMIN["password"],
        })
        print(f"   ✅ {SUPER_ADMIN['username']} (id={uid})")

    # ── Companies + employees ────────────────────────────────
    for idx, company_data in enumerate(COMPANIES, start=1):
        print(f"\n🏢 Компания: {company_data['name']}")
        try:
            company_id = create_company_raw(conn, company_data)
            print(f"   ✅ Создана (id={company_id})")
        except Exception as e:
            print(f"   ❌ Ошибка создания компании: {e}")
            continue

        for tmpl in EMPLOYEE_TEMPLATES:
            username = f"c{idx}_{tmpl['suffix']}"
            full_name = f"{tmpl['full_name']} {company_data['name'].split()[0]}"
            try:
                uid = create_user_raw(
                    conn,
                    username=username,
                    password=tmpl["password"],
                    full_name=full_name,
                    role=tmpl["role"],
                    company_id=company_id,
                    position=tmpl.get("position"),
                    is_service_provider=tmpl.get("is_service_provider", False),
                )
                if uid:
                    records.append({
                        "company": company_data["name"],
                        "role": tmpl["role"],
                        "position": tmpl.get("position", ""),
                        "full_name": full_name,
                        "username": username,
                        "password": tmpl["password"],
                    })
                    print(f"   ✅ {username}  [{tmpl['role']}]  (id={uid})")
            except Exception as e:
                print(f"   ❌ {username}: {e}")

    conn.close()

    # ── Файл credentials не перезаписывается — пароли фиксированные ──
    if not os.path.exists(CREDENTIALS_FILE):
        print(f"\n⚠️  Файл {CREDENTIALS_FILE} не найден, создайте его вручную или из шаблона.")
    else:
        print(f"\n✅ staff_credentials.txt уже существует, пароли не изменились.\n")


if __name__ == "__main__":
    main()
