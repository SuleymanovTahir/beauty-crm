import sqlite3
import threading
import time
from datetime import datetime, timedelta
from typing import List, Tuple
from config import DATABASE_NAME
from api.notifications import create_notification
from logger import log_info, log_error


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
    """Получить всех сотрудников для уведомления"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        SELECT id, username, full_name
        FROM users
        WHERE role IN ('admin', 'manager', 'employee')
    """)
    
    staff = c.fetchall()
    conn.close()
    
    return staff


def send_birthday_notifications():
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
            for staff_member in staff:
                staff_id, staff_username, staff_name = staff_member
                
                if staff_id == user_id:  # Не отправляем уведомление самому имениннику
                    continue
                
                create_notification(
                    user_id=str(staff_id),
                    title=title,
                    message=message,
                    notification_type="birthday"
                )
            
            # Отмечаем как отправленное
            mark_notification_sent(user_id, notification_type, birthday_date)
            
            log_info(f"Отправлены уведомления о ДР {full_name} (тип: {notification_type})", "birthday_checker")
            
    except Exception as e:
        log_error(f"Ошибка проверки дней рождения: {e}", "birthday_checker")


def birthday_checker_loop():
    """Основной цикл проверки дней рождения"""
    log_info("🎂 Запущен планировщик проверки дней рождения", "birthday_checker")
    
    while True:
        try:
            now = datetime.now()
            
            # Проверяем каждый день в 09:00
            if now.hour == 9 and now.minute == 0:
                log_info("Проверка дней рождения...", "birthday_checker")
                send_birthday_notifications()
                time.sleep(60)  # Спим минуту, чтобы не запустить дважды
            else:
                time.sleep(30)  # Проверяем каждые 30 секунд
                
        except Exception as e:
            log_error(f"Ошибка в цикле проверки ДР: {e}", "birthday_checker")
            time.sleep(60)


def start_birthday_checker():
    """Запустить проверку дней рождения в отдельном потоке"""
    thread = threading.Thread(target=birthday_checker_loop, daemon=True)
    thread.start()
    log_info("✅ Планировщик дней рождения запущен", "birthday_checker")