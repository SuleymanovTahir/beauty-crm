"""
Скрипт для заполнения БД тестовыми данными
Запуск: python -m db.migrations.seed_test_data
"""
import sqlite3
import random
import hashlib
import sys
import os
from datetime import datetime, timedelta

# Добавляем путь к корню проекта
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from core.config import DATABASE_NAME

# Списки для генерации данных
FIRST_NAMES = [
    "Анна", "Мария", "Елена", "Ольга", "Ирина", "Наталья", "Татьяна", "Екатерина",
    "Юлия", "Светлана", "Александра", "Виктория", "Дарья", "Полина", "Анастасия",
    "Sarah", "Emma", "Olivia", "Sophia", "Isabella", "Mia", "Charlotte", "Amelia"
]

LAST_NAMES = [
    "Иванова", "Петрова", "Сидорова", "Смирнова", "Кузнецова", "Попова", "Соколова",
    "Лебедева", "Козлова", "Новикова", "Морозова", "Петренко", "Волкова", "Соловьева",
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"
]

SERVICES = [
    ("Маникюр", 150, 60),
    ("Педикюр", 180, 75),
    ("Наращивание ногтей", 250, 120),
    ("Укрепление ногтей", 200, 90),
    ("Дизайн ногтей", 100, 45),
    ("Массаж рук", 120, 30),
    ("Парафинотерапия", 90, 40),
    ("SPA маникюр", 280, 90),
    ("Французский маникюр", 170, 70),
    ("Омбре на ногтях", 200, 80)
]

CLIENT_STATUSES = ["new", "lead", "customer"]
BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled"]
USER_ROLES = ["admin", "manager", "employee"]

MESSAGES_TEMPLATES = [
    "Здравствуйте! Хочу записаться на {service}",
    "Подскажите, сколько стоит {service}?",
    "Какие у вас есть свободные слоты на завтра?",
    "Можно ли записаться на {service} на этой неделе?",
    "Спасибо за процедуру! Очень понравилось!",
    "Есть ли у вас акции на {service}?",
    "Хочу перенести запись на другое время",
    "Отличный салон! Буду рекомендовать друзьям",
    "Hello! I would like to book {service}",
    "How much does {service} cost?",
    "Can I book an appointment for tomorrow?",
    "Thank you for the amazing service!",
]

BOT_RESPONSES = [
    "Здравствуйте! 😊 Конечно, помогу с записью!",
    "Стоимость {service} - {price} AED 💎",
    "У нас есть свободные слоты. Когда вам удобно?",
    "Запись подтверждена! Ждем вас ✨",
    "Спасибо за отзыв! 💖 Будем рады видеть снова!",
    "Да, у нас сейчас действует специальное предложение!",
    "Конечно, переносим вашу запись. На какое время?",
    "Hello! 😊 I'll help you with booking!",
    "The price for {service} is {price} AED 💎",
    "Sure! When would you like to come?",
]


def generate_phone():
    """Генерация случайного телефона"""
    return f"+971 5{random.randint(0,9)} {random.randint(100,999)} {random.randint(1000,9999)}"


def generate_instagram_id():
    """Генерация Instagram ID"""
    return f"{random.randint(100000000000, 999999999999)}"


def generate_username():
    """Генерация Instagram username"""
    name = random.choice(FIRST_NAMES).lower()
    suffix = random.choice(["_dubai", "_uae", "", f"_{random.randint(1,99)}", ".beauty"])
    return f"{name}{suffix}"


def generate_datetime_range(days_ago=30):
    """Генерация случайной даты в диапазоне"""
    days_offset = random.randint(0, days_ago)
    hours_offset = random.randint(9, 20)  # Рабочие часы
    minutes_offset = random.choice([0, 15, 30, 45])
    
    date = datetime.now() - timedelta(days=days_offset)
    date = date.replace(hour=hours_offset, minute=minutes_offset, second=0, microsecond=0)
    return date.isoformat()


