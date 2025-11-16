"""
ТЕСТИРОВАНИЕ ВСЕХ API ЭНДПОИНТОВ CRM САЙТА
Проверка каждой функции веб-приложения
"""

import asyncio
import sqlite3
import hashlib
from datetime import datetime
import sys
import os
import httpx

# Добавляем путь к backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.config import DATABASE_NAME

# Цвета для вывода
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

BASE_URL = "http://localhost:8000"

class WebsiteAPITester:
    """Тестировщик всех API эндпоинтов сайта"""

    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.session_token = None
        self.test_user_id = None
        self.test_client_id = None
        self.test_service_id = None
        self.test_booking_id = None

    def log(self, message: str, color: str = RESET):
        """Логирование с цветом"""
        print(f"{color}{message}{RESET}")

    def success(self, feature: str, message: str):
        """Успешный тест"""
        self.passed += 1
        self.log(f"✅ {feature}: {message}", GREEN)

    def fail(self, feature: str, message: str):
        """Провальный тест"""
        self.failed += 1
        self.log(f"❌ {feature}: {message}", RED)

    def info(self, message: str):
        """Информация"""
        self.log(f"ℹ️  {message}", BLUE)

    def warning(self, feature: str, message: str):
        """Предупреждение"""
        self.log(f"⚠️ {feature}: {message}", YELLOW)

    async def setup_database(self):
        """Подготовить базу данных"""
        self.info("Подготовка базы данных...")

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Создаём тестового админа
        admin_username = "test_admin"
        admin_password = "test123"
        password_hash = hashlib.sha256(admin_password.encode()).hexdigest()

        # Удаляем старого тестового админа
        c.execute("DELETE FROM users WHERE username = ?", (admin_username,))

        # Создаём нового
        c.execute("""
            INSERT INTO users
            (username, password_hash, full_name, email, role, position, created_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            admin_username,
            password_hash,
            "Test Admin",
            "admin@test.com",
            "admin",
            "Administrator",
            datetime.now().isoformat()
        ))

        conn.commit()
        conn.close()

        self.success("SETUP", "База данных подготовлена")

    # ===== АУТЕНТИФИКАЦИЯ =====

    async def test_01_login(self):
        """#1 - Вход в систему"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/api/login",
                    data={
                        "username": "test_admin",
                        "password": "test123"
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("token"):
                        self.session_token = data["token"]
                        self.success("LOGIN", f"Вход выполнен, токен получен: {self.session_token[:20]}...")
                    else:
                        self.fail("LOGIN", f"Токен не получен: {data}")
                else:
                    self.fail("LOGIN", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("LOGIN", f"Ошибка: {e}")

    async def test_02_register(self):
        """#2 - Регистрация нового пользователя"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/api/register",
                    data={
                        "username": "test_user_reg",
                        "password": "test123",
                        "full_name": "Test Registration User",
                        "email": "testreg@test.com"
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.success("REGISTER", "Регистрация прошла успешно")

                        # Удаляем тестового пользователя
                        conn = sqlite3.connect(DATABASE_NAME)
                        c = conn.cursor()
                        c.execute("DELETE FROM users WHERE username = ?", ("test_user_reg",))
                        conn.commit()
                        conn.close()
                    else:
                        self.fail("REGISTER", f"Регистрация не удалась: {data}")
                else:
                    self.fail("REGISTER", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("REGISTER", f"Ошибка: {e}")

    # ===== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ =====

    async def test_03_get_users(self):
        """#3 - Получение списка пользователей"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/api/users",
                    cookies={"session_token": self.session_token}
                )

                if response.status_code == 200:
                    data = response.json()
                    users = data.get("users", [])
                    if len(users) > 0:
                        self.success("GET_USERS", f"Получено {len(users)} пользователей")
                        # Проверяем наличие поля position
                        if "position" in users[0]:
                            self.success("GET_USERS", "Поле 'position' присутствует в ответе")
                        else:
                            self.fail("GET_USERS", "Поле 'position' отсутствует")
                    else:
                        self.warning("GET_USERS", "Список пользователей пуст")
                else:
                    self.fail("GET_USERS", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("GET_USERS", f"Ошибка: {e}")

    async def test_04_create_user(self):
        """#4 - Создание нового пользователя"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/api/users",
                    json={
                        "username": "test_new_user",
                        "password": "test123",
                        "full_name": "Test New User",
                        "email": "newuser@test.com",
                        "role": "employee"
                    },
                    cookies={"session_token": self.session_token}
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.test_user_id = data.get("user_id")
                        self.success("CREATE_USER", f"Пользователь создан, ID: {self.test_user_id}")
                    else:
                        self.fail("CREATE_USER", f"Не удалось создать: {data}")
                else:
                    self.fail("CREATE_USER", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("CREATE_USER", f"Ошибка: {e}")

    async def test_05_change_user_role(self):
        """#5 - Изменение роли пользователя"""
        if not self.test_user_id:
            self.warning("CHANGE_ROLE", "Тест пропущен (нет test_user_id)")
            return

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/api/users/{self.test_user_id}/role",
                    json={"role": "manager"},
                    cookies={"session_token": self.session_token}
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.success("CHANGE_ROLE", "Роль изменена на 'manager'")
                    else:
                        self.fail("CHANGE_ROLE", f"Не удалось изменить: {data}")
                else:
                    self.fail("CHANGE_ROLE", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("CHANGE_ROLE", f"Ошибка: {e}")

    async def test_06_delete_user(self):
        """#6 - Удаление пользователя"""
        if not self.test_user_id:
            self.warning("DELETE_USER", "Тест пропущен (нет test_user_id)")
            return

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/api/users/{self.test_user_id}/delete",
                    cookies={"session_token": self.session_token}
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.success("DELETE_USER", "Пользователь удалён")
                    else:
                        self.fail("DELETE_USER", f"Не удалось удалить: {data}")
                else:
                    self.fail("DELETE_USER", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("DELETE_USER", f"Ошибка: {e}")

    # ===== УПРАВЛЕНИЕ КЛИЕНТАМИ =====

    async def test_07_get_clients(self):
        """#7 - Получение списка клиентов"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/api/clients",
                    cookies={"session_token": self.session_token}
                )

                if response.status_code == 200:
                    data = response.json()
                    clients = data.get("clients", [])
                    self.success("GET_CLIENTS", f"Получено {len(clients)} клиентов")
                else:
                    self.fail("GET_CLIENTS", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("GET_CLIENTS", f"Ошибка: {e}")

    # ===== УПРАВЛЕНИЕ УСЛУГАМИ =====

    async def test_08_get_services(self):
        """#8 - Получение списка услуг"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/api/services",
                    cookies={"session_token": self.session_token}
                )

                if response.status_code == 200:
                    data = response.json()
                    services = data.get("services", [])
                    if len(services) > 0:
                        self.test_service_id = services[0].get("id")
                        self.success("GET_SERVICES", f"Получено {len(services)} услуг")
                    else:
                        self.warning("GET_SERVICES", "Список услуг пуст")
                else:
                    self.fail("GET_SERVICES", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("GET_SERVICES", f"Ошибка: {e}")

    # ===== УПРАВЛЕНИЕ ЗАПИСЯМИ =====

    async def test_09_get_bookings(self):
        """#9 - Получение списка записей"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/api/bookings",
                    cookies={"session_token": self.session_token}
                )

                if response.status_code == 200:
                    data = response.json()
                    bookings = data.get("bookings", [])
                    self.success("GET_BOOKINGS", f"Получено {len(bookings)} записей")

                    # Проверяем наличие поля master
                    if len(bookings) > 0 and "master" in bookings[0]:
                        self.success("GET_BOOKINGS", "Поле 'master' присутствует в записях")
                    elif len(bookings) == 0:
                        self.warning("GET_BOOKINGS", "Нет записей для проверки поля 'master'")
                else:
                    self.fail("GET_BOOKINGS", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("GET_BOOKINGS", f"Ошибка: {e}")

    async def test_10_create_booking_with_master(self):
        """#10 - Создание записи с указанием мастера"""
        try:
            # Сначала получаем список клиентов
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/api/clients",
                    cookies={"session_token": self.session_token}
                )

                if response.status_code != 200:
                    self.warning("CREATE_BOOKING", "Не удалось получить клиентов")
                    return

                clients = response.json().get("clients", [])
                if len(clients) == 0:
                    self.warning("CREATE_BOOKING", "Нет клиентов для создания записи")
                    return

                client = clients[0]

                # Создаём запись с мастером
                response = await client.post(
                    f"{BASE_URL}/api/bookings",
                    json={
                        "instagram_id": client.get("instagram_id"),
                        "name": client.get("display_name", "Test Client"),
                        "phone": client.get("phone", "+971501234567"),
                        "service": "Manicure",
                        "date": "2025-11-20",
                        "time": "15:00",
                        "revenue": 150,
                        "master": "Diana"
                    },
                    cookies={"session_token": self.session_token}
                )

                if response.status_code == 200:
                    data = response.json()
                    if "id" in data or data.get("success"):
                        self.test_booking_id = data.get("id") or data.get("booking_id")
                        self.success("CREATE_BOOKING", f"Запись создана с мастером 'Diana', ID: {self.test_booking_id}")
                    else:
                        self.fail("CREATE_BOOKING", f"Запись не создана: {data}")
                else:
                    self.fail("CREATE_BOOKING", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("CREATE_BOOKING", f"Ошибка: {e}")

    async def test_11_update_booking_status(self):
        """#11 - Изменение статуса записи"""
        if not self.test_booking_id:
            self.warning("UPDATE_STATUS", "Тест пропущен (нет test_booking_id)")
            return

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/api/bookings/{self.test_booking_id}/status",
                    json={"status": "confirmed"},
                    cookies={"session_token": self.session_token}
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") or data.get("message"):
                        self.success("UPDATE_STATUS", "Статус изменён на 'confirmed'")
                    else:
                        self.fail("UPDATE_STATUS", f"Не удалось изменить: {data}")
                else:
                    self.fail("UPDATE_STATUS", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("UPDATE_STATUS", f"Ошибка: {e}")

    # ===== НАСТРОЙКИ =====

    async def test_12_get_settings(self):
        """#12 - Получение настроек салона"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/api/settings",
                    cookies={"session_token": self.session_token}
                )

                if response.status_code == 200:
                    data = response.json()
                    if "salon_name" in data or "working_hours" in data:
                        self.success("GET_SETTINGS", "Настройки получены")
                    else:
                        self.warning("GET_SETTINGS", f"Неожиданный формат настроек: {data}")
                else:
                    self.fail("GET_SETTINGS", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("GET_SETTINGS", f"Ошибка: {e}")

    # ===== DASHBOARD =====

    async def test_13_get_dashboard_stats(self):
        """#13 - Получение статистики дашборда"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/api/dashboard/stats",
                    cookies={"session_token": self.session_token}
                )

                if response.status_code == 200:
                    data = response.json()
                    if "bookings_today" in data or "total_clients" in data or "total_bookings" in data:
                        self.success("DASHBOARD", "Статистика получена")
                    else:
                        self.warning("DASHBOARD", f"Неожиданный формат статистики: {data}")
                else:
                    self.fail("DASHBOARD", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("DASHBOARD", f"Ошибка: {e}")

    # ===== РОЛИ И ДОСТУП =====

    async def test_14_get_roles(self):
        """#14 - Получение списка ролей"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/api/roles",
                    cookies={"session_token": self.session_token}
                )

                if response.status_code == 200:
                    data = response.json()
                    roles = data.get("roles", [])
                    if len(roles) > 0:
                        self.success("GET_ROLES", f"Получено {len(roles)} ролей")
                    else:
                        self.warning("GET_ROLES", "Список ролей пуст")
                else:
                    self.fail("GET_ROLES", f"Статус {response.status_code}: {response.text}")

        except Exception as e:
            self.fail("GET_ROLES", f"Ошибка: {e}")

    # ===== ОЧИСТКА =====

    async def cleanup(self):
        """Очистить тестовые данные"""
        self.info("Очистка тестовых данных...")

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Удаляем тестовые записи
        if self.test_booking_id:
            c.execute("DELETE FROM bookings WHERE id = ?", (self.test_booking_id,))

        # Удаляем тестовых пользователей
        c.execute("DELETE FROM users WHERE username LIKE 'test_%'")

        conn.commit()
        conn.close()

        self.success("CLEANUP", "Тестовые данные удалены")

    def print_summary(self):
        """Вывести итоги"""
        print("\n" + "=" * 70)
        self.info(f"ИТОГИ ТЕСТИРОВАНИЯ API")
        print("=" * 70)

        total = self.passed + self.failed
        success_rate = (self.passed / total * 100) if total > 0 else 0

        self.log(f"✅ Успешно: {self.passed}/{total}", GREEN)
        self.log(f"❌ Провалено: {self.failed}/{total}", RED if self.failed > 0 else RESET)
        self.log(f"📊 Успешность: {success_rate:.1f}%", GREEN if success_rate >= 80 else YELLOW if success_rate >= 60 else RED)

        print("\n" + "=" * 70)

        if success_rate >= 90:
            self.log("🎉 ОТЛИЧНО! Почти все API работают!", GREEN)
        elif success_rate >= 70:
            self.log("👍 ХОРОШО! Большинство API работает", YELLOW)
        else:
            self.log("⚠️ ТРЕБУЕТСЯ ДОРАБОТКА! Много ошибок", RED)

        print("=" * 70 + "\n")

    async def run_all_tests(self):
        """Запустить все тесты"""
        self.log("=" * 70, BLUE)
        self.log("🚀 ЗАПУСК ТЕСТИРОВАНИЯ WEBSITE API", BLUE)
        self.log("=" * 70, BLUE)
        print()

        await self.setup_database()
        await asyncio.sleep(0.5)

        # АУТЕНТИФИКАЦИЯ
        self.log("\n" + "=" * 70, YELLOW)
        self.log("🔐 АУТЕНТИФИКАЦИЯ", YELLOW)
        self.log("=" * 70, YELLOW)

        await self.test_01_login()
        await asyncio.sleep(0.5)

        await self.test_02_register()
        await asyncio.sleep(0.5)

        # УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
        self.log("\n" + "=" * 70, YELLOW)
        self.log("👥 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ", YELLOW)
        self.log("=" * 70, YELLOW)

        await self.test_03_get_users()
        await asyncio.sleep(0.5)

        await self.test_04_create_user()
        await asyncio.sleep(0.5)

        await self.test_05_change_user_role()
        await asyncio.sleep(0.5)

        await self.test_06_delete_user()
        await asyncio.sleep(0.5)

        # КЛИЕНТЫ
        self.log("\n" + "=" * 70, YELLOW)
        self.log("👤 УПРАВЛЕНИЕ КЛИЕНТАМИ", YELLOW)
        self.log("=" * 70, YELLOW)

        await self.test_07_get_clients()
        await asyncio.sleep(0.5)

        # УСЛУГИ
        self.log("\n" + "=" * 70, YELLOW)
        self.log("💅 УПРАВЛЕНИЕ УСЛУГАМИ", YELLOW)
        self.log("=" * 70, YELLOW)

        await self.test_08_get_services()
        await asyncio.sleep(0.5)

        # ЗАПИСИ
        self.log("\n" + "=" * 70, YELLOW)
        self.log("📅 УПРАВЛЕНИЕ ЗАПИСЯМИ", YELLOW)
        self.log("=" * 70, YELLOW)

        await self.test_09_get_bookings()
        await asyncio.sleep(0.5)

        await self.test_10_create_booking_with_master()
        await asyncio.sleep(0.5)

        await self.test_11_update_booking_status()
        await asyncio.sleep(0.5)

        # НАСТРОЙКИ
        self.log("\n" + "=" * 70, YELLOW)
        self.log("⚙️ НАСТРОЙКИ", YELLOW)
        self.log("=" * 70, YELLOW)

        await self.test_12_get_settings()
        await asyncio.sleep(0.5)

        # DASHBOARD
        self.log("\n" + "=" * 70, YELLOW)
        self.log("📊 DASHBOARD", YELLOW)
        self.log("=" * 70, YELLOW)

        await self.test_13_get_dashboard_stats()
        await asyncio.sleep(0.5)

        # РОЛИ
        self.log("\n" + "=" * 70, YELLOW)
        self.log("🔑 РОЛИ И ДОСТУП", YELLOW)
        self.log("=" * 70, YELLOW)

        await self.test_14_get_roles()
        await asyncio.sleep(0.5)

        # Очистка
        await self.cleanup()

        # Итоги
        self.print_summary()


async def main():
    """Главная функция"""
    tester = WebsiteAPITester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
