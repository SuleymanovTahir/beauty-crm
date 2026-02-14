"""
Feedback Response Handler - AI Generated Responses
"""
import re
from services.conversation_context import ConversationContext
from db.connection import get_db_connection
from bot.ai_responses import generate_ai_response
from db import detect_and_save_language
from services.universal_messenger import send_universal_message
from utils.logger import log_info, log_error
from crm_api.notifications import create_notification
from db.users import get_all_users

async def handle_feedback_response(sender_id: str, message_text: str) -> bool:
    """
    Проверяет, является ли сообщение отзывом на запрос.
    Возвращает True, если сообщение обработано и боту не нужно отвечать.
    """
    ctx = ConversationContext(sender_id)
    if not ctx.has_context('awaiting_feedback'):
        return False
        
    feedback_ctx = ctx.get_context('awaiting_feedback')
    booking_id = feedback_ctx['data'].get('booking_id')
    
    if not booking_id:
        return False
        
    # Пытаемся понять оценку
    rating = None
    try:
        # Ищем цифру 1-5 (отдельное слово)
        match = re.search(r'\b([1-5])\b', message_text)
        if match:
            rating = int(match.group(1))
        # Текстовые оценки
        elif any(w in message_text.lower() for w in ["супер", "класс", "отлично", "great", "perfect", "good", "amazing", "excellent"]):
            rating = 5
        elif any(w in message_text.lower() for w in ["ужас", "плохо", "bad", "terrible", "awful"]):
            rating = 1
    except Exception:
        pass
        
    if rating:
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute("UPDATE bookings SET feedback_rating = %s, feedback_comment = %s WHERE id = %s", 
                       (rating, message_text, booking_id))
            conn.commit()
            
            log_info(f"⭐️ Received feedback {rating} from {sender_id} for booking {booking_id}", "feedback")
            
            # Определяем язык для ответа
            lang = detect_and_save_language(sender_id, message_text)
            
            # AI генерирует благодарность
            thank_you = await generate_ai_response('feedback_thanks', lang)
            await send_universal_message(sender_id, thank_you)
            
            
            # ⚠️ Уведомляем админа если оценка плохая (<= 3)
            if rating <= 3:
                try:
                    users = get_all_users()
                    managers = [u for u in users if u[4] in ['admin', 'manager']]
                    for manager in managers:
                        create_notification(
                            user_id=str(manager[0]),
                            title="⚠️ НИЗКАЯ ОЦЕНКА",
                            message=f"Клиент оставил оценку {rating} к визиту #{booking_id}.\nКомментарий: {message_text}",
                            notification_type="urgent",
                            action_url=f"/admin/bookings"
                        )
                except Exception as e:
                    log_error(f"Failed to notify admins about low rating: {e}", "feedback")
            
            # Очищаем контекст
            ctx.clear_context('awaiting_feedback')
            return True
            
        except Exception as e:
            log_error(f"Error saving feedback: {e}", "feedback")
            return False
        finally:
            conn.close()
            
    return False  # Не похоже на рейтинг
