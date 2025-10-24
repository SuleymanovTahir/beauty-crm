"""
Функции для аналитики
"""
import sqlite3
from datetime import datetime, timedelta

from config import DATABASE_NAME


def get_stats():
    """Получить общую статистику"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("SELECT COUNT(*) FROM clients")
    total_clients = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings")
    total_bookings = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings WHERE status='completed'")
    completed_bookings = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings WHERE status='pending'")
    pending_bookings = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM chat_history WHERE sender='client'")
    total_client_messages = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM chat_history WHERE sender='bot'")
    total_bot_messages = c.fetchone()[0]
    
    try:
        c.execute("SELECT SUM(revenue) FROM bookings WHERE status='completed'")
        total_revenue = c.fetchone()[0] or 0
    except sqlite3.OperationalError:
        total_revenue = 0
    
    try:
        c.execute("SELECT COUNT(*) FROM clients WHERE status='new'")
        new_clients = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM clients WHERE status='lead'")
        leads = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM clients WHERE status='customer'")
        customers = c.fetchone()[0]
    except sqlite3.OperationalError:
        new_clients = total_clients
        leads = 0
        customers = 0
    
    conn.close()
    
    conversion_rate = (completed_bookings / total_clients * 100) if total_clients > 0 else 0
    
    return {
        "total_clients": total_clients,
        "total_bookings": total_bookings,
        "completed_bookings": completed_bookings,
        "pending_bookings": pending_bookings,
        "total_client_messages": total_client_messages,
        "total_bot_messages": total_bot_messages,
        "total_revenue": round(total_revenue, 2),
        "new_clients": new_clients,
        "leads": leads,
        "customers": customers,
        "conversion_rate": round(conversion_rate, 2)
    }


def get_analytics_data(days=30, date_from=None, date_to=None):
    """Получить данные для аналитики с периодом"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    if date_from and date_to:
        start_date = date_from
        end_date = date_to
    else:
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        end_date = datetime.now().isoformat()
    
    # Записи по дням
    c.execute("""SELECT DATE(created_at) as date, COUNT(*) as count
                 FROM bookings 
                 WHERE created_at >= ? AND created_at <= ?
                 GROUP BY DATE(created_at)
                 ORDER BY date""", (start_date, end_date))
    bookings_by_day = c.fetchall()
    
    if not bookings_by_day:
        bookings_by_day = [(datetime.now().strftime('%Y-%m-%d'), 0)]
    
    # Статистика по услугам
    c.execute("""SELECT service_name, COUNT(*) as count, SUM(revenue) as revenue
                 FROM bookings 
                 WHERE created_at >= ? AND created_at <= ?
                 GROUP BY service_name 
                 ORDER BY count DESC""", (start_date, end_date))
    services_stats = c.fetchall()
    
    if not services_stats:
        services_stats = [("Нет данных", 0, 0)]
    
    # Статистика по статусам
    c.execute("""SELECT status, COUNT(*) as count
                 FROM bookings 
                 WHERE created_at >= ? AND created_at <= ?
                 GROUP BY status""", (start_date, end_date))
    status_stats = c.fetchall()
    
    if not status_stats:
        status_stats = [("pending", 0)]
    
    # Среднее время ответа бота
    c.execute("""
        WITH client_messages AS (
            SELECT 
                id,
                instagram_id,
                timestamp,
                LEAD(timestamp) OVER (PARTITION BY instagram_id ORDER BY timestamp) as next_timestamp,
                LEAD(sender) OVER (PARTITION BY instagram_id ORDER BY timestamp) as next_sender
            FROM chat_history
            WHERE sender = 'client'
            AND timestamp >= ?
            AND timestamp <= ?
        )
        SELECT 
            AVG(
                (julianday(next_timestamp) - julianday(timestamp)) * 24 * 60
            ) as avg_minutes
        FROM client_messages
        WHERE next_sender = 'bot'
        AND next_timestamp IS NOT NULL
    """, (start_date, end_date))
    
    result = c.fetchone()
    conn.close()
    
    avg_response = result[0] if result and result[0] else 0
    
    return {
        "bookings_by_day": bookings_by_day,
        "services_stats": services_stats,
        "status_stats": status_stats,
        "avg_response_time": round(avg_response, 2) if avg_response else 0
    }


def get_funnel_data():
    """Получить данные воронки продаж"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("SELECT COUNT(*) FROM clients")
    total_visitors = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM clients WHERE total_messages > 0")
    engaged = c.fetchone()[0]
    
    c.execute("SELECT COUNT(DISTINCT instagram_id) FROM booking_temp")
    started_booking = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings WHERE status='pending'")
    booked = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings WHERE status='completed'")
    completed = c.fetchone()[0]
    
    conn.close()
    
    total_visitors = max(total_visitors, 1)
    engaged = max(engaged, 1)
    started_booking = max(started_booking, 1)
    booked = max(booked, 1)
    
    return {
        "visitors": total_visitors,
        "engaged": engaged,
        "started_booking": started_booking,
        "booked": booked,
        "completed": completed,
        "conversion_rates": {
            "visitor_to_engaged": round((engaged / total_visitors * 100), 2),
            "engaged_to_booking": round((started_booking / engaged * 100), 2),
            "booking_to_booked": round((booked / started_booking * 100), 2),
            "booked_to_completed": round((completed / booked * 100) if booked > 0 else 0, 2)
        }
    }