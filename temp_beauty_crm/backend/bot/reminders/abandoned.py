"""
Abandoned Booking Recovery - AI Generated Responses
"""
import json
from datetime import datetime, timedelta, time
from db.connection import get_db_connection
from db.settings import get_bot_settings
from bot.ai_responses import generate_ai_response
from services.universal_messenger import send_universal_message
from bot.tools import get_available_time_slots
from utils.logger import log_info, log_error

def _is_night_hours() -> bool:
    """Проверка ночного времени (23:00 - 08:00)"""
    now = datetime.now().time()
    return now >= time(23, 0) or now < time(8, 0)

async def check_abandoned_bookings():
    """Проверка и восстановление брошенных записей"""
    
    # ✅ Не отправляем ночью
    if _is_night_hours():
        return
    
    settings = get_bot_settings()
    
    if not settings.get('abandoned_cart_enabled', True):
        return

    delay_minutes = int(settings.get('abandoned_cart_delay') or 30)
    
    # Окно поиска: от delay до delay + 2 часа назад
    check_time_start = datetime.now() - timedelta(minutes=delay_minutes)
    check_time_end = datetime.now() - timedelta(minutes=delay_minutes + 120)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Ищем кандидатов: in_progress, в диапазоне, reminder_sent = FALSE
        c.execute("""
            SELECT id, instagram_id, language_detected, context
            FROM bot_analytics
            WHERE outcome = 'in_progress'
              AND last_message_at <= %s
              AND last_message_at >= %s
              AND (reminder_sent IS FALSE OR reminder_sent IS NULL)
        """, (check_time_start, check_time_end))
        
        candidates = c.fetchall()
        
        if not candidates:
            return 
            
        log_info(f"🔎 Найдено {len(candidates)} брошенных диалогов (delay: {delay_minutes}m)", "reminders")
        
        # Кастомное сообщение из настроек (если есть)
        custom_message_template = settings.get('abandoned_cart_message')
        
        for session_id, instagram_id, lang, context_str in candidates:
            lang = lang or 'ru'
            
            # 1. Пробуем найти слоты на завтра (Smart Feature)
            slots_info = ""
            try:
                context_data = {}
                if context_str:
                    try:
                        context_data = json.loads(context_str)
                    except:
                        pass
                
                service_name = context_data.get('service_name')
                
                if service_name:
                    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
                    available = get_available_time_slots(tomorrow, service_name=service_name)
                    
                    if available:
                        top_slots = [s['time'] for s in available[:3]]
                        slots_info = ", ".join(top_slots)
                        
            except Exception as e:
                log_error(f"⚠️ Ошибка поиска слотов для reminder: {e}", "reminders")

            # 2. Формируем сообщение
            if custom_message_template and len(custom_message_template) > 5:
                text = custom_message_template
                if slots_info:
                    text += f"\n\n📅 На завтра: {slots_info}"
            else:
                # AI генерирует сообщение
                text = await generate_ai_response('abandoned_booking', lang)
                if slots_info:
                    text += f"\n\n📅 {slots_info}"
            
            try:
                # Отправляем через универсальный мессенджер
                await send_universal_message(instagram_id, text)
                
                # Сохраняем в историю
                from db.messages import save_message
                save_message(instagram_id, text, 'bot')
                
                # Обновляем статус и время
                c.execute("""
                    UPDATE bot_analytics 
                    SET reminder_sent = TRUE, 
                        last_message_at = NOW() 
                    WHERE id = %s
                """, (session_id,))
                conn.commit()
                
                log_info(f"📤 Напоминание отправлено {instagram_id}", "reminders")
                
            except Exception as e:
                log_error(f"❌ Ошибка отправки напоминания {instagram_id}: {e}", "reminders")
                
    except Exception as e:
        log_error(f"❌ Ошибка check_abandoned_bookings: {e}", "reminders")
    finally:
        conn.close()
