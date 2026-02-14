"""
Планировщик поздравлений с днем рождения (Сотрудники и Клиенты)
Использует UniversalMessenger и шаблоны из БД.
"""
import asyncio
from datetime import datetime
from typing import List, Tuple, Optional

from db.connection import get_db_connection
from utils.logger import log_info, log_error
from services.universal_messenger import send_universal_message

# ===== СОТРУДНИКИ =====

def get_staff_birthdays_today() -> List[dict]:
    """Список сотрудников, у которых сегодня ДР"""
    conn = get_db_connection()
    c = conn.cursor()
    today_md = datetime.now().strftime("%m-%d")
    
    try:
        # Проверяем формат %Y-%m-%d или %m-%d
        c.execute("""
            SELECT id, username, full_name, role 
            FROM users 
            WHERE (birthday LIKE %s OR birthday LIKE %s) AND is_active = TRUE
        """, (f"%-{today_md}", f"{today_md}"))
        
        cols = ['id', 'username', 'full_name', 'role']
        return [dict(zip(cols, row)) for row in c.fetchall()]
    finally:
        conn.close()

async def notify_staff_birthdays():
    """Уведомить коллектив о днях рождения коллег"""
    birthday_people = get_staff_birthdays_today()
    if not birthday_people: return
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Получаем всех активных сотрудников для уведомления
        c.execute("SELECT id, full_name FROM users WHERE is_active = TRUE AND role IN ('admin', 'director', 'manager', 'employee')")
        staff_to_notify = c.fetchall()
        
        for person in birthday_people:
            name = person['full_name'] or person['username']
            title = "🎂 День рождения коллеги!"
            message = f"Сегодня день рождения у {name}! Не забудьте поздравить! 🎉"
            
            for staff_id, staff_name in staff_to_notify:
                if staff_id == person['id']: continue # Не уведомляем самого себя
                
                await send_universal_message(
                    recipient_id=str(staff_id),
                    platform='in_app',
                    text=message,
                    subject=title,
                    user_id=staff_id
                )
    finally:
        conn.close()

def get_client_birthdays(days_offset: int = 0) -> List[dict]:
    """Список клиентов, у которых ДР через days_offset дней"""
    conn = get_db_connection()
    c = conn.cursor()
    # Вычисляем нужную дату
    target_date = datetime.now() + timedelta(days=days_offset)
    target_md = target_date.strftime("%m-%d")
    
    try:
        c.execute("""
            SELECT id, instagram_id, name, email, telegram_id, detected_language
            FROM clients
            WHERE (birthday LIKE %s OR birthday LIKE %s)
            AND NOT EXISTS (
                SELECT 1 FROM marketing_unsubscriptions 
                WHERE (client_id = clients.instagram_id OR client_id = clients.telegram_id OR email = clients.email)
                AND mailing_type IN ('birthday', 'marketing', 'all')
            )
        """, (f"%-{target_md}", f"{target_md}"))
        
        cols = ['id', 'instagram_id', 'name', 'email', 'telegram_id', 'detected_language']
        return [dict(zip(cols, row)) for row in c.fetchall()]
    finally:
        conn.close()

async def congratulate_clients():
    """Отправить поздравления клиентам (сегодня и за 7 дней) через UniversalMessenger"""
    from db.promo_codes import generate_birthday_promo
    
    # 1. СЕГОДНЯШНИЕ ДР
    today_clients = get_client_birthdays(0)
    if today_clients:
        log_info(f"🎂 Today is birthday for {len(today_clients)} clients!", "birthday_checker")
        for client in today_clients:
            recipient_id = client['instagram_id'] or client['telegram_id'] or str(client['id'])
            
            # Генерируем промокод (если еще нет)
            promo = generate_birthday_promo(client['name'] or "Client", recipient_id)
            
            await send_universal_message(
                recipient_id=recipient_id,
                template_name="birthday_greeting",
                context={
                    "name": client['name'] or "Клиент",
                    "promo_code": promo,
                    "salon_name": "M. Le Diamant",
                    "lang": client.get('detected_language') or 'ru'
                },
                platform="auto"
            )

    # 2. ДР ЧЕРЕЗ 7 ДНЕЙ (Напоминание записаться)
    future_clients = get_client_birthdays(7)
    if future_clients:
        log_info(f"✨ {len(future_clients)} clients have birthday in 7 days. Sending reminders...", "birthday_checker")
        for client in future_clients:
            recipient_id = client['instagram_id'] or client['telegram_id'] or str(client['id'])
            
            promo = generate_birthday_promo(client['name'] or "Client", recipient_id)
            
            await send_universal_message(
                recipient_id=recipient_id,
                template_name="birthday_reminder_7d",
                context={
                    "name": client['name'] or "Клиент",
                    "promo_code": promo,
                    "salon_name": "M. Le Diamant",
                    "lang": client.get('detected_language') or 'ru'
                },
                platform="auto"
            )

# ===== ЛУПЫ (LOOP) =====

async def birthday_checker_loop():
    """Цикл проверки дней рождения (сотрудники и клиенты)"""
    log_info("🚀 Birthday checker service started", "birthday_checker")
    
    while True:
        try:
            now = datetime.now()
            # Проверка раз в день в 10:00
            if now.hour == 10 and now.minute == 0:
                log_info("⏰ Running daily birthday checks...", "birthday_checker")
                await notify_staff_birthdays()
                await congratulate_clients()
                await asyncio.sleep(70) # Чтобы не запустить дважды
            
            await asyncio.sleep(40)
        except Exception as e:
            log_error(f"Error in birthday_checker_loop: {e}", "birthday_checker")
            await asyncio.sleep(60)

def start_birthday_checker():
    """Запуск фоновой задачи для сотрудников"""
    asyncio.create_task(birthday_checker_loop())

def start_client_birthday_checker():
    """Алиас для обратной совместимости (теперь всё в одном лупе)"""
    # Мы не запускаем задачу здесь, так как она уже запущена в start_birthday_checker
    # Но если main.py вызывает обе функции, нам нужно убедиться, что мы не создаем два лупа.
    # Поэтому мы просто игнорируем или полагаемся на один вызов.
    pass