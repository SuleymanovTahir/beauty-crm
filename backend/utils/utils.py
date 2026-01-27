"""
Вспомогательные функции для CRM системы
Общие утилиты, используемые по всему проекту
"""
import os
import re
import urllib.parse
from typing import Optional
from fastapi import Cookie, HTTPException

from db import get_user_by_session, get_all_clients, get_unread_messages_count, get_global_unread_count

from db.settings import get_custom_statuses
from db.connection import get_db_connection
from core.config import CLIENT_STATUSES
from utils.logger import log_info, log_error, log_debug, log_warning

# ===== ДИРЕКТОРИИ И ФАЙЛЫ =====

from core.config import UPLOAD_DIR, BASE_DIR

def ensure_upload_directories():
    """Создать все необходимые директории для загрузок"""
    directories = [
        os.path.join(UPLOAD_DIR, "images"),
        os.path.join(UPLOAD_DIR, "images", "portfolio"),
        os.path.join(UPLOAD_DIR, "images", "faces"),
        os.path.join(UPLOAD_DIR, "images", "salon"),
        os.path.join(UPLOAD_DIR, "images", "services"),
        os.path.join(UPLOAD_DIR, "files"),
        os.path.join(UPLOAD_DIR, "voice"),
        os.path.join(BASE_DIR, "logs")
    ]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    log_info(f"✅ Созданы директории: {', '.join(directories)}", "startup")

def sanitize_filename(filename: str) -> str:
    """
    Очистить имя файла от опасных символов
    
    Args:
        filename: исходное имя файла
        
    Returns:
        безопасное имя файла
    """
    # Удаляем всё кроме букв, цифр, точек, дефисов и подчёркиваний
    safe_name = re.sub(r'[^\w\s.-]', '', filename)
    # Заменяем пробелы на подчёркивания
    safe_name = safe_name.replace(' ', '_')
    # Ограничиваем длину
    if len(safe_name) > 100:
        name, ext = os.path.splitext(safe_name)
        safe_name = name[:100] + ext
    return safe_name

def sanitize_url(url: str) -> Optional[str]:
    """
    Очистить URL от локальных хостов и привести к относительному пути или BASE_URL

    Args:
        url: Исходный URL

    Returns:
        Санитизированный URL или None
    """
    if not url:
        return None

    # Импортируем внутри чтобы избежать циклических зависимостей
    from core.config import BASE_URL
    import re

    # Шаблон для поиска localhost и 127.0.0.1 с любым портом
    local_pattern = r'https?://(localhost|127\.0\.0\.1)(:\d+)?'

    # Очистка от localhost
    if re.search(local_pattern, url):
        if "localhost" not in BASE_URL and "127.0.0.1" not in BASE_URL:
            url = re.sub(local_pattern, BASE_URL.rstrip('/'), url)
        else:
            url = re.sub(local_pattern, '', url)

    # НЕ кодируем URL - FastAPI StaticFiles работает с исходными именами файлов
    # Кириллица в путях допустима и работает корректно
    return url

def validate_file_upload(file, max_size_mb: int = 10, allowed_extensions: list = None):
    """
    Валидировать загружаемый файл
    
    Args:
        file: объект файла из FastAPI
        max_size_mb: максимальный размер в MB
        allowed_extensions: список разрешённых расширений (без точки)
        
    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    if not file:
        return False, "Файл не найден"
    
    # Проверка расширения
    if allowed_extensions:
        ext = file.filename.split('.')[-1].lower()
        if ext not in allowed_extensions:
            return False, f"Недопустимое расширение. Разрешено: {', '.join(allowed_extensions)}"
    
    return True, None

# ===== АВТОРИЗАЦИЯ =====

def require_auth(session_token: Optional[str] = Cookie(None)):
    """
    Middleware для проверки авторизации
    Используется в API endpoints
    
    Returns:
        dict или None: Данные пользователя или None если не авторизован
    """
    import time
    from utils.logger import log_info
    
    if not session_token:
        return None
    
    auth_start = time.time()
    user = get_user_by_session(session_token)
    auth_duration = (time.time() - auth_start) * 1000
    
    if auth_duration > 500:
        log_info(f"⚠️ [require_auth] Slow auth check: {auth_duration:.2f}ms", "auth")
    
    return user if user else None

# После функции require_auth (строка ~60)

def check_permission(user: dict, permission: str) -> bool:
    """
    Проверить есть ли у пользователя право
    
    Args:
        user: данные пользователя
        permission: ключ права (например 'clients_view')
    
    Returns:
        bool: True если право есть
    """
    from core.config import ROLES
    
    # Директор имеет все права
    if user.get('role') == 'director':
        return True
    
    # Проверяем права роли
    role_data = ROLES.get(user.get('role'), {})
    role_permissions = role_data.get('permissions', [])
    
    if role_permissions == '*':  # все права
        return True
    
    if permission in role_permissions:
        return True
    
    # Проверяем индивидуальные права из БД
    # Проверяем индивидуальные права из БД
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            SELECT granted FROM user_permissions
            WHERE user_id = %s AND permission_key = %s
        """, (user['id'], permission))
        
        result = c.fetchone()
        conn.close()
        
        return bool(result and result[0]) if result else False
    except Exception as e:
        log_error(f"Error checking permission {permission} for user {user.get('id')}: {e}", "utils")
        return False

