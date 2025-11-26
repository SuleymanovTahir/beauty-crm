#!/usr/bin/env python3
"""
Скрипт для добавления тестовых данных в БД
"""
import sqlite3
import sys
import os
from datetime import datetime

# Добавляем backend в путь
backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from core.config import DATABASE_NAME

def seed_data():
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    now = datetime.now().isoformat()

    print("=" * 70)
    print("ДОБАВЛЕНИЕ ТЕСТОВЫХ ДАННЫХ")
    print("=" * 70)

    # 1. Мастера создаются через update_employee_details.py
    print("\n1. МАСТЕРА:")
    print("-" * 70)
    print("⏭️  Пропущено - мастера создаются через update_employee_details.py")
    
    master_ids = {}  # Empty dict for compatibility

    # 2. Добавляем услуги
    print("\n2. ДОБАВЛЕНИЕ УСЛУГ:")
    print("-" * 70)

    # Проверяем есть ли уже услуги
    c.execute("SELECT COUNT(*) FROM services WHERE is_active = 1")
    if c.fetchone()[0] > 0:
        print("⚠️  Услуги уже существуют, очищаю...")
        c.execute("DELETE FROM services")

    services = [
        # Ногти
        {
            'service_key': 'manicure_basic',
            'name': 'Manicure',
            'name_ru': 'Маникюр',
            'name_ar': 'مانيكير',
            'category': 'Nails',
            'price': 120,
            'currency': 'AED',
            'description': 'Классический маникюр',
            'duration': '60'
        },
        {
            'service_key': 'pedicure_basic',
            'name': 'Pedicure',
            'name_ru': 'Педикюр',
            'name_ar': 'باديكير',
            'category': 'Nails',
            'price': 150,
            'currency': 'AED',
            'description': 'Классический педикюр',
            'duration': '90'
        },
        # Волосы
        {
            'service_key': 'haircut_women',
            'name': 'Women Haircut',
            'name_ru': 'Женская стрижка',
            'name_ar': 'قصة شعر نسائية',
            'category': 'Hair',
            'price': 200,
            'currency': 'AED',
            'description': 'Женская стрижка',
            'duration': '60'
        },
        {
            'service_key': 'hair_coloring',
            'name': 'Hair Coloring',
            'name_ru': 'Окрашивание волос',
            'name_ar': 'صبغ الشعر',
            'category': 'Hair',
            'price': 400,
            'min_price': 400,
            'max_price': 800,
            'currency': 'AED',
            'description': 'Окрашивание волос',
            'duration': '180'
        },
        {
            'service_key': 'keratin_treatment',
            'name': 'Keratin Treatment',
            'name_ru': 'Кератиновое выпрямление',
            'name_ar': 'علاج الكيراتين',
            'category': 'Hair',
            'price': 1500,
            'currency': 'AED',
            'description': 'Кератиновое выпрямление и уход за волосами',
            'duration': '240'
        },
        {
            'service_key': 'hair_care',
            'name': 'Hair Care',
            'name_ru': 'Уход за волосами',
            'name_ar': 'العناية بالشعر',
            'category': 'Hair',
            'price': 1500,
            'currency': 'AED',
            'description': 'Комплексный уход за волосами (ботокс, кератин, восстановление)',
            'duration': '180'
        },
        # Перманентный макияж
        {
            'service_key': 'permanent_brows',
            'name': 'Permanent Makeup Brows',
            'name_ru': 'Перманентный макияж бровей',
            'name_ar': 'مكياج دائم للحواجب',
            'category': 'Brows',
            'price': 1200,
            'currency': 'AED',
            'description': 'Перманентный макияж бровей',
            'duration': '120'
        },
        {
            'service_key': 'permanent_lips',
            'name': 'Permanent Makeup Lips',
            'name_ru': 'Перманентный макияж губ',
            'name_ar': 'مكياج دائم للشفاه',
            'category': 'Makeup',
            'price': 1500,
            'currency': 'AED',
            'description': 'Перманентный макияж губ',
            'duration': '120'
        },
        {
            'service_key': 'permanent_eyeliner',
            'name': 'Permanent Eyeliner',
            'name_ru': 'Перманентный макияж век (стрелки)',
            'name_ar': 'آيلاينر دائم',
            'category': 'Lashes',
            'price': 1000,
            'currency': 'AED',
            'description': 'Перманентный макияж век (стрелки)',
            'duration': '120'
        },
    ]

    service_ids = {}
    for service in services:
        c.execute("""
            INSERT INTO services (service_key, name, name_ru, name_ar, category, price, min_price, max_price,
                                  currency, description, duration, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        """, (service['service_key'], service['name'], service['name_ru'], service['name_ar'],
              service['category'], service['price'], service.get('min_price'), service.get('max_price'),
              service['currency'], service['description'], service['duration'], now, now))
        service_ids[service['service_key']] = c.lastrowid
        print(f"✅ Добавлена услуга: {service['name_ru']} ({service['category']}) - {service['price']} {service['currency']}")

    # 3. Привязываем мастеров к услугам
    print("\n3. ПРИВЯЗКА МАСТЕРОВ К УСЛУГАМ:")
    print("-" * 70)

    # Ляззат - Ногти
    lyazzat_id = master_ids['Ляззат']
    for service_key in ['manicure_basic', 'pedicure_basic']:
        c.execute("""
            INSERT INTO user_services (user_id, service_id)
            VALUES (?, ?)
        """, (lyazzat_id, service_ids[service_key]))
        print(f"✅ Ляззат ← {service_key}")

    # Симо и Местан - Волосы
    for master_name in ['Симо', 'Местан']:
        master_id = master_ids[master_name]
        for service_key in ['haircut_women', 'hair_coloring', 'keratin_treatment', 'hair_care']:
            c.execute("""
                INSERT INTO user_services (user_id, service_id)
                VALUES (?, ?)
            """, (master_id, service_ids[service_key]))
        print(f"✅ {master_name} ← Hair Services")

    # 4. Добавляем расписание мастеров
    print("\n4. ДОБАВЛЕНИЕ РАСПИСАНИЯ МАСТЕРОВ:")
    print("-" * 70)

    # Расписание: Пн-Сб 10:00-21:00, Вс выходной
    for master_name, master_id in master_ids.items():
        for day in range(6):  # 0=Пн, 5=Сб
            c.execute("""
                INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active)
                VALUES (?, ?, '10:00', '21:00', 1)
            """, (master_id, day))
        print(f"✅ {master_name}: Пн-Сб 10:00-21:00")

    conn.commit()
    conn.close()

    print("\n" + "=" * 70)
    print("✅ ТЕСТОВЫЕ ДАННЫЕ УСПЕШНО ДОБАВЛЕНЫ!")
    print("=" * 70)

if __name__ == "__main__":
    try:
        seed_data()
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)