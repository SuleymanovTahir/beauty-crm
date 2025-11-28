#!/usr/bin/env python3
"""
Set online booking status for employee services based on user's data
"""
import sqlite3
import os

DATABASE_NAME = "salon_bot.db"

# Mapping: employee_name -> {service_name_ru: is_online_booking_enabled}
EMPLOYEE_SERVICES_CONFIG = {
    "MESTAN": {
        # Вкл (enabled)
        "Детская стрижка": True,
        "Укладка": True,
        "Натуральный уход": True,
        "Окрашивание корней + Укладка": True,
        "Окрашивание в один тон + Укладка": True,
        "Омбре/Шатуш/Аиртач": True,
        "Окрашивание бровей": True,
        "Пакет из 5 укладок": True,
        "Уход за волосами": True,
        
        # Выкл (disabled)
        "Мытье волос": False,
        "Стрижка": False,
        "Ровный срез кончиков": False,
        "Прическа": False,
        "Стрижка + Укладка": False,
        "Снятие наращенных волос": False,
        "Наращивание волос за капсулу": False,
        "Балаяж + Стрижка + Укладка": False,
        "Балаяж": False,
        "Осветление корней + Укладка": False,
        "Тонирование + Укладка": False,
        "Выход из черного": False,
        "Промо 390": False,
    },
    
    "JENNIFER": {
        # Вкл (enabled)
        "Маникюр без покрытия": True,
        "Педикюр без покрытия": True,
        "Маникюр с обычным покрытием": True,
        "Педикюр с обычным покрытием": True,
        "Маникюр гель-лак": True,
        "Педикюр гель-лак": True,
        "Спа маникюр": True,
        "Снятие обычного лака": True,
        "Снятие гель-лака": True,
        "Смена гель-лака": True,
        "Спа педикюр": True,
        "Смена обычного лака": True,
        "Японский маникюр": True,
        "Снятие наращенных ногтей": True,
        "Снятие ресниц": True,
        "Ноги полностью": True,
        "Ноги до колен": True,
        "Руки полностью": True,
        "Руки до локтя": True,
        "Эпиляция всего тела": True,
        "Марокканская баня с мочалкой": True,
        "Марокканская баня 60 мин": True,
        "Антицеллюлитный массаж": True,
        "Скульптурный массаж тела": True,
        "Глубокая чистка лица": True,
        "Подтягивающий массаж лица с маской": True,
        "Медицинская чистка для проблемной кожи": True,
        "Пилинг": True,
        "Уход за волосами": True,
        
        # Выкл (disabled)
        "Французский маникюр": False,
        "Укрепление ногтей": False,
        "Детский маникюр": False,
        "Починка 1 ноготь": False,
        "Подмышки": False,
        "Массаж головы 40 мин": False,
        "Массаж ног/рук 40 мин": False,
        "Шейно-воротниковая зона 30 мин": False,
        "Массаж спины 30 мин": False,
        "Массаж тела 40 мин": False,
        "Массаж горячими камнями": False,
        "Массаж спины (5-10)": False,
        "Классический общий массаж": False,
        "Антицеллюлитный массаж (пакет)": False,
        "Мытье волос": False,
        "Промо оверлей маникюр": False,
        "Промо мани педи 250": False,
        "Комбо базовый 150": False,
        "Промо 390": False,
    },
    
    "SIMO": {
        # Вкл (enabled)
        "Детская стрижка": True,
        "Укладка": True,
        "Окрашивание корней + Укладка": True,
        "Окрашивание в один тон + Укладка": True,
        "Омбре/Шатуш/Аиртач": True,
        "Уход за волосами": True,
        "Натуральный уход": True,
        
        # Выкл (disabled)
        "Мытье волос": False,
        "Стрижка": False,
        "Ровный срез кончиков": False,
        "Прическа": False,
        "Стрижка + Укладка": False,
        "Балаяж + Стрижка + Укладка": False,
        "Балаяж": False,
        "Осветление корней + Укладка": False,
        "Тонирование + Укладка": False,
        "Выход из черного": False,
        "Снятие наращенных волос": False,
        "Наращивание волос за капсулу": False,
    },
    
    "LYAZZAT": {
        # Вкл (enabled)
        "Маникюр без покрытия": True,
        "Педикюр без покрытия": True,
        "Маникюр с обычным покрытием": True,
        "Педикюр с обычным покрытием": True,
        "Маникюр гель-лак": True,
        "Педикюр гель-лак": True,
        "Спа маникюр": True,
        "Снятие обычного лака": True,
        "Снятие гель-лака": True,
        "Смена гель-лака": True,
        "Спа педикюр": True,
        "Смена обычного лака": True,
        "Японский маникюр": True,
        "Снятие наращенных ногтей": True,
        
        # Выкл (disabled)
        "Французский маникюр": False,
        "Укрепление ногтей": False,
        "Детский маникюр": False,
        "Дизайн ногтей": False,
        "Починка 1 ноготь": False,
        "Накладные ногти": False,
        "Гелевое покрытие": False,
        "Наращивание гелем": False,
        "Акриловое покрытие": False,
        "Наращивание акрилом": False,
        "Промо оверлей маникюр": False,
        "Промо мани педи 250": False,
        "Комбо базовый 150": False,
        "Промо 390": False,
    },
    
    "GULYA": {
        # Вкл (enabled)
        "Маникюр без покрытия": True,
        "Педикюр без покрытия": True,
        "Маникюр с обычным покрытием": True,
        "Педикюр с обычным покрытием": True,
        "Маникюр гель-лак": True,
        "Педикюр гель-лак": True,
        "Спа маникюр": True,
        "Снятие обычного лака": True,
        "Снятие гель-лака": True,
        "Смена гель-лака": True,
        "Спа педикюр": True,
        "Смена обычного лака": True,
        "Японский маникюр": True,
        "Снятие наращенных ногтей": True,
        "Ноги полностью": True,
        "Ноги до колен": True,
        "Руки полностью": True,
        "Руки до локтя": True,
        "Эпиляция всего тела": True,
        "Линия бикини": True,
        "Бразильское бикини": True,
        "Лицо полностью": True,
        "Щеки": True,
        "Верхняя губа": True,
        "Подбородок": True,
        
        # Выкл (disabled)
        "Французский маникюр": False,
        "Укрепление ногтей": False,
        "Детский маникюр": False,
        "Дизайн ногтей": False,
        "Починка 1 ноготь": False,
        "Накладные ногти": False,
        "Подология": False,
        "Акриловое покрытие": False,
        "Наращивание акрилом": False,
        "Подмышки": False,
        "Глубокое бикини": False,
        "Промо оверлей маникюр": False,
        "Промо мани педи 250": False,
        "Комбо базовый 150": False,
        "Промо 390": False,
    },
}


