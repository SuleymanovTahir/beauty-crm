"""
API для управления настройками
Settings management API
"""
from fastapi import APIRouter, HTTPException, Request, Cookie, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import shutil
import re
import secrets
import string
from datetime import datetime, timedelta

from core.config import (
    DATABASE_NAME,
    DEFAULT_HOURS_WEEKDAYS,
    DEFAULT_HOURS_WEEKENDS,
    DEFAULT_HOURS_START,
    DEFAULT_HOURS_END,
    DEFAULT_LUNCH_START,
    DEFAULT_LUNCH_END,
    DEFAULT_REPORT_TIME,
    get_default_hours_dict,
    get_default_working_hours_response
)
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from db.settings import get_bot_settings, update_bot_settings, get_salon_settings, update_salon_settings
from services.features import FeatureService
from utils.permissions import require_role, require_permission, RoleHierarchy
import psycopg2

router = APIRouter()

class NotificationSettings(BaseModel):
    """Модель настроек уведомлений"""
    emailNotifications: bool = True
    smsNotifications: bool = False
    bookingNotifications: bool = True
    chatNotifications: bool = True
    dailyReport: bool = True
    reportTime: str = DEFAULT_REPORT_TIME  # ✅ Используем константу

@router.post("/settings/notifications")
async def save_notification_settings(
    settings: NotificationSettings,
    session_token: Optional[str] = Cookie(None)
):
    """
    Сохранить настройки уведомлений для пользователя
    """
    try:
        from utils.utils import require_auth
        user = require_auth(session_token)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        user_id = user['id']

        conn = get_db_connection()
        c = conn.cursor()

        # Проверяем есть ли уже настройки
        c.execute("""
            SELECT id FROM notification_settings
            WHERE user_id =%s
        """, (user_id,))
        existing = c.fetchone()

        if existing:
            # Обновляем существующие настройки
            c.execute("""
                UPDATE notification_settings
                SET
                    email_notifications =%s,
                    sms_notifications =%s,
                    booking_notifications =%s,
                    chat_notifications =%s,
                    daily_report =%s,
                    report_time =%s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id =%s
            """, (
                True if settings.emailNotifications else False,
                True if settings.smsNotifications else False,
                True if settings.bookingNotifications else False,
                True if settings.chatNotifications else False,
                True if settings.dailyReport else False,
                settings.reportTime,
                user_id
            ))
            log_info(f"Notification settings updated for user {user_id}", "settings")
        else:
            # Создаем новые настройки
            c.execute("""
                INSERT INTO notification_settings (
                    user_id,
                    email_notifications,
                    sms_notifications,
                    booking_notifications,
                    chat_notifications,
                    daily_report,
                    report_time
                ) VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (
                user_id,
                True if settings.emailNotifications else False,
                True if settings.smsNotifications else False,
                True if settings.bookingNotifications else False,
                True if settings.chatNotifications else False,
                True if settings.dailyReport else False,
                settings.reportTime
            ))
            log_info(f"Notification settings created for user {user_id}", "settings")

        conn.commit()
        conn.close()

        return {
            "success": True,
            "message": "Настройки сохранены"
        }

    except Exception as e:
        log_error(f"Error saving notification settings: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/settings/notifications")
async def get_notification_settings(
    session_token: Optional[str] = Cookie(None)
):
    """
    Получить настройки уведомлений для пользователя
    """
    try:
        from utils.utils import require_auth
        user = require_auth(session_token)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        user_id = user['id']

        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT
                email_notifications,
                sms_notifications,
                booking_notifications,
                chat_notifications,
                daily_report,
                report_time
            FROM notification_settings
            WHERE user_id =%s
        """, (user_id,))

        result = c.fetchone()
        conn.close()

        if result:
            return {
                "emailNotifications": bool(result[0]),
                "smsNotifications": bool(result[1]),
                "bookingNotifications": bool(result[2]),
                "chatNotifications": bool(result[3]),
                "dailyReport": bool(result[4]),
                "reportTime": result[5]
            }
        else:
            # Возвращаем настройки по умолчанию
            return {
                "emailNotifications": True,
                "smsNotifications": False,
                "bookingNotifications": True,
                "chatNotifications": True,
                "dailyReport": True,
                "reportTime": DEFAULT_REPORT_TIME  # ✅ Используем константу
            }

    except psycopg2.OperationalError:
        # Таблица не существует - возвращаем настройки по умолчанию
        return {
            "emailNotifications": True,
            "smsNotifications": False,
            "bookingNotifications": True,
            "chatNotifications": True,
            "dailyReport": True,
            "reportTime": DEFAULT_REPORT_TIME  # ✅ Используем константу
        }
    except Exception as e:
        log_error(f"Error loading notification settings: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

# ===== BOT SETTINGS =====

@router.get("/bot-settings")
async def get_bot_settings_api(session_token: Optional[str] = Cookie(None)):
    """
    Получить настройки бота (только director, admin, sales)
    """
    from utils.utils import require_auth
    from utils.logger import log_warning
    
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # 🔒 Только director, admin, sales могут видеть настройки бота
    ALLOWED_BOT_SETTINGS_ROLES = ["director", "admin", "sales"]
    
    if user["role"] not in ALLOWED_BOT_SETTINGS_ROLES:
        log_warning(
            f"🔒 SECURITY: {user['role']} {user['username']} attempted to view bot settings", 
            "security"
        )
        raise HTTPException(
            status_code=403,
            detail="Only director, admin, and sales can view bot settings"
        )
    
    try:
        settings = get_bot_settings()
        return settings
    except Exception as e:
        log_error(f"Error loading bot settings: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/settings/bot")
async def update_bot_settings_api(request: Request, session_token: Optional[str] = Cookie(None)):
    """
    Обновить настройки бота (только director, admin, sales)
    """
    from utils.utils import require_auth
    from utils.logger import log_warning
    
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # 🔒 Только director, admin, sales могут изменять настройки бота
    ALLOWED_BOT_SETTINGS_ROLES = ["director", "admin", "sales"]
    
    if user["role"] not in ALLOWED_BOT_SETTINGS_ROLES:
        log_warning(
            f"🔒 SECURITY: {user['role']} {user['username']} attempted to update bot settings", 
            "security"
        )
        raise HTTPException(
            status_code=403,
            detail="Only director, admin, and sales can update bot settings"
        )
    
    try:
        data = await request.json()
        success = update_bot_settings(data)

        if success:
            log_info(f"Bot settings updated by {user['role']} {user['username']}", "settings")
            return {"success": True, "message": "Bot settings updated"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update bot settings")
    except Exception as e:
        log_error(f"Error updating bot settings: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bot-settings/reload")
async def reload_bot():
    """
    Перезагрузить бота (очистить кеш)
    """
    try:
        # Очищаем кеш бота
        from bot import get_bot
        bot = get_bot()

        # Перезагружаем настройки из БД
        bot.reload_settings()

        log_info("Bot settings reloaded successfully", "settings")
        return {"success": True, "message": "Bot reloaded"}
    except Exception as e:
        log_error(f"Error reloading bot: {e}", "settings")
        # Возвращаем success=True даже при ошибке, чтобы не блокировать UI
        return {"success": True, "message": "Settings saved (bot reload skipped)"}

# ===== BACKUP =====

@router.get("/settings/download-backup")
async def download_backup(session_token: Optional[str] = Cookie(None)):
    """
    Скачать резервную копию базы данных
    Доступно только для директоров
    """
    from utils.utils import require_auth
    
    # Проверка авторизации
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Проверка роли - только директора
    if user.get("role") != "director":
        log_error(f"Backup download attempt by non-director user: {user.get('username')}", "settings")
        raise HTTPException(
            status_code=403, 
            detail="Access denied. Only directors can download database backups."
        )
    
    try:
        # Create a backup using pg_dump
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"beauty_crm_backup_{timestamp}.sql"
        # Use absolute path to ensure pg_dump can find it, or use a temp dir
        # Using current directory as it is cleaner for now
        backup_path = os.path.abspath(backup_filename)
        
        # Get DB params from env or config
        from core.config import POSTGRES_CONFIG
        
        db_host = POSTGRES_CONFIG['host']
        db_port = POSTGRES_CONFIG['port']
        db_name = POSTGRES_CONFIG['database']
        db_user = POSTGRES_CONFIG['user']
        db_pass = POSTGRES_CONFIG['password']
        
        import subprocess
        
        # Construct pg_dump command
        # Note: We provide password via environment variable to avoid prompt
        env = os.environ.copy()
        if db_pass:
            env["PGPASSWORD"] = db_pass
            
        cmd = [
            "pg_dump",
            "-h", db_host,
            "-p", str(db_port),
            "-U", db_user,
            "-f", backup_path,
            db_name
        ]
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode != 0:
            log_error(f"pg_dump failed: {result.stderr}", "settings")
            raise Exception(f"Backup failed: {result.stderr}")
            
        return FileResponse(
            path=backup_path,
            filename=backup_filename,
            media_type='application/sql',
            headers={
                "Content-Disposition": f"attachment; filename={backup_filename}"
            }
        )
        
    except Exception as e:
        log_error(f"Error creating backup: {e}", "settings")
        raise HTTPException(status_code=500, detail=f"Failed to create backup: {str(e)}")

# ===== SALON SETTINGS =====

# Simple cache for salon settings (fallback when Redis is unavailable)
_salon_settings_cache = None
_salon_settings_cache_time = None
_salon_settings_cache_ttl = 0  # Disabled for CRM - always fetch fresh data

@router.get("/salon-settings")
async def get_salon_settings_api(session_token: Optional[str] = Cookie(None)):
    """
    Получить настройки салона (публичный доступ для базовой информации)
    """
    from utils.cache import cache
    from utils.utils import require_auth
    import time
    
    # Пытаемся авторизовать пользователя, но не падаем с ошибкой
    user = None
    try:
        user = require_auth(session_token)
    except:
        pass

    cache_key = "salon_settings"
    
    # Try Redis cache first (if available)
    if cache.enabled:
        cached_settings = cache.get(cache_key)
        if cached_settings is not None:
            settings = cached_settings
        else:
            settings = get_salon_settings()
            cache.set(cache_key, settings, expire=300)
    else:
        # Fallback to in-memory cache
        global _salon_settings_cache, _salon_settings_cache_time
        if _salon_settings_cache is not None and (time.time() - _salon_settings_cache_time < _salon_settings_cache_ttl):
            settings = _salon_settings_cache
        else:
            settings = get_salon_settings()
            _salon_settings_cache = settings
            _salon_settings_cache_time = time.time()
    
    # Если пользователь авторизован и имеет права - отдаем всё
    if user and RoleHierarchy.has_permission(user['role'], 'settings_view', user.get('secondary_role')):
        return settings
        
    # Иначе отдаем только публичную информацию (брендинг)
    public_fields = [
        'name', 'logo_url', 'city', 'address', 'phone', 'email', 
        'instagram', 'website', 'currency', 'timezone_offset',
        'hours_weekdays', 'hours_weekends', 'lunch_start', 'lunch_end'
    ]
    
    public_settings = {k: v for k, v in settings.items() if k in public_fields}
    return public_settings

@router.post("/salon-settings")
@require_permission(["settings_edit", "settings_edit_branding", "settings_edit_finance", "settings_edit_integrations", "settings_edit_loyalty", "settings_edit_schedule"])
async def update_salon_settings_api(request: Request, session_token: Optional[str] = Cookie(None)):
    """
    Обновить настройки салона (с гранулярной проверкой прав)
    """
    from utils.cache import cache
    from utils.utils import get_current_user_from_token
    from utils.permissions import check_user_permission
    
    try:
        user = get_current_user_from_token(session_token)
        data = await request.json()
        
        # Если у пользователя есть полные права, обновляем всё
        if check_user_permission(user, "settings_edit"):
             updated_data = data
        else:
            # Иначе фильтруем поля по правам
            updated_data = {}
            
            # Карта полей и необходимых прав
            PERMISSION_FIELD_MAP = {
                'name': 'settings_edit_branding',
                'city': 'settings_edit_branding',
                'address': 'settings_edit_branding',
                'phone': 'settings_edit_branding',
                'email': 'settings_edit_branding',
                'instagram': 'settings_edit_branding', 
                'telegram_manager_chat_id': 'settings_edit_branding',
                
                'currency': 'settings_edit_finance',
                'timezone_offset': 'settings_edit_finance',
                
                'birthday_discount': 'settings_edit_loyalty',
                
                'hours_weekdays': 'settings_edit_schedule',
                'hours_weekends': 'settings_edit_schedule',
                'lunch_start': 'settings_edit_schedule',
                'lunch_end': 'settings_edit_schedule',
            }
            
            for field, value in data.items():
                # Если поле известно и у пользователя есть право
                if field in PERMISSION_FIELD_MAP:
                    required_perm = PERMISSION_FIELD_MAP[field]
                    if check_user_permission(user, required_perm):
                        updated_data[field] = value
                else:
                    # Если поле неизвестно, пропускаем его (безопасность по умолчанию)
                    # Либо можно разрешить, если это какое-то общее поле
                    pass
            
            if not updated_data:
                return {"success": True, "message": "No changes applied due to insufficient permissions"}

        success = update_salon_settings(updated_data)

        if success:
            # Invalidate cache after successful update
            cache_key = "salon_settings"
            global _salon_settings_cache, _salon_settings_cache_time
            _salon_settings_cache = None
            _salon_settings_cache_time = None
            if cache.enabled:
                cache.delete(cache_key)
            
            log_info(f"Salon settings updated by {user['username']}", "settings")
            return {"success": True, "message": "Salon settings updated"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update salon settings")
    except Exception as e:
        log_error(f"Error updating salon settings: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/salon-settings/working-hours")
async def get_salon_working_hours():
    """Получить рабочие часы салона из настроек"""
    try:
        from db import get_salon_settings
        salon = get_salon_settings()
        
        # Парсим часы работы
        hours_weekdays = salon.get('hours_weekdays', DEFAULT_HOURS_WEEKDAYS)  # ✅ Используем константу
        hours_weekends = salon.get('hours_weekends', DEFAULT_HOURS_WEEKENDS)  # ✅ Используем константу
        lunch_start = salon.get('lunch_start')
        lunch_end = salon.get('lunch_end')
        
        # Парсим время начала и конца
        def parse_hours(hours_str):
            parts = hours_str.split('-')
            if len(parts) == 2:
                start = parts[0].strip()
                end = parts[1].strip()
                return {
                    "start": start,
                    "end": end,
                    "start_hour": int(start.split(':')[0]),
                    "end_hour": int(end.split(':')[0])
                }
            return get_default_hours_dict()  # ✅ Используем функцию
        
        return {
            "weekdays": parse_hours(hours_weekdays),
            "weekends": parse_hours(hours_weekends),
            "lunch": {
                "start": lunch_start,
                "end": lunch_end
            }
        }
    except Exception as e:
        log_error(f"Error getting salon working hours: {e}", "settings")
        # Fallback
        return get_default_working_hours_response()  # ✅ Используем функцию

        return get_default_working_hours_response()  # ✅ Используем функцию

# ===== CURRENCY MANAGEMENT =====

@router.get("/settings/currencies")
async def get_currencies():
    """Получить список всех доступных валют"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT code, name, symbol, is_active FROM currencies ORDER BY code")
        currencies = []
        for row in c.fetchall():
            currencies.append({
                "code": row[0],
                "name": row[1],
                "symbol": row[2],
                "is_active": row[3]
            })
        conn.close()
        return {"currencies": currencies}
    except Exception as e:
        log_error(f"Error loading currencies: {e}", "settings")
        # Return default if table doesn't exist yet (though migration should have run)
        return {"currencies": [
            {"code": "AED", "name": "UAE Dirham", "symbol": "AED", "is_active": True},
            {"code": "USD", "name": "US Dollar", "symbol": "$", "is_active": True},
            {"code": "RUB", "name": "Russian Ruble", "symbol": "₽", "is_active": True},
            {"code": "EUR", "name": "Euro", "symbol": "€", "is_active": True},
            {"code": "KZT", "name": "Kazakhstani Tenge", "symbol": "₸", "is_active": True}
        ]}

@router.post("/settings/currencies")
@require_permission("settings_edit_finance")
async def add_currency(request: Request, session_token: Optional[str] = Cookie(None)):
    """Добавить новую валюту"""
    try:
        data = await request.json()
        code = data.get('code', '').upper()
        name = data.get('name', '')
        symbol = data.get('symbol', '')

        if not code or not name or not symbol:
            raise HTTPException(status_code=400, detail="Missing required fields")

        conn = get_db_connection()
        c = conn.cursor()
        
        # Check if exists
        c.execute("SELECT code FROM currencies WHERE code = %s", (code,))
        if c.fetchone():
             c.execute("""
                UPDATE currencies SET name=%s, symbol=%s, is_active=TRUE 
                WHERE code=%s
             """, (name, symbol, code))
        else:
            c.execute("""
                INSERT INTO currencies (code, name, symbol, is_active)
                VALUES (%s, %s, %s, TRUE)
            """, (code, name, symbol))
        
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error adding currency: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/settings/currencies/{code}")
@require_permission("settings_edit_finance")
async def delete_currency(code: str, session_token: Optional[str] = Cookie(None)):
    """Удалить валюту"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("DELETE FROM currencies WHERE code = %s", (code.upper(),))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error deleting currency: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

# ===== FEATURE MANAGEMENT =====

@router.get("/features")
async def get_features_config():
    """Получить конфигурацию всех фича-флагов"""
    service = FeatureService()
    return service.get_features_config()

@router.post("/features")
@require_permission("settings_edit_integrations")
async def update_features_config(request: Request, session_token: Optional[str] = Cookie(None)):
    """Обновить конфигурацию фича-флагов"""
    service = FeatureService()
    try:
        data = await request.json()
        # Ensure data is a dict
        if not isinstance(data, dict):
             raise HTTPException(status_code=400, detail="Invalid format")
             
        if service.update_features_config(data):
            return {"success": True}
        else:
            raise HTTPException(status_code=500, detail="Failed to update feature flags")
    except Exception as e:
        log_error(f"Error updating features: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

# ===== REFERRAL CAMPAIGNS =====
import json

class ReferralCampaignCreate(BaseModel):
    """Model for creating a referral campaign"""
    name: str
    description: Optional[str] = None
    bonus_points: int = 200
    referrer_bonus: int = 200
    is_active: bool = True
    target_type: str = 'all'  # all, specific_users, by_master, by_service, by_inactivity
    target_criteria: Optional[dict] = None  # {user_ids: [], master_id: int, service_ids: [], days_inactive: int}
    start_date: Optional[str] = None
    end_date: Optional[str] = None


def _table_has_column(cursor, table_name: str, column_name: str) -> bool:
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = %s
          AND column_name = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    return bool(cursor.fetchone())


def _build_referral_link_by_token(token: str) -> str:
    normalized_token = str(token or "").strip().lower()
    if not normalized_token:
        return ""
    return f"/ref/{normalized_token}"


def _build_fallback_campaign_token(campaign_id: int) -> str:
    return f"cmp{int(campaign_id)}"


def _extract_fallback_campaign_id(token: str) -> Optional[int]:
    normalized_token = str(token or "").strip().lower()
    match_value = re.fullmatch(r"cmp(\d+)", normalized_token)
    if not match_value:
        return None
    try:
        parsed_id = int(match_value.group(1))
    except (TypeError, ValueError):
        return None
    return parsed_id if parsed_id > 0 else None


def _build_absolute_referral_link(base_url: str, relative_path: str) -> str:
    normalized_base = str(base_url or "").strip().rstrip("/")
    normalized_path = str(relative_path or "").strip()
    if not normalized_base:
        return normalized_path
    if not normalized_path:
        return normalized_base
    if normalized_path.startswith("http://") or normalized_path.startswith("https://"):
        return normalized_path
    if normalized_path.startswith("/"):
        return f"{normalized_base}{normalized_path}"
    return f"{normalized_base}/{normalized_path}"


def _generate_token_suffix(length: int = 10) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _generate_unique_share_token(cursor, table_name: str, column_name: str, prefix: str) -> str:
    normalized_prefix = re.sub(r"[^a-z0-9]", "", str(prefix or "").strip().lower())
    if not normalized_prefix:
        normalized_prefix = "ref"

    for _ in range(24):
        token = f"{normalized_prefix}{_generate_token_suffix(10)}"
        cursor.execute(
            f"SELECT 1 FROM {table_name} WHERE {column_name} = %s LIMIT 1",
            (token,),
        )
        if not cursor.fetchone():
            return token

    raise HTTPException(status_code=500, detail="Failed to generate referral token")


def _ensure_campaign_share_token(cursor, campaign_id: int, current_token: Optional[str]) -> str:
    normalized_token = str(current_token or "").strip().lower()
    if normalized_token:
        return normalized_token

    token = _generate_unique_share_token(cursor, "referral_campaigns", "share_token", f"cmp{campaign_id}")
    cursor.execute(
        """
        UPDATE referral_campaigns
        SET share_token = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """,
        (token, campaign_id),
    )
    return token


def _extract_referral_token_from_url(page_url: Optional[str]) -> str:
    normalized_url = str(page_url or "").strip().lower()
    if not normalized_url:
        return ""

    match_path = re.search(r"/ref/([a-z0-9]+)", normalized_url)
    if match_path and match_path.group(1):
        return match_path.group(1)

    match_query = re.search(r"(?:\?|&)ref_share=([a-z0-9]+)", normalized_url)
    if match_query and match_query.group(1):
        return match_query.group(1)

    return ""


def _extract_referral_token_from_source(source_value: Optional[str]) -> str:
    normalized_source = str(source_value or "").strip().lower()
    if not normalized_source:
        return ""

    match_source = re.search(r"ref_share_([a-z0-9]+)", normalized_source)
    if match_source and match_source.group(1):
        return match_source.group(1)

    match_query = re.search(r"ref_share=([a-z0-9]+)", normalized_source)
    if match_query and match_query.group(1):
        return match_query.group(1)

    return ""


def _parse_referral_analytics_range(period: str, date_from: Optional[str], date_to: Optional[str]) -> tuple:
    now = datetime.now()

    if date_from and date_to:
        try:
            start_custom = datetime.strptime(date_from, "%Y-%m-%d")
            end_custom = datetime.strptime(date_to, "%Y-%m-%d")
            end_custom = end_custom.replace(hour=23, minute=59, second=59, microsecond=999999)
            return start_custom, end_custom
        except Exception:
            pass

    period_key = str(period or "").strip().lower()
    if period_key == "today":
        start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start_today, now
    if period_key == "7d":
        return now - timedelta(days=7), now
    if period_key == "90d":
        return now - timedelta(days=90), now

    return now - timedelta(days=30), now


def _format_location(city: Optional[str], country: Optional[str]) -> str:
    city_value = str(city or "").strip()
    country_value = str(country or "").strip()
    if city_value and country_value:
        return f"{city_value}, {country_value}"
    if city_value:
        return city_value
    if country_value:
        return country_value
    return "-"

@router.get("/referral-campaigns")
@require_permission("settings_edit_loyalty")
async def get_referral_campaigns(session_token: Optional[str] = Cookie(None)):
    """Получить список реферальных кампаний"""
    try:
        conn = get_db_connection()
        c = conn.cursor()

        has_campaign_share_token = _table_has_column(c, "referral_campaigns", "share_token")
        share_select = ", share_token" if has_campaign_share_token else ", NULL AS share_token"

        c.execute(f"""
            SELECT id, name, description, bonus_points, referrer_bonus, is_active,
                   target_type, target_criteria, start_date, end_date, created_at{share_select}
            FROM referral_campaigns
            ORDER BY created_at DESC
        """)
        
        campaigns = []
        for row in c.fetchall():
            criteria = None
            if row[7]:
                try:
                    criteria = json.loads(row[7])
                except:
                    criteria = {}

            campaign_id_value = int(row[0])
            campaign_share_token = _build_fallback_campaign_token(campaign_id_value)
            if has_campaign_share_token:
                campaign_share_token = _ensure_campaign_share_token(c, campaign_id_value, row[11])

            campaigns.append({
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "bonus_points": row[3],
                "referrer_bonus": row[4],
                "is_active": row[5],
                "target_type": row[6],
                "target_criteria": criteria,
                "start_date": row[8],
                "end_date": row[9],
                "created_at": row[10],
                "share_token": campaign_share_token
            })

        conn.commit()
        conn.close()
        return {"campaigns": campaigns}
    except Exception as e:
        log_error(f"Error loading referral campaigns: {e}", "settings")
        return {"campaigns": [], "error": str(e)}


@router.get("/referral-campaigns/{campaign_id}/analytics")
@require_permission("settings_edit_loyalty")
async def get_referral_campaign_analytics(
    campaign_id: int,
    period: str = Query("30d"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """Детальная аналитика по реферальной ссылке кампании."""
    try:
        start_date, end_date = _parse_referral_analytics_range(period, date_from, date_to)
        conn = get_db_connection()
        c = conn.cursor()
        has_campaign_share_token = _table_has_column(c, "referral_campaigns", "share_token")
        has_user_share_token = _table_has_column(c, "referral_campaign_users", "share_token")

        if has_campaign_share_token:
            c.execute(
                """
                SELECT id, name, share_token
                FROM referral_campaigns
                WHERE id = %s
                LIMIT 1
                """,
                (campaign_id,),
            )
        else:
            c.execute(
                """
                SELECT id, name, '' AS share_token
                FROM referral_campaigns
                WHERE id = %s
                LIMIT 1
                """,
                (campaign_id,),
            )
        campaign_row = c.fetchone()
        if not campaign_row:
            conn.close()
            raise HTTPException(status_code=404, detail="Campaign not found")
        campaign_share_token = _build_fallback_campaign_token(campaign_id)
        if has_campaign_share_token:
            campaign_share_token = _ensure_campaign_share_token(c, campaign_id, campaign_row[2])

        campaign_referral_link = _build_referral_link_by_token(campaign_share_token)

        share_links: List[Dict[str, Any]] = []
        share_links_by_token: Dict[str, Dict[str, Any]] = {}
        share_tokens: set[str] = set()
        if has_user_share_token:
            c.execute(
                """
                SELECT rcu.client_id, rcu.share_token, c.name, c.phone
                FROM referral_campaign_users rcu
                LEFT JOIN clients c ON c.instagram_id = rcu.client_id
                WHERE rcu.campaign_id = %s
                ORDER BY COALESCE(c.name, rcu.client_id)
                """,
                (campaign_id,),
            )
            for share_row in c.fetchall() or []:
                client_id = str(share_row[0] or "").strip()
                share_token = str(share_row[1] or "").strip().lower()
                if not share_token and client_id:
                    share_token = _generate_unique_share_token(
                        c,
                        "referral_campaign_users",
                        "share_token",
                        f"ref{campaign_id}",
                    )
                    c.execute(
                        """
                        UPDATE referral_campaign_users
                        SET share_token = %s
                        WHERE campaign_id = %s
                          AND client_id = %s
                        """,
                        (share_token, campaign_id, client_id),
                    )

                if not share_token:
                    continue

                share_tokens.add(share_token)
                share_item = {
                    "client_id": client_id,
                    "client_name": str(share_row[2] or client_id or "-"),
                    "client_phone": str(share_row[3] or ""),
                    "share_token": share_token,
                    "referral_link": _build_referral_link_by_token(share_token),
                    "total_clicks": 0,
                    "unique_clicks": 0,
                    "total_bookings": 0,
                    "registered_clients": 0,
                    "conversion_rate": 0.0,
                    "last_activity": None,
                    "_unique_keys": set(),
                    "_registered_keys": set(),
                }
                share_links.append(share_item)
                share_links_by_token[share_token] = share_item

        c.execute(
            """
            SELECT id, ip_hash, city, country, visited_at, page_url
            FROM visitor_tracking
            WHERE visited_at >= %s
              AND visited_at <= %s
              AND (
                LOWER(COALESCE(page_url, '')) LIKE LOWER(%s)
                OR LOWER(COALESCE(page_url, '')) LIKE LOWER(%s)
                OR LOWER(COALESCE(page_url, '')) LIKE LOWER(%s)
              )
            ORDER BY visited_at DESC
            LIMIT 5000
            """,
            (start_date, end_date, f"%ref_campaign={campaign_id}%", "%/ref/%", "%ref_share=%"),
        )
        raw_visit_rows = c.fetchall() or []

        visit_rows: List[Dict[str, Any]] = []
        unique_click_keys: set[str] = set()
        for visit_row in raw_visit_rows:
            page_url = str(visit_row[5] or "").strip().lower()
            extracted_token = _extract_referral_token_from_url(page_url)
            is_campaign_visit = (
                f"ref_campaign={campaign_id}" in page_url
                or (campaign_share_token and f"/ref/{campaign_share_token}" in page_url)
                or (extracted_token in share_tokens if extracted_token else False)
            )
            if not is_campaign_visit:
                continue

            visit_entry = {
                "id": int(visit_row[0]),
                "ip_hash": str(visit_row[1] or "").strip(),
                "city": str(visit_row[2] or "").strip(),
                "country": str(visit_row[3] or "").strip(),
                "visited_at": visit_row[4],
                "page_url": str(visit_row[5] or ""),
                "share_token": extracted_token if extracted_token in share_tokens else "",
            }
            visit_rows.append(visit_entry)

            click_key = visit_entry["ip_hash"] if visit_entry["ip_hash"] else f"visit_{visit_entry['id']}"
            unique_click_keys.add(click_key)

            if visit_entry["share_token"] in share_links_by_token:
                share_item = share_links_by_token[visit_entry["share_token"]]
                share_item["total_clicks"] += 1
                share_item["_unique_keys"].add(click_key)
                visit_timestamp = visit_entry["visited_at"].isoformat() if visit_entry["visited_at"] else None
                if visit_timestamp and (share_item["last_activity"] is None or visit_timestamp > share_item["last_activity"]):
                    share_item["last_activity"] = visit_timestamp

        c.execute(
            """
            SELECT
                b.id,
                b.name,
                b.phone,
                b.instagram_id,
                b.status,
                b.created_at,
                b.source,
                c.user_id,
                c.password_hash
            FROM bookings b
            LEFT JOIN clients c ON c.instagram_id = b.instagram_id
            WHERE b.created_at >= %s
              AND b.created_at <= %s
              AND (
                LOWER(COALESCE(b.source, '')) LIKE LOWER(%s)
                OR LOWER(COALESCE(b.source, '')) LIKE LOWER(%s)
                OR LOWER(COALESCE(b.source, '')) LIKE LOWER(%s)
                OR LOWER(COALESCE(b.source, '')) LIKE LOWER(%s)
              )
            ORDER BY b.created_at DESC
            LIMIT 5000
            """,
            (
                start_date,
                end_date,
                f"%ref_campaign_{campaign_id}%",
                f"%ref_campaign={campaign_id}%",
                f"%referral_campaign_{campaign_id}%",
                "%ref_share_%",
            ),
        )
        raw_booking_rows = c.fetchall() or []
        conn.commit()
        conn.close()

        booking_rows: List[Dict[str, Any]] = []
        for booking_row in raw_booking_rows:
            source_value = str(booking_row[6] or "").strip().lower()
            extracted_token = _extract_referral_token_from_source(source_value)
            belongs_campaign = (
                f"ref_campaign_{campaign_id}" in source_value
                or f"ref_campaign={campaign_id}" in source_value
                or f"referral_campaign_{campaign_id}" in source_value
                or (extracted_token in share_tokens if extracted_token else False)
            )
            if not belongs_campaign:
                continue

            booking_rows.append({
                "id": int(booking_row[0]),
                "name": str(booking_row[1] or "-"),
                "phone": str(booking_row[2] or "").strip(),
                "instagram_id": str(booking_row[3] or "").strip(),
                "status": str(booking_row[4] or "pending"),
                "created_at": booking_row[5],
                "source": source_value,
                "share_token": extracted_token if extracted_token in share_tokens else "",
                "has_registered_user": booking_row[7] is not None or booking_row[8] is not None,
            })

        registered_client_keys: set[str] = set()
        total_bookings = 0
        leads: List[Dict[str, Any]] = []

        for visit_item in visit_rows:
            visited_at_iso = visit_item["visited_at"].isoformat() if visit_item["visited_at"] else None
            leads.append({
                "id": f"visit_{visit_item['id']}",
                "event_type": "visit",
                "name": "-",
                "phone": "-",
                "location": _format_location(visit_item["city"], visit_item["country"]),
                "registered": False,
                "booked": False,
                "status": "visited",
                "timestamp": visited_at_iso,
                "share_token": visit_item["share_token"],
            })

        for booking_item in booking_rows:
            booking_status = booking_item["status"]
            is_booked = booking_status != "cancelled"
            if is_booked:
                total_bookings += 1

            booking_phone = booking_item["phone"]
            booking_instagram_id = booking_item["instagram_id"]
            has_registered_user = booking_item["has_registered_user"]
            if has_registered_user:
                registered_key = booking_instagram_id if booking_instagram_id else booking_phone
                if registered_key:
                    registered_client_keys.add(registered_key)

            created_at = booking_item["created_at"]
            created_at_iso = created_at.isoformat() if created_at else None
            leads.append({
                "id": f"booking_{booking_item['id']}",
                "event_type": "booking",
                "name": booking_item["name"],
                "phone": booking_phone if booking_phone else "-",
                "location": "-",
                "registered": has_registered_user,
                "booked": is_booked,
                "status": booking_status,
                "timestamp": created_at_iso,
                "booking_id": booking_item["id"],
                "share_token": booking_item["share_token"],
            })

            share_token = booking_item["share_token"]
            if share_token in share_links_by_token:
                share_item = share_links_by_token[share_token]
                if is_booked:
                    share_item["total_bookings"] += 1
                if has_registered_user:
                    registered_key = booking_instagram_id if booking_instagram_id else booking_phone
                    if registered_key:
                        share_item["_registered_keys"].add(registered_key)
                if created_at_iso and (share_item["last_activity"] is None or created_at_iso > share_item["last_activity"]):
                    share_item["last_activity"] = created_at_iso

        leads.sort(
            key=lambda item: datetime.fromisoformat(item["timestamp"]) if item.get("timestamp") else datetime.min,
            reverse=True
        )

        for share_item in share_links:
            share_item["unique_clicks"] = len(share_item["_unique_keys"])
            share_item["registered_clients"] = len(share_item["_registered_keys"])
            unique_clicks_value = int(share_item["unique_clicks"])
            share_item["conversion_rate"] = round(
                (float(share_item["total_bookings"]) / unique_clicks_value) * 100,
                2
            ) if unique_clicks_value > 0 else 0.0
            del share_item["_unique_keys"]
            del share_item["_registered_keys"]

        share_links.sort(
            key=lambda item: (int(item["total_bookings"]), int(item["unique_clicks"])),
            reverse=True,
        )

        unique_clicks = len(unique_click_keys)
        conversion_rate = round((total_bookings / unique_clicks) * 100, 2) if unique_clicks > 0 else 0.0

        analytics_payload = {
            "campaign_id": campaign_id,
            "campaign_name": str(campaign_row[1] or ""),
            "period": period,
            "date_from": start_date.isoformat(),
            "date_to": end_date.isoformat(),
            "campaign_share_token": campaign_share_token,
            "referral_link": campaign_referral_link,
            "total_clicks": len(visit_rows),
            "unique_clicks": unique_clicks,
            "total_bookings": total_bookings,
            "registered_clients": len(registered_client_keys),
            "conversion_rate": conversion_rate,
            "share_links": share_links,
            "leads": leads[:250],
        }

        return {"success": True, "analytics": analytics_payload}
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error getting referral campaign analytics: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/public/referral-links/{share_token}")
async def get_public_referral_link_profile(
    share_token: str,
    period: str = Query("30d"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Публичный профиль персональной реферальной ссылки."""
    try:
        normalized_token = str(share_token or "").strip().lower()
        if not normalized_token:
            raise HTTPException(status_code=404, detail="Referral link not found")

        start_date, end_date = _parse_referral_analytics_range(period, date_from, date_to)
        conn = get_db_connection()
        c = conn.cursor()

        has_campaign_share_token = _table_has_column(c, "referral_campaigns", "share_token")
        has_user_share_token = _table_has_column(c, "referral_campaign_users", "share_token")

        campaign_id: Optional[int] = None
        campaign_name = ""
        campaign_description = ""
        campaign_active = False
        referrer_client_id = ""
        referrer_name = ""
        referrer_phone = ""
        is_individual_link = False

        if has_user_share_token:
            c.execute(
                """
                SELECT rc.id, rc.name, rc.description, rc.is_active,
                       rcu.client_id, c.name, c.phone
                FROM referral_campaign_users rcu
                JOIN referral_campaigns rc ON rc.id = rcu.campaign_id
                LEFT JOIN clients c ON c.instagram_id = rcu.client_id
                WHERE LOWER(COALESCE(rcu.share_token, '')) = %s
                LIMIT 1
                """,
                (normalized_token,),
            )
            user_link_row = c.fetchone()
            if user_link_row:
                campaign_id = int(user_link_row[0])
                campaign_name = str(user_link_row[1] or "")
                campaign_description = str(user_link_row[2] or "")
                campaign_active = bool(user_link_row[3])
                referrer_client_id = str(user_link_row[4] or "")
                referrer_name = str(user_link_row[5] or referrer_client_id or "-")
                referrer_phone = str(user_link_row[6] or "")
                is_individual_link = True

        if campaign_id is None and has_campaign_share_token:
            c.execute(
                """
                SELECT id, name, description, is_active
                FROM referral_campaigns
                WHERE LOWER(COALESCE(share_token, '')) = %s
                LIMIT 1
                """,
                (normalized_token,),
            )
            campaign_row = c.fetchone()
            if campaign_row:
                campaign_id = int(campaign_row[0])
                campaign_name = str(campaign_row[1] or "")
                campaign_description = str(campaign_row[2] or "")
                campaign_active = bool(campaign_row[3])
                is_individual_link = False

        if campaign_id is None:
            fallback_campaign_id = _extract_fallback_campaign_id(normalized_token)
            if fallback_campaign_id is not None:
                c.execute(
                    """
                    SELECT id, name, description, is_active
                    FROM referral_campaigns
                    WHERE id = %s
                    LIMIT 1
                    """,
                    (fallback_campaign_id,),
                )
                campaign_row = c.fetchone()
                if campaign_row:
                    campaign_id = int(campaign_row[0])
                    campaign_name = str(campaign_row[1] or "")
                    campaign_description = str(campaign_row[2] or "")
                    campaign_active = bool(campaign_row[3])
                    is_individual_link = False

        if campaign_id is None:
            conn.close()
            raise HTTPException(status_code=404, detail="Referral link not found")

        c.execute(
            """
            SELECT id, ip_hash, city, country, visited_at, page_url
            FROM visitor_tracking
            WHERE visited_at >= %s
              AND visited_at <= %s
              AND (
                LOWER(COALESCE(page_url, '')) LIKE LOWER(%s)
                OR LOWER(COALESCE(page_url, '')) LIKE LOWER(%s)
              )
            ORDER BY visited_at DESC
            LIMIT 5000
            """,
            (start_date, end_date, f"%/ref/{normalized_token}%", f"%ref_share={normalized_token}%"),
        )
        visit_rows = c.fetchall() or []

        if is_individual_link:
            c.execute(
                """
                SELECT
                    b.id,
                    b.name,
                    b.phone,
                    b.instagram_id,
                    b.status,
                    b.created_at,
                    c.user_id,
                    c.password_hash
                FROM bookings b
                LEFT JOIN clients c ON c.instagram_id = b.instagram_id
                WHERE b.created_at >= %s
                  AND b.created_at <= %s
                  AND LOWER(COALESCE(b.source, '')) LIKE LOWER(%s)
                ORDER BY b.created_at DESC
                LIMIT 5000
                """,
                (start_date, end_date, f"%ref_share_{normalized_token}%"),
            )
        else:
            c.execute(
                """
                SELECT
                    b.id,
                    b.name,
                    b.phone,
                    b.instagram_id,
                    b.status,
                    b.created_at,
                    c.user_id,
                    c.password_hash
                FROM bookings b
                LEFT JOIN clients c ON c.instagram_id = b.instagram_id
                WHERE b.created_at >= %s
                  AND b.created_at <= %s
                  AND (
                    LOWER(COALESCE(b.source, '')) LIKE LOWER(%s)
                    OR LOWER(COALESCE(b.source, '')) LIKE LOWER(%s)
                    OR LOWER(COALESCE(b.source, '')) LIKE LOWER(%s)
                  )
                ORDER BY b.created_at DESC
                LIMIT 5000
                """,
                (
                    start_date,
                    end_date,
                    f"%ref_campaign_{campaign_id}%",
                    f"%ref_campaign={campaign_id}%",
                    f"%referral_campaign_{campaign_id}%",
                ),
            )
        booking_rows = c.fetchall() or []
        conn.close()

        unique_click_keys: set[str] = set()
        leads: List[Dict[str, Any]] = []
        for visit_row in visit_rows:
            visit_ip_hash = str(visit_row[1] or "").strip()
            unique_key = visit_ip_hash if visit_ip_hash else f"visit_{visit_row[0]}"
            unique_click_keys.add(unique_key)
            visited_at = visit_row[4]
            leads.append({
                "id": f"visit_{visit_row[0]}",
                "event_type": "visit",
                "name": "-",
                "phone": "-",
                "location": _format_location(visit_row[2], visit_row[3]),
                "registered": False,
                "booked": False,
                "status": "visited",
                "timestamp": visited_at.isoformat() if visited_at else None,
            })

        total_bookings = 0
        registered_client_keys: set[str] = set()
        for booking_row in booking_rows:
            booking_status = str(booking_row[4] or "pending")
            is_booked = booking_status != "cancelled"
            if is_booked:
                total_bookings += 1

            booking_instagram_id = str(booking_row[3] or "").strip()
            booking_phone = str(booking_row[2] or "").strip()
            has_registered_user = booking_row[6] is not None or booking_row[7] is not None
            if has_registered_user:
                registered_key = booking_instagram_id if booking_instagram_id else booking_phone
                if registered_key:
                    registered_client_keys.add(registered_key)

            created_at = booking_row[5]
            leads.append({
                "id": f"booking_{booking_row[0]}",
                "event_type": "booking",
                "name": str(booking_row[1] or "-"),
                "phone": booking_phone if booking_phone else "-",
                "location": "-",
                "registered": has_registered_user,
                "booked": is_booked,
                "status": booking_status,
                "timestamp": created_at.isoformat() if created_at else None,
                "booking_id": booking_row[0],
            })

        leads.sort(
            key=lambda item: datetime.fromisoformat(item["timestamp"]) if item.get("timestamp") else datetime.min,
            reverse=True,
        )

        unique_clicks = len(unique_click_keys)
        conversion_rate = round((total_bookings / unique_clicks) * 100, 2) if unique_clicks > 0 else 0.0

        referral_relative_link = _build_referral_link_by_token(normalized_token)
        referral_base_url = os.getenv("PUBLIC_BASE_URL", "").strip()
        referral_absolute_link = _build_absolute_referral_link(referral_base_url, referral_relative_link)

        return {
            "success": True,
            "profile": {
                "campaign_id": campaign_id,
                "campaign_name": campaign_name,
                "campaign_description": campaign_description,
                "campaign_active": campaign_active,
                "period": period,
                "date_from": start_date.isoformat(),
                "date_to": end_date.isoformat(),
                "share_token": normalized_token,
                "is_individual_link": is_individual_link,
                "referrer_client_id": referrer_client_id,
                "referrer_name": referrer_name,
                "referrer_phone": referrer_phone,
                "referral_link": referral_relative_link,
                "referral_link_absolute": referral_absolute_link if referral_absolute_link else referral_relative_link,
                "total_clicks": len(visit_rows),
                "unique_clicks": unique_clicks,
                "total_bookings": total_bookings,
                "registered_clients": len(registered_client_keys),
                "conversion_rate": conversion_rate,
                "leads": leads[:250],
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error getting public referral link profile: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/referral-campaigns")
@require_permission("settings_edit_loyalty")
async def create_referral_campaign(campaign: ReferralCampaignCreate, session_token: Optional[str] = Cookie(None)):
    """Создать реферальную кампанию"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        criteria_json = json.dumps(campaign.target_criteria) if campaign.target_criteria else None
        
        c.execute("""
            INSERT INTO referral_campaigns 
            (name, description, bonus_points, referrer_bonus, is_active, target_type, target_criteria, start_date, end_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            campaign.name,
            campaign.description,
            campaign.bonus_points,
            campaign.referrer_bonus,
            campaign.is_active,
            campaign.target_type,
            criteria_json,
            campaign.start_date,
            campaign.end_date
        ))
        
        campaign_id = c.fetchone()[0]

        has_campaign_share_token = _table_has_column(c, "referral_campaigns", "share_token")
        has_user_share_token = _table_has_column(c, "referral_campaign_users", "share_token")
        if has_campaign_share_token:
            _ensure_campaign_share_token(c, int(campaign_id), None)

        # If targeting specific users, add them to referral_campaign_users
        if campaign.target_type == 'specific_users' and campaign.target_criteria:
            user_ids = campaign.target_criteria.get('user_ids', [])
            for user_id in user_ids:
                if has_user_share_token:
                    generated_share_token = _generate_unique_share_token(
                        c,
                        "referral_campaign_users",
                        "share_token",
                        f"ref{campaign_id}",
                    )
                    c.execute(
                        """
                        INSERT INTO referral_campaign_users (campaign_id, client_id, share_token)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (campaign_id, client_id) DO UPDATE
                        SET share_token = COALESCE(referral_campaign_users.share_token, EXCLUDED.share_token)
                        """,
                        (campaign_id, user_id, generated_share_token),
                    )
                else:
                    c.execute("""
                        INSERT INTO referral_campaign_users (campaign_id, client_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                    """, (campaign_id, user_id))
        
        conn.commit()
        conn.close()
        
        log_info(f"Referral campaign created: {campaign.name}", "settings")
        return {"success": True, "id": campaign_id}
    except Exception as e:
        log_error(f"Error creating referral campaign: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/referral-campaigns/{campaign_id}")
@require_permission("settings_edit_loyalty")
async def update_referral_campaign(campaign_id: int, campaign: ReferralCampaignCreate, session_token: Optional[str] = Cookie(None)):
    """Обновить реферальную кампанию"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        has_campaign_share_token = _table_has_column(c, "referral_campaigns", "share_token")
        has_user_share_token = _table_has_column(c, "referral_campaign_users", "share_token")
        
        criteria_json = json.dumps(campaign.target_criteria) if campaign.target_criteria else None
        
        c.execute("""
            UPDATE referral_campaigns 
            SET name = %s, description = %s, bonus_points = %s, referrer_bonus = %s,
                is_active = %s, target_type = %s, target_criteria = %s,
                start_date = %s, end_date = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (
            campaign.name,
            campaign.description,
            campaign.bonus_points,
            campaign.referrer_bonus,
            campaign.is_active,
            campaign.target_type,
            criteria_json,
            campaign.start_date,
            campaign.end_date,
            campaign_id
        ))

        if has_campaign_share_token:
            c.execute("SELECT share_token FROM referral_campaigns WHERE id = %s", (campaign_id,))
            share_token_row = c.fetchone()
            existing_campaign_token = share_token_row[0] if share_token_row else None
            _ensure_campaign_share_token(c, campaign_id, existing_campaign_token)

        # Update targeted users if needed
        if campaign.target_type == 'specific_users' and campaign.target_criteria:
            existing_user_tokens: Dict[str, str] = {}
            if has_user_share_token:
                c.execute(
                    """
                    SELECT client_id, share_token
                    FROM referral_campaign_users
                    WHERE campaign_id = %s
                    """,
                    (campaign_id,),
                )
                for token_row in c.fetchall() or []:
                    client_key = str(token_row[0] or "").strip()
                    share_token_value = str(token_row[1] or "").strip().lower()
                    if client_key and share_token_value:
                        existing_user_tokens[client_key] = share_token_value

            # Remove old assignments
            c.execute("DELETE FROM referral_campaign_users WHERE campaign_id = %s", (campaign_id,))
            # Add new ones
            user_ids = campaign.target_criteria.get('user_ids', [])
            for user_id in user_ids:
                if has_user_share_token:
                    user_key = str(user_id)
                    share_token_value = existing_user_tokens.get(user_key)
                    if not share_token_value:
                        share_token_value = _generate_unique_share_token(
                            c,
                            "referral_campaign_users",
                            "share_token",
                            f"ref{campaign_id}",
                        )
                    c.execute(
                        """
                        INSERT INTO referral_campaign_users (campaign_id, client_id, share_token)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (campaign_id, client_id) DO UPDATE
                        SET share_token = EXCLUDED.share_token
                        """,
                        (campaign_id, user_id, share_token_value),
                    )
                else:
                    c.execute("""
                        INSERT INTO referral_campaign_users (campaign_id, client_id)
                        VALUES (%s, %s)
                    """, (campaign_id, user_id))
        
        conn.commit()
        conn.close()
        
        log_info(f"Referral campaign updated: {campaign_id}", "settings")
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating referral campaign: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/referral-campaigns/{campaign_id}")
@require_permission("settings_edit_loyalty")
async def patch_referral_campaign(campaign_id: int, request: Request, session_token: Optional[str] = Cookie(None)):
    """Частичное обновление реферальной кампании (например, is_active)"""
    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        # Поддерживаем обновление is_active
        if 'is_active' in data:
            c.execute("""
                UPDATE referral_campaigns
                SET is_active = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (data['is_active'], campaign_id))

        conn.commit()
        conn.close()

        log_info(f"Referral campaign {campaign_id} patched: {data}", "settings")
        return {"success": True}
    except Exception as e:
        log_error(f"Error patching referral campaign: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/referral-campaigns/{campaign_id}")
@require_permission("settings_edit_loyalty")
async def delete_referral_campaign(campaign_id: int, session_token: Optional[str] = Cookie(None)):
    """Удалить реферальную кампанию"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Delete user assignments first
        c.execute("DELETE FROM referral_campaign_users WHERE campaign_id = %s", (campaign_id,))
        # Delete campaign
        c.execute("DELETE FROM referral_campaigns WHERE id = %s", (campaign_id,))
        
        conn.commit()
        conn.close()
        
        log_info(f"Referral campaign deleted: {campaign_id}", "settings")
        return {"success": True}
    except Exception as e:
        log_error(f"Error deleting referral campaign: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/referral-campaigns/{campaign_id}/eligible-users")
async def get_eligible_users_for_campaign(campaign_id: int):
    """Получить список клиентов, подходящих под критерии кампании"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Get campaign
        c.execute("SELECT target_type, target_criteria FROM referral_campaigns WHERE id = %s", (campaign_id,))
        row = c.fetchone()
        if not row:
            conn.close()
            return {"users": [], "error": "Campaign not found"}
        
        target_type, criteria_str = row
        criteria = json.loads(criteria_str) if criteria_str else {}
        
        users = []
        
        if target_type == 'all':
            c.execute("SELECT instagram_id, name, email, phone FROM clients LIMIT 100")
        elif target_type == 'specific_users':
            user_ids = criteria.get('user_ids', [])
            if user_ids:
                placeholders = ','.join(['%s'] * len(user_ids))
                c.execute(f"SELECT instagram_id, name, email, phone FROM clients WHERE instagram_id IN ({placeholders})", tuple(user_ids))
        elif target_type == 'by_master':
            master_id = criteria.get('master_id')
            if master_id:
                c.execute("""
                    SELECT DISTINCT c.instagram_id, c.name, c.email, c.phone 
                    FROM clients c
                    JOIN bookings b ON c.instagram_id = b.instagram_id
                    JOIN users u ON b.master = u.full_name
                    WHERE u.id = %s
                """, (master_id,))
        elif target_type == 'by_service':
            service_ids = criteria.get('service_ids', [])
            if service_ids:
                placeholders = ','.join(['%s'] * len(service_ids))
                c.execute(f"""
                    SELECT DISTINCT c.instagram_id, c.name, c.email, c.phone 
                    FROM clients c
                    JOIN bookings b ON c.instagram_id = b.instagram_id
                    WHERE b.service_name IN (
                        SELECT name FROM services WHERE id IN ({placeholders})
                    )
                """, tuple(service_ids))
        elif target_type == 'by_inactivity':
            days = criteria.get('days_inactive', 30)
            c.execute("""
                SELECT c.instagram_id, c.name, c.email, c.phone 
                FROM clients c
                WHERE c.instagram_id NOT IN (
                    SELECT DISTINCT instagram_id FROM bookings 
                    WHERE datetime > %s
                )
            """, ((datetime.now() - timedelta(days=days)).isoformat(),))
        
        for row in c.fetchall():
            users.append({
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "phone": row[3]
            })
        
        conn.close()
        return {"users": users, "count": len(users)}
    except Exception as e:
        log_error(f"Error getting eligible users: {e}", "settings")
        return {"users": [], "error": str(e)}
