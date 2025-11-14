"""
Константы и функции для работы с подписками пользователей
"""

# Типы подписок для клиентов
CLIENT_SUBSCRIPTION_TYPES = {
    "promotions": {
        "name": "Акции и специальные предложения",
        "description": "Получайте уведомления о скидках и специальных предложениях"
    },
    "news": {
        "name": "Новости салона",
        "description": "Будьте в курсе новостей и обновлений салона"
    },
    "appointments": {
        "name": "Напоминания о записях",
        "description": "Получайте напоминания о ваших записях"
    },
    "new_services": {
        "name": "Новые услуги",
        "description": "Узнавайте первыми о новых услугах и процедурах"
    }
}

# Типы подписок для сотрудников
STAFF_SUBSCRIPTION_TYPES = {
    "schedule_changes": {
        "name": "Изменения в расписании",
        "description": "Уведомления об изменениях в вашем рабочем расписании"
    },
    "staff_news": {
        "name": "Новости для персонала",
        "description": "Важные новости и объявления для сотрудников"
    },
    "training": {
        "name": "Обучение и тренинги",
        "description": "Информация о тренингах и возможностях обучения"
    },
    "client_bookings": {
        "name": "Новые записи клиентов",
        "description": "Уведомления о новых записях к вам"
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
