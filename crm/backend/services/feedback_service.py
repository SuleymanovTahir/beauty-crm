"""
Сервис для сбора и анализа отзывов
"""

from datetime import datetime
from core.config import DATABASE_NAME
from db.connection import get_db_connection
import logging

logger = logging.getLogger('crm')

async def save_rating(instagram_id: str, rating: int, comment: str = None):
    """Сохранить оценку клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Находим последнее завершенное бронирование клиента
        c.execute("""
            SELECT id FROM bookings 
            WHERE instagram_id = %s AND status = 'completed'
            ORDER BY datetime DESC LIMIT 1
        """, (instagram_id,))
        
        booking = c.fetchone()
        booking_id = booking[0] if booking else None
        
        c.execute("""
            INSERT INTO ratings (booking_id, instagram_id, rating, comment, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (booking_id, instagram_id, rating, comment, datetime.now().isoformat()))
        
        conn.commit()
        logger.info(f"⭐ Rating saved for {instagram_id}: {rating}/5")
        
        # Анализ негатива
        if rating <= 3:
            await alert_manager(instagram_id, rating, comment)
            
    except Exception as e:
        logger.error(f"❌ Error saving rating: {e}")
    finally:
        conn.close()

async def alert_manager(instagram_id: str, rating: int, comment: str):
    """Уведомить менеджера о плохом отзыве через Telegram"""
    logger.warning(f"⚠️ NEGATIVE FEEDBACK from {instagram_id}: {rating}/5 - {comment}")
    
    try:
        from integrations.telegram_bot import send_telegram_alert
        from db.clients import get_client_by_id
        from crm_api.notifications import create_notification
        from db.users import get_all_users
        from utils.email import send_email_async
        
        # Получаем информацию о клиенте
        client_data = get_client_by_id(instagram_id)
        # client_data format: 0:id, 1:username, 2:phone, 3:name, ...
        
        client_name = "Неизвестный"
        client_username = ""
        client_phone = "Не указан"
        
        if client_data:
            client_username = client_data[1] or ""
            client_phone = client_data[2] or "Не указан"
            client_name = client_data[3] or client_username or "Без имени"
            
        # Determine platform and profile link
        platform_icon = "❓"
        profile_link = "Не найден"
        platform_name = "Unknown"

        if instagram_id.startswith("telegram_"):
            platform_icon = "✈️"
            platform_name = "Telegram"
            tg_id = instagram_id.replace("telegram_", "")
            if client_username:
                    profile_link = f"https://t.me/{client_username.replace('@', '')}"
            else:
                    profile_link = f"tg://user?id={tg_id}"
        
        elif instagram_id.startswith("whatsapp_"):
            platform_icon = "💚"
            platform_name = "WhatsApp"
            if client_phone and client_phone != "Не указан":
                clean_phone = client_phone.replace('+', '').replace(' ', '').replace('-', '')
                profile_link = f"https://wa.me/{clean_phone}"
            else:
                profile_link = "Нет номера"
        
        else:
            # Instagram
            platform_icon = "📸"
            platform_name = "Instagram"
            if client_username:
                profile_link = f"https://instagram.com/{client_username}"
            else:
                profile_link = f"https://instagram.com/{instagram_id}"

        # Rating stars
        stars = "⭐" * rating
        
        # Alert Header
        header = f"🚨 <b>НЕГАТИВНЫЙ ОТЗЫВ!</b>"
        
        # Formatted Message
        telegram_message = f"""
{header}

<b>Клиент:</b> {client_name}
<b>Оценка:</b> {stars} ({rating}/5)

<i>"{comment or 'Без комментария'}"</i>

<b>Инфо:</b>
📱 {client_phone}
{platform_icon} <a href="{profile_link}">{platform_name} Профиль</a>

<a href="https://beauty-crm.com/crm/chat?client_id={instagram_id}">👉 ОТВЕТИТЬ В CRM</a>
"""
        
        # 1. Send Telegram Alert
        await send_telegram_alert(telegram_message)
        logger.info(f"✅ Telegram alert sent for negative feedback from {instagram_id}")
        
        # 2. Notify Managers (In-App + Email)
        users = get_all_users()
        managers = [u for u in users if u[4] in ['admin', 'manager', 'director']]
        
        for manager in managers:
            # In-App Notification
            create_notification(
                user_id=str(manager[0]),
                title=f"💔 Плохой отзыв ({rating}/5)",
                message=f"{client_name}: {comment or 'Без комментария'}",
                notification_type="urgent",
                action_url=f"/crm/chat?client_id={instagram_id}"
            )
            
            # Email Notification
            manager_email = manager[2]
            if manager_email:
                try:
                    await send_email_async(
                        recipients=[manager_email],
                        subject=f"💔 Негативный отзыв от {client_name} ({rating}/5)",
                        message=f"""
                        Получен негативный отзыв!
                        
                        Клиент: {client_name} ({platform_name})
                        Оценка: {rating}/5
                        Комментарий: "{comment}"
                        
                        Телефон: {client_phone}
                        Ссылка: {profile_link}
                        
                        Перейти в CRM: https://beauty-crm.com/crm/chat?client_id={instagram_id}
                        """,
                        html=f"""
                        <h2>💔 Негативный отзыв</h2>
                        <p><strong>Клиент:</strong> {client_name}</p>
                        <p><strong>Оценка:</strong> <span style="color: #ef4444; font-size: 18px;">{stars}</span> ({rating}/5)</p>
                        <div style="background-color: #fff1f2; padding: 15px; border-left: 4px solid #f43f5e; margin: 10px 0;">
                            <i>"{comment or 'Без комментария'}"</i>
                        </div>
                        <p><strong>Контакты:</strong> {client_phone} | <a href="{profile_link}">{platform_name}</a></p>
                        <br>
                        <a href="https://beauty-crm.com/crm/chat?client_id={instagram_id}" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Разрешить ситуацию</a>
                        """
                    )
                    logger.info(f"📧 Feedback email sent to {manager_email}")
                except Exception as e:
                    logger.error(f"❌ Failed to send feedback email: {e}")

    except Exception as e:
        logger.error(f"❌ Failed to send alerts: {e}")
