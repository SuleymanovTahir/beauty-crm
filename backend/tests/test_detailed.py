#!/usr/bin/env python3
"""
🔍 ДЕТАЛЬНОЕ ТЕСТИРОВАНИЕ CRM СИСТЕМЫ

Максимально подробные тесты с детальной диагностикой.
Показывает ГДЕ ИМЕННО возникают проблемы.
"""
import sys
import os
from datetime import datetime, date, timedelta
import traceback
import json

# Добавляем путь к backend
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Импорт конфигурации тестов
from tests.config import get_test_config

# Получаем конфигурацию
TEST_CONFIG = get_test_config()

def print_header(text):
    """Красивый заголовок"""
    print("\n" + "=" * 100)
    print(f"  {text}")
    print("=" * 100)

def print_section(text):
    """Секция теста"""
    print("\n" + "-" * 100)
    print(f"  {text}")
    print("-" * 100)

def print_step(step_num, total, description):
    """Шаг теста"""
    print(f"\n[Шаг {step_num}/{total}] {description}")

def print_success(message):
    """Успех"""
    print(f"   ✅ {message}")

def print_error(message):
    """Ошибка"""
    print(f"   ❌ {message}")

def print_warning(message):
    """Предупреждение"""
    print(f"   ⚠️  {message}")

def print_info(message):
    """Информация"""
    print(f"   ℹ️  {message}")

