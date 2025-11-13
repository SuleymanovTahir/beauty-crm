"""
ИНТЕГРАЦИОННЫЕ ТЕСТЫ: Реальные сценарии диалогов
Проверка работы бота в различных ситуациях
"""

import asyncio
import sqlite3
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.config import DATABASE_NAME
from bot.core import get_bot
from db import get_or_create_client, save_message, get_chat_history

# Цвета
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
CYAN = '\033[96m'
MAGENTA = '\033[95m'
RESET = '\033[0m'


class IntegrationTester:
    """Тестирование реальных сценариев диалогов"""
    
    def __init__(self):
        self.bot = get_bot()
        self.test_client_prefix = "test_scenario_"
        self.scenarios_passed = 0
        self.scenarios_failed = 0
        
    def log(self, message: str, color: str = RESET):
        """Цветной вывод"""
        print(f"{color}{message}{RESET}")
        
    def log_user(self, message: str):
        """Сообщение пользователя"""
        self.log(f"👤 Клиент: {message}", CYAN)
        
    def log_bot(self, message: str):
        """Ответ бота"""
        self.log(f"🤖 Бот: {message}", MAGENTA)
        
    def log_info(self, message: str):
        """Информация"""
        self.log(f"ℹ️  {message}", BLUE)
        
    def log_success(self, message: str):
        """Успех"""
        self.scenarios_passed += 1
        self.log(f"✅ {message}", GREEN)
        
    def log_fail(self, message: str):
        """Провал"""
        self.scenarios_failed += 1
        self.log(f"❌ {message}", RED)
        
    async def simulate_conversation(
        self, 
        client_id: str, 
        messages: list, 
        scenario_name: str,
        checks: list = None
    ):
        """
        Симулировать диалог между клиентом и ботом
        
        Args:
            client_id: ID тестового клиента
            messages: Список сообщений от клиента
            scenario_name: Название сценария
            checks: Список проверок (функций) для валидации ответов
        """
        self.log("\n" + "=" * 70, YELLOW)
        self.log(f"📋 СЦЕНАРИЙ: {scenario_name}", YELLOW)
        self.log("=" * 70, YELLOW)
        
        try:
            for i, user_message in enumerate(messages):
                self.log_user(user_message)
                
                # Сохраняем сообщение клиента
                save_message(client_id, user_message, "client")
                
                # Получаем историю
                history = get_chat_history(client_id, limit=10)
                
                # Генерируем ответ бота
                bot_response = await self.bot.generate_response(
                    user_message=user_message,
                    instagram_id=client_id,
                    history=history,
                    client_language='ru'
                )
                
                # Сохраняем ответ бота
                save_message(client_id, bot_response, "assistant")
                
                self.log_bot(bot_response)
                
                # Проверки (если есть)
                if checks and i < len(checks) and checks[i]:
                    check_result = checks[i](bot_response)
                    if check_result:
                        self.log_info(f"✓ Проверка пройдена: {check_result}")
                    else:
                        self.log_fail(f"✗ Проверка не пройдена")
                
                # Задержка между сообщениями (чтобы не перегрузить Gemini)
                await asyncio.sleep(2)
            
            self.log_success(f"Сценарий '{scenario_name}' завершён")
            
        except Exception as e:
            self.log_fail(f"Ошибка в сценарии '{scenario_name}': {e}")
            import traceback
            print(traceback.format_exc())
    
    def cleanup_test_clients(self):
        """Удалить всех тестовых клиентов"""
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute(f"DELETE FROM clients WHERE instagram_id LIKE '{self.test_client_prefix}%'")
        c.execute(f"DELETE FROM chat_history WHERE instagram_id LIKE '{self.test_client_prefix}%'")
        c.execute(f"DELETE FROM bookings WHERE instagram_id LIKE '{self.test_client_prefix}%'")
        
        conn.commit()
        conn.close()
    
    # ===== СЦЕНАРИИ =====
    
    async def scenario_1_simple_booking(self):
        """Сценарий 1: Простая запись на маникюр"""
        client_id = f"{self.test_client_prefix}simple"
        get_or_create_client(client_id, username="maria_test")
        
        messages = [
            "Привет! Хочу записаться на маникюр",
            "Завтра после обеда",
            "+971501234567",
        ]
        
        checks = [
            lambda r: "маникюр" in r.lower() or "цена" in r.lower(),  # Должен предложить цену
            lambda r: "время" in r.lower() or "когда" in r.lower(),   # Должен уточнить время
            lambda r: "записал" in r.lower() or "подтверд" in r.lower(),  # Подтверждение
        ]
        
        await self.simulate_conversation(client_id, messages, "Простая запись", checks)
    
    async def scenario_2_objection_price(self):
        """Сценарий 2: Возражение по цене"""
        client_id = f"{self.test_client_prefix}price_objection"
        get_or_create_client(client_id, username="elena_test")
        
        messages = [
            "Сколько стоит маникюр?",
            "Дорого",
            "А есть какие-то скидки?",
        ]
        
        checks = [
            lambda r: "aed" in r.lower(),  # Должна быть цена
            lambda r: any(word in r.lower() for word in ["качество", "материал", "результат"]),  # Работа с возражением
            lambda r: "акци" in r.lower() or "пакет" in r.lower() or "скидк" in r.lower(),  # Предложение пакетов
        ]
        
        await self.simulate_conversation(client_id, messages, "Возражение по цене", checks)
    
    async def scenario_3_hot_client(self):
        """Сценарий 3: Горячий клиент (много вопросов про одну услугу)"""
        client_id = f"{self.test_client_prefix}hot"
        get_or_create_client(client_id, username="anna_hot")
        
        messages = [
            "Привет, расскажите про маникюр",
            "А сколько держится гель-лак?",
            "Какие мастера есть?",
            "Хорошо, хочу записаться",
        ]
        
        # Должен распознать что клиент горячий и активно предложить запись
        await self.simulate_conversation(client_id, messages, "Горячий клиент")
    
    async def scenario_4_incomplete_booking(self):
        """Сценарий 4: Незавершённая запись"""
        client_id = f"{self.test_client_prefix}incomplete"
        get_or_create_client(client_id, username="olga_test")
        
        # Первый день - начинаем запись но не завершаем
        messages_day1 = [
            "Хочу записаться на педикюр",
            "Подумаю",  # Уходит
        ]
        
        await self.simulate_conversation(client_id, messages_day1, "День 1: Начало записи")
        
        # Ждём немного
        await asyncio.sleep(3)
        
        # Второй день - клиент возвращается
        messages_day2 = [
            "Привет, я снова",
        ]
        
        checks = [
            lambda r: "педикюр" in r.lower(),  # Должен напомнить о незавершённой записи
        ]
        
        await self.simulate_conversation(client_id, messages_day2, "День 2: Продолжение", checks)
    
    async def scenario_5_urgent_booking(self):
        """Сценарий 5: Срочная запись"""
        client_id = f"{self.test_client_prefix}urgent"
        get_or_create_client(client_id, username="kate_urgent")
        
        messages = [
            "Срочно нужен маникюр, завтра уезжаю!",
        ]
        
        checks = [
            lambda r: any(word in r.lower() for word in ["сегодня", "срочно", "окно", "успе"]),  # Должен предложить срочные варианты
        ]
        
        await self.simulate_conversation(client_id, messages, "Срочная запись", checks)
    
    async def scenario_6_repeat_client(self):
        """Сценарий 6: Постоянный клиент"""
        client_id = f"{self.test_client_prefix}repeat"
        get_or_create_client(client_id, username="vera_regular")
        
        # Создаём историю записей
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        for i in range(3):
            c.execute("""
                INSERT INTO bookings 
                (instagram_id, service_name, datetime, status, master, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                client_id,
                "Manicure",
                (datetime.now() - timedelta(days=30 * (i + 1))).isoformat(),
                "completed",
                "Diana",
                (datetime.now() - timedelta(days=30 * (i + 1))).isoformat()
            ))
        
        conn.commit()
        conn.close()
        
        messages = [
            "Хочу записаться на маникюр",
        ]
        
        checks = [
            lambda r: "диан" in r.lower(),  # Должен предложить того же мастера
        ]
        
        await self.simulate_conversation(client_id, messages, "Постоянный клиент", checks)
    
    async def scenario_7_multi_language(self):
        """Сценарий 7: Клиент на английском"""
        client_id = f"{self.test_client_prefix}english"
        get_or_create_client(client_id, username="john_english")
        
        messages = [
            "Hello! I want to book a manicure",
            "Tomorrow afternoon",
        ]
        
        checks = [
            lambda r: any(word in r.lower() for word in ["manicure", "price", "aed", "time"]),  # Должен ответить на английском
            None,
        ]
        
        await self.simulate_conversation(client_id, messages, "Английский язык", checks)
    
    async def scenario_8_upsell(self):
        """Сценарий 8: Upsell (давно не был на другой услуге)"""
        client_id = f"{self.test_client_prefix}upsell"
        get_or_create_client(client_id, username="lisa_upsell")
        
        # Создаём старую запись на педикюр
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute("""
            INSERT INTO bookings 
            (instagram_id, service_name, datetime, status, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            client_id,
            "Pedicure",
            (datetime.now() - timedelta(days=45)).isoformat(),
            "completed",
            (datetime.now() - timedelta(days=45)).isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        messages = [
            "Хочу записаться на маникюр",
        ]
        
        checks = [
            lambda r: "педикюр" in r.lower(),  # Должен предложить педикюр
        ]
        
        await self.simulate_conversation(client_id, messages, "Upsell педикюра", checks)
    
    async def scenario_9_short_style(self):
        """Сценарий 9: Клиент с кратким стилем общения"""
        client_id = f"{self.test_client_prefix}short"
        get_or_create_client(client_id, username="max_short")
        
        messages = [
            "Маникюр",
            "Завтра",
            "15:00",
            "+971501234567",
        ]
        
        # Бот должен адаптироваться и отвечать кратко
        await self.simulate_conversation(client_id, messages, "Краткий стиль")
    
    async def scenario_10_friendly_style(self):
        """Сценарий 10: Дружелюбный клиент с эмодзи"""
        client_id = f"{self.test_client_prefix}friendly"
        get_or_create_client(client_id, username="masha_friendly")
        
        messages = [
            "Привет! 😊 Хочу к вам на маникюрчик 💅✨",
            "Ой как здорово! 🥰 Завтра подойдёт?",
            "Супер! 🎉 Записывайте меня!",
        ]
        
        # Бот должен отвечать в том же дружелюбном тоне
        await self.simulate_conversation(client_id, messages, "Дружелюбный стиль")
    
    # ===== ЗАПУСК =====
    
    async def run_all_scenarios(self):
        """Запустить все сценарии"""
        self.log("=" * 70, BLUE)
        self.log("🧪 ИНТЕГРАЦИОННОЕ ТЕСТИРОВАНИЕ", BLUE)
        self.log("=" * 70, BLUE)
        self.log_info("Проверка реальных сценариев диалогов")
        print()
        
        # Очистка перед тестами
        self.cleanup_test_clients()
        
        scenarios = [
            ("Простая запись", self.scenario_1_simple_booking),
            ("Возражение по цене", self.scenario_2_objection_price),
            ("Горячий клиент", self.scenario_3_hot_client),
            ("Незавершённая запись", self.scenario_4_incomplete_booking),
            ("Срочная запись", self.scenario_5_urgent_booking),
            ("Постоянный клиент", self.scenario_6_repeat_client),
            ("Английский язык", self.scenario_7_multi_language),
            ("Upsell", self.scenario_8_upsell),
            ("Краткий стиль", self.scenario_9_short_style),
            ("Дружелюбный стиль", self.scenario_10_friendly_style),
        ]
        
        for name, scenario_func in scenarios:
            try:
                await scenario_func()
                await asyncio.sleep(3)  # Задержка между сценариями
            except Exception as e:
                self.log_fail(f"Сценарий '{name}' упал с ошибкой: {e}")
        
        # Очистка после тестов
        self.cleanup_test_clients()
        
        # Итоги
        self.print_summary()
    
    def print_summary(self):
        """Итоги тестирования"""
        print("\n" + "=" * 70)
        self.log_info("ИТОГИ ИНТЕГРАЦИОННОГО ТЕСТИРОВАНИЯ")
        print("=" * 70)
        
        total = self.scenarios_passed + self.scenarios_failed
        success_rate = (self.scenarios_passed / total * 100) if total > 0 else 0
        
        self.log(f"✅ Успешно: {self.scenarios_passed}/{total}", GREEN)
        self.log(f"❌ Провалено: {self.scenarios_failed}/{total}", RED if self.scenarios_failed > 0 else RESET)
        self.log(f"📊 Успешность: {success_rate:.1f}%", GREEN if success_rate >= 70 else YELLOW if success_rate >= 50 else RED)
        
        print("\n" + "=" * 70)
        
        if success_rate >= 90:
            self.log("🎉 ОТЛИЧНО! Бот работает великолепно!", GREEN)
        elif success_rate >= 70:
            self.log("👍 ХОРОШО! Бот работает нормально", YELLOW)
        else:
            self.log("⚠️ ТРЕБУЕТСЯ ДОРАБОТКА!", RED)
        
        print("=" * 70 + "\n")


async def main():
    """Главная функция"""
    tester = IntegrationTester()
    await tester.run_all_scenarios()


if __name__ == "__main__":
    asyncio.run(main())