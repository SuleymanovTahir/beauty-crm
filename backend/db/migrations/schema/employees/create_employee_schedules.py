"""
Создание расписаний для всех мастеров
"""
import sqlite3
from core.config import DATABASE_NAME

def create_employee_schedules_table():
    """Создать таблицу расписаний (создается в create_employees.py)"""
    # Таблица создается в create_employees.py, эта функция просто для совместимости
    print("⏭️  Таблица employee_schedule создается в create_employees.py")
    return True

def create_schedules():
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Получаем всех активных мастеров
    c.execute("SELECT id, full_name FROM employees WHERE is_active = 1")
    employees = c.fetchall()
    
    print(f"👥 Создаём расписания для {len(employees)} мастеров")
    
    # Дни недели (0 = Понедельник, 6 = Воскресенье)
    days = [
        (0, 'Понедельник'),
        (1, 'Вторник'),
        (2, 'Среда'),
        (3, 'Четверг'),
        (4, 'Пятница'),
        (5, 'Суббота'),
        (6, 'Воскресенье')
    ]
    
    # Стандартное расписание салона: 10:30 - 21:00
    for emp_id, emp_name in employees:
        created = 0
        
        for day_num, day_name in days:
            # Проверяем есть ли уже расписание
            c.execute("""
                SELECT id FROM employee_schedule 
                WHERE employee_id = ? AND day_of_week = ?
            """, (emp_id, day_num))
            
            if c.fetchone():
                continue
            
            # Создаём расписание для этого дня
            c.execute("""
                INSERT INTO employee_schedule 
                (employee_id, day_of_week, start_time, end_time, is_active)
                VALUES (?, ?, '10:30', '21:00', 1)
            """, (emp_id, day_num))
            
            created += 1
        
        if created > 0:
            print(f"   ✅ {emp_name} - создано {created} расписаний")
        else:
            print(f"   ⏭️  {emp_name} - расписания уже есть")
    
    conn.commit()
    
    # Проверяем результат
    c.execute("""
        SELECT COUNT(*) FROM employee_schedule WHERE is_active = 1
    """)
    count = c.fetchone()[0]
    
    print(f"\n📊 Всего активных расписаний: {count}")
    
    conn.close()
    return count > 0


if __name__ == "__main__":
    print("=" * 70)
    print("📅 СОЗДАНИЕ РАСПИСАНИЙ МАСТЕРОВ")
    print("=" * 70)
    
    success = create_schedules()
    
    if success:
        print("\n✅ УСПЕХ! Расписания созданы")
    else:
        print("\n❌ ОШИБКА!")
    
    print("=" * 70)