def update_online_booking_status():
    """Update online booking status for all employees"""
    if not os.path.exists(DATABASE_NAME):
        print(f"❌ Database {DATABASE_NAME} not found!")
        return

    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    total_updated = 0
    
    for employee_name, services_config in EMPLOYEE_SERVICES_CONFIG.items():
        # Get employee ID
        c.execute("SELECT id FROM users WHERE UPPER(full_name) = ? AND is_service_provider = 1", 
                 (employee_name,))
        emp = c.fetchone()
        
        if not emp:
            print(f"⚠️  Employee '{employee_name}' not found, skipping...")
            continue
            
        employee_id = emp['id']
        print(f"\n{'='*80}")
        print(f"Updating: {employee_name} (ID: {employee_id})")
        print(f"{'='*80}")
        
        for service_name_ru, is_enabled in services_config.items():
            # Find service by Russian name
            c.execute("SELECT id FROM services WHERE name_ru = ?", (service_name_ru,))
            svc = c.fetchone()
            
            if not svc:
                print(f"  ⚠️  Service '{service_name_ru}' not found, skipping...")
                continue
                
            service_id = svc['id']
            
            # Update user_services
            c.execute("""
                UPDATE user_services 
                SET is_online_booking_enabled = ? 
                WHERE user_id = ? AND service_id = ?
            """, (1 if is_enabled else 0, employee_id, service_id))
            
            if c.rowcount > 0:
                status = "✅ Вкл" if is_enabled else "❌ Выкл"
                print(f"  {status}: {service_name_ru}")
                total_updated += 1

    conn.commit()
    conn.close()
    
    print(f"\n{'='*80}")
    print(f"✅ Total updated: {total_updated} service assignments")
    print(f"{'='*80}")


if __name__ == "__main__":
    update_online_booking_status()
