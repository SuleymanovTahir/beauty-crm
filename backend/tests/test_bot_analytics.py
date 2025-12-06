
import sys
import os
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.bot_analytics import (
    start_bot_session, 
    track_bot_message, 
    end_bot_session,
    get_bot_analytics_summary,
    track_referral
)

def test_bot_analytics_flow():
    """Тест полного цикла аналитики бота"""
    print("\n🧪 Тест: test_bot_analytics_flow")
    
    instagram_id = "test_analytics_user"
    
    # Создаем тестового клиента чтобы не было ошибки FK
    from db.connection import get_db_connection
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("INSERT INTO clients (instagram_id, name) VALUES (%s, 'Test User') ON CONFLICT DO NOTHING", (instagram_id,))
        conn.commit()
    finally:
        conn.close()
    
    # 1. Start session
    session_id = start_bot_session(instagram_id, "ru")
    assert session_id is not None
    print("✅ Сессия создана")
    
    # 2. Track messages
    track_bot_message(instagram_id)
    track_bot_message(instagram_id)
    print("✅ Сообщения учтены")
    
    # 3. End session
    end_bot_session(instagram_id, "booking_created", booking_id=123)
    print("✅ Сессия завершена успешно")
    
    # 4. Check stats
    stats = get_bot_analytics_summary(days=1)
    # Note: stats might aggregate all tests runs, so we just check keys exist
    assert 'total_sessions' in stats
    assert 'bookings_created' in stats
    assert 'avg_messages_per_session' in stats
    print("✅ Статистика получена")

def test_referral_tracking():
    """Тест трекинга рефералов"""
    print("\n🧪 Тест: test_referral_tracking")
    
    referrer = "referrer_user"
    referred = "referred_user"
    
    # Создаем тестовых клиентов
    from db.connection import get_db_connection
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("INSERT INTO clients (instagram_id, name) VALUES (%s, 'Referrer') ON CONFLICT DO NOTHING", (referrer,))
        c.execute("INSERT INTO clients (instagram_id, name) VALUES (%s, 'Referred') ON CONFLICT DO NOTHING", (referred,))
        conn.commit()
    finally:
        conn.close()
    
    track_referral(referrer, referred)
    print("✅ Реферал записан")
    
    # Проверка (нужно добавить функцию чтения рефералов в db/bot_analytics.py если хотим проверить)
    # Но пока просто проверяем что не упало

    print("\n🎉 Все тесты аналитики пройдены!")

def cleanup_analytics_test_data():
    """Очистка тестовых данных после тестов аналитики"""
    print("\n🧹 Очистка тестовых данных аналитики...")
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        c = conn.cursor()
        
        test_ids = ['referrer_user', 'referred_user', 'test_analytics_user', 'test_user_123']
        
        # 1. Clean dependent tables
        placeholders = ','.join(['%s'] * len(test_ids))
        
        # client_referrals
        c.execute(f"DELETE FROM client_referrals WHERE referrer_id IN ({placeholders}) OR referred_id IN ({placeholders})", test_ids + test_ids)
        
        # bot_analytics
        c.execute(f"DELETE FROM bot_analytics WHERE instagram_id IN ({placeholders})", test_ids)
        
        # conversation_context
        c.execute(f"DELETE FROM conversation_context WHERE client_id IN ({placeholders})", test_ids)

        # 2. Clean clients
        c.execute(f"DELETE FROM clients WHERE instagram_id IN ({placeholders})", test_ids)
        
        if c.rowcount > 0:
            print(f"✅ Удалено {c.rowcount} тестовых записей")
            
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ Ошибка очистки: {e}")

if __name__ == "__main__":
    try:
        test_bot_analytics_flow()
        test_referral_tracking()
        print("\n🎉 Все тесты аналитики пройдены!")
    finally:
        cleanup_analytics_test_data()
