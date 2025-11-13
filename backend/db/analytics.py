"""
Функции для аналитики
"""
import sqlite3
from datetime import datetime, timedelta

from core.config import DATABASE_NAME


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


def get_advanced_analytics_data(period=30, date_from=None, date_to=None):
    """Получить расширенную аналитику"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Определяем период
    if date_from and date_to:
        start_date = date_from
        end_date = date_to
    else:
        end_date = datetime.now().isoformat()
        start_date = (datetime.now() - timedelta(days=period)).isoformat()
    
    # Активность клиентов по дням
    c.execute("""
        SELECT DATE(created_at) as date, COUNT(DISTINCT instagram_id) as unique_clients
        FROM messages 
        WHERE created_at >= ? AND created_at <= ?
        GROUP BY DATE(created_at)
        ORDER BY date
    """, (start_date, end_date))
    daily_activity = c.fetchall()
    
    # Топ клиентов по активности
    c.execute("""
        SELECT c.instagram_id, c.username, c.name, COUNT(m.id) as message_count,
               c.total_messages, c.lifetime_value
        FROM clients c
        LEFT JOIN messages m ON c.instagram_id = m.instagram_id 
            AND m.created_at >= ? AND m.created_at <= ?
        GROUP BY c.instagram_id
        HAVING message_count > 0
        ORDER BY message_count DESC
        LIMIT 10
    """, (start_date, end_date))
    top_active_clients = c.fetchall()
    
    # Распределение сообщений по времени суток
    c.execute("""
        SELECT strftime('%H', created_at) as hour, COUNT(*) as count
        FROM messages 
        WHERE created_at >= ? AND created_at <= ?
        GROUP BY strftime('%H', created_at)
        ORDER BY hour
    """, (start_date, end_date))
    hourly_distribution = c.fetchall()
    
    # Статистика по типам сообщений
    c.execute("""
        SELECT message_type, COUNT(*) as count
        FROM messages 
        WHERE created_at >= ? AND created_at <= ?
        GROUP BY message_type
    """, (start_date, end_date))
    message_types = c.fetchall()
    
    # Средняя длина сообщений
    c.execute("""
        SELECT AVG(LENGTH(message_text)) as avg_length
        FROM messages 
        WHERE created_at >= ? AND created_at <= ? 
        AND message_text IS NOT NULL
    """, (start_date, end_date))
    avg_message_length = c.fetchone()[0] or 0
    
    # Конверсия по источникам (если есть данные)
    c.execute("""
        SELECT 
            CASE 
                WHEN username LIKE '%instagram%' OR username LIKE '%ig%' THEN 'Instagram'
                WHEN username LIKE '%whatsapp%' OR username LIKE '%wa%' THEN 'WhatsApp'
                ELSE 'Other'
            END as source,
            COUNT(*) as total_clients,
            COUNT(CASE WHEN total_messages > 0 THEN 1 END) as engaged_clients
        FROM clients
        GROUP BY source
    """)
    source_conversion = c.fetchall()
    
    conn.close()
    
    return {
        "daily_activity": [{"date": d[0], "clients": d[1]} for d in daily_activity],
        "top_active_clients": [
            {
                "instagram_id": c[0],
                "username": c[1],
                "name": c[2],
                "message_count": c[3],
                "total_messages": c[4],
                "lifetime_value": c[5]
            } for c in top_active_clients
        ],
        "hourly_distribution": [{"hour": int(h[0]), "count": h[1]} for h in hourly_distribution],
        "message_types": [{"type": t[0] or "text", "count": t[1]} for t in message_types],
        "avg_message_length": round(avg_message_length, 2),
        "source_conversion": [
            {
                "source": s[0],
                "total_clients": s[1],
                "engaged_clients": s[2],
                "conversion_rate": round((s[2] / s[1] * 100) if s[1] > 0 else 0, 2)
            } for s in source_conversion
        ]
    }


def get_client_insights_data(client_id):
    """Получить инсайты по конкретному клиенту"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Основная информация о клиенте
    c.execute("""
        SELECT instagram_id, username, name, phone, status, 
               total_messages, lifetime_value, first_contact, last_contact
        FROM clients WHERE instagram_id = ?
    """, (client_id,))
    client_info = c.fetchone()
    
    if not client_info:
        conn.close()
        return {"error": "Client not found"}
    
    # История сообщений
    c.execute("""
        SELECT message_text, sender, message_type, created_at
        FROM messages 
        WHERE instagram_id = ?
        ORDER BY created_at DESC
        LIMIT 50
    """, (client_id,))
    message_history = c.fetchall()
    
    # Статистика активности
    c.execute("""
        SELECT 
            COUNT(*) as total_messages,
            COUNT(CASE WHEN sender = 'client' THEN 1 END) as client_messages,
            COUNT(CASE WHEN sender = 'bot' THEN 1 END) as bot_messages,
            COUNT(CASE WHEN sender = 'manager' THEN 1 END) as manager_messages,
            MIN(created_at) as first_message,
            MAX(created_at) as last_message
        FROM messages 
        WHERE instagram_id = ?
    """, (client_id,))
    activity_stats = c.fetchone()
    
    # Записи клиента
    c.execute("""
        SELECT id, service_name, datetime, status, revenue
        FROM bookings 
        WHERE instagram_id = ?
        ORDER BY datetime DESC
    """, (client_id,))
    bookings = c.fetchall()
    
    # Анализ времени ответа (если есть данные)
    c.execute("""
        SELECT 
            AVG(CASE 
                WHEN sender = 'client' AND LAG(sender) OVER (ORDER BY created_at) = 'bot' 
                THEN julianday(created_at) - julianday(LAG(created_at) OVER (ORDER BY created_at))
                END) * 24 * 60 as avg_response_time_minutes
        FROM messages 
        WHERE instagram_id = ?
    """, (client_id,))
    response_time = c.fetchone()[0]
    
    conn.close()
    
    return {
        "client_info": {
            "instagram_id": client_info[0],
            "username": client_info[1],
            "name": client_info[2],
            "phone": client_info[3],
            "status": client_info[4],
            "total_messages": client_info[5],
            "lifetime_value": client_info[6],
            "first_contact": client_info[7],
            "last_contact": client_info[8]
        },
        "message_history": [
            {
                "text": m[0],
                "sender": m[1],
                "type": m[2],
                "created_at": m[3]
            } for m in message_history
        ],
        "activity_stats": {
            "total_messages": activity_stats[0],
            "client_messages": activity_stats[1],
            "bot_messages": activity_stats[2],
            "manager_messages": activity_stats[3],
            "first_message": activity_stats[4],
            "last_message": activity_stats[5],
            "avg_response_time_minutes": round(response_time, 2) if response_time else None
        },
        "bookings": [
            {
                "id": b[0],
                "service": b[1],
                "datetime": b[2],
                "status": b[3],
                "revenue": b[4]
            } for b in bookings
        ]
    }