def seed_users(conn, count=20):
    """Создать тестовых пользователей"""
    c = conn.cursor()
    users = []
    
    print(f"\n📝 Создание {count} пользователей...")
    
    # Админ всегда первый
    password_hash = hashlib.sha256("admin123".encode()).hexdigest()
    c.execute("""INSERT INTO users (username, password_hash, full_name, email, role, created_at, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, 1)""",
              ("admin", password_hash, "Администратор", "admin@mlediamant.com", "admin", 
               datetime.now().isoformat()))
    users.append(c.lastrowid)
    
    # Остальные пользователи
    for i in range(count - 1):
        username = f"user{i+1}"
        password = "password123"
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        full_name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        email = f"user{i+1}@mlediamant.com"
        role = random.choice(USER_ROLES)
        
        c.execute("""INSERT INTO users (username, password_hash, full_name, email, role, created_at, is_active)
                     VALUES (?, ?, ?, ?, ?, ?, 1)""",
                  (username, password_hash, full_name, email, role, generate_datetime_range(90)))
        users.append(c.lastrowid)
    
    print(f"✅ Создано {len(users)} пользователей")
    print(f"   👤 admin / admin123 (Администратор)")
    print(f"   👤 user1-{count-1} / password123")
    return users


def seed_clients(conn, count=20):
    """Создать тестовых клиентов"""
    c = conn.cursor()
    clients = []
    
    print(f"\n📝 Создание {count} клиентов...")
    
    for i in range(count):
        instagram_id = generate_instagram_id()
        username = generate_username()
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        phone = generate_phone()
        status = random.choice(CLIENT_STATUSES)
        first_contact = generate_datetime_range(60)
        last_contact = generate_datetime_range(5)
        total_messages = random.randint(3, 50)
        lifetime_value = random.randint(0, 5000)
        is_pinned = 1 if random.random() > 0.8 else 0
        
        c.execute("""INSERT INTO clients 
                     (instagram_id, username, name, phone, status, first_contact, 
                      last_contact, total_messages, lifetime_value, is_pinned, 
                      labels, detected_language)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (instagram_id, username, name, phone, status, first_contact,
                   last_contact, total_messages, lifetime_value, is_pinned,
                   "Тестовый клиент", random.choice(["ru", "en", "ar"])))
        
        clients.append(instagram_id)
    
    print(f"✅ Создано {len(clients)} клиентов")
    return clients


def seed_services(conn):
    """Создать услуги"""
    c = conn.cursor()
    
    print(f"\n📝 Создание услуг...")
    
    # Проверяем есть ли уже услуги
    c.execute("SELECT COUNT(*) FROM services")
    if c.fetchone()[0] > 0:
        print("⚠️  Услуги уже существуют, пропускаем")
        return
    
    for service_name, price, duration in SERVICES:
        c.execute("""INSERT INTO services 
                     (name, name_en, name_ar, price, duration, description, 
                      description_en, description_ar, category, is_active)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)""",
                  (service_name, service_name, service_name, price, duration,
                   f"Профессиональный {service_name.lower()}",
                   f"Professional {service_name}",
                   service_name, "Ногтевой сервис"))
    
    print(f"✅ Создано {len(SERVICES)} услуг")


def seed_bookings(conn, clients, count=20):
    """Создать тестовые записи"""
    c = conn.cursor()
    bookings = []
    
    print(f"\n📝 Создание {count} записей...")
    
    for i in range(count):
        client_id = random.choice(clients)
        service = random.choice(SERVICES)
        service_name = service[0]
        revenue = service[1]
        
        # Генерируем дату записи (в будущем или прошлом)
        future = random.random() > 0.5
        if future:
            booking_date = datetime.now() + timedelta(days=random.randint(1, 14))
        else:
            booking_date = datetime.now() - timedelta(days=random.randint(1, 30))
        
        booking_date = booking_date.replace(
            hour=random.randint(10, 20),
            minute=random.choice([0, 15, 30, 45]),
            second=0, microsecond=0
        )
        
        status = random.choice(BOOKING_STATUSES) if not future else "pending"
        
        # Получаем имя и телефон клиента
        c.execute("SELECT name, phone FROM clients WHERE instagram_id = ?", (client_id,))
        client_data = c.fetchone()
        name = client_data[0] if client_data else "Клиент"
        phone = client_data[1] if client_data else generate_phone()
        
        created_at = generate_datetime_range(45)
        
        c.execute("""INSERT INTO bookings 
                     (instagram_id, service_name, datetime, phone, name, status, 
                      created_at, revenue)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                  (client_id, service_name, booking_date.isoformat(), phone, name,
                   status, created_at, revenue if status == "completed" else 0))
        
        bookings.append(c.lastrowid)
    
    print(f"✅ Создано {len(bookings)} записей")
    return bookings


