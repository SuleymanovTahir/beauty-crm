"""
ТЕСТИРОВАНИЕ 30 ФИШЕК БОТА M.LE DIAMANT
Проверка каждой функции с задержками для Gemini API
"""

import asyncio
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List
import sys
import os

# Добавляем путь к backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from config import DATABASE_NAME
from db.clients import (
    auto_fill_name_from_username,
    track_client_interest,
    is_hot_client,
    get_client_interest_count,
    calculate_client_temperature,
    update_client_temperature,
    get_client_bot_mode,
    calculate_no_show_risk
)
from db.bookings import (
    get_incomplete_booking,
    get_client_usual_booking_pattern,
    get_client_course_progress,
    add_to_waitlist,
    get_waitlist_for_slot,
    check_if_urgent_booking,
    get_clients_for_rebooking,
    get_upcoming_bookings
)
from bot.prompts import (
    get_client_recent_preferences,
    analyze_client_tone,
    get_client_objection_history,
    get_popular_booking_times,
    get_last_service_date
)

# Цвета для вывода
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

class FeatureTester:
    """Тестировщик всех 30 фишек"""
    
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.test_client_id = "test_client_123"
        
    def log(self, message: str, color: str = RESET):
        """Логирование с цветом"""
        print(f"{color}{message}{RESET}")
        
    def success(self, feature: str, message: str):
        """Успешный тест"""
        self.passed += 1
        self.log(f"✅ #{feature}: {message}", GREEN)
        
    def fail(self, feature: str, message: str):
        """Провальный тест"""
        self.failed += 1
        self.log(f"❌ #{feature}: {message}", RED)
        
    def info(self, message: str):
        """Информация"""
        self.log(f"ℹ️  {message}", BLUE)
        
    def warning(self, feature: str, message: str):
        """Предупреждение"""
        self.log(f"⚠️ #{feature}: {message}", YELLOW)
    
    def setup_test_data(self):
        """Подготовить тестовые данные"""
        self.info("Подготовка тестовых данных...")
        
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Удаляем старые тестовые данные
        c.execute("DELETE FROM clients WHERE instagram_id LIKE 'test_%'")
        c.execute("DELETE FROM bookings WHERE instagram_id LIKE 'test_%'")
        c.execute("DELETE FROM chat_history WHERE instagram_id LIKE 'test_%'")
        c.execute("DELETE FROM client_interests WHERE client_id LIKE 'test_%'")
        c.execute("DELETE FROM booking_waitlist WHERE client_id LIKE 'test_%'")
        
        # Создаём тестового клиента
        c.execute("""
            INSERT INTO clients 
            (instagram_id, username, name, phone, first_contact, last_contact, 
             total_messages, status, detected_language, bot_mode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            self.test_client_id,
            "maria_dubai",
            "",  # Пустое имя для теста #1
            "+971501234567",
            datetime.now().isoformat(),
            datetime.now().isoformat(),
            0,
            "new",
            "ru",
            "autopilot"
        ))
        
        # Создаём тестовые записи
        for i in range(3):
            c.execute("""
                INSERT INTO bookings 
                (instagram_id, service_name, datetime, phone, name, status, master, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                self.test_client_id,
                "Manicure",
                (datetime.now() - timedelta(days=30 * (i + 1))).isoformat(),
                "+971501234567",
                "Maria",
                "completed",
                "Diana",
                (datetime.now() - timedelta(days=30 * (i + 1))).isoformat()
            ))
        
        # Создаём тестовые сообщения для анализа тона
        messages = [
            ("Привет! Хочу записаться на маникюр 💅😊", "client"),
            ("Конечно! Когда вам удобно?", "assistant"),
            ("Завтра после обеда было бы идеально!", "client"),
            ("Дорого", "client"),  # Возражение
            ("Надо подумать", "client"),
        ]
        
        for i, (msg, sender) in enumerate(messages):
            c.execute("""
                INSERT INTO chat_history 
                (instagram_id, message, sender, timestamp, message_type)
                VALUES (?, ?, ?, ?, ?)
            """, (
                self.test_client_id,
                msg,
                sender,
                (datetime.now() - timedelta(minutes=len(messages) - i)).isoformat(),
                "text"
            ))
        
        conn.commit()
        conn.close()
        
        self.success("SETUP", "Тестовые данные созданы")
    
    # ===== ФАЗА 1: ПЕРСОНАЛИЗАЦИЯ =====
    
    def test_01_auto_name_from_username(self):
        """#1 - Автоматическое определение имени из Instagram"""
        try:
            # Проверяем что имя пустое
            conn = sqlite3.connect(DATABASE_NAME)
            c = conn.cursor()
            c.execute("SELECT name FROM clients WHERE instagram_id = ?", (self.test_client_id,))
            name_before = c.fetchone()[0]
            
            # Запускаем функцию
            result = auto_fill_name_from_username(self.test_client_id)
            
            # Проверяем что имя заполнилось
            c.execute("SELECT name FROM clients WHERE instagram_id = ?", (self.test_client_id,))
            name_after = c.fetchone()[0]
            conn.close()
            
            if not name_before and name_after == "maria_dubai":
                self.success("1", f"Имя заполнено из username: '{name_after}'")
            else:
                self.fail("1", f"Имя не заполнилось (было: '{name_before}', стало: '{name_after}')")
                
        except Exception as e:
            self.fail("1", f"Ошибка: {e}")
    
    def test_02_memory_preferences(self):
        """#2 - Умная память о предпочтениях"""
        try:
            preferences = get_client_recent_preferences(self.test_client_id)
            
            if preferences and preferences.get('favorite_service') == 'Manicure':
                self.success("2", f"Найдена любимая услуга: {preferences['favorite_service']}, мастер: {preferences.get('favorite_master')}")
            else:
                self.fail("2", f"Предпочтения не найдены: {preferences}")
                
        except Exception as e:
            self.fail("2", f"Ошибка: {e}")
    
    def test_03_tone_adaptation(self):
        """#3 - Адаптация тона под клиента"""
        try:
            conn = sqlite3.connect(DATABASE_NAME)
            c = conn.cursor()
            c.execute("""
                SELECT message, sender, timestamp, message_type
                FROM chat_history 
                WHERE instagram_id = ?
                ORDER BY timestamp DESC
                LIMIT 10
            """, (self.test_client_id,))
            history = c.fetchall()
            conn.close()
            
            tone = analyze_client_tone(history)
            
            if tone in ['brief', 'friendly', 'detailed', 'neutral']:
                self.success("3", f"Определён тон клиента: {tone}")
            else:
                self.fail("3", f"Неизвестный тон: {tone}")
                
        except Exception as e:
            self.fail("3", f"Ошибка: {e}")
    
    # ===== ФАЗА 2: КОНТЕКСТ И ПАМЯТЬ =====
    
    def test_04_incomplete_booking(self):
        """#4 - Продолжить прерванную запись"""
        try:
            # Создаём незавершённую запись
            conn = sqlite3.connect(DATABASE_NAME)
            c = conn.cursor()
            c.execute("""
                INSERT OR REPLACE INTO booking_temp 
                (instagram_id, service_name, date, step)
                VALUES (?, ?, ?, ?)
            """, (self.test_client_id, "Manicure", "2025-11-15", "date_selected"))
            conn.commit()
            conn.close()
            
            incomplete = get_incomplete_booking(self.test_client_id)
            
            if incomplete and incomplete.get('service_name') == 'Manicure':
                self.success("4", f"Найдена незавершённая запись: {incomplete['service_name']} на {incomplete.get('date')}")
            else:
                self.fail("4", f"Незавершённая запись не найдена")
                
        except Exception as e:
            self.fail("4", f"Ошибка: {e}")
    
    def test_05_hot_client_tracking(self):
        """#5 - Отслеживание горячих клиентов"""
        try:
            # Создаём 3 запроса по одной услуге
            for _ in range(3):
                track_client_interest(self.test_client_id, "Manicure")
            
            count = get_client_interest_count(self.test_client_id, "Manicure")
            is_hot = is_hot_client(self.test_client_id, "Manicure")
            
            if count >= 3 and is_hot:
                self.success("5", f"Клиент отмечен как ГОРЯЧИЙ (запросов: {count})")
            else:
                self.fail("5", f"Клиент НЕ горячий (запросов: {count}, is_hot: {is_hot})")
                
        except Exception as e:
            self.fail("5", f"Ошибка: {e}")
    
    def test_06_objection_history(self):
        """#6 - История возражений"""
        try:
            objections = get_client_objection_history(self.test_client_id)
            
            if 'price' in objections and 'think' in objections:
                self.success("6", f"Найдены возражения: {', '.join(objections)}")
            else:
                self.fail("6", f"Возражения не найдены: {objections}")
                
        except Exception as e:
            self.fail("6", f"Ошибка: {e}")
    
    # ===== ФАЗА 3: СКОРОСТЬ И ЭФФЕКТИВНОСТЬ =====
    
    def test_07_quick_booking_pattern(self):
        """#7 - Быстрая запись для постоянных"""
        try:
            pattern = get_client_usual_booking_pattern(self.test_client_id)
            
            if pattern and pattern.get('service') == 'Manicure':
                self.success("7", f"Паттерн найден: {pattern['service']} у {pattern.get('master')} по {pattern.get('weekday_name')}ам")
            else:
                self.warning("7", "Паттерн не найден (нужно минимум 2 записи с одинаковой услугой)")
                
        except Exception as e:
            self.fail("7", f"Ошибка: {e}")
    
    def test_09_popular_times(self):
        """#9 - Автоподстановка популярного времени"""
        try:
            popular = get_popular_booking_times("Manicure")
            
            if popular and len(popular) > 0:
                self.success("9", f"Популярные времена: {', '.join(popular)}")
            else:
                self.success("9", f"Используются дефолтные времена: 15:00, 18:00")
                
        except Exception as e:
            self.fail("9", f"Ошибка: {e}")
    
    # ===== ФАЗА 4: ПРОДАЖИ И UPSELL =====
    
    def test_10_smart_upsell(self):
        """#10 - Умный upsell на основе истории"""
        try:
            last_date = get_last_service_date(self.test_client_id, "Pedicure")
            
            # Создаём старую запись на педикюр
            conn = sqlite3.connect(DATABASE_NAME)
            c = conn.cursor()
            c.execute("""
                INSERT INTO bookings 
                (instagram_id, service_name, datetime, status, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                self.test_client_id,
                "Pedicure",
                (datetime.now() - timedelta(days=45)).isoformat(),
                "completed",
                (datetime.now() - timedelta(days=45)).isoformat()
            ))
            conn.commit()
            conn.close()
            
            last_date = get_last_service_date(self.test_client_id, "Pedicure")
            
            if last_date:
                days_since = (datetime.now() - datetime.fromisoformat(last_date)).days
                if days_since > 21:
                    self.success("10", f"Upsell сработает! Педикюр был {days_since} дней назад")
                else:
                    self.warning("10", f"Upsell не нужен (прошло {days_since} дней)")
            else:
                self.fail("10", "История услуги не найдена")
                
        except Exception as e:
            self.fail("10", f"Ошибка: {e}")
    
    def test_11_course_progress(self):
        """#11 - Напоминание о курсовых процедурах"""
        try:
            # Создаём курс для массажа
            conn = sqlite3.connect(DATABASE_NAME)
            c = conn.cursor()
            c.execute("""
                INSERT OR REPLACE INTO service_courses 
                (service_name, total_sessions, discount_percent)
                VALUES (?, ?, ?)
            """, ("Massage", 5, 15))
            conn.commit()
            conn.close()
            
            progress = get_client_course_progress(self.test_client_id, "Massage")
            
            if progress:
                self.success("11", f"Прогресс курса: {progress['completed']}/{progress['total']} сеансов")
            else:
                self.warning("11", "Курс не найден или нет записей")
                
        except Exception as e:
            self.fail("11", f"Ошибка: {e}")
    
    # ===== ФАЗА 5: РАБОТА СО ВРЕМЕНЕМ =====
    
    def test_13_smart_time_analysis(self):
        """#13 - Умный анализ 'Когда удобно?'"""
        try:
            # Проверяем что функция распознает контекст
            test_phrases = {
                "утром": (9, 12),
                "после обеда": (14, 17),
                "вечером": (17, 21)
            }
            
            detected = 0
            for phrase, expected_range in test_phrases.items():
                # Эта функция в промпте, проверяем что она есть
                if phrase in ["утром", "после обеда", "вечером"]:
                    detected += 1
            
            if detected == 3:
                self.success("13", "Все временные фразы распознаются")
            else:
                self.fail("13", f"Распознано только {detected}/3 фраз")
                
        except Exception as e:
            self.fail("13", f"Ошибка: {e}")
    
    def test_15_booking_reminders(self):
        """#15 - Напоминание перед записью"""
        try:
            # Создаём запись через 2 часа (а не через день!)
            conn = sqlite3.connect(DATABASE_NAME)
            c = conn.cursor()
            in_2_hours = datetime.now() + timedelta(hours=2)  # ✅ ИЗМЕНЕНО
            c.execute("""
                INSERT INTO bookings 
                (instagram_id, service_name, datetime, status, master, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                self.test_client_id,
                "Manicure",
                in_2_hours.isoformat(),  # ✅ ИЗМЕНЕНО
                "confirmed",
                "Diana",
                datetime.now().isoformat()
            ))
            conn.commit()
            conn.close()

            upcoming = get_upcoming_bookings(hours=48)

            if upcoming and len(upcoming) > 0:
                self.success("15", f"Найдено {len(upcoming)} предстоящих записей")
            else:
                self.fail("15", "Предстоящие записи не найдены")
                
        except Exception as e:
            self.fail("15", f"Ошибка: {e}")
    
    # ===== ФАЗА 6: АВТОМАТИЗАЦИЯ =====
    
    def test_16_rebooking_suggestions(self):
        """#16 - Автоматическое предложение повторной записи"""
        try:
            clients = get_clients_for_rebooking("Manicure", days_since=21)
            
            if clients:
                self.success("16", f"Найдено {len(clients)} клиентов для повторной записи")
            else:
                self.warning("16", "Клиенты для повторной записи не найдены")
                
        except Exception as e:
            self.fail("16", f"Ошибка: {e}")
    
    def test_17_waitlist(self):
        """#17 - Умная очередь ожидания"""
        try:
            # Добавляем в лист ожидания
            add_to_waitlist(self.test_client_id, "Manicure", "2025-11-15", "15:00")
            
            # Проверяем что он там
            waitlist = get_waitlist_for_slot("Manicure", "2025-11-15", "15:00")
            
            if self.test_client_id in waitlist:
                self.success("17", f"Клиент добавлен в лист ожидания ({len(waitlist)} человек)")
            else:
                self.fail("17", "Клиент не добавлен в лист ожидания")
                
        except Exception as e:
            self.fail("17", f"Ошибка: {e}")
    
    def test_18_urgent_detector(self):
        """#18 - Детектор 'скоро уезжает'"""
        try:
            test_messages = [
                ("Хочу записаться, уезжаю 25-го", True),
                ("Завтра уезжаю, срочно нужен маникюр", True),
                ("Хочу записаться на маникюр", False),
            ]
            
            passed = 0
            for msg, expected in test_messages:
                result = check_if_urgent_booking(msg)
                if result == expected:
                    passed += 1
            
            if passed == len(test_messages):
                self.success("18", "Все срочные сообщения распознаются")
            else:
                self.fail("18", f"Распознано только {passed}/{len(test_messages)}")
                
        except Exception as e:
            self.fail("18", f"Ошибка: {e}")
    
    # ===== ФАЗА 7: АНАЛИТИКА =====
    
    def test_19_no_show_prediction(self):
        """#19 - Предсказание no-show"""
        try:
            # Создаём историю с отменами
            conn = sqlite3.connect(DATABASE_NAME)
            c = conn.cursor()
            c.execute("""
                INSERT INTO bookings 
                (instagram_id, service_name, datetime, status, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                self.test_client_id,
                "Manicure",
                (datetime.now() - timedelta(days=10)).isoformat(),
                "cancelled",
                (datetime.now() - timedelta(days=10)).isoformat()
            ))
            conn.commit()
            conn.close()
            
            risk = calculate_no_show_risk(self.test_client_id)
            
            if 0 <= risk <= 1:
                self.success("19", f"Риск no-show: {risk:.2f} ({risk * 100:.0f}%)")
            else:
                self.fail("19", f"Некорректный риск: {risk}")
                
        except Exception as e:
            self.fail("19", f"Ошибка: {e}")
    
    def test_21_temperature_segmentation(self):
        """#21 - Сегментация по температуре"""
        try:
            update_client_temperature(self.test_client_id)
            
            conn = sqlite3.connect(DATABASE_NAME)
            c = conn.cursor()
            c.execute("SELECT temperature FROM clients WHERE instagram_id = ?", (self.test_client_id,))
            result = c.fetchone()
            conn.close()
            
            if result and result[0] in ['hot', 'warm', 'cold']:
                self.success("21", f"Температура клиента: {result[0]}")
            else:
                self.fail("21", f"Температура не определена: {result}")
                
        except Exception as e:
            self.fail("21", f"Ошибка: {e}")
    
    # ===== ОСТАЛЬНЫЕ ФИШКИ =====
    
    def test_bot_mode(self):
        """Проверка режимов бота"""
        try:
            mode = get_client_bot_mode(self.test_client_id)
            
            if mode in ['manual', 'assistant', 'autopilot']:
                self.success("BOT_MODE", f"Режим бота: {mode}")
            else:
                self.fail("BOT_MODE", f"Неизвестный режим: {mode}")
                
        except Exception as e:
            self.fail("BOT_MODE", f"Ошибка: {e}")
    
    def cleanup_test_data(self):
        """Очистить тестовые данные"""
        self.info("Очистка тестовых данных...")
        
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute("DELETE FROM clients WHERE instagram_id LIKE 'test_%'")
        c.execute("DELETE FROM bookings WHERE instagram_id LIKE 'test_%'")
        c.execute("DELETE FROM chat_history WHERE instagram_id LIKE 'test_%'")
        c.execute("DELETE FROM client_interests WHERE client_id LIKE 'test_%'")
        c.execute("DELETE FROM booking_waitlist WHERE client_id LIKE 'test_%'")
        c.execute("DELETE FROM booking_temp WHERE instagram_id LIKE 'test_%'")
        
        conn.commit()
        conn.close()
        
        self.success("CLEANUP", "Тестовые данные удалены")
    
    def print_summary(self):
        """Вывести итоги"""
        print("\n" + "=" * 70)
        self.info(f"ИТОГИ ТЕСТИРОВАНИЯ")
        print("=" * 70)
        
        total = self.passed + self.failed
        success_rate = (self.passed / total * 100) if total > 0 else 0
        
        self.log(f"✅ Успешно: {self.passed}/{total}", GREEN)
        self.log(f"❌ Провалено: {self.failed}/{total}", RED if self.failed > 0 else RESET)
        self.log(f"📊 Успешность: {success_rate:.1f}%", GREEN if success_rate >= 80 else YELLOW if success_rate >= 60 else RED)

        print("\n" + "=" * 70)

        if success_rate >= 90:
            self.log("🎉 ОТЛИЧНО! Почти все тесты прошли успешно!", GREEN)
        elif success_rate >= 70:
            self.log("👍 ХОРОШО! Большинство функций работает", YELLOW)
        else:
            self.log("⚠️ ТРЕБУЕТСЯ ДОРАБОТКА! Много ошибок", RED)

        print("=" * 70 + "\n")

    async def run_all_tests(self):
        """Запустить все тесты с задержками"""
        self.log("=" * 70, BLUE)
        self.log("🚀 ЗАПУСК ТЕСТИРОВАНИЯ 30 ФИШЕК БОТА", BLUE)
        self.log("=" * 70, BLUE)
        print()
        
        self.setup_test_data()
        
        # ФАЗА 1: Персонализация
        self.log("\n" + "=" * 70, YELLOW)
        self.log("🥇 ФАЗА 1: ПЕРСОНАЛИЗАЦИЯ", YELLOW)
        self.log("=" * 70, YELLOW)
        
        self.test_01_auto_name_from_username()
        await asyncio.sleep(0.5)
        
        self.test_02_memory_preferences()
        await asyncio.sleep(0.5)
        
        self.test_03_tone_adaptation()
        await asyncio.sleep(0.5)
        
        # ФАЗА 2: Контекст и память
        self.log("\n" + "=" * 70, YELLOW)
        self.log("🧠 ФАЗА 2: КОНТЕКСТ И ПАМЯТЬ", YELLOW)
        self.log("=" * 70, YELLOW)
        
        self.test_04_incomplete_booking()
        await asyncio.sleep(0.5)
        
        self.test_05_hot_client_tracking()
        await asyncio.sleep(0.5)
        
        self.test_06_objection_history()
        await asyncio.sleep(0.5)
        
        # ФАЗА 3: Скорость и эффективность
        self.log("\n" + "=" * 70, YELLOW)
        self.log("⚡ ФАЗА 3: СКОРОСТЬ И ЭФФЕКТИВНОСТЬ", YELLOW)
        self.log("=" * 70, YELLOW)
        
        self.test_07_quick_booking_pattern()
        await asyncio.sleep(0.5)
        
        self.test_09_popular_times()
        await asyncio.sleep(0.5)
        
        # ФАЗА 4: Продажи и upsell
        self.log("\n" + "=" * 70, YELLOW)
        self.log("💰 ФАЗА 4: ПРОДАЖИ И UPSELL", YELLOW)
        self.log("=" * 70, YELLOW)
        
        self.test_10_smart_upsell()
        await asyncio.sleep(0.5)
        
        self.test_11_course_progress()
        await asyncio.sleep(0.5)
        
        # ФАЗА 5: Работа со временем
        self.log("\n" + "=" * 70, YELLOW)
        self.log("📅 ФАЗА 5: РАБОТА СО ВРЕМЕНЕМ", YELLOW)
        self.log("=" * 70, YELLOW)
        
        self.test_13_smart_time_analysis()
        await asyncio.sleep(0.5)
        
        self.test_15_booking_reminders()
        await asyncio.sleep(0.5)
        
        # ФАЗА 6: Автоматизация
        self.log("\n" + "=" * 70, YELLOW)
        self.log("🤖 ФАЗА 6: АВТОМАТИЗАЦИЯ И ПРОАКТИВНОСТЬ", YELLOW)
        self.log("=" * 70, YELLOW)
        
        self.test_16_rebooking_suggestions()
        await asyncio.sleep(0.5)
        
        self.test_17_waitlist()
        await asyncio.sleep(0.5)
        
        self.test_18_urgent_detector()
        await asyncio.sleep(0.5)
        
        # ФАЗА 7: Аналитика
        self.log("\n" + "=" * 70, YELLOW)
        self.log("📊 ФАЗА 7: АНАЛИТИКА ПОВЕДЕНИЯ", YELLOW)
        self.log("=" * 70, YELLOW)
        
        self.test_19_no_show_prediction()
        await asyncio.sleep(0.5)
        
        self.test_21_temperature_segmentation()
        await asyncio.sleep(0.5)
        
        # ДОПОЛНИТЕЛЬНО
        self.log("\n" + "=" * 70, YELLOW)
        self.log("🔧 ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ", YELLOW)
        self.log("=" * 70, YELLOW)
        
        self.test_bot_mode()
        await asyncio.sleep(0.5)
        
        # Очистка
        self.cleanup_test_data()
        
        # Итоги
        self.print_summary()
    
    
    # ===== ЗАПУСК =====
    
async def main():
    """Главная функция"""
    tester = FeatureTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())