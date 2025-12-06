"""
Post-Visit Feedback Request - AI Generated Responses
"""
from datetime import datetime, timedelta, time
from db.connection import get_db_connection
from db.settings import get_bot_settings
from bot.ai_responses import generate_ai_response
from services.universal_messenger import send_universal_message
from services.conversation_context import ConversationContext
from utils.logger import log_info, log_error

def _is_night_hours() -> bool:
    """Проверка ночного времени (23:00 - 08:00)"""
    now = datetime.now().time()
    return now >= time(23, 0) or now < time(8, 0)

async def check_visits_for_feedback():
    """Сбор отзывов после визита (через N часов)"""
    
    # ✅ Не отправляем ночью
    if _is_night_hours():
        return
    
    settings = get_bot_settings()
    
    if not settings.get('post_visit_feedback_enabled', True):
        return

    delay_hours = int(settings.get('post_visit_delay') or 24)
    
    # Окно поиска: визиты, завершенные от (сейчас - delay) до (сейчас - delay - 48h)
    check_time_limit_recent = datetime.now() - timedelta(hours=delay_hours) 
    check_time_limit_old = datetime.now() - timedelta(hours=delay_hours + 48)

    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT b.id, b.instagram_id, b.language
            FROM bookings b
            WHERE (b.status = 'confirmed' OR b.status = 'completed')
              AND to_timestamp(b.date || ' ' || b.time, 'YYYY-MM-DD HH24:MI') <= %s
              AND to_timestamp(b.date || ' ' || b.time, 'YYYY-MM-DD HH24:MI') >= %s
              AND (b.feedback_requested IS FALSE OR b.feedback_requested IS NULL)
            LIMIT 20
        """, (check_time_limit_recent, check_time_limit_old))
        
        visits = c.fetchall()
        
        if not visits:
            return
            
        log_info(f"⭐️ Найдено {len(visits)} визитов для сбора отзывов (delay: {delay_hours}h)", "feedback")
        
        custom_message_template = settings.get('post_visit_feedback_message')

        for booking_id, instagram_id, lang in visits:
            lang = lang or 'ru'
            
            # Используем кастомный текст или AI генерацию
            if custom_message_template and len(custom_message_template) > 5:
                text = custom_message_template
            else:
                text = await generate_ai_response('feedback_request', lang)
            
            try:
                await send_universal_message(instagram_id, text)
                
                # Сохраняем контекст, что мы ждем отзыв
                ctx = ConversationContext(instagram_id)
                ctx.save_context(
                    context_type='awaiting_feedback',
                    context_data={'booking_id': booking_id},
                    expires_in_minutes=60 * 24 * 2  # 48 часов
                )
                
                c.execute("UPDATE bookings SET feedback_requested = TRUE WHERE id = %s", (booking_id,))
                conn.commit()
                
                log_info(f"📤 Запрошен отзыв для бронирования {booking_id}", "feedback")
                
            except Exception as e:
                log_error(f"❌ Ошибка запроса отзыва {booking_id}: {e}", "feedback")
                
    except Exception as e:
        log_error(f"❌ Ошибка check_visits_for_feedback: {e}", "feedback")
    finally:
        conn.close()
