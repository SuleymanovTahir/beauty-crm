"""
Аналитика бота - трекинг эффективности разговоров

Отслеживает:
- Сколько разговоров привели к записи
- Сколько эскалаций к менеджеру  
- Средняя длина диалога
- Языки клиентов
"""

from datetime import datetime
from db.connection import get_db_connection
from utils.logger import log_info, log_error


def start_bot_session(instagram_id: str, language: str = None) -> int:
    """Начать новую сессию разговора с ботом"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем есть ли активная сессия (менее 30 минут назад)
        c.execute("""
            SELECT id FROM bot_analytics 
            WHERE instagram_id = %s 
              AND outcome = 'in_progress'
              AND session_started > NOW() - INTERVAL '30 minutes'
            ORDER BY session_started DESC
            LIMIT 1
        """, (instagram_id,))
        
        existing = c.fetchone()
        if existing:
            # Обновляем счётчик сообщений в существующей сессии
            c.execute("""
                UPDATE bot_analytics 
                SET messages_count = messages_count + 1
                WHERE id = %s
            """, (existing[0],))
            conn.commit()
            return existing[0]
        
        # Создаём новую сессию
        c.execute("""
            INSERT INTO bot_analytics (instagram_id, messages_count, language_detected)
            VALUES (%s, 1, %s)
            RETURNING id
        """, (instagram_id, language))
        
        session_id = c.fetchone()[0]
        conn.commit()
        log_info(f"📊 Started bot session {session_id} for {instagram_id}", "analytics")
        return session_id
        
    except Exception as e:
        log_error(f"Error starting bot session: {e}", "analytics")
        conn.rollback()
        return None
    finally:
        conn.close()


def track_bot_message(instagram_id: str):
    """Увеличить счётчик сообщений в текущей сессии"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            UPDATE bot_analytics 
            SET messages_count = messages_count + 1,
                last_message_at = NOW()
            WHERE instagram_id = %s 
              AND outcome = 'in_progress'
              AND session_started > NOW() - INTERVAL '60 minutes'
        """, (instagram_id,))
        conn.commit()
    except Exception as e:
        log_error(f"Error tracking message: {e}", "analytics")
    finally:
        conn.close()


def end_bot_session(instagram_id: str, outcome: str, booking_id: int = None):
    """
    Завершить сессию бота
    
    Outcomes:
    - booking_created: Создана запись
    - escalated: Передано менеджеру
    - cancelled: Клиент отменил запись
    - abandoned: Клиент ушёл
    - info_provided: Клиент получил информацию
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        update_fields = {
            'booking_created': outcome == 'booking_created',
            'escalated_to_manager': outcome == 'escalated',
            'cancellation_requested': outcome == 'cancelled'
        }
        
        c.execute("""
            UPDATE bot_analytics 
            SET session_ended = NOW(),
                outcome = %s,
                booking_created = %s,
                escalated_to_manager = %s,
                cancellation_requested = %s,
                booking_id = %s
            WHERE instagram_id = %s 
              AND outcome = 'in_progress'
              AND session_started > NOW() - INTERVAL '30 minutes'
        """, (outcome, update_fields['booking_created'], update_fields['escalated_to_manager'],
              update_fields['cancellation_requested'], booking_id, instagram_id))
        
        conn.commit()
        log_info(f"📊 Ended bot session for {instagram_id}: {outcome}", "analytics")
        
    except Exception as e:
        log_error(f"Error ending bot session: {e}", "analytics")
    finally:
        conn.close()


def get_bot_analytics_summary(days: int = 30) -> dict:
    """Получить сводку по эффективности бота за N дней"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Общее количество сессий
        c.execute("""
            SELECT COUNT(*) FROM bot_analytics 
            WHERE session_started > NOW() - INTERVAL '%s days'
        """, (days,))
        total_sessions = c.fetchone()[0]
        
        # Успешные записи
        c.execute("""
            SELECT COUNT(*) FROM bot_analytics 
            WHERE booking_created = TRUE
              AND session_started > NOW() - INTERVAL '%s days'
        """, (days,))
        bookings_created = c.fetchone()[0]
        
        # Эскалации
        c.execute("""
            SELECT COUNT(*) FROM bot_analytics 
            WHERE escalated_to_manager = TRUE
              AND session_started > NOW() - INTERVAL '%s days'
        """, (days,))
        escalations = c.fetchone()[0]
        
        # Среднее кол-во сообщений
        c.execute("""
            SELECT AVG(messages_count) FROM bot_analytics 
            WHERE outcome != 'in_progress'
              AND session_started > NOW() - INTERVAL '%s days'
        """, (days,))
        avg_messages = c.fetchone()[0] or 0
        
        # Распределение по языкам
        c.execute("""
            SELECT language_detected, COUNT(*) FROM bot_analytics
            WHERE session_started > NOW() - INTERVAL '%s days'
              AND language_detected IS NOT NULL
            GROUP BY language_detected
        """, (days,))
        languages = {row[0]: row[1] for row in c.fetchall()}
        
        # Конверсия (% записей от всех сессий)
        conversion_rate = (bookings_created / total_sessions * 100) if total_sessions > 0 else 0
        
        # Популярные часы активности
        c.execute("""
            SELECT EXTRACT(HOUR FROM session_started) as hour, COUNT(*) as cnt
            FROM bot_analytics
            WHERE session_started > NOW() - INTERVAL '%s days'
            GROUP BY hour
            ORDER BY cnt DESC
            LIMIT 5
        """, (days,))
        popular_hours = [{"hour": int(row[0]), "count": row[1]} for row in c.fetchall()]
        
        return {
            'period_days': days,
            'total_sessions': total_sessions,
            'bookings_created': bookings_created,
            'escalations': escalations,
            'avg_messages_per_session': round(avg_messages, 1),
            'conversion_rate': round(conversion_rate, 1),
            'languages': languages,
            'popular_hours': popular_hours
        }
        
    except Exception as e:
        log_error(f"Error getting analytics summary: {e}", "analytics")
        return {}
    finally:
        conn.close()


# === РЕФЕРАЛЫ ===

def track_referral(referrer_id: str, referred_id: str):
    """Записать реферала"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO client_referrals (referrer_id, referred_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
        """, (referrer_id, referred_id))
        conn.commit()
        log_info(f"📊 Referral tracked: {referrer_id} -> {referred_id}", "analytics")
    except Exception as e:
        log_error(f"Error tracking referral: {e}", "analytics")
    finally:
        conn.close()


def get_client_referral_count(instagram_id: str) -> int:
    """Получить количество рефералов клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT COUNT(*) FROM client_referrals 
            WHERE referrer_id = %s
        """, (instagram_id,))
        return c.fetchone()[0]
    except Exception as e:
        log_error(f"Error getting referral count: {e}", "analytics")
        return 0
    finally:
        conn.close()
