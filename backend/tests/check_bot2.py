"""
МИНИ-ТЕСТЫ: Только проблемные сценарии
"""
import asyncio
import sqlite3
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.config import DATABASE_NAME
from bot.core import get_bot
from db import get_or_create_client, save_message, get_chat_history, detect_and_save_language

GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
MAGENTA = '\033[95m'
RESET = '\033[0m'


class MiniTester:
    def __init__(self):
        self.bot = get_bot()
        self.passed = 0
        self.failed = 0
        
    def log(self, msg, color=RESET):
        print(f"{color}{msg}{RESET}")
        
    async def test_scenario(self, client_id, messages, checks, name):
        self.log(f"\n{'='*50}", YELLOW)
        self.log(f"📋 {name}", YELLOW)
        self.log('='*50, YELLOW)
        
        for i, (user_msg, lang) in enumerate(messages):
            self.log(f"👤: {user_msg}", CYAN)
            
            save_message(client_id, user_msg, "client")
            
            # Определяем язык
            client_language = detect_and_save_language(client_id, user_msg)
            self.log(f"🌐 Detected: {client_language}, Expected: {lang}", CYAN)
            
            history = get_chat_history(client_id, limit=10)
            
            bot_response = await self.bot.generate_response(
                user_message=user_msg,
                instagram_id=client_id,
                history=history,
                client_language=client_language
            )
            
            save_message(client_id, bot_response, "assistant")
            self.log(f"🤖: {bot_response}", MAGENTA)
            
            # Проверка
            if i < len(checks) and checks[i]:
                result = checks[i](bot_response)
                if result:
                    self.passed += 1
                    self.log(f"✅ {result}", GREEN)
                else:
                    self.failed += 1
                    self.log("❌ Проверка не пройдена", RED)
            
            await asyncio.sleep(2)
    
    def cleanup(self, client_id):
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        c.execute("DELETE FROM clients WHERE instagram_id = ?", (client_id,))
        c.execute("DELETE FROM chat_history WHERE instagram_id = ?", (client_id,))
        c.execute("DELETE FROM bookings WHERE instagram_id = ?", (client_id,))
        conn.commit()
        conn.close()
    
    async def run(self):
        self.log("🧪 МИНИ-ТЕСТЫ (Только проблемные)", YELLOW)
        
        # Тест 1: Английский язык
        client1 = "test_english_lang"
        get_or_create_client(client1, "john_test")
        
        await self.test_scenario(
            client1,
            [
                ("Hello! I want to book a manicure", "en"),
                ("Tomorrow afternoon", "en")
            ],
            [
                lambda r: "manicure" in r.lower() or "aed" in r.lower(),
                lambda r: "tomorrow" in r.lower() or "afternoon" in r.lower()
            ],
            "Английский язык"
        )
        self.cleanup(client1)
        
        # Тест 2: Выбор мастера
        client2 = "test_master_choice"
        get_or_create_client(client2, "maria_test")
        
        await self.test_scenario(
            client2,
            [("Хочу записаться на маникюр", "ru")],
            [lambda r: any(name in r for name in ["Ляззат", "Гуля", "Дженнифер"])],
            "Предложение мастеров"
        )
        self.cleanup(client2)
        
        # Тест 3: Upsell
        client3 = "test_upsell_ped"
        get_or_create_client(client3, "lisa_test")
        
        # Создаём старую запись на педикюр
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        c.execute("""
            INSERT INTO bookings 
            (instagram_id, service_name, datetime, status, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            client3,
            "Pedicure",
            (datetime.now() - timedelta(days=30)).isoformat(),
            "completed",
            (datetime.now() - timedelta(days=30)).isoformat()
        ))
        conn.commit()
        conn.close()
        
        await self.test_scenario(
            client3,
            [("Хочу на маникюр", "ru")],
            [lambda r: "педикюр" in r.lower()],
            "Upsell педикюра"
        )
        self.cleanup(client3)
        
        # Тест 4: Срочность
        client4 = "test_urgent_req"
        get_or_create_client(client4, "kate_test")
        
        await self.test_scenario(
            client4,
            [("Срочно нужен маникюр, завтра уезжаю!", "ru")],
            [lambda r: "завтра" in r.lower() and ("время" in r.lower() or "час" in r.lower())],
            "Срочная запись"
        )
        self.cleanup(client4)
        
        # Итоги
        total = self.passed + self.failed
        rate = (self.passed / total * 100) if total > 0 else 0
        
        print("\n" + "="*50)
        self.log(f"✅ Успешно: {self.passed}/{total}", GREEN)
        self.log(f"❌ Провалено: {self.failed}/{total}", RED)
        self.log(f"📊 Успешность: {rate:.1f}%", GREEN if rate >= 75 else RED)
        print("="*50)


async def main():
    tester = MiniTester()
    await tester.run()


if __name__ == "__main__":
    asyncio.run(main())