def require_permission(permission: str):
    """
    Декоратор для проверки прав доступа
    
    Usage:
        @require_permission('clients_view')
        async def get_clients(session_token: str = Cookie(None)):
            ...
    """
    def decorator(func):
        async def wrapper(*args, session_token: Optional[str] = Cookie(None), **kwargs):
            user = require_auth(session_token)
            if not user:
                raise HTTPException(status_code=401, detail="Не авторизован")
            
            if not check_permission(user, permission):
                raise HTTPException(
                    status_code=403, 
                    detail=f"Недостаточно прав. Требуется: {permission}"
                )
            
            return await func(*args, session_token=session_token, **kwargs)
        return wrapper
    return decorator

def get_current_user(session_token: Optional[str] = Cookie(None)):
    """
    Dependency для получения текущего пользователя
    Бросает исключение если не авторизован
    
    Usage:
        @app.get("/api/protected")
        async def protected_route(user = Depends(get_current_user)):
            ...
    
    Returns:
        dict: Данные пользователя
        
    Raises:
        HTTPException: Если не авторизован или сессия истекла
    """
    import time
    from utils.logger import log_info
    
    if not session_token:
        raise HTTPException(
            status_code=401,
            detail="Не авторизован. Пожалуйста, войдите в систему."
        )
    
    auth_start = time.time()
    user = get_user_by_session(session_token)
    auth_duration = (time.time() - auth_start) * 1000
    
    if auth_duration > 500:
        log_info(f"⚠️ [get_current_user] Slow auth check: {auth_duration:.2f}ms", "auth")
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Сессия истекла. Пожалуйста, войдите заново."
        )
    
    return user

def check_role_permission(user: dict, required_role: str) -> bool:
    # ВАЖНО: Для операций CREATE DATABASE нужны права владельца БД или суперюзера
    # На production используем 'ubuntu', на macOS - текущий пользователь
    superuser = os.getenv('POSTGRES_SUPERUSER', 'postgres') # Default to postgres instead of USER
    
    """
    Проверить роль пользователя с учетом иерархии
    
    Args:
        user: Словарь с данными пользователя
        required_role: Требуемая роль ('admin', 'manager', 'employee')
    
    Returns:
        bool: True если роль подходит
    """
    role_hierarchy = {
        'admin': 3,
        'manager': 2,
        'employee': 1
    }
    
    user_level = role_hierarchy.get(user.get('role'), 0)
    required_level = role_hierarchy.get(required_role, 0)
    
    return user_level >= required_level

def require_role(required_role: str):
    """
    Декоратор для проверки роли пользователя
    
    Usage:
        @app.get("/admin-only")
        @require_role("admin")
        async def admin_endpoint(user = Depends(get_current_user)):
            ...
    """
    def decorator(user: dict):
        if not check_role_permission(user, required_role):
            raise HTTPException(
                status_code=403,
                detail=f"Требуется роль: {required_role}"
            )
        return user
    return decorator

# ===== КЛИЕНТЫ =====

def get_client_display_name(client) -> str:
    """
    Форматировать имя клиента для отображения
    Приоритет: name > username > ID
    
    Args:
        client: tuple из БД (id, username, phone, name, ...)
    
    Returns:
        str: Отображаемое имя
    """
    if client[3]:  # name
        return client[3]
    elif client[1]:  # username
        return f"@{client[1]}"
    else:
        return client[0][:15] + "..."

def get_total_unread() -> int:
    """
    Получить общее количество непрочитанных сообщений (оптимизировано)
    """
    return get_global_unread_count()


# ===== СТАТУСЫ =====

