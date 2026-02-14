"""
Уведомления для админов и директоров о важных событиях
- Новые регистрации, ожидающие одобрения
- Новые записи (bookings)
- Новые клиенты
- Подписки на рассылку
"""
import asyncio
from typing import Optional, List
from datetime import datetime
from db.connection import get_db_connection
from utils.logger import log_info, log_error


def get_admin_director_ids() -> List[int]:
    """Получить список ID всех админов и директоров"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT id FROM users
            WHERE role IN ('admin', 'director')
            AND is_active = TRUE
        """)
        ids = [row[0] for row in c.fetchall()]
        conn.close()
        return ids
    except Exception as e:
        log_error(f"Error getting admin/director IDs: {e}", "notifications")
        return []


def create_admin_notification(
    title: str,
    content: str,
    trigger_type: str,
    action_url: Optional[str] = None,
    exclude_user_id: Optional[int] = None
) -> bool:
    """
    Создать in-app уведомление для всех админов и директоров

    Args:
        title: Заголовок уведомления
        content: Текст уведомления
        trigger_type: Тип события (new_registration, new_booking, new_client, newsletter_subscription)
        action_url: URL для перехода (опционально)
        exclude_user_id: Исключить пользователя (например, того кто создал событие)

    Returns:
        bool: True если уведомления созданы успешно
    """
    try:
        admin_ids = get_admin_director_ids()
        if not admin_ids:
            log_info("No admins/directors to notify", "notifications")
            return True

        # Исключаем пользователя если указано
        if exclude_user_id:
            admin_ids = [uid for uid in admin_ids if uid != exclude_user_id]

        if not admin_ids:
            return True

        conn = get_db_connection()
        c = conn.cursor()

        for user_id in admin_ids:
            c.execute("""
                INSERT INTO unified_communication_log
                (user_id, medium, trigger_type, title, content, action_url, is_read, created_at)
                VALUES (%s, 'in_app', %s, %s, %s, %s, FALSE, NOW())
            """, (user_id, trigger_type, title, content, action_url))

        conn.commit()
        conn.close()

        log_info(f"Created {len(admin_ids)} admin notifications for {trigger_type}", "notifications")
        return True

    except Exception as e:
        log_error(f"Error creating admin notification: {e}", "notifications")
        return False


async def notify_admins_websocket(
    title: str,
    content: str,
    trigger_type: str,
    action_url: Optional[str] = None,
    exclude_user_id: Optional[int] = None
):
    """
    Отправить WebSocket уведомление всем админам/директорам
    """
    try:
        from api.notifications_ws import notify_user

        admin_ids = get_admin_director_ids()
        if exclude_user_id:
            admin_ids = [uid for uid in admin_ids if uid != exclude_user_id]

        notification_data = {
            "title": title,
            "message": content,
            "type": trigger_type,
            "action_url": action_url,
            "timestamp": datetime.now().isoformat()
        }

        for user_id in admin_ids:
            await notify_user(user_id, notification_data)

    except Exception as e:
        log_error(f"Error sending WebSocket notifications: {e}", "notifications")


def notify_new_registration_pending(
    user_name: str,
    user_email: str,
    user_role: str
):
    """
    Уведомить о новой регистрации, ожидающей одобрения
    """
    title = "Новая регистрация"
    content = f"{user_name} ({user_email}) зарегистрировался как {user_role} и ожидает одобрения"

    create_admin_notification(
        title=title,
        content=content,
        trigger_type="new_registration",
        action_url="/admin/dashboard"
    )

    # Async WebSocket notification
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(notify_admins_websocket(
                title=title,
                content=content,
                trigger_type="new_registration",
                action_url="/admin/dashboard"
            ))
        else:
            loop.run_until_complete(notify_admins_websocket(
                title=title,
                content=content,
                trigger_type="new_registration",
                action_url="/admin/dashboard"
            ))
    except RuntimeError:
        # No event loop, skip WebSocket notification
        pass


def notify_new_booking(
    client_name: str,
    service_name: str,
    master_name: str,
    booking_datetime: str,
    booking_id: int,
    created_by_user_id: Optional[int] = None
):
    """
    Уведомить о новой записи
    """
    title = "Новая запись"
    content = f"{client_name} записался на {service_name} к {master_name} на {booking_datetime}"

    create_admin_notification(
        title=title,
        content=content,
        trigger_type="new_booking",
        action_url=f"/admin/dashboard?booking_id={booking_id}"
    )

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(notify_admins_websocket(
                title=title,
                content=content,
                trigger_type="new_booking",
                action_url=f"/admin/dashboard?booking_id={booking_id}"
            ))
    except RuntimeError:
        pass


def notify_new_client(
    client_name: str,
    client_phone: Optional[str] = None,
    client_email: Optional[str] = None,
    client_id: Optional[str] = None,
    created_by_user_id: Optional[int] = None
):
    """
    Уведомить о новом клиенте
    """
    title = "Новый клиент"
    contact_info = client_phone or client_email or "контактные данные не указаны"
    content = f"Новый клиент: {client_name} ({contact_info})"

    action_url = f"/admin/dashboard?client_id={client_id}" if client_id else "/admin/dashboard"

    create_admin_notification(
        title=title,
        content=content,
        trigger_type="new_client",
        action_url=action_url
    )

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(notify_admins_websocket(
                title=title,
                content=content,
                trigger_type="new_client",
                action_url=action_url
            ))
    except RuntimeError:
        pass


def notify_newsletter_subscription(
    email: str
):
    """
    Уведомить о новой подписке на рассылку
    """
    title = "Новая подписка на рассылку"
    content = f"Новый подписчик: {email}"

    create_admin_notification(
        title=title,
        content=content,
        trigger_type="newsletter_subscription",
        action_url="/admin/notifications"
    )

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(notify_admins_websocket(
                title=title,
                content=content,
                trigger_type="newsletter_subscription",
                action_url="/admin/notifications"
            ))
    except RuntimeError:
        pass


def notify_email_verified(
    user_name: str,
    user_email: str
):
    """
    Уведомить что пользователь подтвердил email и ожидает одобрения
    """
    title = "Email подтвержден"
    content = f"{user_name} ({user_email}) подтвердил email и ожидает одобрения регистрации"

    create_admin_notification(
        title=title,
        content=content,
        trigger_type="email_verified",
        action_url="/admin/dashboard"
    )

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(notify_admins_websocket(
                title=title,
                content=content,
                trigger_type="email_verified",
                action_url="/admin/dashboard"
            ))
    except RuntimeError:
        pass
