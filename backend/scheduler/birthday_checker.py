import sqlite3
import threading
import time
import asyncio
from datetime import datetime, timedelta
from typing import List, Tuple
from core.config import DATABASE_NAME, SHOW_SCHEDULER_START
from api.notifications import create_notification
from utils.logger import log_info, log_error
from utils.email import send_email_async


def get_upcoming_birthdays() -> List[Tuple]:
    """Получить предстоящие дни рождения"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    today = datetime.now().date()
    week_later = (today + timedelta(days=7)).strftime("%m-%d")
    three_days_later = (today + timedelta(days=3)).strftime("%m-%d")
    tomorrow = (today + timedelta(days=1)).strftime("%m-%d")
    
    c.execute("""
        SELECT id, username, full_name, birthday, role
        FROM users
        WHERE birthday IS NOT NULL
    """)
    
    all_users = c.fetchall()
    conn.close()
    
    upcoming = []
    
    for user in all_users:
        user_id, username, full_name, birthday_str, role = user
        
        if not birthday_str:
            continue
            
        try:
            birthday_date = datetime.strptime(birthday_str, "%Y-%m-%d").date()
            birthday_this_year = birthday_date.replace(year=today.year)
            
            # Если ДР уже прошел в этом году, смотрим на следующий год
            if birthday_this_year < today:
                birthday_this_year = birthday_date.replace(year=today.year + 1)
            
            days_until = (birthday_this_year - today).days
            
            # Определяем тип уведомления
            notification_type = None
            if days_until == 7:
                notification_type = "week"
            elif days_until == 3:
                notification_type = "three_days"
            elif days_until == 1:
                notification_type = "one_day"
            elif days_until == 0:
                notification_type = "today"
            
            if notification_type:
                upcoming.append((
                    user_id,
                    username,
                    full_name,
                    birthday_this_year.strftime("%Y-%m-%d"),
                    notification_type,
                    days_until
                ))
                
        except ValueError:
            log_error(f"Неверный формат даты рождения для {username}: {birthday_str}", "birthday_checker")
    
    return upcoming


def check_if_notification_sent(user_id: int, notification_type: str, notification_date: str) -> bool:
    """Проверить, было ли уже отправлено уведомление"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        SELECT id FROM birthday_notifications
        WHERE user_id = ? AND notification_type = ? AND notification_date = ? AND is_sent = 1
    """, (user_id, notification_type, notification_date))
    
    result = c.fetchone()
    conn.close()
    
    return result is not None


def mark_notification_sent(user_id: int, notification_type: str, notification_date: str):
    """Отметить уведомление как отправленное"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    c.execute("""
        INSERT INTO birthday_notifications (user_id, notification_type, notification_date, is_sent, sent_at)
        VALUES (?, ?, ?, 1, ?)
    """, (user_id, notification_type, notification_date, now))
    
    conn.commit()
    conn.close()


def get_all_staff() -> List[Tuple]:
    """Получить всех сотрудников для уведомления (с email)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT id, username, full_name, email
        FROM users
        WHERE role IN ('admin', 'manager', 'employee')
    """)

    staff = c.fetchall()
    conn.close()

    return staff


async def send_birthday_notifications():
    """Отправить уведомления о днях рождения"""
    try:
        upcoming_birthdays = get_upcoming_birthdays()
        
        if not upcoming_birthdays:
            return
        
        staff = get_all_staff()
        
        for birthday_info in upcoming_birthdays:
            user_id, username, full_name, birthday_date, notification_type, days_until = birthday_info
            
            # Проверяем, было ли уже отправлено
            if check_if_notification_sent(user_id, notification_type, birthday_date):
                continue
            
            # Формируем сообщение
            if notification_type == "week":
                title = "🎂 День рождения через неделю"
                message = f"Через неделю ({birthday_date}) день рождения у {full_name} (@{username})"
            elif notification_type == "three_days":
                title = "🎉 День рождения через 3 дня"
                message = f"Через 3 дня ({birthday_date}) день рождения у {full_name} (@{username})"
            elif notification_type == "one_day":
                title = "🎈 День рождения завтра!"
                message = f"Завтра ({birthday_date}) день рождения у {full_name} (@{username})"
            else:  # today
                title = "🎊 День рождения сегодня!"
                message = f"Сегодня день рождения у {full_name} (@{username})! Не забудьте поздравить! 🎁"
            
            # Отправляем уведомление всем сотрудникам (кроме именинника)
            email_recipients = []

            for staff_member in staff:
                staff_id, staff_username, staff_name, staff_email = staff_member

                if staff_id == user_id:  # Не отправляем уведомление самому имениннику
                    continue

                # Создаём уведомление в интерфейсе
                create_notification(
                    user_id=str(staff_id),
                    title=title,
                    message=message,
                    notification_type="birthday"
                )

                # Собираем email для отправки
                if staff_email and '@' in staff_email:
                    email_recipients.append(staff_email)

            # Отправляем email всем сотрудникам
            if email_recipients:
                html_message = f"""
                <html>
                  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                      <h1 style="color: white; margin: 0;">🎂 {title}</h1>
                    </div>
                    <div style="padding: 30px; background-color: #f7f7f7;">
                      <p style="color: #666; font-size: 16px;">{message}</p>
                      <p style="color: #999; font-size: 14px; margin-top: 20px;">
                        Это автоматическое напоминание от CRM системы.
                      </p>
                    </div>
                  </body>
                </html>
                """

                try:
                    await send_email_async(
                        recipients=email_recipients,
                        subject=title,
                        message=message,
                        html=html_message
                    )
                    log_info(f"📧 Email отправлен на {len(email_recipients)} адресов", "birthday_checker")
                except Exception as e:
                    log_error(f"Ошибка отправки email: {e}", "birthday_checker")

            # Отмечаем как отправленное
            mark_notification_sent(user_id, notification_type, birthday_date)

            log_info(f"Отправлены уведомления о ДР {full_name} (тип: {notification_type})", "birthday_checker")
            
    except Exception as e:
        log_error(f"Ошибка проверки дней рождения: {e}", "birthday_checker")


async def birthday_checker_loop():
    """Основной цикл проверки дней рождения (async версия)"""
    if SHOW_SCHEDULER_START:
        log_info("🎂 Запущен планировщик проверки дней рождения", "birthday_checker")

    while True:
        try:
            now = datetime.now()

            # Проверяем каждый день в 09:00
            if now.hour == 9 and now.minute == 0:
                log_info("Проверка дней рождения...", "birthday_checker")
                await send_birthday_notifications()
                await asyncio.sleep(60)  # Спим минуту, чтобы не запустить дважды
            else:
                await asyncio.sleep(30)  # Проверяем каждые 30 секунд

        except Exception as e:
            log_error(f"Ошибка в цикле проверки ДР: {e}", "birthday_checker")
            await asyncio.sleep(60)


def start_birthday_checker():
    """Запустить проверку дней рождения как фоновую задачу"""
    # Создаем фоновую задачу в текущем event loop (НЕ используем threading!)
    asyncio.create_task(birthday_checker_loop())
    log_info("✅ Планировщик дней рождения запущен", "birthday_checker")


# ===== ПОЗДРАВЛЕНИЯ КЛИЕНТОВ =====

def get_client_birthdays_today() -> List[Tuple]:
    """Получить клиентов с днем рождения сегодня"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    today = datetime.now().date()
    today_md = today.strftime("%m-%d")

    c.execute("""
        SELECT instagram_id, name, username, birthday, email
        FROM clients
        WHERE birthday IS NOT NULL
    """)

    all_clients = c.fetchall()
    conn.close()

    birthday_clients = []

    for client in all_clients:
        instagram_id, name, username, birthday_str, email = client

        if not birthday_str:
            continue

        try:
            birthday_date = datetime.strptime(birthday_str, "%Y-%m-%d").date()
            birthday_md = birthday_date.strftime("%m-%d")

            if birthday_md == today_md:
                age = today.year - birthday_date.year
                birthday_clients.append((
                    instagram_id,
                    name or username,
                    age,
                    email
                ))

        except ValueError:
            log_error(f"Неверный формат даты рождения для клиента {instagram_id}: {birthday_str}", "birthday_checker")

    return birthday_clients


