"""
API для управления настройками
Settings management API
"""
from fastapi import APIRouter, HTTPException, Request,Cookie
from pydantic import BaseModel
from typing import Optional
import sqlite3
from datetime import datetime

from core.config import DATABASE_NAME
from utils.logger import log_info, log_error
from db.settings import get_bot_settings, update_bot_settings, get_salon_settings, update_salon_settings

router = APIRouter()


class NotificationSettings(BaseModel):
    """Модель настроек уведомлений"""
    emailNotifications: bool = True
    smsNotifications: bool = False
    bookingNotifications: bool = True
    chatNotifications: bool = True
    dailyReport: bool = True
    reportTime: str = "09:00"


@router.post("/settings/notifications")
async def save_notification_settings(request: Request, settings: NotificationSettings):
    """
    Сохранить настройки уведомлений для пользователя
    """
    try:
        # TODO: Получить user_id из сессии когда будет авторизация
        user_id = 1  # По умолчанию для первого пользователя

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Проверяем есть ли уже настройки
        c.execute("""
            SELECT id FROM notification_settings
            WHERE user_id = ?
        """, (user_id,))
        existing = c.fetchone()

        if existing:
            # Обновляем существующие настройки
            c.execute("""
                UPDATE notification_settings
                SET
                    email_notifications = ?,
                    sms_notifications = ?,
                    booking_notifications = ?,
                    chat_notifications = ?,
                    daily_report = ?,
                    report_time = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            """, (
                1 if settings.emailNotifications else 0,
                1 if settings.smsNotifications else 0,
                1 if settings.bookingNotifications else 0,
                1 if settings.chatNotifications else 0,
                1 if settings.dailyReport else 0,
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
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                1 if settings.emailNotifications else 0,
                1 if settings.smsNotifications else 0,
                1 if settings.bookingNotifications else 0,
                1 if settings.chatNotifications else 0,
                1 if settings.dailyReport else 0,
                settings.reportTime
            ))
            log_info(f"Notification settings created for user {user_id}", "settings")

        conn.commit()
        conn.close()

        return {
            "success": True,
            "message": "Настройки сохранены"
        }

    except sqlite3.OperationalError as e:
        # Таблица не существует - создадим её
        if "no such table" in str(e).lower():
            log_info("Creating notification_settings table", "settings")
            try:
                conn = sqlite3.connect(DATABASE_NAME)
                c = conn.cursor()
                c.execute("""
                    CREATE TABLE IF NOT EXISTS notification_settings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        email_notifications INTEGER DEFAULT 1,
                        sms_notifications INTEGER DEFAULT 0,
                        booking_notifications INTEGER DEFAULT 1,
                        chat_notifications INTEGER DEFAULT 1,
                        daily_report INTEGER DEFAULT 1,
                        report_time TEXT DEFAULT '09:00',
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
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
                    1 if settings.emailNotifications else 0,
                    1 if settings.smsNotifications else 0,
                    1 if settings.bookingNotifications else 0,
                    1 if settings.chatNotifications else 0,
                    1 if settings.dailyReport else 0,
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

        conn = sqlite3.connect(DATABASE_NAME)
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
            WHERE user_id = ?
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
                "reportTime": "09:00"
            }

    except sqlite3.OperationalError:
        # Таблица не существует - возвращаем настройки по умолчанию
        return {
            "emailNotifications": True,
            "smsNotifications": False,
            "bookingNotifications": True,
            "chatNotifications": True,
            "dailyReport": True,
            "reportTime": "09:00"
        }
    except Exception as e:
        log_error(f"Error loading notification settings: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))


# ===== BOT SETTINGS =====

@router.get("/bot-settings")
async def get_bot_settings_api():
    """
    Получить настройки бота
    """
    try:
        settings = get_bot_settings()
        return settings
    except Exception as e:
        log_error(f"Error loading bot settings: {e}", "settings")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings/bot")
async def update_bot_settings_api(request: Request):
    """
    Обновить настройки бота
    """
    try:
        data = await request.json()
        success = update_bot_settings(data)

        if success:
            log_info("Bot settings updated successfully", "settings")
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
        import shutil
        import tempfile
        from fastapi.responses import FileResponse
        import os
        
        # Создаем временную копию базы данных
        temp_dir = tempfile.gettempdir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"salon_bot_backup_{timestamp}.db"
        backup_path = os.path.join(temp_dir, backup_filename)
        
        # Копируем базу данных
        shutil.copy2(DATABASE_NAME, backup_path)
        
        log_info(f"Database backup created by {user.get('username')}: {backup_filename}", "settings")
        
        # Возвращаем файл для скачивания
        return FileResponse(
            path=backup_path,
            filename=backup_filename,
            media_type="application/x-sqlite3",
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