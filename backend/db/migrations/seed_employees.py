import sqlite3
from datetime import datetime
from config import DATABASE_NAME

def seed_employees():
    """Заполнить таблицу employees нужными сотрудниками"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    # ✅ УДАЛЯЕМ СТАРЫХ
    c.execute("DELETE FROM employees")
    
    # ✅ ДОБАВЛЯЕМ НОВЫХ (в нужном порядке)
    employees = [
        {
            "full_name": "SIMO",
            "position": "HAIR STYLIST",
            "phone": None,
            "email": None,
            "sort_order": 1,
            "is_active": 1
        },
        {
            "full_name": "MESTAN",
            "position": "HAIR STYLIST",
            "phone": "+971 50 180 0346",
            "email": "amandurdyyeva80@gmail.com",
            "sort_order": 2,
            "is_active": 1
        },
        {
            "full_name": "LYAZZAT",
            "position": "NAIL MASTER",
            "phone": None,
            "email": None,
            "sort_order": 3,
            "is_active": 1
        },
        {
            "full_name": "GULYA",
            "position": "NAIL/WAXING",
            "phone": None,
            "email": None,
            "sort_order": 4,
            "is_active": 1
        },
        {
            "full_name": "JENNIFER",
            "position": "NAIL MASTER/MASSAGES",
            "phone": "+971 56 420 8308",
            "email": "peradillajennifer47@gmail.com",
            "sort_order": 5,
            "is_active": 1
        },
        {
            "full_name": "Tursunay",
            "position": "Владелец",
            "phone": "+971 58 208 1188",
            "email": "rakhmattursinay@gmail.com",
            "sort_order": 6,
            "is_active": 1
        }
    ]
    
    for emp in employees:
        c.execute("""
            INSERT INTO employees 
            (full_name, position, phone, email, sort_order, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            emp["full_name"],
            emp["position"],
            emp["phone"],
            emp["email"],
            emp["sort_order"],
            emp["is_active"],
            now,
            now
        ))
    
    conn.commit()
    conn.close()
    
    print(f"✅ Добавлено {len(employees)} сотрудников")

if __name__ == "__main__":
    seed_employees()