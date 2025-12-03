"""
Проверка расписаний мастеров
"""
from db.connection import get_db_connection

def check_schedules():
    conn = get_db_connection()
    c = conn.cursor()

    # Проверяем есть ли расписания
    c.execute("""
        SELECT e.full_name, es.start_time, es.end_time, es.is_active
        FROM employees e
        LEFT JOIN employee_schedule es ON e.id = es.employee_id
        WHERE e.is_active = TRUE
    """)

    print("📅 РАСПИСАНИЯ МАСТЕРОВ:")
    print("=" * 50)

    results = c.fetchall()
    if not results or all(r[1] is None for r in results):
        print("❌ НЕТ РАСПИСАНИЙ!")
    else:
        for name, start, end, active in results:
            if start:
                print(f"✓ {name}: {start} - {end} (active: {active})")
            else:
                print(f"✗ {name}: НЕТ РАСПИСАНИЯ")

    conn.close()

if __name__ == "__main__":
    check_schedules()