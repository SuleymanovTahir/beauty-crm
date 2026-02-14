"""
Модуль для отправки уведомлений мастерам о новых записях
Использует UniversalMessenger для унифицированной отправки.
"""
from datetime import datetime
from typing import Optional, Dict, Any
import asyncio
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from services.universal_messenger import send_universal_message

def get_master_info(master_name: str) -> Optional[Dict[str, Any]]:
    """Получить информацию о мастере по имени"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Ищем мастера по full_name или username с учетом настроек уведомлений
        c.execute("""
            SELECT 
                u.id, u.username, u.full_name, u.email, u.phone, u.telegram_chat_id, u.role,
                COALESCE(ns.telegram_notifications, TRUE) as notify_telegram,
                COALESCE(ns.email_notifications, TRUE) as notify_email,
                COALESCE(ns.whatsapp_notifications, FALSE) as notify_whatsapp,
                COALESCE(ns.notify_on_new_booking, TRUE) as notify_on_new_booking,
                COALESCE(ns.notify_on_booking_change, TRUE) as notify_on_booking_change,
                COALESCE(ns.notify_on_booking_cancel, TRUE) as notify_on_booking_cancel
            FROM users u
            LEFT JOIN notification_settings ns ON u.id = ns.user_id
            WHERE (LOWER(u.full_name) = LOWER(%s) OR LOWER(u.username) = LOWER(%s))
              AND u.role IN ('employee', 'admin', 'manager', 'director')
              AND u.is_active = TRUE
        """, (master_name, master_name))

        result = c.fetchone()
        if not result: return None

        return {
            "id": result[0],
            "username": result[1],
            "full_name": result[2],
            "email": result[3],
            "phone": result[4],
            "telegram_chat_id": result[5],
            "role": result[6],
            "notify_telegram": bool(result[7]),
            "notify_email": bool(result[8]),
            "notify_whatsapp": bool(result[9]),
            "notify_on_new_booking": bool(result[10]),
            "notify_on_booking_change": bool(result[11]),
            "notify_on_booking_cancel": bool(result[12]),
        }
    finally:
        conn.close()

async def notify_master_about_booking(
    master_name: str,
    client_name: str,
    service: str,
    datetime_str: str,
    phone: str = "",
    booking_id: int = None,
    notification_type: str = "new_booking"
) -> Dict[str, bool]:
    """Отправить уведомление мастеру через UniversalMessenger"""
    results = {"telegram": False, "email": False, "whatsapp": False}

    if not master_name: return results

    master = get_master_info(master_name)
    if not master: return results

    # Проверка предпочтений
    trigger_map = {
        "new_booking": "notify_on_new_booking",
        "booking_change": "notify_on_booking_change",
        "booking_cancel": "notify_on_booking_cancel"
    }
    if not master.get(trigger_map.get(notification_type), True):
        return results

    # Контекст для шаблонов
    context = {
        "master_name": master['full_name'] or master['username'],
        "client_name": client_name or "Клиент",
        "service": service,
        "datetime": datetime_str,
        "phone": phone,
        "booking_id": str(booking_id) if booking_id else ""
    }

    # Отправка по каналам через UniversalMessenger
    tasks = []
    
    # 1. Telegram
    if master.get("notify_telegram") and master.get("telegram_chat_id"):
        tasks.append(("telegram", send_universal_message(
            recipient_id=str(master['telegram_chat_id']),
            template_name=f"master_{notification_type}", # master_new_booking и т.д.
            context=context,
            booking_id=booking_id,
            platform='telegram',
            user_id=master['id']
        )))

    # 2. Email
    if master.get("notify_email") and master.get("email"):
        tasks.append(("email", send_universal_message(
            recipient_id=master['email'],
            template_name=f"master_{notification_type}",
            context=context,
            booking_id=booking_id,
            platform='email',
            user_id=master['id']
        )))

    # Выполняем
    if tasks:
        coros = [t[1] for t in tasks]
        raw_res = await asyncio.gather(*coros, return_exceptions=True)
        for i, (channel, _) in enumerate(tasks):
            res = raw_res[i]
            if not isinstance(res, Exception) and res.get("success"):
                results[channel] = True

    return results

def save_notification_log(*args, **kwargs):
    """DEPRECATED: Now handled by unified_communication_log in UniversalMessenger"""
    pass
