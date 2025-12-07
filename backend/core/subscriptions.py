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

def get_subscription_types_for_role(role: str) -> dict:
    """
    Получить типы подписок для определенной роли

    Args:
        role: роль пользователя (client, employee, manager, admin, director)

    Returns:
        dict: словарь с типами подписок для данной роли
    """
    if role in ['employee', 'manager', 'admin', 'director']:
        return STAFF_SUBSCRIPTION_TYPES
    else:
        return CLIENT_SUBSCRIPTION_TYPES

def get_all_subscription_types() -> dict:
    """Получить все типы подписок"""
    return {
        **CLIENT_SUBSCRIPTION_TYPES,
        **STAFF_SUBSCRIPTION_TYPES
    }
