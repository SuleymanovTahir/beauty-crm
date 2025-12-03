"""
Функции для работы с историей клиентов
"""
from datetime import datetime, timedelta
from db.connection import get_db_connection


def get_client_history(instagram_id: str, limit: int = 10):
    """Получить историю записей клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT service_name, datetime, status, master, revenue
            FROM bookings
            WHERE instagram_id = %s
            ORDER BY datetime DESC
            LIMIT %s
        """, (instagram_id, limit))
        
        history = c.fetchall()
        return [
            {
                "service": row[0],
                "datetime": row[1],
                "status": row[2],
                "master": row[3],
                "revenue": row[4]
            }
            for row in history
        ]
    finally:
        conn.close()


def get_client_stats(instagram_id: str):
    """Получить статистику клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Первый визит
        c.execute("""
            SELECT MIN(datetime), COUNT(*), SUM(revenue)
            FROM bookings
            WHERE instagram_id = %s AND status != 'cancelled'
        """, (instagram_id,))
        
        row = c.fetchone()
        first_visit = row[0] if row[0] else None
        total_visits = row[1] if row[1] else 0
        total_spent = row[2] if row[2] else 0
        
        # Последняя услуга
        c.execute("""
            SELECT service_name, datetime, master
            FROM bookings
            WHERE instagram_id = %s AND status != 'cancelled'
            ORDER BY datetime DESC
            LIMIT 1
        """, (instagram_id,))
        
        last_booking = c.fetchone()
        last_service = last_booking[0] if last_booking else None
        last_visit_date = last_booking[1] if last_booking else None
        last_master = last_booking[2] if last_booking else None
        
        # Вычисляем tenure (сколько дней с первого визита)
        tenure_days = 0
        if first_visit:
            try:
                first_dt = datetime.fromisoformat(first_visit.replace('T', ' ').split('.')[0])
                tenure_days = (datetime.now() - first_dt).days
            except:
                pass
        
        # Проверяем давность последнего визита
        days_since_last_visit = None
        if last_visit_date:
            try:
                last_dt = datetime.fromisoformat(last_visit_date.replace('T', ' ').split('.')[0])
                days_since_last_visit = (datetime.now() - last_dt).days
            except:
                pass
        
        return {
            "first_visit": first_visit,
            "total_visits": total_visits,
            "total_spent": total_spent,
            "last_service": last_service,
            "last_visit_date": last_visit_date,
            "last_master": last_master,
            "tenure_days": tenure_days,
            "days_since_last_visit": days_since_last_visit,
            "is_returning": total_visits > 0,
            "is_vip": total_visits >= 5 or total_spent >= 5000
        }
    finally:
        conn.close()


def get_recommended_services(instagram_id: str):
    """Получить рекомендации на основе истории"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получаем услуги которые клиент уже делал
        c.execute("""
            SELECT DISTINCT service_name
            FROM bookings
            WHERE instagram_id = %s AND status != 'cancelled'
        """, (instagram_id,))
        
        past_services = [row[0] for row in c.fetchall()]
        
        # Простая логика рекомендаций
        recommendations = []
        
        if "Маникюр" in past_services and "Педикюр" not in past_services:
            recommendations.append("Педикюр")
        
        if "Педикюр" in past_services and "Маникюр" not in past_services:
            recommendations.append("Маникюр")
        
        if any("волос" in s.lower() for s in past_services):
            if not any("кератин" in s.lower() for s in past_services):
                recommendations.append("Кератиновое выпрямление")
        
        return recommendations
    finally:
        conn.close()


def should_send_retention_reminder(instagram_id: str, service_type: str = "Маникюр"):
    """Проверить нужно ли отправить напоминание о повторном визите"""
    stats = get_client_stats(instagram_id)
    
    # Если клиент был, но давно не приходил
    if stats["days_since_last_visit"] and stats["last_service"]:
        # Для маникюра/педикюра - напоминание через 3 недели
        if "маникюр" in stats["last_service"].lower() or "педикюр" in stats["last_service"].lower():
            return stats["days_since_last_visit"] >= 21
        
        # Для волос - напоминание через 6 недель
        if "волос" in stats["last_service"].lower() or "кератин" in stats["last_service"].lower():
            return stats["days_since_last_visit"] >= 42
    
    return False
