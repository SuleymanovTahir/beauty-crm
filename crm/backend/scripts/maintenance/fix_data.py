import os
import sys

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from db.connection import get_db_connection
from utils.logger import log_info, log_error


def run_all_fixes():
    """Entry point for centralized maintenance runner"""
    return run_fix()

def run_fix():
    print("🚀 Running system data maintenance...")

    conn = get_db_connection()
    c = conn.cursor()

    # Advisory lock to prevent multiple workers from running maintenance simultaneously
    c.execute("SELECT pg_try_advisory_lock(12346)")  # Different lock ID from init_database (12345)
    got_lock = c.fetchone()[0]
    if not got_lock:
        log_info("⏳ Another process is running maintenance, skipping...", "maintenance")
        conn.close()
        return True  # Return success - maintenance is being done by another worker

    try:
        log_info("🧹 Running data cleanup and synchronization...", "maintenance")

        # 1. Remove legacy public/admin contour data from CRM runtime.
        legacy_public_tables = (
            ("public_banners", "banner"),
            ("public_gallery", "gallery"),
            ("public_faq", "FAQ"),
            ("public_reviews", "review"),
        )
        for table_name, label in legacy_public_tables:
            c.execute(f"DELETE FROM {table_name}")
            if c.rowcount > 0:
                log_info(f"   ✅ Removed {c.rowcount} {label} records", "maintenance")

        # 2. Remove employee photos (CRM runtime without image profiles)
        c.execute("""
            UPDATE users
            SET photo = NULL
            WHERE photo IS NOT NULL
        """)
        if c.rowcount > 0:
            log_info(f"   ✅ Cleared {c.rowcount} employee/client photo links", "maintenance")

        c.execute("""
            UPDATE salon_settings
            SET logo_url = NULL
            WHERE logo_url IS NOT NULL
              AND TRIM(logo_url) <> ''
        """)
        if c.rowcount > 0:
            log_info(f"   ✅ Cleared {c.rowcount} logo links in salon_settings", "maintenance")

        # 3. Normalize optional branding/timezone fields without hardcoded salon-specific values.
        salon_instagram = os.getenv('SALON_INSTAGRAM', '').strip()

        timezone_offset_raw = os.getenv('SALON_TIMEZONE_OFFSET', '0').strip()
        try:
            timezone_offset_value = int(float(timezone_offset_raw))
        except ValueError:
            timezone_offset_value = 0

        c.execute("""
            UPDATE salon_settings
            SET
                instagram = COALESCE(NULLIF(TRIM(instagram), ''), %s),
                timezone_offset = COALESCE(timezone_offset, %s),
                timezone = COALESCE(NULLIF(TRIM(timezone), ''), 'UTC')
            WHERE id = 1
        """, (salon_instagram, timezone_offset_value))
        if c.rowcount > 0:
            log_info("   ✅ Ensured salon Instagram and timezone defaults in salon_settings", "maintenance")

        # 4. Ensure only providers are public.
        c.execute("""
            UPDATE users SET is_public_visible = FALSE
            WHERE is_service_provider = FALSE AND is_public_visible = TRUE
        """)
        
        seed_notification_templates(c)

        conn.commit()
        log_info("🏆 Data maintenance completed successfully!", "maintenance")
        return True

    except Exception as e:
        log_error(f"❌ Maintenance failed: {e}", "maintenance")
        try: conn.rollback()
        except: pass
        return False
    finally:
        try: c.execute("SELECT pg_advisory_unlock(12346)")
        except: pass
        try: conn.close()
        except: pass

def seed_notification_templates(c):
    """Синхронизация базовых системных шаблонов уведомлений"""
    log_info("🎭 Synchronizing notification templates...", "maintenance")
    
    templates = [
        {
            "name": "booking_confirmation",
            "category": "transactional",
            "subject": "Подтверждение записи к мастеру",
            "body": "Здравствуйте, {name}! \n\nВы успешно записаны в {salon_name}.\n\n🗓 {date}\n⏰ {time}\n💆 {service}\n👤 {master}\n\nБудем рады видеть вас! Если ваши планы изменятся, пожалуйста, сообщите нам заранее.",
            "variables": '["name", "service", "master", "date", "time", "salon_name"]'
        },
        {
            "name": "booking_reminder",
            "category": "transactional",
            "subject": "Напоминание о записи - {salon_name}",
            "body": "Напоминаем, что вы записаны сегодня ({date}) в {time} на {service}. Будем рады вас видеть!",
            "variables": '["name", "service", "date", "time", "salon_name"]'
        },
        {
            "name": "birthday_greeting",
            "category": "marketing",
            "subject": "{name}, с днем рождения! 🎁",
            "body": "Здравствуйте, {name}! \n\nПоздравляем вас с Днем Рождения! 🎉\n\nВ честь вашего праздника мы подготовили для вас особенный подарок от {salon_name} — скидку 15% на любую услугу!\n\nВоспользоваться предложением можно в течение 7 дней.\n\nБудьте прекрасны и сияйте каждый день! ✨",
            "variables": '["name", "salon_name"]'
        },
        {
            "name": "birthday_reminder_7d",
            "category": "marketing",
            "subject": "{name}, ваш день рождения уже через неделю! ✨",
            "body": "Здравствуйте, {name}! \n\nМы знаем, что ваш особенный день — через неделю! 🎉\n\nСамое время подготовиться, чтобы сиять и быть на высоте. Мы подготовили для вас подарок: промокод на скидку 15% на любые услуги нашего салона!\n\n🎁 Промокод: {promo_code}\n\nЗапишитесь заранее, чтобы забронировать удобное время! Ждем вас! 💖",
            "variables": '["name", "promo_code", "salon_name"]'
        },
        {
            "name": "master_new_booking",
            "category": "transactional",
            "subject": "🔔 Новая запись! - {datetime}",
            "body": "🔔 Новая запись!\n\n👤 Клиент: {client_name}\n💆 Услуга: {service}\n📅 Дата и время: {datetime}\n📞 Телефон: {phone}\n📋 ID: #{booking_id}",
            "variables": '["client_name", "service", "datetime", "phone", "booking_id"]'
        },
        {
            "name": "master_booking_change",
            "category": "transactional",
            "subject": "✏️ Запись изменена! - {datetime}",
            "body": "✏️ Запись изменена!\n\n👤 Клиент: {client_name}\n💆 Услуга: {service}\n📅 Новое время: {datetime}\n📞 Телефон: {phone}\n📋 ID: #{booking_id}",
            "variables": '["client_name", "service", "datetime", "phone", "booking_id"]'
        },
        {
            "name": "master_booking_cancel",
            "category": "transactional",
            "subject": "❌ Запись отменена! - {datetime}",
            "body": "❌ Запись отменена!\n\n👤 Клиент: {client_name}\n💆 Услуга: {service}\n📅 Была на: {datetime}\n📋 ID: #{booking_id}",
            "variables": '["client_name", "service", "datetime", "booking_id"]'
        }
    ]

    for t in templates:
        c.execute("""
            INSERT INTO notification_templates 
            (name, category, subject, body, variables, is_system)
            VALUES (%s, %s, %s, %s, %s, TRUE)
            ON CONFLICT (name) DO UPDATE SET
                category = EXCLUDED.category,
                subject = EXCLUDED.subject,
                body = EXCLUDED.body,
                variables = EXCLUDED.variables,
                updated_at = CURRENT_TIMESTAMP
        """, (
            t['name'], t['category'], t['subject'], t['body'], t['variables']
        ))
    
    log_info(f"   ✅ Synchronized {len(templates)} system templates", "maintenance")

if __name__ == "__main__":
    run_fix()
