"""
Константы и функции для работы с подписками пользователей
"""

# Типы подписок для клиентов
# Frontend will translate these keys via admin/settings.json
CLIENT_SUBSCRIPTION_TYPES = {
    "promotions": {
        "name": "subscription_promotions",
        "description": "subscription_promotions_desc"
    },
    "news": {
        "name": "subscription_news",
        "description": "subscription_news_desc"
    },
    "appointments": {
        "name": "subscription_appointments",
        "description": "subscription_appointments_desc"
    },
    "new_services": {
        "name": "subscription_new_services",
        "description": "subscription_new_services_desc"
    }
}

# Типы подписок для сотрудников
STAFF_SUBSCRIPTION_TYPES = {
    "schedule_changes": {
        "name": "subscription_schedule_changes",
        "description": "subscription_schedule_changes_desc"
    },
    "staff_news": {
        "name": "subscription_staff_news",
        "description": "subscription_staff_news_desc"
    },
    "training": {
        "name": "subscription_training",
        "description": "subscription_training_desc"
    },
    "client_bookings": {
        "name": "subscription_client_bookings",
        "description": "subscription_client_bookings_desc"
    }
}

from db.connection import get_db_connection

def get_subscription_types_for_role(role: str) -> dict:
    """
    Получить типы подписок для определенной роли из БД
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        target_role = 'client' if role not in ['employee', 'manager', 'admin', 'director'] else 'employee'
        
        c.execute("""
            SELECT key, name, description 
            FROM broadcast_subscription_types 
            WHERE (target_role = %s OR target_role = 'all') AND is_active = TRUE
        """, (target_role,))
        
        rows = c.fetchall()
        conn.close()
        
        if not rows:
            # Fallback to constants if DB is empty
            return STAFF_SUBSCRIPTION_TYPES if target_role == 'employee' else CLIENT_SUBSCRIPTION_TYPES
            
        return {row[0]: {"name": row[1], "description": row[2]} for row in rows}
    except Exception:
        # Fallback in case table doesn't exist yet
        return STAFF_SUBSCRIPTION_TYPES if role in ['employee', 'manager', 'admin', 'director'] else CLIENT_SUBSCRIPTION_TYPES

def get_all_subscription_types() -> dict:
    """Получить все типы подписок из БД"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT key, name, description FROM broadcast_subscription_types WHERE is_active = TRUE")
        rows = c.fetchall()
        conn.close()
        
        if not rows:
            return {**CLIENT_SUBSCRIPTION_TYPES, **STAFF_SUBSCRIPTION_TYPES}
            
        return {row[0]: {"name": row[1], "description": row[2]} for row in rows}
    except Exception:
        return {**CLIENT_SUBSCRIPTION_TYPES, **STAFF_SUBSCRIPTION_TYPES}
