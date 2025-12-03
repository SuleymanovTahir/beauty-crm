"""
Сервис для сбора и анализа отзывов
"""
import sqlite3
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
            WHERE instagram_id = ? AND status = 'completed'
            ORDER BY datetime DESC LIMIT 1
        """, (instagram_id,))
        
        booking = c.fetchone()
        booking_id = booking[0] if booking else None
        
        c.execute("""
            INSERT INTO ratings (booking_id, instagram_id, rating, comment, created_at)
            VALUES (?, ?, ?, ?, ?)
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
        
        # Получаем информацию о клиенте
        client = get_client_by_id(instagram_id)
        client_name = client.get('name', instagram_id) if client else instagram_id
        
        # Формируем сообщение для менеджера
        alert_message = f"""
🚨 <b>НЕГАТИВНЫЙ ОТЗЫВ!</b>

👤 Клиент: {client_name}
⭐ Оценка: {rating}/5
💬 Комментарий: {comment or 'Без комментария'}

📱 Instagram ID: {instagram_id}

⚠️ Требуется внимание менеджера!
"""
        
        # Отправляем уведомление в Telegram
        await send_telegram_alert(alert_message)
        logger.info(f"✅ Telegram alert sent for negative feedback from {instagram_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to send Telegram alert: {e}")
