"""
Database модуль - функции для работы с SQLite
"""
# Инициализация
from .init import init_database

# Клиенты
from .clients import (
    get_all_clients,
    get_client_by_id,
    get_or_create_client,
    update_client_info,
    update_client_status,
    pin_client,
    delete_client,
    detect_and_save_language,
    get_client_bot_mode, 
    update_client_bot_mode,
    get_client_language,
    update_client,
)

# Записи
from .bookings import (
    get_all_bookings,
    save_booking,
    update_booking_status,
    get_booking_progress,
    update_booking_progress,
    clear_booking_progress
)

# Услуги
from .services import (
    get_all_services,
    get_service_by_key,
    create_service,
    update_service,
    delete_service,
    get_all_special_packages,
    get_special_package_by_id,
    find_special_package_by_keywords,
    create_special_package,
    update_special_package,
    delete_special_package,
    increment_package_usage
)

# Пользователи
from .users import (
    get_all_users,
    create_user,
    verify_user,
    delete_user,
    get_user_by_email,
    get_user_by_session,
    create_session,
    delete_session,
    create_password_reset_token,
    verify_reset_token,
    mark_reset_token_used,
    reset_user_password,
    log_activity
)

# Настройки
from .settings import (
    get_salon_settings,
    update_salon_settings,
    get_bot_settings,
    update_bot_settings,
    get_custom_statuses,
    create_custom_status,
    delete_custom_status,
    update_custom_status,
    get_all_roles,
    create_custom_role,
    delete_custom_role,
    get_role_permissions,
    update_role_permissions,
    check_user_permission,
    AVAILABLE_PERMISSIONS,
    update_bot_globally_enabled,
)

# Сообщения
from .messages import (
    save_message,
    get_chat_history,
    mark_messages_as_read,
    get_unread_messages_count,
    get_all_messages
)

# Аналитика
from .analytics import (
    get_stats,
    get_analytics_data,
    get_funnel_data
)

__all__ = [
    # Init
    "init_database",
    
    # Clients
    "get_all_clients",
    "get_client_by_id",
    "get_or_create_client",
    "update_client_info",
    "update_client_status",
    "pin_client",
    "delete_client",
    "detect_and_save_language",
    "get_client_language",
    
    # Bookings
    "get_all_bookings",
    "save_booking",
    "update_booking_status",
    "get_booking_progress",
    "update_booking_progress",
    "clear_booking_progress",
    'get_last_service_date',
    
    # Services
    "get_all_services",
    "get_service_by_key",
    "create_service",
    "update_service",
    "delete_service",
    "get_all_special_packages",
    "get_special_package_by_id",
    "find_special_package_by_keywords",
    "create_special_package",
    "update_special_package",
    "delete_special_package",
    "increment_package_usage",
    
    # Users
    "get_all_users",
    "create_user",
    "verify_user",
    "delete_user",
    "get_user_by_email",
    "get_user_by_session",
    "create_session",
    "delete_session",
    "create_password_reset_token",
    "verify_reset_token",
    "mark_reset_token_used",
    "reset_user_password",
    "log_activity",
    
    # Settings
    "get_salon_settings",
    "update_salon_settings",
    "get_bot_settings",
    "update_bot_settings",
    "get_custom_statuses",
    "create_custom_status",
    "delete_custom_status",
    "update_custom_status",
    "get_all_roles",
    "create_custom_role",
    "delete_custom_role",
    "get_role_permissions",
    "update_role_permissions",
    "check_user_permission",
    "AVAILABLE_PERMISSIONS",
    
    # Messages
    "save_message",
    "get_chat_history",
    "mark_messages_as_read",
    "get_unread_messages_count",
    "get_all_messages",
    
    # Analytics
    "get_stats",
    "get_analytics_data",
    "get_funnel_data",
]