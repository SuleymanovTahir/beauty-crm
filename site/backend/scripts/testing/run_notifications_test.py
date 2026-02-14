"""
Комплексный тест системы уведомлений и рассылок.
Проверяет UniversalMessenger, шаблоны, логирование и рассылки.
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta

# Добавляем путь к backend для импортов
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from db.connection import get_db_connection
from services.universal_messenger import send_universal_message
from crm_api.broadcasts import BroadcastRequest, process_broadcast_sending
from utils.logger import log_info, log_error

async def run_notifications_test():
    print("🧪 Запуск тестирования системы уведомлений...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Проверка наличия тестового пользователя (админа или директора)
        c.execute("SELECT id, username, email, telegram_chat_id FROM users WHERE role IN ('admin', 'director') ORDER BY id ASC LIMIT 1")
        admin = c.fetchone()
        
        if not admin:
            # Fallback: любой сотрудник
            c.execute("SELECT id, username, email, telegram_chat_id FROM users WHERE role = 'employee' LIMIT 1")
            admin = c.fetchone()
            
        if not admin:
            print("❌ Тестовый пользователь не найден в базе!")
            return
        
        admin_id, admin_user, admin_email, admin_tg = admin
        print(f"✅ Используем админа: {admin_user} (ID: {admin_id})")

        # Настройка реальных данных для теста
        real_email = "ii3391609@gmail.com"
        real_tg_id = "906813754"

        # 2. Тест UniversalMessenger (In-App)
        print("\n--- [1] Тест In-App уведомления ---")
        c.execute("SELECT id, username FROM users WHERE role IN ('admin', 'director', 'manager') AND is_active = TRUE")
        staff_users = c.fetchall()
        
        for s_id, s_name in staff_users:
            res = await send_universal_message(
                recipient_id=str(s_id),
                text=f"Тестовое уведомление для {s_name}",
                platform='in_app',
                user_id=s_id,
                subject="Проверка системы"
            )
            if res.get("success"):
                print(f"✅ In-App для {s_name} отправлено!")

        # 3. Тест шаблонизатора (Клиентские письма)
        print("\n--- [2] Тест красивых писем (Email) ---")
        
        # 3.1 Запись
        print("📨 Отправка подтверждения записи...")
        res_booking = await send_universal_message(
            recipient_id=real_email,
            template_name="booking_confirmation",
            context={
                "name": "Турсунай",
                "service": "Комплексный уход",
                "master": "Гуля",
                "date": "12.02.2026",
                "time": "14:00"
            },
            platform='email'
        )
        if res_booking.get("success"):
            print("✅ Письмо о записи успешно отправлено!")

        # 3.2 День рождения
        print("📨 Отправка поздравления с днем рождения...")
        res_bday = await send_universal_message(
            recipient_id=real_email,
            template_name="birthday_greeting",
            context={
                "name": "Турсунай"
            },
            platform='email'
        )
        if res_bday.get("success"):
            print("✅ Письмо о дне рождения успешно отправлено!")
            
        if not res_booking.get("success") or not res_bday.get("success"):
            print(f"❌ Ошибки при отправке: {res_booking.get('error')} / {res_bday.get('error')}")

        # 4. Тест мастер-уведомлений (Подготовка данных)
        print("\n--- [3] Тест через master_notifications ---")
        
        c.execute("""
            UPDATE users SET telegram_chat_id = %s, email = %s 
            WHERE id = %s
        """, (real_tg_id, real_email, admin_id))
        conn.commit()
        
        from notifications.master_notifications import notify_master_about_booking
        res_master = await notify_master_about_booking(
            master_name=admin_user, 
            client_name="Клиент Тест",
            service="Маникюр",
            datetime_str="2026-02-12 10:00",
            booking_id=999,
            notification_type="new_booking"
        )
        print(f"✅ Результаты мастера: {res_master}")

        # 5. Тест рассылки (A/B тест на себе)
        print("\n--- [4] Тест рассылки (A/B) ---")
        broadcast = BroadcastRequest(
            subscription_type="promotions",
            channels=["notification", "email", "telegram"], 
            subject="A/B Тест Рассылка (Real)",
            message="Тестовое сообщение для проверки почты и ТГ",
            user_ids=[admin_id], 
            force_send=True,
            template_name="birthday_greeting", 
            template_b_name="birthday_greeting", 
            split_ratio=0.5
        )
        
        await process_broadcast_sending(broadcast, admin_id)
        print("✅ Процесс рассылки завершен")

        # 6. Проверка статистики
        print("\n--- [5] Проверка аналитики ---")
        c.execute("""
            SELECT status, COUNT(*) 
            FROM unified_communication_log 
            WHERE created_at > NOW() - INTERVAL '1 hour'
            GROUP BY status
        """)
        stats = c.fetchall()
        print(f"📊 Логи за последний час: {dict(stats)}")

    except Exception as e:
        log_error(f"❌ Ошибка при выполнении тестов: {e}", "testing")
        print(f"❌ Ошибка: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(run_notifications_test())
