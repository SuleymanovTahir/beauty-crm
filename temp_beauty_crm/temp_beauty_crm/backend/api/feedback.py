"""
API Endpoints для отзывов и рейтингов
"""
from fastapi import APIRouter, Request, Cookie, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from utils.utils import require_auth
from utils.logger import log_error, log_info

from core.config import DATABASE_NAME
from db.connection import get_db_connection

router = APIRouter(tags=["Feedback"])

@router.get("/feedback/stats")
async def get_feedback_stats(session_token: Optional[str] = Cookie(None)):
    """Получить статистику отзывов"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Средний рейтинг
        c.execute("SELECT AVG(rating) FROM ratings")
        avg_rating = c.fetchone()[0] or 0
        
        # Всего отзывов
        c.execute("SELECT COUNT(*) FROM ratings")
        total_reviews = c.fetchone()[0]
        
        # Распределение по звездам
        c.execute("SELECT rating, COUNT(*) FROM ratings GROUP BY rating ORDER BY rating DESC")
        distribution = {row[0]: row[1] for row in c.fetchall()}
        
        # Последние отзывы
        c.execute("""
            SELECT r.id, r.rating, r.comment, r.created_at, r.instagram_id, b.service_name
            FROM ratings r
            LEFT JOIN bookings b ON r.booking_id = b.id
            ORDER BY r.created_at DESC
            LIMIT 10
        """)
        
        reviews = [
            {
                "id": row[0],
                "rating": row[1],
                "comment": row[2],
                "date": row[3],
                "client": row[4],
                "service": row[5]
            }
            for row in c.fetchall()
        ]
        
        return {
            "success": True,
            "stats": {
                "average": round(avg_rating, 1),
                "total": total_reviews,
                "distribution": distribution,
                "recent_reviews": reviews
            }
        }
    except Exception as e:
        log_error(f"Error getting feedback stats: {e}", "feedback")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

@router.post("/feedback")
async def submit_feedback(data: dict):
    """Отправить отзыв о визите"""
    try:
        instagram_id = data.get('instagram_id')
        rating = data.get('rating')
        comment = data.get('comment', '')
        
        if not instagram_id or not rating:
            return JSONResponse({"error": "instagram_id and rating are required"}, status_code=400)
        
        if not (1 <= rating <= 5):
            return JSONResponse({"error": "rating must be between 1 and 5"}, status_code=400)
        
        # Сохраняем рейтинг (теперь async)
        await save_rating(instagram_id, rating, comment)
        
        return {
            "success": True,
            "message": "Thank you for your feedback!"
        }
    except Exception as e:
        log_error(f"Error submitting feedback: {e}", "feedback")
        return JSONResponse({"error": str(e)}, status_code=500)
