"""
Сервис для сбора и анализа отзывов
"""
import sqlite3
from datetime import datetime
from core.config import DATABASE_NAME
import logging

logger = logging.getLogger('crm')

def save_rating(instagram_id: str, rating: int, comment: str = None):
    """Сохранить оценку клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
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
            alert_manager(instagram_id, rating, comment)
            
    except Exception as e:
        logger.error(f"❌ Error saving rating: {e}")
    finally:
        conn.close()

def alert_manager(instagram_id: str, rating: int, comment: str):
    """Уведомить менеджера о плохом отзыве"""
    logger.warning(f"⚠️ NEGATIVE FEEDBACK from {instagram_id}: {rating}/5 - {comment}")
    # TODO: Реализовать отправку в Telegram менеджера
