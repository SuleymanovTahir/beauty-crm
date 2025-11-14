"""
API для управления настройками
Settings management API
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import sqlite3

from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

router = APIRouter()


class NotificationSettings(BaseModel):
    """Модель настроек уведомлений"""
    emailNotifications: bool = True
    smsNotifications: bool = False
    bookingNotifications: bool = True
    chatNotifications: bool = True
    dailyReport: bool = True
    reportTime: str = "09:00"


@router.post("/api/settings/notifications")
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


@router.get("/api/settings/notifications")
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
