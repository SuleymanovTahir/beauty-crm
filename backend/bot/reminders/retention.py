"""
Client Retention Reminder - AI Generated Responses
"""
from datetime import datetime, timedelta, time
from db.connection import get_db_connection
from db.settings import get_bot_settings
from bot.ai_responses import generate_ai_response
from db.messages import save_message
from services.universal_messenger import send_universal_message
from utils.logger import log_info, log_error

def _is_night_hours() -> bool:
    """Проверка ночного времени (23:00 - 08:00)"""
    now = datetime.now().time()
    return now >= time(23, 0) or now < time(8, 0)

async def check_client_retention():
    """Возвращение клиентов, которые давно не были"""
    
    # ✅ Не отправляем ночью
    if _is_night_hours():
        return
    
    settings = get_bot_settings()
    
    if not settings.get('return_client_reminder_enabled', False):
        return

    delay_days = int(settings.get('return_client_delay') or 45)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Сложный запрос:
        # 1. Находим клиентов с завершенными визитами в нужном диапазоне
        # 2. Исключаем тех, у кого есть будущие записи
        # 3. Исключаем тех, кому уже напоминали недавно
        
        query = """
            SELECT DISTINCT c.id, c.instagram, c.name, c.language
            FROM clients c
            WHERE c.instagram IS NOT NULL AND length(c.instagram) > 1
            -- Условие 1: Был визит в целевом диапазоне
            AND EXISTS (
                SELECT 1 FROM bookings b_past
                WHERE b_past.instagram_id = c.instagram
                AND b_past.status = 'completed'
                -- Используем datetime (TEXT) -> Timestamp -> Date для сравнения
                AND to_timestamp(b_past.datetime, 'YYYY-MM-DD HH24:MI')::date <= CURRENT_DATE - INTERVAL '%s days'
                AND to_timestamp(b_past.datetime, 'YYYY-MM-DD HH24:MI')::date >= CURRENT_DATE - INTERVAL '%s days'
            )
            -- Условие 2: НЕТ будущих записей
            AND NOT EXISTS (
                SELECT 1 FROM bookings b_future
                WHERE b_future.instagram_id = c.instagram
                AND b_future.status IN ('pending', 'confirmed')
                AND to_timestamp(b_future.datetime, 'YYYY-MM-DD HH24:MI')::date >= CURRENT_DATE
            )
            -- Условие 3: Не напоминали в последние 30 дней
            AND (c.last_retention_reminder_at IS NULL OR c.last_retention_reminder_at < NOW() - INTERVAL '30 days')
            LIMIT 10
        """
        
        c.execute(query, (delay_days, delay_days + 60))
        candidates = c.fetchall()
        
        if not candidates:
            return
            
        log_info(f"🔄 Retention: Найдено {len(candidates)} клиентов для возврата (delay: {delay_days}d)", "retention")
        
        custom_message_template = settings.get('return_client_message')
        
        for client_id, instagram_id, name, lang in candidates:
            name = name or "Дорогой клиент"
            lang = lang or 'ru'
            
            # Используем кастомный текст или AI генерацию
            if custom_message_template and len(custom_message_template) > 5:
                text = custom_message_template.replace('{name}', name).replace('{NAME}', name)
            else:
                text = await generate_ai_response('retention_reminder', lang, name=name)
                
            try:
                await send_universal_message(instagram_id, text)
                
                # Обновляем метку времени
                c.execute("UPDATE clients SET last_retention_reminder_at = NOW() WHERE id = %s", (client_id,))
                conn.commit()
                
                log_info(f"📤 Retention: Отправлено приглашение {instagram_id}", "retention")
                
                # Сохраняем в историю сообщений
                save_message(instagram_id, text, 'bot')
                
            except Exception as e:
                log_error(f"❌ Ошибка отправки retention {instagram_id}: {e}", "retention")
                
    except Exception as e:
        log_error(f"❌ Ошибка check_client_retention: {e}", "retention")
    finally:
        conn.close()
