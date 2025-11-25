"""
Миграция: Связать мастеров с услугами
"""
import sqlite3
from core.config import DATABASE_NAME

def link_employees_to_services():
    """Создать связи между мастерами и услугами"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Проверяем что таблица существует
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='employee_services'")
    if not c.fetchone():
        print("❌ Таблица employee_services не существует!")
        conn.close()
        return
    
    # Очищаем старые связи (если есть)
    c.execute("DELETE FROM employee_services")
    
    # Получаем всех мастеров
    c.execute("SELECT id, full_name, position FROM employees WHERE is_active = 1")
    employees = c.fetchall()
    
    # Получаем все услуги
    c.execute("SELECT id, name, category FROM services WHERE is_active = 1")
    services = c.fetchall()
    
    print(f"👥 Мастеров: {len(employees)}")
    print(f"✂️ Услуг: {len(services)}")
    
    # Логика привязки по должности
    links = []
    
    for emp_id, emp_name, position in employees:
        position_upper = position.upper()
        
        for svc_id, svc_name, category in services:
            should_link = False
            
            # HAIR STYLIST → Hair услуги
            if 'HAIR' in position_upper and category == 'Hair':
                should_link = True
            
            # NAIL MASTER → Manicure, Pedicure
            if 'NAIL' in position_upper and category in ['Manicure', 'Pedicure', 'Nails']:
                should_link = True
            
            # WAXING → Waxing услуги
            if 'WAXING' in position_upper and category == 'Waxing':
                should_link = True
            
            # MASSAGE → Massage услуги
            if 'MASSAGE' in position_upper and category == 'Massage':
                should_link = True
            
            # BEAUTICIAN → Facial, Brows
            if 'BEAUTICIAN' in position_upper and category in ['Facial', 'Brows', 'Lashes']:
                should_link = True
            
            if should_link:
                links.append((emp_id, svc_id))
    
    # Вставляем связи
    for emp_id, svc_id in links:
        c.execute("""
            INSERT OR IGNORE INTO employee_services (employee_id, service_id)
            VALUES (?, ?)
        """, (emp_id, svc_id))
    
    conn.commit()
    
    print(f"✅ Создано связей: {len(links)}")
    
    # Проверяем результат
    c.execute("SELECT COUNT(*) FROM employee_services")
    count = c.fetchone()[0]
    print(f"📊 Связей в БД: {count}")
    
    # Показываем примеры
    c.execute("""
        SELECT e.full_name, s.name, s.category
        FROM employee_services es
        JOIN employees e ON es.employee_id = e.id
        JOIN services s ON es.service_id = s.id
        LIMIT 10
    """)
    
    print("\n📋 Примеры связей:")
    for emp_name, svc_name, category in c.fetchall():
        print(f"   {emp_name} → {svc_name} ({category})")
    
    conn.close()
    
    return count > 0


if __name__ == "__main__":
    print("=" * 70)
    print("🔗 СВЯЗЫВАНИЕ МАСТЕРОВ С УСЛУГАМИ")
    print("=" * 70)
    
    success = link_employees_to_services()
    
    if success:
        print("\n✅ УСПЕХ! Мастера привязаны к услугам")
    else:
        print("\n❌ ОШИБКА! Не удалось создать связи")
    
    print("=" * 70)