"""
API для управления настройками
Settings management API
"""
from fastapi import APIRouter, HTTPException, Request, Cookie
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import os
import shutil
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
async def save_notification_settings(request: Request, settings: NotificationSettings):
    """
    Сохранить настройки уведомлений для пользователя
    """
    try:
        # TODO: Получить user_id из сессии когда будет авторизация
        user_id = 1  # По умолчанию для первого пользователя

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

    except psycopg2.OperationalError as e:
        # Таблица не существует - создадим её
        if "no such table" in str(e).lower():
            log_info("Creating notification_settings table", "settings")
            try:
                conn = get_db_connection()
                c = conn.cursor()
                c.execute(f"""
                    CREATE TABLE IF NOT EXISTS notification_settings (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        email_notifications INTEGER DEFAULT 1,
                        sms_notifications INTEGER DEFAULT 0,
                        booking_notifications INTEGER DEFAULT 1,
                        chat_notifications INTEGER DEFAULT 1,
                        daily_report INTEGER DEFAULT 1,
                        report_time TEXT DEFAULT '{DEFAULT_REPORT_TIME}',
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id)
                    )
                """)

                # Вставляем настройки после создания таблицы
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

                conn.commit()
                conn.close()

                log_info("notification_settings table created and settings saved", "settings")
                return {
                    "success": True,
                    "message": "Настройки сохранены"
                }
            except Exception as create_error:
                log_error(f"Error creating notification_settings table: {create_error}", "settings")
                raise HTTPException(status_code=500, detail=str(create_error))
        else:
            log_error(f"Database error: {e}", "settings")
            raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        log_error(f"Error saving notification settings: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/settings/notifications")
async def get_notification_settings():
    """
    Получить настройки уведомлений для пользователя
    """
    try:
        user_id = 1  # TODO: Получить из сессии

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
        backup_path = f"backend/{backup_filename}"
        
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

@router.get("/salon-settings")
async def get_salon_settings_api():
    """
    Получить настройки салона
    """
    try:
        settings = get_salon_settings()
        return settings
    except Exception as e:
        log_error(f"Error loading salon settings: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/salon-settings")
async def update_salon_settings_api(request: Request):
    """
    Обновить настройки салона
    """
    try:
        data = await request.json()
        success = update_salon_settings(data)

        if success:
            log_info("Salon settings updated successfully", "settings")
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
        lunch_start = salon.get('lunch_start', DEFAULT_LUNCH_START)  # ✅ Используем константу
        lunch_end = salon.get('lunch_end', DEFAULT_LUNCH_END)  # ✅ Используем константу
        
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
            {"code": "USD", "name": "US Dollar", "symbol": "$", "is_active": True}
        ]}

@router.post("/settings/currencies")
async def add_currency(request: Request):
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
async def delete_currency(code: str):
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
async def update_features_config(request: Request):
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
from typing import List

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

@router.get("/referral-campaigns")
async def get_referral_campaigns():
    """Получить список реферальных кампаний"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            SELECT id, name, description, bonus_points, referrer_bonus, is_active,
                   target_type, target_criteria, start_date, end_date, created_at
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
                "created_at": row[10]
            })
        
        conn.close()
        return {"campaigns": campaigns}
    except Exception as e:
        log_error(f"Error loading referral campaigns: {e}", "settings")
        return {"campaigns": [], "error": str(e)}

@router.post("/referral-campaigns")
async def create_referral_campaign(campaign: ReferralCampaignCreate):
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
        
        # If targeting specific users, add them to referral_campaign_users
        if campaign.target_type == 'specific_users' and campaign.target_criteria:
            user_ids = campaign.target_criteria.get('user_ids', [])
            for user_id in user_ids:
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
async def update_referral_campaign(campaign_id: int, campaign: ReferralCampaignCreate):
    """Обновить реферальную кампанию"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
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
        
        # Update targeted users if needed
        if campaign.target_type == 'specific_users' and campaign.target_criteria:
            # Remove old assignments
            c.execute("DELETE FROM referral_campaign_users WHERE campaign_id = %s", (campaign_id,))
            # Add new ones
            user_ids = campaign.target_criteria.get('user_ids', [])
            for user_id in user_ids:
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
async def patch_referral_campaign(campaign_id: int, request: Request):
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
async def delete_referral_campaign(campaign_id: int):
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