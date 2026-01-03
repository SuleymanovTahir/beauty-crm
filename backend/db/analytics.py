"""
Функции для аналитики
"""

from datetime import datetime, timedelta

from db.connection import get_db_connection
from utils.datetime_utils import get_current_time
import psycopg2

def get_stats(comparison_period: str = "7days"):
    """
    Получить общую статистику с индикаторами роста
    
    Args:
        comparison_period: Период сравнения ('7days', '30days', 'month', 'week')
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    # Определяем период сравнения
    if comparison_period == "today":
        days = 1
        context = "за сегодня"
    elif comparison_period == "yesterday":
        days = 1
        context = "за вчера"
    elif comparison_period == "7days":
        days = 7
        context = "за последние 7 дней"
    elif comparison_period == "30days":
        days = 30
        context = "за последние 30 дней"
    elif comparison_period == "month" or comparison_period == "thisMonth":
        days = 30
        context = "за этот месяц"
    elif comparison_period == "lastMonth":
        days = 30
        context = "за прошлый месяц"
    elif comparison_period == "week":
        days = 7
        context = "за неделю"
    else:
        days = 7
        context = "за последние 7 дней"
    
    # Текущая дата и дата начала периода
    current_date = get_current_time()
    period_start = (current_date - timedelta(days=days)).isoformat()
    previous_period_start = (current_date - timedelta(days=days * 2)).isoformat()
    previous_period_end = period_start
    
    # === ТЕКУЩИЙ ПЕРИОД ===
    # Count unique clients who made bookings (not all clients in database)
    c.execute("SELECT COUNT(DISTINCT instagram_id) FROM bookings WHERE instagram_id IS NOT NULL")
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
    except psycopg2.OperationalError:
        total_revenue = 0
    
    try:
        # New clients: unique clients who made their first booking in the current period
        c.execute("""
            SELECT COUNT(DISTINCT instagram_id)
            FROM bookings
            WHERE created_at >= %s
            AND instagram_id NOT IN (
                SELECT DISTINCT instagram_id
                FROM bookings
                WHERE created_at < %s AND instagram_id IS NOT NULL
            )
        """, (period_start, period_start))
        new_clients = c.fetchone()[0]

        # Leads, customers, VIP from clients table (for those who made bookings)
        c.execute("""
            SELECT COUNT(DISTINCT c.instagram_id)
            FROM clients c
            INNER JOIN bookings b ON c.instagram_id = b.instagram_id
            WHERE c.status='lead'
        """)
        leads = c.fetchone()[0]

        c.execute("""
            SELECT COUNT(DISTINCT c.instagram_id)
            FROM clients c
            INNER JOIN bookings b ON c.instagram_id = b.instagram_id
            WHERE c.status='customer'
        """)
        customers = c.fetchone()[0]

        c.execute("""
            SELECT COUNT(DISTINCT c.instagram_id)
            FROM clients c
            INNER JOIN bookings b ON c.instagram_id = b.instagram_id
            WHERE c.status='vip'
        """)
        vip_clients = c.fetchone()[0]

        # Active clients: made a booking in the last 30 days
        active_threshold = (get_current_time() - timedelta(days=30)).isoformat()
        c.execute("SELECT COUNT(DISTINCT instagram_id) FROM bookings WHERE created_at >= %s", (active_threshold,))
        active_clients = c.fetchone()[0]

    except psycopg2.OperationalError:
        new_clients = total_clients
        leads = 0
        customers = 0
        vip_clients = 0
        active_clients = 0
    
    # === ПРЕДЫДУЩИЙ ПЕРИОД (для сравнения) ===
    # Prev new clients: unique clients who made their first booking in previous period
    c.execute("""
        SELECT COUNT(DISTINCT instagram_id)
        FROM bookings
        WHERE created_at >= %s AND created_at < %s
        AND instagram_id NOT IN (
            SELECT DISTINCT instagram_id
            FROM bookings
            WHERE created_at < %s AND instagram_id IS NOT NULL
        )
    """, (previous_period_start, previous_period_end, previous_period_start))
    prev_new_clients = c.fetchone()[0]

    # Prev VIP clients who made bookings
    c.execute("""
        SELECT COUNT(DISTINCT c.instagram_id)
        FROM clients c
        INNER JOIN bookings b ON c.instagram_id = b.instagram_id
        WHERE c.status='vip' AND b.created_at >= %s AND b.created_at < %s
    """, (previous_period_start, previous_period_end))
    prev_vip_clients = c.fetchone()[0]

    # Previous total clients (unique clients who made bookings before current period)
    c.execute("SELECT COUNT(DISTINCT instagram_id) FROM bookings WHERE created_at < %s AND instagram_id IS NOT NULL", (period_start,))
    prev_total_clients = c.fetchone()[0]

    # Prev active clients (bookings in previous window)
    prev_active_threshold_start = (get_current_time() - timedelta(days=60)).isoformat()
    prev_active_threshold_end = (get_current_time() - timedelta(days=30)).isoformat()
    c.execute("SELECT COUNT(DISTINCT instagram_id) FROM bookings WHERE created_at >= %s AND created_at < %s",
              (prev_active_threshold_start, prev_active_threshold_end))
    prev_active_clients = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM bookings 
        WHERE created_at >= %s AND created_at < %s
    """, (previous_period_start, previous_period_end))
    prev_bookings = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM bookings 
        WHERE status='completed' AND created_at >= %s AND created_at < %s
    """, (previous_period_start, previous_period_end))
    prev_completed = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM bookings
        WHERE status='pending'
        AND created_at >= %s AND created_at < %s
    """, (previous_period_start, previous_period_end))
    prev_pending = c.fetchone()[0]
    
    try:
        c.execute("""
            SELECT SUM(revenue) FROM bookings
            WHERE status='completed' AND created_at >= %s AND created_at < %s
        """, (previous_period_start, previous_period_end))
        prev_revenue = c.fetchone()[0] or 0

        # Average booking value for previous period
        c.execute("""
            SELECT COALESCE(AVG(revenue), 0)
            FROM bookings
            WHERE status='completed' AND created_at >= %s AND created_at < %s AND revenue > 0
        """, (previous_period_start, previous_period_end))
        prev_avg_booking_value = c.fetchone()[0]
    except psycopg2.OperationalError:
        prev_revenue = 0
        prev_avg_booking_value = 0
    
    # === ТЕКУЩИЙ ПЕРИОД (новые данные) ===
    # Current new clients: unique clients who made their first booking in current period
    c.execute("""
        SELECT COUNT(DISTINCT instagram_id)
        FROM bookings
        WHERE created_at >= %s
        AND instagram_id NOT IN (
            SELECT DISTINCT instagram_id
            FROM bookings
            WHERE created_at < %s AND instagram_id IS NOT NULL
        )
    """, (period_start, period_start))
    current_new_clients = c.fetchone()[0]

    # Current VIP clients who made bookings in current period
    c.execute("""
        SELECT COUNT(DISTINCT c.instagram_id)
        FROM clients c
        INNER JOIN bookings b ON c.instagram_id = b.instagram_id
        WHERE c.status='vip' AND b.created_at >= %s
    """, (period_start,))
    current_vip_clients = c.fetchone()[0]

    # Current active clients growth (bookings in current window)
    # Note: This is slightly different from "Total Active Clients" which is a snapshot.
    # For growth, we compare "clients active in this period" vs "clients active in prev period".
    c.execute("SELECT COUNT(DISTINCT instagram_id) FROM bookings WHERE created_at >= %s", (period_start,))
    current_active_clients_growth = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM bookings 
        WHERE created_at >= %s
    """, (period_start,))
    current_bookings = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM bookings 
        WHERE status='completed' AND created_at >= %s
    """, (period_start,))
    current_completed = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM bookings
        WHERE status='pending' AND created_at >= %s
    """, (period_start,))
    current_pending = c.fetchone()[0]
    
    try:
        c.execute("""
            SELECT SUM(revenue) FROM bookings
            WHERE status='completed' AND created_at >= %s
        """, (period_start,))
        current_revenue = c.fetchone()[0] or 0

        # Average booking value for current period
        c.execute("""
            SELECT COALESCE(AVG(revenue), 0)
            FROM bookings
            WHERE status='completed' AND created_at >= %s AND revenue > 0
        """, (period_start,))
        avg_booking_value = c.fetchone()[0]
    except psycopg2.OperationalError:
        current_revenue = 0
        avg_booking_value = 0
    
    conn.close()
    
    # Функция для расчета роста
    def calculate_growth(current, previous):
        if previous == 0:
            if current > 0:
                return 100.0, "up"
            return 0.0, "stable"
        
        growth = ((current - previous) / previous) * 100
        if abs(growth) < 1:
            direction = "stable"
        elif growth > 0:
            direction = "up"
        else:
            direction = "down"
        
        return round(growth, 1), direction
    
    # Расчет показателей роста
    total_clients_growth, total_clients_trend = calculate_growth(total_clients, prev_total_clients)
    new_clients_growth, new_clients_trend = calculate_growth(current_new_clients, prev_new_clients)
    vip_clients_growth, vip_clients_trend = calculate_growth(current_vip_clients, prev_vip_clients)
    active_clients_growth, active_clients_trend = calculate_growth(current_active_clients_growth, prev_active_clients)
    bookings_growth, bookings_trend = calculate_growth(current_bookings, prev_bookings)
    completed_growth, completed_trend = calculate_growth(current_completed, prev_completed)
    pending_growth, pending_trend = calculate_growth(current_pending, prev_pending)
    revenue_growth, revenue_trend = calculate_growth(current_revenue, prev_revenue)
    avg_booking_growth, avg_booking_trend = calculate_growth(avg_booking_value, prev_avg_booking_value)
    
    conversion_rate = (completed_bookings / total_clients * 100) if total_clients > 0 else 0
    
    return {
        "total_clients": total_clients,
        "vip_clients": vip_clients,
        "active_clients": active_clients,
        "total_bookings": total_bookings,
        "completed_bookings": completed_bookings,
        "pending_bookings": pending_bookings,
        "total_client_messages": total_client_messages,
        "total_bot_messages": total_bot_messages,
        "total_revenue": round(total_revenue, 2),
        "avg_booking_value": round(avg_booking_value, 2),
        "new_clients": new_clients,
        "leads": leads,
        "customers": customers,
        "conversion_rate": round(conversion_rate, 2),
        
        # Индикаторы роста
        "growth": {
            "total_clients": {
                "current": total_clients,
                "previous": prev_total_clients,
                "percentage": total_clients_growth,
                "trend": total_clients_trend
            },
            "new_clients": {
                "current": current_new_clients,
                "previous": prev_new_clients,
                "percentage": new_clients_growth,
                "trend": new_clients_trend
            },
            "vip_clients": {
                "current": current_vip_clients,
                "previous": prev_vip_clients,
                "percentage": vip_clients_growth,
                "trend": vip_clients_trend
            },
            "active_clients": {
                "current": current_active_clients_growth,
                "previous": prev_active_clients,
                "percentage": active_clients_growth,
                "trend": active_clients_trend
            },
            "bookings": {
                "current": current_bookings,
                "previous": prev_bookings,
                "percentage": bookings_growth,
                "trend": bookings_trend
            },
            "completed_bookings": {
                "current": current_completed,
                "previous": prev_completed,
                "percentage": completed_growth,
                "trend": completed_trend
            },
            "pending_bookings": {
                "current": current_pending,
                "previous": prev_pending,
                "percentage": pending_growth,
                "trend": pending_trend
            },
            "revenue": {
                "current": round(current_revenue, 2),
                "previous": round(prev_revenue, 2),
                "percentage": revenue_growth,
                "trend": revenue_trend
            },
            "avg_booking_value": {
                "current": round(avg_booking_value, 2),
                "previous": round(prev_avg_booking_value, 2),
                "percentage": avg_booking_growth,
                "trend": avg_booking_trend
            }
        },
        "comparison_context": context
    }

def get_analytics_data(days=30, date_from=None, date_to=None):
    """Получить данные для аналитики с периодом"""
    conn = get_db_connection()
    c = conn.cursor()
    
    if date_from and date_to:
        start_date = date_from
        end_date = date_to
    else:
        start_date = (get_current_time() - timedelta(days=days)).isoformat()
        end_date = get_current_time().isoformat()
    
    # Записи по дням
    c.execute("""SELECT DATE(created_at) as date, COUNT(*) as count
                 FROM bookings 
                 WHERE created_at >= %s AND created_at <= %s
                 GROUP BY DATE(created_at)
                 ORDER BY date""", (start_date, end_date))
    bookings_by_day = c.fetchall()
    
    if not bookings_by_day:
        bookings_by_day = [(get_current_time().strftime('%Y-%m-%d'), 0)]
    
    # Статистика по услугам
    c.execute("""SELECT service_name, COUNT(*) as count, SUM(revenue) as revenue
                 FROM bookings 
                 WHERE created_at >= %s AND created_at <= %s
                 GROUP BY service_name 
                 ORDER BY count DESC""", (start_date, end_date))
    services_stats = c.fetchall()
    
    if not services_stats:
        services_stats = [("Нет данных", 0, 0)]
    
    # Статистика по статусам
    c.execute("""SELECT status, COUNT(*) as count
                 FROM bookings 
                 WHERE created_at >= %s AND created_at <= %s
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
            AND timestamp >= %s
            AND timestamp <= %s
        )
        SELECT 
            AVG(
                EXTRACT(EPOCH FROM (next_timestamp::TIMESTAMP - timestamp::TIMESTAMP)) / 60
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
    conn = get_db_connection()
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
    conn = get_db_connection()
    c = conn.cursor()
    
    # Определяем период
    if date_from and date_to:
        start_date = date_from
        end_date = date_to
    else:
        end_date = get_current_time().isoformat()
        start_date = (get_current_time() - timedelta(days=period)).isoformat()
    
    # Активность клиентов по дням
    c.execute("""
        SELECT DATE(created_at) as date, COUNT(DISTINCT instagram_id) as unique_clients
        FROM messages 
        WHERE created_at >= %s AND created_at <= %s
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
            AND m.created_at >= %s AND m.created_at <= %s
        GROUP BY c.instagram_id
        HAVING message_count > 0
        ORDER BY message_count DESC
        LIMIT 10
    """, (start_date, end_date))
    top_active_clients = c.fetchall()
    
    # Распределение сообщений по времени суток (Postgres compatible)
    c.execute("""
        SELECT EXTRACT(HOUR FROM created_at::TIMESTAMP) as hour, COUNT(*) as count
        FROM messages 
        WHERE created_at >= %s AND created_at <= %s
        GROUP BY EXTRACT(HOUR FROM created_at::TIMESTAMP)
        ORDER BY hour
    """, (start_date, end_date))
    hourly_distribution = c.fetchall()
    
    # Статистика по типам сообщений
    c.execute("""
        SELECT message_type, COUNT(*) as count
        FROM messages 
        WHERE created_at >= %s AND created_at <= %s
        GROUP BY message_type
    """, (start_date, end_date))
    message_types = c.fetchall()
    
    # Средняя длина сообщений
    c.execute("""
        SELECT AVG(LENGTH(message_text)) as avg_length
        FROM messages 
        WHERE created_at >= %s AND created_at <= %s 
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
    conn = get_db_connection()
    c = conn.cursor()
    
    # Основная информация о клиенте
    c.execute("""
        SELECT instagram_id, username, name, phone, status, 
               total_messages, lifetime_value, first_contact, last_contact
        FROM clients WHERE instagram_id = %s
    """, (client_id,))
    client_info = c.fetchone()
    
    if not client_info:
        conn.close()
        return {"error": "Client not found"}
    
    # История сообщений
    c.execute("""
        SELECT message_text, sender, message_type, created_at
        FROM messages 
        WHERE instagram_id = %s
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
        WHERE instagram_id = %s
    """, (client_id,))
    activity_stats = c.fetchone()
    
    # Записи клиента
    c.execute("""
        SELECT id, service_name, datetime, status, revenue
        FROM bookings 
        WHERE instagram_id = %s
        ORDER BY datetime DESC
    """, (client_id,))
    bookings = c.fetchall()
    
    # Анализ времени ответа (если есть данные)
    c.execute("""
        SELECT 
            AVG(CASE 
                WHEN sender = 'client' AND LAG(sender) OVER (ORDER BY created_at) = 'bot' 
                THEN EXTRACT(EPOCH FROM (created_at::TIMESTAMP - LAG(created_at::TIMESTAMP) OVER (ORDER BY created_at))) / 60
                END) as avg_response_time_minutes
        FROM messages 
        WHERE instagram_id = %s
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
    conn = get_db_connection()
    c = conn.cursor()
    
    end_date = get_current_time().isoformat()
    start_date = (get_current_time() - timedelta(days=period)).isoformat()
    
    # Общие метрики
    c.execute("SELECT COUNT(*) FROM clients")
    total_clients = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM messages WHERE created_at >= %s", (start_date,))
    total_messages = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings WHERE created_at >= %s", (start_date,))
    total_bookings = c.fetchone()[0]
    
    # Метрики вовлеченности
    c.execute("""
        SELECT COUNT(DISTINCT instagram_id) 
        FROM messages 
        WHERE created_at >= %s AND sender = 'client'
    """, (start_date,))
    active_clients = c.fetchone()[0]
    
    c.execute("""
        SELECT AVG(message_count) 
        FROM (
            SELECT instagram_id, COUNT(*) as message_count
            FROM messages 
            WHERE created_at >= %s AND sender = 'client'
            GROUP BY instagram_id
        )
    """, (start_date,))
    avg_messages_per_client = c.fetchone()[0] or 0
    
    # Конверсия
    c.execute("""
        SELECT COUNT(DISTINCT instagram_id) 
        FROM bookings 
        WHERE created_at >= %s
    """, (start_date,))
    clients_with_bookings = c.fetchone()[0]
    
    conversion_rate = (clients_with_bookings / active_clients * 100) if active_clients > 0 else 0
    
    # Доходность
    c.execute("""
        SELECT SUM(revenue) 
        FROM bookings 
        WHERE created_at >= %s AND status = 'completed'
    """, (start_date,))
    total_revenue = c.fetchone()[0] or 0
    
    avg_revenue_per_client = total_revenue / active_clients if active_clients > 0 else 0
    
    # Время ответа (приблизительно)
    c.execute("""
        SELECT AVG(
            EXTRACT(EPOCH FROM (created_at::TIMESTAMP - LAG(created_at::TIMESTAMP) OVER (ORDER BY created_at))) / 60
        )
        FROM messages 
        WHERE created_at >= %s AND sender = 'bot'
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