def check_if_client_congratulated(instagram_id: str, date: str) -> bool:
    """Проверить, было ли отправлено поздравление клиенту"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT id FROM client_notifications
        WHERE client_instagram_id = ?
          AND notification_type = 'birthday'
          AND DATE(created_at) = ?
    """, (instagram_id, date))

    result = c.fetchone()
    conn.close()

    return result is not None


async def send_birthday_congratulations():
    """Отправить поздравления клиентам с днем рождения"""
    from integrations.instagram import send_message
    from db.settings import get_salon_settings

    try:
        birthday_clients = get_client_birthdays_today()

        if not birthday_clients:
            return

        salon = get_salon_settings()
        salon_name = salon.get('name', 'Наш салон')

        today_str = datetime.now().date().isoformat()

        for client_info in birthday_clients:
            instagram_id, name, age, email = client_info

            # Проверяем, не поздравляли ли уже сегодня
            if check_if_client_congratulated(instagram_id, today_str):
                continue

            # Формируем поздравление
            birthday_discount = salon.get('birthday_discount', '15%')  # Configurable discount
            
            message = f"""🎉🎂 С Днём Рождения, {name}! 🎂🎉

Команда {salon_name} поздравляет вас с этим особенным днём!
Желаем счастья, здоровья, красоты и исполнения всех желаний! ✨

🎁 Специально для вас - скидка {birthday_discount} на любую услугу в день рождения!

Будем рады видеть вас! 💖"""

            try:
                # Отправляем поздравление в Instagram
                if instagram_id and not instagram_id.startswith('web_'):
                    await send_message(instagram_id, message)
                    log_info(f"🎂 Отправлено поздравление клиенту {name} ({instagram_id})", "birthday_checker")

                # Сохраняем уведомление в БД
                conn = sqlite3.connect(DATABASE_NAME)
                c = conn.cursor()

                c.execute("""
                    INSERT INTO client_notifications
                    (client_instagram_id, client_email, notification_type, title, message, sent_at, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    instagram_id,
                    email,
                    'birthday',
                    'С Днём Рождения!',
                    message,
                    datetime.now().isoformat(),
                    datetime.now().isoformat()
                ))

                conn.commit()
                conn.close()

            except Exception as e:
                log_error(f"Ошибка отправки поздравления {instagram_id}: {e}", "birthday_checker")

    except Exception as e:
        log_error(f"Ошибка в send_birthday_congratulations: {e}", "birthday_checker")


async def client_birthday_checker_loop():
    """Основной цикл проверки дней рождения клиентов (async версия)"""
    log_info("🎂 Запущен планировщик поздравлений клиентов", "birthday_checker")

    while True:
        try:
            now = datetime.now()

            # Поздравляем каждый день в 10:00
            if now.hour == 10 and now.minute == 0:
                log_info("Проверка дней рождения клиентов...", "birthday_checker")
                await send_birthday_congratulations()
                await asyncio.sleep(60)  # Спим минуту
            else:
                await asyncio.sleep(30)  # Проверяем каждые 30 секунд

        except Exception as e:
            log_error(f"Ошибка в цикле поздравлений клиентов: {e}", "birthday_checker")
            await asyncio.sleep(60)


def start_client_birthday_checker():
    """Запустить проверку дней рождения клиентов как фоновую задачу"""
    # Создаем фоновую задачу в текущем event loop (НЕ используем threading!)
    asyncio.create_task(client_birthday_checker_loop())
    log_info("✅ Планировщик поздравлений клиентов запущен", "birthday_checker")


# ===== SCHEDULER ДЛЯ ЗАПИСЕЙ =====

async def send_booking_reminders():
    """Отправить напоминания о записях (#15)"""
    from db.bookings import get_upcoming_bookings
    from integrations.instagram import send_message
    from db.settings import get_salon_settings
    import asyncio
    
    salon_settings = get_salon_settings()
    salon_name = salon_settings.get('name', 'M.Le Diamant Beauty Lounge')
    salon_address = salon_settings.get('address', 'JBR, Dubai')
    
    try:
        # За 24 часа
        bookings_24h = get_upcoming_bookings(hours=24)
        
        for booking in bookings_24h:
            booking_id, instagram_id, service, dt, master, name, username = booking
            
            try:
                dt_obj = datetime.fromisoformat(dt)
                hours_until = (dt_obj - datetime.now()).total_seconds() / 3600
                
                # Отправляем только если близко к 24 часам (23-25 часов)
                if 23 <= hours_until <= 25:
                    message = f"""Напоминаю: завтра {service} в {dt_obj.strftime('%H:%M')} 💅
{f'Мастер: {master}' if master else ''}

Адрес: {salon_name}, {salon_address}
Ждём вас! 💎"""
                    
                    await send_message(instagram_id, message)
                    log_info(f"✅ Reminder sent (24h) to {instagram_id}", "scheduler")
                    
            except Exception as e:
                log_error(f"Error sending 24h reminder: {e}", "scheduler")
        
        # За 2 часа
        bookings_2h = get_upcoming_bookings(hours=2)
        
        for booking in bookings_2h:
            booking_id, instagram_id, service, dt, master, name, username = booking
            
            try:
                dt_obj = datetime.fromisoformat(dt)
                hours_until = (dt_obj - datetime.now()).total_seconds() / 3600
                
                # Отправляем только если близко к 2 часам (1.5-2.5 часа)
                if 1.5 <= hours_until <= 2.5:
                    message = f"""Через 2 часа увидимся! 😊

{service} в {dt_obj.strftime('%H:%M')}
Если не успеваете - дайте знать, перенесём 💖"""
                    
                    await send_message(instagram_id, message)
                    log_info(f"✅ Reminder sent (2h) to {instagram_id}", "scheduler")
                    
            except Exception as e:
                log_error(f"Error sending 2h reminder: {e}", "scheduler")
                
    except Exception as e:
        log_error(f"Error in send_booking_reminders: {e}", "scheduler")


async def send_immediate_booking_reminders():
    """Send reminders for bookings that are less than or equal to 1 hour away.
    This function is called every 5 minutes to ensure newly created bookings are not missed.
    """
    from db.bookings import get_upcoming_bookings
    from integrations.instagram import send_message
    import asyncio

    try:
        # Get bookings that are within the next hour
        bookings_1h = get_upcoming_bookings(hours=1)
        for booking in bookings_1h:
            booking_id, instagram_id, service, dt, master, name, username = booking
            try:
                dt_obj = datetime.fromisoformat(dt)
                minutes_until = (dt_obj - datetime.now()).total_seconds() / 60
                if minutes_until < 0:
                    continue
                # Build message
                from db.settings import get_salon_settings
                salon_settings = get_salon_settings()
                salon_name = salon_settings.get('name', 'M.Le Diamant Beauty Lounge')
                salon_address = salon_settings.get('address', 'JBR, Dubai')
                
                message = f"🔔 Через {int(minutes_until)} мин {service} в {dt_obj.strftime('%H:%M')} 💅\n{f'Mастер: {master}' if master else ''}\n\nАдрес: {salon_name}, {salon_address}\nЖдём вас! 💎"
                await send_message(instagram_id, message)
                log_info(f"✅ Immediate reminder (≤1h) sent to {instagram_id}", "scheduler")
            except Exception as e:
                log_error(f"Error sending immediate reminder: {e}", "scheduler")
    except Exception as e:
        log_error(f"Error in send_immediate_booking_reminders: {e}", "scheduler")
async def check_rebooking_opportunities():
    """Проверить клиентов для повторной записи (#16)"""
    from db.bookings import get_clients_for_rebooking
    from integrations.instagram import send_message
    import asyncio
    
    try:
        # Маникюр (21 день)
        manicure_clients = get_clients_for_rebooking('Manicure', 21)
        
        for instagram_id, name, username in manicure_clients[:5]:  # Макс 5 в день
            try:
                message = f"""Привет! Маникюр уже 3 недели, пора обновить? 💅

Записать как в прошлый раз?"""
                
                await send_message(instagram_id, message)
                log_info(f"✅ Rebooking suggestion sent to {instagram_id}", "scheduler")
                
                # Делаем паузу между сообщениями
                await asyncio.sleep(5)
                
            except Exception as e:
                log_error(f"Error sending rebooking: {e}", "scheduler")
        
        # Педикюр (28 дней)
        pedicure_clients = get_clients_for_rebooking('Pedicure', 28)
        
        for instagram_id, name, username in pedicure_clients[:5]:
            try:
                message = f"""Привет! Педикюр уже месяц 🦶

Хотите записаться снова?"""
                
                await send_message(instagram_id, message)
                log_info(f"✅ Rebooking suggestion sent to {instagram_id}", "scheduler")

                await asyncio.sleep(5)

            except Exception as e:
                log_error(f"Error sending rebooking: {e}", "scheduler")
                
    except Exception as e:
        log_error(f"Error in check_rebooking_opportunities: {e}", "scheduler")


async def booking_scheduler_loop():
    """Основной цикл scheduler для записей (async версия)"""
    log_info("📅 Запущен планировщик записей", "scheduler")

    while True:
        try:
            now = datetime.now()

            # 1️⃣ Напоминания – каждый час (как сейчас)
            if now.minute == 0:
                log_info("Проверка напоминаний о записях...", "scheduler")
                await send_booking_reminders()
                await asyncio.sleep(60)   # спим минуту, чтобы не запустить дважды

            # 2️⃣ Повторные записи – раз в день в 10:00
            if now.hour == 10 and now.minute == 0:
                log_info("Проверка возможностей повторной записи...", "scheduler")
                await check_rebooking_opportunities()
                await asyncio.sleep(60)

            # 3️⃣ **Новый быстрый чекер** – каждые 5 минут
            # (можно уменьшить до 1 минуты, если нужен ещё более быстрый отклик)
            if now.minute % 5 == 0:   # каждый 5‑й минутный тик
                await send_immediate_booking_reminders()
                # Не делаем отдельный sleep – основной цикл всё равно будет ждать 30 сек

            await asyncio.sleep(30)  # проверяем каждые 30 секунд
        except Exception as e:
            log_error(f"Ошибка в booking_scheduler_loop: {e}", "scheduler")
            await asyncio.sleep(60)


def start_booking_scheduler():
    """Запустить scheduler записей как фоновую задачу"""
    # Создаем фоновую задачу в текущем event loop (НЕ используем threading!)
    asyncio.create_task(booking_scheduler_loop())
    log_info("✅ Планировщик записей запущен", "scheduler")