def seed_messages(conn, clients, count_per_client=5):
    """Создать тестовые сообщения"""
    c = conn.cursor()
    messages = []
    
    print(f"\n📝 Создание сообщений (по {count_per_client} на клиента)...")
    
    total = 0
    for client_id in clients:
        # Генерируем диалог для клиента
        num_messages = random.randint(3, count_per_client)
        
        for i in range(num_messages):
            # Чередуем клиента и бота
            if i % 2 == 0:
                sender = "client"
                service = random.choice(SERVICES)[0]
                message = random.choice(MESSAGES_TEMPLATES).replace("{service}", service)
            else:
                sender = "bot"
                service = random.choice(SERVICES)
                message = random.choice(BOT_RESPONSES).replace(
                    "{service}", service[0]
                ).replace("{price}", str(service[1]))
            
            timestamp = generate_datetime_range(30)
            is_read = 1 if sender == "bot" or random.random() > 0.3 else 0
            
            c.execute("""INSERT INTO chat_history 
                         (instagram_id, message, sender, timestamp, message_type, 
                          language, is_read)
                         VALUES (?, ?, ?, ?, ?, ?, ?)""",
                      (client_id, message, sender, timestamp, "text", "ru", is_read))
            
            messages.append(c.lastrowid)
            total += 1
    
    print(f"✅ Создано {total} сообщений")
    return messages


def main():
    """Главная функция заполнения данных"""
    print("=" * 70)
    print("🎲 ГЕНЕРАЦИЯ ТЕСТОВЫХ ДАННЫХ ДЛЯ CRM")
    print("=" * 70)
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        
        # Очистка старых тестовых данных (опционально)
        response = input("\n⚠️  Очистить существующие данные? (y/N): ")
        if response.lower() == 'y':
            print("\n🗑️  Очистка данных...")
            c = conn.cursor()
            
            # Отключаем проверку внешних ключей
            c.execute("PRAGMA foreign_keys = OFF")
            
            # Очищаем таблицы
            tables = ["chat_history", "bookings", "booking_temp", "clients", 
                     "sessions", "users"]
            for table in tables:
                try:
                    c.execute(f"DELETE FROM {table}")
                    print(f"   ✅ Очищена таблица {table}")
                except sqlite3.OperationalError:
                    print(f"   ⚠️  Таблица {table} не найдена")
            
            # Включаем проверку внешних ключей
            c.execute("PRAGMA foreign_keys = ON")
            conn.commit()
            print("✅ Данные очищены\n")
        
        # Генерация данных
        users = seed_users(conn, count=10)
        clients = seed_clients(conn, count=25)
        seed_services(conn)
        bookings = seed_bookings(conn, clients, count=30)
        messages = seed_messages(conn, clients, count_per_client=8)
        
        conn.commit()
        
        # Итоговая статистика
        c = conn.cursor()
        
        c.execute("SELECT COUNT(*) FROM users")
        users_count = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM clients")
        clients_count = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM bookings")
        bookings_count = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM chat_history")
        messages_count = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM services")
        services_count = c.fetchone()[0]
        
        print("\n" + "=" * 70)
        print("✅ ГЕНЕРАЦИЯ ЗАВЕРШЕНА!")
        print("=" * 70)
        print(f"\n📊 Статистика:")
        print(f"   👥 Пользователей: {users_count}")
        print(f"   👤 Клиентов: {clients_count}")
        print(f"   📅 Записей: {bookings_count}")
        print(f"   💬 Сообщений: {messages_count}")
        print(f"   💎 Услуг: {services_count}")
        
        print(f"\n🔑 Данные для входа:")
        print(f"   Username: admin")
        print(f"   Password: admin123")
        print(f"   Role: Администратор")
        print(f"\n   Username: user1, user2, ..., user9")
        print(f"   Password: password123")
        print(f"   Role: admin/manager/employee (случайно)")
        
        print("\n✨ Готово! Можно запускать приложение.")
        print("=" * 70)
        
        conn.close()
        
    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    main()