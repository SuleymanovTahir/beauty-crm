#!/usr/bin/env python3
"""
Тестирование новых функций 1-4:
1. Dashboard с KPI
2. Расписание мастеров
3. Программа лояльности
4. Автозаполнение окон
"""
import sys
import os
from datetime import datetime, timedelta

# Добавляем путь к backend
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from tests.config import get_test_config
TEST_CONFIG = get_test_config()

from services.analytics import AnalyticsService
from services.master_schedule import MasterScheduleService
from services.loyalty import LoyaltyService
from services.auto_booking import AutoBookingService

def print_section(title):
    """Печать заголовка секции"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def print_subsection(title):
    """Печать подзаголовка"""
    print(f"\n--- {title} ---")

def test_analytics():
    """Тест 1: Dashboard с KPI и аналитикой"""
    print_section("ТЕСТ 1: Dashboard с KPI и аналитикой")

    try:
        analytics = AnalyticsService()

        # Тест 1.1: KPI за месяц
        print_subsection("KPI за текущий месяц")
        kpi = analytics.get_dashboard_kpi(period="month")

        print(f"✅ Доход:")
        print(f"   - Общий: {kpi['revenue']['total']} AED")
        print(f"   - Средний чек: {kpi['revenue']['average_check']} AED")
        print(f"   - Прогноз: {kpi['revenue']['forecast']} AED")

        print(f"\n✅ Записи:")
        print(f"   - Всего: {kpi['bookings']['total']}")
        print(f"   - Завершено: {kpi['bookings']['completed']}")
        print(f"   - Отменено: {kpi['bookings']['cancelled']}")
        print(f"   - Коэффициент завершения: {kpi['bookings']['completion_rate']}%")

        print(f"\n✅ Клиенты:")
        print(f"   - Новые: {kpi['clients']['new']}")
        print(f"   - Вернувшиеся: {kpi['clients']['returning']}")
        print(f"   - Удержание: {kpi['clients']['retention']}%")
        print(f"   - LTV: {kpi['clients']['ltv']} AED")

        print(f"\n✅ Топ-5 мастеров:")
        for i, master in enumerate(kpi['masters']['top_masters'], 1):
            print(f"   {i}. {master['name']} - {master['revenue']} AED ({master['bookings']} записей)")

        print(f"\n✅ Топ-5 услуг:")
        for i, service in enumerate(kpi['services']['top_services'], 1):
            print(f"   {i}. {service['name']} - {service['revenue']} AED ({service['bookings']}x)")

        # Тест 1.2: Тренды
        print_subsection("Сравнение с предыдущим периодом")
        if kpi['trends']:
            print(f"   Изменение дохода: {kpi['trends']['revenue_change_percent']:+.1f}%")
            print(f"   Изменение записей: {kpi['trends']['bookings_change_percent']:+.1f}%")

        return True

    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_master_schedule():
    """Тест 2: Расписание мастеров"""
    print_section("ТЕСТ 2: Расписание мастеров")

    try:
        # Создаем тестового мастера в таблице users
        from tests.test_utils import create_test_user
        test_master = "Анна"

        # Создаем пользователя с уникальным username
        user_id = create_test_user("test_anna", test_master, "employee", "Stylist")

        schedule = MasterScheduleService()

        # Тест 2.1: Установка рабочих часов
        print_subsection("Установка рабочих часов")
        # Устанавливаем: Пн-Пт из конфига
        work_start = TEST_CONFIG['work_start_weekday']
        work_end = TEST_CONFIG['work_end_weekday']
        for day in range(5):
            schedule.set_working_hours(test_master, day, work_start, work_end)
        print(f"✅ Рабочие часы установлены (Пн-Пт, {work_start}-{work_end})")

        # Тест 2.4: Получение доступных слотов
        today = datetime.now().strftime('%Y-%m-%d')
        print_subsection("Доступные слоты на сегодня")
        slots = schedule.get_available_slots(test_master, today, duration_minutes=60)
        print(f"   Доступно слотов для '{test_master}': {len(slots)}")
        if slots:
            print(f"   Первые 5 слотов: {', '.join(slots[:5])}")

        # Тест 2.5: Проверка доступности
        print_subsection("Проверка доступности")
        test_time = TEST_CONFIG['test_time_afternoon']
        is_available = schedule.is_master_available(test_master, today, test_time)
        print(f"   Доступен ли мастер сегодня в {test_time}: {'✅ Да' if is_available else '❌ Нет'}")

        # Тест 2.6: Доступность всех мастеров
        print_subsection("Доступность всех мастеров")
        all_availability = schedule.get_all_masters_availability(today)
        for master_name, master_slots in all_availability.items():
            print(f"   {master_name}: {len(master_slots)} слотов")

        return True

    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Cleanup test employee
        try:
            from tests.test_utils import cleanup_test_users
            cleanup_test_users("test_anna")
        except Exception:
            pass

def test_loyalty_program():
    """Тест 3: Программа лояльности"""
    print_section("ТЕСТ 3: Программа лояльности")

    try:
        # Create test client
        from db.connection import get_db_connection
        conn = get_db_connection()
        c = conn.cursor()
        test_client = "test_client_123"
        
        # Check if client exists
        c.execute("SELECT instagram_id FROM clients WHERE instagram_id = %s", (test_client,))
        if not c.fetchone():
            c.execute("""
                INSERT INTO clients (instagram_id, username, name, phone, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (test_client, test_client, "Test Client Loyalty", "+1234567890", "active", datetime.now().isoformat()))
            conn.commit()
        conn.close()

        loyalty = LoyaltyService()

        # Тест 3.1: Получение данных лояльности
        print_subsection("Получение данных лояльности клиента")
        client_loyalty = loyalty.get_client_loyalty(test_client)
        print(f"   Уровень: {client_loyalty['loyalty_level']}")
        print(f"   Всего баллов: {client_loyalty['total_points']}")
        print(f"   Доступно: {client_loyalty['available_points']}")
        print(f"   Потрачено: {client_loyalty['spent_points']}")

        # Тест 3.2: Начисление баллов
        print_subsection("Начисление баллов")
        earned = loyalty.earn_points(
            test_client,
            100,
            "Тестовая запись на маникюр",
            booking_id=None,
            expires_days=365
        )
        if earned:
            print(f"   ✅ Начислено 100 баллов")
            client_loyalty = loyalty.get_client_loyalty(test_client)
            print(f"   Новый баланс: {client_loyalty['available_points']} баллов")

        # Тест 3.3: Все уровни лояльности
        print_subsection("Уровни лояльности")
        levels = loyalty.get_all_levels()
        for level in levels:
            print(f"   {level['level_name'].upper()}: от {level['min_points']} баллов")
            print(f"      - Скидка: {level['discount_percent']}%")
            print(f"      - Множитель: x{level['points_multiplier']}")

        # Тест 3.4: Расчет скидки
        print_subsection("Расчет скидки")
        discount = loyalty.calculate_discount(test_client, 500.0)
        print(f"   Цена: {discount['original_price']} AED")
        print(f"   Скидка: {discount['discount_percent']}% ({discount['discount_amount']} AED)")
        print(f"   Итого: {discount['final_price']} AED")
        print(f"   Уровень: {discount['loyalty_level']}")

        # Тест 3.5: История транзакций
        print_subsection("История транзакций")
        transactions = loyalty.get_transaction_history(test_client, limit=5)
        print(f"   Всего транзакций: {len(transactions)}")
        for i, tx in enumerate(transactions[:3], 1):
            print(f"   {i}. {tx['type']}: {tx['points']:+d} баллов - {tx['reason']}")

        # Тест 3.6: Баллы за запись
        print_subsection("Вычисление баллов за запись")
        points_500 = loyalty.points_for_booking(500)
        points_1000 = loyalty.points_for_booking(1000)
        print(f"   За запись 500 AED: {points_500} баллов")
        print(f"   За запись 1000 AED: {points_1000} баллов")

        return True

    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_auto_booking():
    """Тест 4: Автозаполнение окон"""
    print_section("ТЕСТ 4: Автозаполнение окон записи")

    try:
        auto_booking = AutoBookingService()
        today = datetime.now().strftime('%Y-%m-%d')
        week_later = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')

        # Тест 4.1: Поиск клиентов для слотов
        print_subsection("Рекомендации клиентов для доступных слотов")
        recommendations = auto_booking.find_clients_for_slots(
            date=today,
            master_name=None,  # Все мастера
            min_days_since_visit=21
        )

        print(f"   Найдено рекомендаций: {len(recommendations)}")

        if recommendations:
            print(f"\n   Топ-5 рекомендаций:")
            for i, rec in enumerate(recommendations[:5], 1):
                print(f"   {i}. {rec['client_name']} ({rec['client_id']})")
                print(f"      - Мастер: {rec['master']}")
                print(f"      - Время: {rec['date']} {rec['time']}")
                print(f"      - Услуга: {rec['service']}")
                print(f"      - Уверенность: {rec['confidence']*100:.0f}%")
                print(f"      - Причина: {rec['reason']}")
        else:
            print(f"   ℹ️  Нет рекомендаций (возможно, нет свободных слотов или подходящих клиентов)")

        # Тест 4.2: Недогруженные слоты
        print_subsection("Анализ недогруженных слотов на неделю")
        underutilized = auto_booking.get_underutilized_slots(today, week_later)

        if underutilized:
            print(f"   Найдено мастеров с доступными слотами: {len(underutilized)}")
            for master, info in underutilized.items():
                print(f"\n   {master}:")
                print(f"      - Всего свободных слотов: {info['total_available_slots']}")
                print(f"      - Дней с доступностью: {len(info['dates_with_availability'])}")

                if info['dates_with_availability']:
                    first_day = info['dates_with_availability'][0]
                    print(f"      - Пример ({first_day['date']}): {first_day['available_slots']} слотов")
        else:
            print(f"   ℹ️  Все слоты заполнены или нет данных о расписании")

        # Тест 4.3: Автоматические предложения на день
        print_subsection("Автоматические предложения на сегодня")
        daily_suggestions = auto_booking.auto_suggest_bookings(today, max_suggestions=5)

        print(f"   Предложений на сегодня: {len(daily_suggestions)}")
        for i, sug in enumerate(daily_suggestions, 1):
            print(f"   {i}. {sug['client_name']} -> {sug['master']} в {sug['time']}")
            print(f"      Уверенность: {sug['confidence']*100:.0f}%")

        return True

    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_webrtc_call_state_security():
    """Тест 5: Изоляция состояний звонка между пользователями"""
    print_section("ТЕСТ 5: Защита и изоляция звонков WebRTC")

    caller_prefix = "test_webrtc_caller"
    callee_prefix = "test_webrtc_callee"
    intruder_prefix = "test_webrtc_intruder"

    try:
        from tests.test_utils import create_test_user
        from db.connection import get_db_connection
        from crm_api.webrtc_signaling import (
            accept_call_session,
            get_user_call_state,
            is_call_peer,
            mark_user_connected,
            mark_user_disconnected,
            release_call_session,
            reserve_call_session,
        )

        caller_id = create_test_user(caller_prefix, "Test WebRTC Caller", "admin", "Administrator", False)
        callee_id = create_test_user(callee_prefix, "Test WebRTC Callee", "employee", "Stylist")
        intruder_id = create_test_user(intruder_prefix, "Test WebRTC Intruder", "employee", "Stylist")

        conn = get_db_connection()
        c = conn.cursor()
        for user_id in [caller_id, callee_id, intruder_id]:
            c.execute("""
                INSERT INTO user_status (
                    user_id, is_online, is_dnd, call_status, current_call_peer_id, ws_connection_count, call_updated_at, updated_at
                )
                VALUES (%s, TRUE, FALSE, 'available', NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE
                SET is_online = TRUE,
                    is_dnd = FALSE,
                    call_status = 'available',
                    current_call_peer_id = NULL,
                    ws_connection_count = 0,
                    call_updated_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id,))
        conn.commit()
        conn.close()

        print_subsection("Глобальный online/offline по нескольким WS-сессиям")
        first_connect = mark_user_connected(caller_id)
        second_connect = mark_user_connected(caller_id)
        caller_state = get_user_call_state(caller_id)
        assert first_connect.get("became_online") is True
        assert second_connect.get("became_online") is False
        assert caller_state["is_online"] is True
        assert caller_state["ws_connection_count"] == 2
        print("   ✅ Первый connect включает online, второй только увеличивает общий счетчик")

        first_disconnect = mark_user_disconnected(caller_id)
        caller_state = get_user_call_state(caller_id)
        assert first_disconnect.get("became_offline") is False
        assert caller_state["is_online"] is True
        assert caller_state["ws_connection_count"] == 1
        print("   ✅ При закрытии одной WS-сессии пользователь остается online")

        second_disconnect = mark_user_disconnected(caller_id)
        caller_state = get_user_call_state(caller_id)
        assert second_disconnect.get("became_offline") is True
        assert caller_state["is_online"] is False
        assert caller_state["ws_connection_count"] == 0
        print("   ✅ Offline наступает только после закрытия последней WS-сессии")

        reconnect = mark_user_connected(caller_id)
        caller_state = get_user_call_state(caller_id)
        assert reconnect.get("became_online") is True
        assert caller_state["is_online"] is True
        assert caller_state["ws_connection_count"] == 1
        print("   ✅ Пользователь корректно возвращается online после повторного подключения")

        print_subsection("Резервирование звонка между двумя пользователями")
        reserve_result = reserve_call_session(caller_id, callee_id)
        assert reserve_result.get("ok") is True
        caller_state = get_user_call_state(caller_id)
        callee_state = get_user_call_state(callee_id)
        assert caller_state["call_status"] == "calling"
        assert caller_state["peer_id"] == callee_id
        assert callee_state["call_status"] == "ringing"
        assert callee_state["peer_id"] == caller_id
        print("   ✅ Звонок зарезервирован, peer/state записаны в общей БД")

        print_subsection("Блокировка второго звонящего к уже занятому пользователю")
        intruder_result = reserve_call_session(intruder_id, callee_id)
        assert intruder_result.get("ok") is False
        assert intruder_result.get("reason") == "busy"
        print("   ✅ Второй пользователь получил отказ, состояние не пересеклось")

        print_subsection("Принятие звонка и перевод в BUSY")
        accept_result = accept_call_session(callee_id, caller_id)
        assert accept_result.get("ok") is True
        caller_state = get_user_call_state(caller_id)
        callee_state = get_user_call_state(callee_id)
        assert caller_state["call_status"] == "busy"
        assert callee_state["call_status"] == "busy"
        assert is_call_peer(caller_id, callee_id) is True
        assert is_call_peer(callee_id, caller_id) is True
        print("   ✅ После accept оба участника находятся в BUSY и связаны только друг с другом")

        print_subsection("Освобождение состояния звонка")
        release_result = release_call_session(caller_id, callee_id)
        assert release_result.get("peer_id") == callee_id
        caller_state = get_user_call_state(caller_id)
        callee_state = get_user_call_state(callee_id)
        assert caller_state["call_status"] == "available"
        assert caller_state["peer_id"] is None
        assert callee_state["call_status"] == "available"
        assert callee_state["peer_id"] is None
        print("   ✅ После hangup/release оба пользователя снова доступны")

        return True
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        try:
            from tests.test_utils import cleanup_test_users
            cleanup_test_users(caller_prefix)
            cleanup_test_users(callee_prefix)
            cleanup_test_users(intruder_prefix)
        except Exception:
            pass

def main():
    """Запуск всех тестов"""
    print("\n" + "="*80)
    print("  ТЕСТИРОВАНИЕ НОВЫХ ФУНКЦИЙ CRM")
    print("="*80)
    print(f"  Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)

    results = {
        "Dashboard с KPI": test_analytics(),
        "Расписание мастеров": test_master_schedule(),
        "Программа лояльности": test_loyalty_program(),
        "Автозаполнение окон": test_auto_booking(),
        "Защита состояний звонка": test_webrtc_call_state_security()
    }

    # Итоги
    print_section("ИТОГИ ТЕСТИРОВАНИЯ")

    for feature, success in results.items():
        status = "✅ УСПЕШНО" if success else "❌ ОШИБКА"
        print(f"  {feature}: {status}")

    total_success = sum(results.values())
    total_tests = len(results)

    print(f"\n  Пройдено: {total_success}/{total_tests}")

    if total_success == total_tests:
        print("\n  🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
    else:
        print("\n  ⚠️  Некоторые тесты завершились с ошибками")

    print("="*80 + "\n")
    
    # Автоматическая очистка тестовых данных после успешных тестов
    if total_success == total_tests:
        try:
            from tests.test_cleanup import cleanup_after_test
            print("\n" + "="*80)
            print("  ОЧИСТКА ТЕСТОВЫХ ДАННЫХ")
            print("="*80)
            cleanup_after_test(test_clients=['test_client_123'], verbose=True)
        except Exception as e:
            print(f"   ⚠️  Ошибка очистки: {e}")
        return True
    
    return False

if __name__ == "__main__":
    main()