def get_all_statuses() -> dict:
    """
    Получить все статусы (базовые + кастомные)
    
    Returns:
        dict: Словарь всех статусов
    """
    statuses = CLIENT_STATUSES.copy()
    for status in get_custom_statuses():
        statuses[status[1]] = {
            "label": status[2],
            "color": status[3],
            "icon": status[4]
        }
    return statuses

# ===== ФОРМАТИРОВАНИЕ =====

def format_phone(phone: str) -> str:
    """
    Форматировать номер телефона
    
    Args:
        phone: номер телефона
        
    Returns:
        str: отформатированный номер
    """
    if not phone:
        return ""
    
    # Убираем всё кроме цифр
    digits = re.sub(r'\D', '', phone)
    
    # Форматируем в зависимости от длины
    if len(digits) == 11:  # российский номер
        return f"+{digits[0]} ({digits[1:4]}) {digits[4:7]}-{digits[7:9]}-{digits[9:]}"
    elif len(digits) == 12:  # международный (UAE и др.)
        return f"+{digits[0:3]} {digits[3:5]} {digits[5:8]} {digits[8:]}"
    else:
        return phone  # возвращаем как есть

def format_currency(amount: float, currency: str = "AED") -> str:
    """
    Форматировать денежную сумму
    
    Args:
        amount: сумма
        currency: валюта (по умолчанию AED)
        
    Returns:
        str: отформатированная строка
    """
    if not amount:
        return f"0 {currency}"
    
    return f"{amount:,.2f} {currency}".replace(",", " ")

def truncate_text(text: str, max_length: int = 50, suffix: str = "...") -> str:
    """
    Обрезать текст до указанной длины
    
    Args:
        text: исходный текст
        max_length: максимальная длина
        suffix: суффикс для обрезанного текста
        
    Returns:
        str: обрезанный текст
    """
    if not text or len(text) <= max_length:
        return text
    
    return text[:max_length].strip() + suffix

# ===== ВАЛИДАЦИЯ =====

def is_valid_email(email: str) -> bool:
    """
    Проверить валидность email
    
    Args:
        email: адрес электронной почты
        
    Returns:
        bool: True если email валиден
    """
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def is_valid_phone(phone: str) -> bool:
    """
    Проверить валидность номера телефона
    
    Args:
        phone: номер телефона
        
    Returns:
        bool: True если номер валиден
    """
    if not phone:
        return False
    # Убираем всё кроме цифр
    digits = re.sub(r'\D', '', phone)
    # Проверяем длину (от 11 до 15 цифр) - теперь минимум 11 для учета кода страны
    return 11 <= len(digits) <= 15

def is_valid_instagram_username(username: str) -> bool:
    """
    Проверить валидность Instagram username
    
    Args:
        username: имя пользователя (без @)
        
    Returns:
        bool: True если username валиден
    """
    if not username:
        return False
    # Instagram username: буквы, цифры, точки, подчёркивания, до 30 символов
    pattern = r'^[a-zA-Z0-9._]{1,30}$'
    return bool(re.match(pattern, username))

def validate_password(password: str, min_length: int = 6) -> tuple:
    """
    Валидировать пароль
    
    Args:
        password: пароль для проверки
        min_length: минимальная длина
        
    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    if not password:
        return False, "Пароль не может быть пустым"
    
    if len(password) < min_length:
        return False, f"Пароль должен быть минимум {min_length} символов"
    
    # Можно добавить дополнительные проверки:
    # - наличие цифр
    # - наличие заглавных букв
    # - наличие спецсимволов
    
    return True, None

def hash_password(password: str) -> str:
    """Хэшировать пароль (PBKDF2 с солью)
    Используем 50000 итераций - баланс между безопасностью и производительностью
    (OWASP рекомендует минимум 10000 итераций)
    """
    import hashlib
    import secrets
    salt = secrets.token_hex(16)
    iterations = 50000  # Снижено с 100000 для производительности
    hash_value = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), iterations).hex()
    return f"pbkdf2:sha256:{iterations}${salt}${hash_value}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Проверить пароль с поддержкой legacy SHA256"""
    import hashlib
    if not stored_hash:
        return False
        
    if stored_hash.startswith("pbkdf2:"):
        try:
            _, algorithm, iterations_salt_hash = stored_hash.split(':')
            iterations, salt, hash_value = iterations_salt_hash.split('$')
            new_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), int(iterations)).hex()
            return new_hash == hash_value
        except Exception:
            return False
    else:
        # Legacy SHA256
        return hashlib.sha256(password.encode()).hexdigest() == stored_hash

# ===== БЕЗОПАСНОСТЬ =====