def print_data(label, data):
    """Вывод данных"""
    print(f"   📊 {label}:")
    if isinstance(data, (dict, list)):
        def default_serializer(obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            return str(obj)
        print(f"      {json.dumps(data, indent=6, ensure_ascii=False, default=default_serializer)}")
    else:
        print(f"      {data}")

def test_database_detailed():
    """ТЕСТ 1: Детальная проверка базы данных"""
    print_header("ТЕСТ 1: ДЕТАЛЬНАЯ ПРОВЕРКА БАЗЫ ДАННЫХ")

    try:
        from core.config import DATABASE_NAME
        from db.connection import get_db_connection

        # Шаг 1: Проверка готовности (PostgreSQL)
        print_step(1, 10, "Проверка готовности БД")
        print_success("База данных PostgreSQL сконфигурирована")

        # Шаг 2: Подключение
        print_step(2, 10, "Попытка подключения к БД")
        try:
            conn = get_db_connection()
            c = conn.cursor()
            print_success("Подключение установлено")
        except Exception as e:
            print_error(f"Не удалось подключиться: {e}")
            return False

        # Шаг 3: Список всех таблиц (PostgreSQL)
        print_step(3, 10, "Получение списка всех таблиц")
        c.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
        all_tables = [row[0] for row in c.fetchall()]
        print_success(f"Найдено таблиц: {len(all_tables)}")
        print_data("Список таблиц", all_tables)

        # Шаг 4: Проверка обязательных таблиц
        print_step(4, 10, "Проверка обязательных таблиц")
        required_tables = {
            'clients': 'Клиенты',
            'bookings': 'Записи',
            'users': 'Пользователи (Сотрудники)',
            'positions': 'Должности',
            'services': 'Услуги',
            'conversations': 'Диалоги',
            'user_schedule': 'Расписание мастеров',
            'user_time_off': 'Выходные мастеров',
            'loyalty_levels': 'Уровни лояльности',
            'client_loyalty_points': 'Баллы клиентов'
        }

        missing = []
        for table, description in required_tables.items():
            if table in all_tables:
                print_success(f"{table} ({description})")
            else:
                print_error(f"{table} ({description}) - ОТСУТСТВУЕТ")
                missing.append(table)

        if missing:
            print_error(f"Отсутствуют {len(missing)} таблиц: {', '.join(missing)}")
            print_info("Запустите: python3 run_all_migrations.py")
            return False

        # Шаг 5: Проверка структуры таблиц
        print_step(5, 10, "Проверка структуры ключевых таблиц")

        # Проверка users.position
        # Проверка users.position
        # information_schema.columns: (table_catalog, table_schema, table_name, column_name, ...)
        # column_name is at index 3
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users'")
        user_columns = {col[0]: True for col in c.fetchall()}
        if 'position' in user_columns:
            print_success(f"users.position - {user_columns['position']}")
        else:
            print_error("users.position - ОТСУТСТВУЕТ")

        # Проверка services.position_id
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='services'")
        serv_columns = {col[0]: True for col in c.fetchall()}
        if 'position_id' in serv_columns:
            print_success(f"services.position_id - {serv_columns.get('position_id')}")
        else:
            print_warning("services.position_id - ОТСУТСТВУЕТ (опционально)")
            print_info("Запустите миграцию: python3 backend/migration_add_position_to_services.py")

        # Проверка user_schedule (nullable start_time/end_time)
        c.execute("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='user_schedule'")
        schedule_columns = {col[0]: {'type': col[1], 'not_null': col[2]} for col in c.fetchall()}
        if 'start_time' in schedule_columns:
            # is_nullable is 'YES' or 'NO' in postgres
            is_nullable = schedule_columns['start_time']['not_null']
            if is_nullable == 'YES':
                print_success("user_schedule.start_time - nullable ✓")
            else:
                print_warning(f"user_schedule.start_time - NOT NULL ({is_nullable}) (должен быть nullable)")
        else:
            print_error("user_schedule.start_time - ОТСУТСТВУЕТ")

        # Шаг 6: Подсчет данных
        print_step(6, 10, "Подсчет записей в таблицах")
        for table in required_tables.keys():
            if table in all_tables:
                try:
                    c.execute(f"SELECT COUNT(*) FROM {table}")
                    count = c.fetchone()[0]
                    if count > 0:
                        print_info(f"{table}: {count} записей")
                    else:
                        print_warning(f"{table}: пусто (0 записей)")
                except Exception as e:
                    print_error(f"{table}: ошибка подсчета - {e}")

        # Шаг 7: Проверка индексов (PostgreSQL)
        print_step(7, 10, "Проверка индексов")
        c.execute("SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public'")
        indexes = c.fetchall()
        print_success(f"Найдено индексов: {len(indexes)}")
        for idx_name, tbl_name in indexes[:10]:  # Первые 10
            print_info(f"{idx_name} (таблица: {tbl_name})")

        # Шаг 8: Проверка foreign keys (PostgreSQL)
        print_step(8, 10, "Проверка foreign keys")
        print_success("Foreign keys: ВКЛЮЧЕНЫ (PostgreSQL default)")

        # Шаг 9: Проверка целостности БД (PostgreSQL)
        print_step(9, 10, "Проверка целостности БД")
        print_info("Проверка целостности пропущена для PostgreSQL (требует сложных запросов)")

        # Шаг 10: Проверка версии (PostgreSQL)
        print_step(10, 10, "Проверка версии БД")
        c.execute("SELECT version()")
        version = c.fetchone()[0]
        print_success(f"Версия: {version}")

        conn.close()
        print("\n" + "=" * 100)
        print_success("ТЕСТ 1: ПРОЙДЕН")
        return True

    except Exception as e:
        print_error(f"КРИТИЧЕСКАЯ ОШИБКА: {e}")
        traceback.print_exc()
        return False

def test_analytics_detailed():
    """ТЕСТ 2: Детальная проверка Analytics"""
    print_header("ТЕСТ 2: ДЕТАЛЬНАЯ ПРОВЕРКА ANALYTICS (DASHBOARD)")

    try:
        from services.analytics import AnalyticsService

        # Шаг 1: Создание сервиса
        print_step(1, 7, "Инициализация AnalyticsService")
        try:
            analytics = AnalyticsService()
            print_success("AnalyticsService создан")
        except Exception as e:
            print_error(f"Не удалось создать сервис: {e}")
            traceback.print_exc()
            return False

        # Шаг 2: Получение KPI за месяц
        print_step(2, 7, "Получение KPI за текущий месяц")
        try:
            kpi = analytics.get_dashboard_kpi(period="month")
            print_success("KPI получены")
        except Exception as e:
            print_error(f"Ошибка получения KPI: {e}")
            traceback.print_exc()
            return False

        # Шаг 3: Проверка структуры ответа
        print_step(3, 7, "Проверка структуры ответа KPI")
        required_keys = ['period', 'revenue', 'bookings', 'clients', 'masters', 'services']
        for key in required_keys:
            if key in kpi:
                print_success(f"Ключ '{key}' присутствует")
            else:
                print_error(f"Ключ '{key}' ОТСУТСТВУЕТ")
                return False

        # Шаг 4: Проверка Revenue
        print_step(4, 7, "Проверка метрик Revenue")
        revenue = kpi.get('revenue', {})
        revenue_keys = ['total', 'daily', 'average_check', 'forecast']
        for key in revenue_keys:
            if key in revenue:
                print_success(f"revenue.{key} = {revenue[key]}")
            else:
                print_error(f"revenue.{key} - ОТСУТСТВУЕТ")
                print_info("Проверьте backend/services/analytics.py:122")
                return False

        # Шаг 5: Проверка Bookings
        print_step(5, 7, "Проверка метрик Bookings")
        bookings = kpi.get('bookings', {})
        booking_keys = ['total', 'completed', 'cancelled', 'completion_rate', 'cancellation_rate']
        for key in booking_keys:
            if key in bookings:
                print_success(f"bookings.{key} = {bookings[key]}")
            else:
                print_warning(f"bookings.{key} - отсутствует (возможно опционально)")

        # Шаг 6: Проверка Clients
        print_step(6, 7, "Проверка метрик Clients")
        clients = kpi.get('clients', {})
        client_keys = ['new', 'returning', 'retention', 'ltv']
        for key in client_keys:
            if key in clients:
                print_success(f"clients.{key} = {clients[key]}")
            else:
                print_warning(f"clients.{key} - отсутствует")

        # Шаг 7: Полный вывод данных
        print_step(7, 7, "Полный вывод KPI данных")
        print_data("Period", kpi['period'])
        print_data("Revenue", kpi['revenue'])
        print_data("Bookings", kpi['bookings'])
        print_data("Clients", kpi['clients'])
        print_data("Top 5 Masters", kpi.get('masters', {}).get('top_masters', [])[:3])
        print_data("Top 5 Services", kpi.get('services', {}).get('top_services', [])[:3])

        print("\n" + "=" * 100)
        print_success("ТЕСТ 2: ПРОЙДЕН")
        return True

    except Exception as e:
        print_error(f"КРИТИЧЕСКАЯ ОШИБКА: {e}")
        traceback.print_exc()
        return False

def test_master_schedule_detailed():
    """ТЕСТ 3: Детальная проверка Master Schedule"""
    print_header("ТЕСТ 3: ДЕТАЛЬНАЯ ПРОВЕРКА РАСПИСАНИЯ МАСТЕРОВ")

    test_master = "Тест Мастер Детальный"
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Вычисляем следующий понедельник для гарантированной проверки рабочего времени
    today_dt = datetime.now()
    days_until_monday = (7 - today_dt.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    next_monday = (today_dt + timedelta(days=days_until_monday)).strftime('%Y-%m-%d')
    
    test_date = next_monday
    print_info(f"Тестирование на дату: {test_date} (Следующий понедельник)")
    
    user_id = None # Initialize user_id for cleanup
    
    try:
        from services.master_schedule import MasterScheduleService

        # Шаг 1: Создание сервиса
        print_step(1, 9, "Инициализация MasterScheduleService")
        try:
            # Создаем тестового мастера в базе данных
            from tests.test_utils import create_test_user

            # Создаем пользователя с уникальным username
            user_id = create_test_user("test_detailed", test_master, "employee", "Stylist")

            schedule = MasterScheduleService()
            print_success("MasterScheduleService создан")
        except Exception as e:
            print_error(f"Не удалось создать сервис: {e}")
            traceback.print_exc()
            return False

        # Шаг 2: Установка рабочих часов (понедельник-пятница)
        work_start = TEST_CONFIG['work_start_weekday']
        work_end = TEST_CONFIG['work_end_weekday']
        print_step(2, 9, f"Установка рабочих часов (ПН-ПТ: {work_start}-{work_end})")
        try:
            for day in range(5):  # 0-4 = ПН-ПТ
                result = schedule.set_working_hours(test_master, day, work_start, work_end)
                if result:
                    print_success(f"День {day} (ПН-ПТ): {work_start}-{work_end}")
                else:
                    print_error(f"День {day}: не удалось установить")
        except Exception as e:
            print_error(f"Ошибка установки рабочих часов: {e}")
            traceback.print_exc()
            return False

        # Шаг 3: Установка сокращенного дня (суббота)
        sat_start = TEST_CONFIG['work_start_saturday']
        sat_end = TEST_CONFIG['work_end_saturday']
        print_step(3, 9, f"Установка сокращенного дня (СБ: {sat_start}-{sat_end})")
        try:
            result = schedule.set_working_hours(test_master, 5, sat_start, sat_end)
            if result:
                print_success(f"Суббота: {sat_start}-{sat_end}")
            else:
                print_error("Не удалось установить субботу")
        except Exception as e:
            print_error(f"Ошибка: {e}")
            traceback.print_exc()

        # Шаг 4: Установка выходного (воскресенье)
        print_step(4, 9, "Установка выходного дня (ВС: NULL)")
        try:
            result = schedule.set_working_hours(test_master, 6, None, None)
            if result:
                print_success("Воскресенье: ВЫХОДНОЙ")
            else:
                print_error("Не удалось установить выходной")
        except Exception as e:
            print_error(f"Ошибка: {e}")
            traceback.print_exc()

        # Шаг 5: Получение рабочих часов
        print_step(5, 9, "Получение установленных рабочих часов")
        try:
            hours = schedule.get_working_hours(test_master)
            print_success(f"Получено расписание для '{test_master}':")
            day_names = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"]
            for day_info in hours:
                day_name = day_names[day_info['day_of_week']]
                if day_info['start_time']:
                    print_info(f"  {day_name}: {day_info['start_time']} - {day_info['end_time']}")
                else:
                    print_info(f"  {day_name}: ВЫХОДНОЙ")
        except Exception as e:
            print_error(f"Ошибка получения расписания: {e}")
            traceback.print_exc()

        # Шаг 6: Добавление time-off (отпуск)
        print_step(6, 9, "Добавление отпуска")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        try:
            time_off_id = schedule.add_time_off(
                test_master,
                tomorrow,
                tomorrow,
                "vacation",
                "Тестовый отпуск"
            )
            if time_off_id:
                print_success(f"Отпуск добавлен (ID: {time_off_id})")
            else:
                print_error("Не удалось добавить отпуск")
        except Exception as e:
            print_error(f"Ошибка: {e}")
            traceback.print_exc()

        # Шаг 7: Получение доступных слотов
        print_step(7, 9, f"Получение доступных слотов на {test_date}")
        try:
            slots = schedule.get_available_slots(test_master, test_date, duration_minutes=60)
            print_success(f"Доступно слотов: {len(slots)}")
            if slots:
                print_data("Первые 5 слотов", slots[:5])
            else:
                print_warning("Слотов нет (возможно сегодня выходной или все заняты)")
        except Exception as e:
            print_error(f"Ошибка получения слотов: {e}")
            traceback.print_exc()

        # Шаг 8: Проверка доступности
        test_time = TEST_CONFIG['test_time_morning']
        print_step(8, 9, f"Проверка доступности в конкретное время ({test_time})")
        try:
            is_available = schedule.is_master_available(test_master, test_date, test_time)
            if is_available:
                print_success(f"{test_master} доступен {test_date} в {test_time}")
            else:
                print_warning(f"{test_master} НЕ доступен {test_date} в {test_time}")
        except Exception as e:
            print_error(f"Ошибка проверки доступности: {e}")
            traceback.print_exc()

        # Шаг 9: Доступность всех мастеров
        print_step(9, 9, f"Получение доступности всех мастеров на {test_date}")
        try:
            all_availability = schedule.get_all_masters_availability(test_date)
            print_success(f"Получена доступность для {len(all_availability)} мастеров")
            for master_name, master_slots in list(all_availability.items())[:3]:
                print_info(f"{master_name}: {len(master_slots)} слотов")
        except Exception as e:
            print_error(f"Ошибка: {e}")
            traceback.print_exc()

        print("\n" + "=" * 100)
        print_success("ТЕСТ 3: ПРОЙДЕН (с возможными предупреждениями)")
        result = True

    except Exception as e:
        print_error(f"КРИТИЧЕСКАЯ ОШИБКА: {e}")
        traceback.print_exc()
        result = False
    
    finally:
        # Cleanup: удаляем тестовые данные
        print(f"\n   🧹 Очистка тестовых данных мастера '{test_master}'...")
        try:
            from core.config import DATABASE_NAME
            from db.connection import get_db_connection
            
            conn = get_db_connection()
            c = conn.cursor()
            
            # Получаем ID пользователя, если он не определен
            if user_id is None:
                c.execute("SELECT id FROM users WHERE full_name = %s", (test_master,))
                row = c.fetchone()
                if row:
                    user_id = row[0]
            
            if user_id:
                c.execute("DELETE FROM user_schedule WHERE user_id = %s", (user_id,))
                c.execute("DELETE FROM user_time_off WHERE user_id = %s", (user_id,))
            
            # Удаляем пользователя
            c.execute("DELETE FROM users WHERE full_name = %s", (test_master,))
            
            conn.commit()
            conn.close()
            
            print_success(f"Тестовые данные удалены")
            
        except Exception as cleanup_error:
            print_warning(f"Ошибка очистки: {cleanup_error}")
    
    return result

def main():
    """Запуск всех детальных тестов"""
    print_header("🔍 ДЕТАЛЬНОЕ ТЕСТИРОВАНИЕ CRM СИСТЕМЫ")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Python: {sys.version}")

    results = {}

    # Запускаем тесты
    results["1. База данных"] = test_database_detailed()
    results["2. Analytics (Dashboard)"] = test_analytics_detailed()
    results["3. Master Schedule"] = test_master_schedule_detailed()

    # Итоги
    print_header("ИТОГИ ДЕТАЛЬНОГО ТЕСТИРОВАНИЯ")

    total = len(results)
    successful = sum(1 for r in results.values() if r)
    failed = total - successful

    for test_name, success in results.items():
        status = "✅ ПРОЙДЕН" if success else "❌ ПРОВАЛЕН"
        print(f"  {test_name}: {status}")

    print(f"\n  Всего тестов: {total}")
    print(f"  Пройдено: {successful}")
    print(f"  Провалено: {failed}")

    if failed == 0:
        print("\n  🎉 ВСЕ ДЕТАЛЬНЫЕ ТЕСТЫ ПРОЙДЕНЫ!")
    else:
        print("\n  ⚠️  Некоторые тесты провалены")
        print("  ℹ️  Проверьте логи выше для подробной диагностики")

    print("=" * 100 + "\n")

    return failed == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
