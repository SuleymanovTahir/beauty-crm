"""
Background service for processing scheduled notifications
This service should be run as a separate process or cron job
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from datetime import datetime, timedelta
import json
import time

def process_scheduled_notifications():
    """
    Обработать запланированные уведомления
    Эту функцию нужно запускать периодически (например, каждую минуту через cron)
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Найти уведомления, которые нужно отправить сейчас
        c.execute("""
            SELECT id, title, message, notification_type,
                   target_segment, filter_params,
                   repeat_enabled, repeat_interval, repeat_end_date
            FROM notification_history
            WHERE scheduled = TRUE
              AND status = 'pending'
              AND schedule_datetime <= CURRENT_TIMESTAMP
        """)

        notifications = c.fetchall()

        for notif in notifications:
            notif_id = notif[0]
            title = notif[1]
            message = notif[2]
            notif_type = notif[3]
            target_segment = notif[4]
            filter_params = json.loads(notif[5]) if notif[5] else {}
            repeat_enabled = notif[6]
            repeat_interval = notif[7]
            repeat_end_date = notif[8]

            try:
                # Получить список получателей на основе filter_params
                recipients = get_recipients_by_filters(c, target_segment, filter_params)
                recipients_count = len(recipients)

                # TODO: Реальная отправка уведомлений
                # Здесь должна быть интеграция с Telegram/Email/SMS API
                log_info(f"Processing notification {notif_id}: {title} to {recipients_count} recipients", "scheduler")

                # Обновить статус
                c.execute("""
                    UPDATE notification_history
                    SET status = 'sent',
                        sent_count = %s,
                        sent_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (recipients_count, notif_id))

                # Если включен repeat - создать следующее уведомление
                if repeat_enabled and repeat_interval:
                    create_next_scheduled_notification(
                        c, notif_id, title, message, notif_type,
                        target_segment, filter_params,
                        repeat_interval, repeat_end_date
                    )

                conn.commit()
                log_info(f"Notification {notif_id} sent successfully", "scheduler")

            except Exception as e:
                log_error(f"Error processing notification {notif_id}: {e}", "scheduler")
                # Пометить как failed
                c.execute("""
                    UPDATE notification_history
                    SET status = 'failed'
                    WHERE id = %s
                """, (notif_id,))
                conn.commit()

        conn.close()
        log_info(f"Processed {len(notifications)} scheduled notifications", "scheduler")

    except Exception as e:
        log_error(f"Error in process_scheduled_notifications: {e}", "scheduler")

def get_recipients_by_filters(cursor, target_segment, filter_params):
    """Получить список получателей на основе фильтров"""
    tier_filter = filter_params.get("tier_filter", "")
    appointment_filter = filter_params.get("appointment_filter", "")
    appointment_date = filter_params.get("appointment_date", "")
    appointment_start_date = filter_params.get("appointment_start_date", "")
    appointment_end_date = filter_params.get("appointment_end_date", "")
    service_filter = filter_params.get("service_filter", "")

    if target_segment == "all":
        cursor.execute("SELECT instagram_id FROM clients WHERE telegram_id IS NOT NULL")
    elif target_segment == "active":
        cursor.execute("SELECT instagram_id FROM clients WHERE telegram_id IS NOT NULL AND is_active = TRUE")
    elif target_segment == "inactive":
        cursor.execute("SELECT instagram_id FROM clients WHERE telegram_id IS NOT NULL AND is_active = FALSE")
    elif target_segment == "tier" and tier_filter:
        cursor.execute("SELECT instagram_id FROM clients WHERE telegram_id IS NOT NULL AND loyalty_tier = %s", (tier_filter,))
    elif target_segment == "appointment-based":
        if appointment_filter == "tomorrow":
            cursor.execute("""
                SELECT DISTINCT c.instagram_id
                FROM clients c
                JOIN bookings b ON c.instagram_id = b.client_id
                WHERE c.telegram_id IS NOT NULL
                  AND b.booking_date = CURRENT_DATE + INTERVAL '1 day'
                  AND b.status IN ('pending', 'confirmed')
            """)
        elif appointment_filter == "specific_date" and appointment_date:
            cursor.execute("""
                SELECT DISTINCT c.instagram_id
                FROM clients c
                JOIN bookings b ON c.instagram_id = b.client_id
                WHERE c.telegram_id IS NOT NULL
                  AND b.booking_date = %s
                  AND b.status IN ('pending', 'confirmed')
            """, (appointment_date,))
        elif appointment_filter == "date_range" and appointment_start_date and appointment_end_date:
            cursor.execute("""
                SELECT DISTINCT c.instagram_id
                FROM clients c
                JOIN bookings b ON c.instagram_id = b.client_id
                WHERE c.telegram_id IS NOT NULL
                  AND b.booking_date BETWEEN %s AND %s
                  AND b.status IN ('pending', 'confirmed')
            """, (appointment_start_date, appointment_end_date))
        else:
            cursor.execute("SELECT instagram_id FROM clients WHERE telegram_id IS NOT NULL")
    elif target_segment == "service-based" and service_filter:
        cursor.execute("""
            SELECT DISTINCT c.instagram_id
            FROM clients c
            JOIN bookings b ON c.instagram_id = b.client_id
            WHERE c.telegram_id IS NOT NULL
              AND (b.service_name ILIKE %s OR b.service_id::text = %s)
        """, (f"%{service_filter}%", service_filter))
    else:
        cursor.execute("SELECT instagram_id FROM clients WHERE telegram_id IS NOT NULL")

    return cursor.fetchall()

def create_next_scheduled_notification(cursor, original_id, title, message, notif_type,
                                       target_segment, filter_params, repeat_interval, repeat_end_date):
    """Создать следующее запланированное уведомление для повторяющихся уведомлений"""
    try:
        # Получить текущую дату отправки
        cursor.execute("SELECT schedule_datetime FROM notification_history WHERE id = %s", (original_id,))
        current_schedule = cursor.fetchone()[0]

        # Вычислить следующую дату
        if repeat_interval == "daily":
            next_schedule = current_schedule + timedelta(days=1)
        elif repeat_interval == "weekly":
            next_schedule = current_schedule + timedelta(weeks=1)
        elif repeat_interval == "monthly":
            next_schedule = current_schedule + timedelta(days=30)  # Приблизительно
        else:
            return

        # Проверить, не прошла ли дата окончания
        if repeat_end_date:
            end_date = datetime.strptime(str(repeat_end_date), "%Y-%m-%d").date()
            if next_schedule.date() > end_date:
                log_info(f"Repeat ended for notification {original_id}", "scheduler")
                return

        # Создать новое запланированное уведомление
        cursor.execute("""
            INSERT INTO notification_history (
                title, message, notification_type,
                recipients_count, status,
                scheduled, schedule_datetime,
                repeat_enabled, repeat_interval, repeat_end_date,
                target_segment, filter_params
            ) VALUES (%s, %s, %s, 0, 'pending', TRUE, %s, %s, %s, %s, %s, %s)
        """, (
            title, message, notif_type,
            next_schedule,
            True, repeat_interval, repeat_end_date,
            target_segment, json.dumps(filter_params)
        ))

        log_info(f"Created next scheduled notification for {original_id} at {next_schedule}", "scheduler")

    except Exception as e:
        log_error(f"Error creating next scheduled notification: {e}", "scheduler")

if __name__ == "__main__":
    # Можно запустить как отдельный процесс
    # Или настроить как cron job: */1 * * * * python3 notification_scheduler.py
    log_info("Starting notification scheduler", "scheduler")
    while True:
        process_scheduled_notifications()
        time.sleep(60)  # Проверять каждую минуту