def escape_html(text: str) -> str:
    """
    Экранировать HTML символы для предотвращения XSS
    
    Args:
        text: исходный текст
        
    Returns:
        str: экранированный текст
    """
    if not text:
        return ""
    
    escape_dict = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    }
    
    for char, escaped in escape_dict.items():
        text = text.replace(char, escaped)
    
    return text

def sanitize_input(text: str, max_length: int = 1000) -> str:
    """
    Очистить пользовательский ввод
    
    Args:
        text: исходный текст
        max_length: максимальная длина
        
    Returns:
        str: очищенный текст
    """
    if not text:
        return ""
    
    # Удаляем лишние пробелы
    text = text.strip()
    
    # Ограничиваем длину
    if len(text) > max_length:
        text = text[:max_length]
    
    # Экранируем HTML
    text = escape_html(text)
    
    return text

# ===== ДЕБАГ И ЛОГИРОВАНИЕ =====

def log_function_call(func_name: str, **kwargs):
    """
    Логировать вызов функции с параметрами
    
    Args:
        func_name: имя функции
        **kwargs: параметры функции
    """
    params = ", ".join([f"{k}={v}" for k, v in kwargs.items()])
    log_debug(f"📞 Вызов: {func_name}({params})", "utils")

def safe_execute(func, *args, default=None, log_errors=True, **kwargs):
    """
    Безопасно выполнить функцию с обработкой ошибок
    
    Args:
        func: функция для выполнения
        *args: аргументы функции
        default: значение по умолчанию при ошибке
        log_errors: логировать ли ошибки
        **kwargs: именованные аргументы
        
    Returns:
        результат функции или default при ошибке
    """
    try:
        return func(*args, **kwargs)
    except Exception as e:
        if log_errors:
            log_error(f"Ошибка в {func.__name__}: {e}", "utils")
        return default

# ===== РАБОТА С ДАТАМИ =====

def format_datetime(dt_string: str, format: str = "%d.%m.%Y %H:%M") -> str:
    """
    Форматировать дату/время
    
    Args:
        dt_string: строка с датой в ISO формате
        format: желаемый формат
        
    Returns:
        str: отформатированная дата
    """
    from datetime import datetime
    try:
        dt = datetime.fromisoformat(dt_string)
        return dt.strftime(format)
    except:
        return dt_string

def get_time_ago(dt_string: str) -> str:
    """
    Получить относительное время ("2 часа назад", "вчера" и т.д.)
    
    Args:
        dt_string: строка с датой в ISO формате
        
    Returns:
        str: относительное время
    """
    from datetime import datetime, timedelta
    
    try:
        dt = datetime.fromisoformat(dt_string)
        now = datetime.now()
        diff = now - dt
        
        if diff < timedelta(minutes=1):
            return "только что"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes} мин. назад"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} ч. назад"
        elif diff < timedelta(days=7):
            days = diff.days
            if days == 1:
                return "вчера"
            return f"{days} дн. назад"
        else:
            return format_datetime(dt_string, "%d.%m.%Y")
    except:
        return dt_string

# ===== ПАГИНАЦИЯ =====

def paginate_list(items: list, page: int = 1, per_page: int = 20):
    """
    Пагинация списка
    
    Args:
        items: список элементов
        page: номер страницы (начиная с 1)
        per_page: элементов на странице
        
    Returns:
        dict: {items, page, per_page, total, pages}
    """
    total = len(items)
    pages = (total + per_page - 1) // per_page  # округление вверх
    
    start = (page - 1) * per_page
    end = start + per_page
    
    return {
        "items": items[start:end],
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": pages,
        "has_prev": page > 1,
        "has_next": page < pages
    }

# ===== СТАТИСТИКА =====

def calculate_percentage(part: float, total: float, decimals: int = 2) -> float:
    """
    Вычислить процент
    
    Args:
        part: часть
        total: целое
        decimals: количество знаков после запятой
        
    Returns:
        float: процент
    """
    if not total or total == 0:
        return 0.0
    return round((part / total) * 100, decimals)

def calculate_growth(current: float, previous: float) -> dict:
    """
    Вычислить рост/падение показателя
    
    Args:
        current: текущее значение
        previous: предыдущее значение
        
    Returns:
        dict: {value, percentage, direction}
    """
    if not previous or previous == 0:
        return {
            "value": current,
            "percentage": 0,
            "direction": "neutral"
        }
    
    change = current - previous
    percentage = (change / previous) * 100
    
    return {
        "value": abs(change),
        "percentage": abs(round(percentage, 2)),
        "direction": "up" if change > 0 else "down" if change < 0 else "neutral"
    }