def get_performance_metrics_data(period=30):
    """Получить метрики производительности"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    end_date = datetime.now().isoformat()
    start_date = (datetime.now() - timedelta(days=period)).isoformat()
    
    # Общие метрики
    c.execute("SELECT COUNT(*) FROM clients")
    total_clients = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM messages WHERE created_at >= ?", (start_date,))
    total_messages = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings WHERE created_at >= ?", (start_date,))
    total_bookings = c.fetchone()[0]
    
    # Метрики вовлеченности
    c.execute("""
        SELECT COUNT(DISTINCT instagram_id) 
        FROM messages 
        WHERE created_at >= ? AND sender = 'client'
    """, (start_date,))
    active_clients = c.fetchone()[0]
    
    c.execute("""
        SELECT AVG(message_count) 
        FROM (
            SELECT instagram_id, COUNT(*) as message_count
            FROM messages 
            WHERE created_at >= ? AND sender = 'client'
            GROUP BY instagram_id
        )
    """, (start_date,))
    avg_messages_per_client = c.fetchone()[0] or 0
    
    # Конверсия
    c.execute("""
        SELECT COUNT(DISTINCT instagram_id) 
        FROM bookings 
        WHERE created_at >= ?
    """, (start_date,))
    clients_with_bookings = c.fetchone()[0]
    
    conversion_rate = (clients_with_bookings / active_clients * 100) if active_clients > 0 else 0
    
    # Доходность
    c.execute("""
        SELECT SUM(revenue) 
        FROM bookings 
        WHERE created_at >= ? AND status = 'completed'
    """, (start_date,))
    total_revenue = c.fetchone()[0] or 0
    
    avg_revenue_per_client = total_revenue / active_clients if active_clients > 0 else 0
    
    # Время ответа (приблизительно)
    c.execute("""
        SELECT AVG(
            julianday(created_at) - julianday(LAG(created_at) OVER (ORDER BY created_at))
        ) * 24 * 60
        FROM messages 
        WHERE created_at >= ? AND sender = 'bot'
    """, (start_date,))
    avg_response_time = c.fetchone()[0]
    
    conn.close()
    
    return {
        "total_clients": total_clients,
        "total_messages": total_messages,
        "total_bookings": total_bookings,
        "active_clients": active_clients,
        "avg_messages_per_client": round(avg_messages_per_client, 2),
        "conversion_rate": round(conversion_rate, 2),
        "total_revenue": total_revenue,
        "avg_revenue_per_client": round(avg_revenue_per_client, 2),
        "avg_response_time_minutes": round(avg_response_time, 2) if avg_response_time else None
    }