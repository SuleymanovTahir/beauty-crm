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
        # 1. Summary Stats
        c.execute(f"""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN session_started > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
                AVG(messages_count) as avg_msg,
                COUNT(CASE WHEN booking_created = TRUE THEN 1 END) as bookings,
                COUNT(CASE WHEN escalated_to_manager = TRUE THEN 1 END) as escalations,
                COUNT(CASE WHEN cancellation_requested = TRUE THEN 1 END) as cancellations
            FROM bot_analytics
            WHERE session_started > NOW() - INTERVAL '{days} days'
        """)
        row = c.fetchone()
        
        total_sessions = row[0] or 0
        sessions_last_7d = row[1] or 0
        avg_messages = float(row[2]) if row[2] else 0.0
        bookings_created = row[3] or 0
        escalations = row[4] or 0
        cancellations = row[5] or 0
        
        conversion_rate = (bookings_created / total_sessions * 100) if total_sessions > 0 else 0
        
        # 2. Daily Stats (Chart)
        c.execute(f"""
            SELECT 
                TO_CHAR(session_started, 'YYYY-MM-DD') as date,
                COUNT(*) as sessions,
                COUNT(CASE WHEN booking_created = TRUE THEN 1 END) as bookings
            FROM bot_analytics
            WHERE session_started > NOW() - INTERVAL '{days} days'
            GROUP BY 1
            ORDER BY 1 ASC
        """)
        daily_stats = [
            {"date": r[0], "sessions": r[1], "bookings": r[2]} 
            for r in c.fetchall()
        ]
        
        # 3. Outcomes Distribution (Pie Chart)
        c.execute(f"""
            SELECT outcome, COUNT(*)
            FROM bot_analytics
            WHERE session_started > NOW() - INTERVAL '{days} days'
              AND outcome != 'in_progress'
            GROUP BY outcome
        """)
        outcomes = [{"outcome": r[0], "count": r[1]} for r in c.fetchall()]
        
        # 4. Languages
        c.execute(f"""
            SELECT language_detected, COUNT(*) 
            FROM bot_analytics
            WHERE session_started > NOW() - INTERVAL '{days} days'
              AND language_detected IS NOT NULL
            GROUP BY language_detected
            ORDER BY 2 DESC
        """)
        languages = [{"language": r[0], "count": r[1]} for r in c.fetchall()]
        
        return {
            "summary": {
                "total_sessions": total_sessions,
                "sessions_last_7d": sessions_last_7d,
                "messages_total": int(avg_messages * total_sessions), # Approx
                "messages_avg": round(avg_messages, 1),
                "bookings_created": bookings_created,
                "escalated_to_manager": escalations,
                "cancellations": cancellations,
                "conversion_rate": round(conversion_rate, 1)
            },
            "daily_stats": daily_stats,
            "outcomes": outcomes,
            "languages": languages
        }
        
    except Exception as e:
        log_error(f"Error getting analytics summary: {e}", "analytics")
        return {
            "summary": {
                "total_sessions": 0,
                "sessions_last_7d": 0,
                "messages_total": 0,
                "messages_avg": 0,
                "bookings_created": 0,
                "escalated_to_manager": 0,
                "cancellations": 0,
                "conversion_rate": 0
            },
            "daily_stats": [],
            "outcomes": [],
            "languages": []
        }
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
