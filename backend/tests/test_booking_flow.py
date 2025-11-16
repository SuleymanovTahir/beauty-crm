#!/usr/bin/env python3
"""
Тестовый скрипт для проверки полного флоу записи через чат-бота
Тестирует от приветствия до финальной записи
"""
import sys
import os

# Добавляем путь к backend в sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import asyncio
from datetime import datetime
from bot.core import get_bot
from db import get_all_services, get_all_employees
from db.employees import get_employees_by_service
from db.services import format_service_price_for_bot


class BookingFlowTester:
    """Класс для тестирования флоу записи"""

    def __init__(self):
        self.bot = get_bot()
        self.test_instagram_id = "test_user_genrih"
        self.conversation = []

    def print_section(self, title: str):
        """Красивая печать секции"""
        print("\n" + "="*70)
        print(f"  {title}")
        print("="*70)

    def print_message(self, role: str, message: str, source: str = ""):
        """Печать сообщения с форматированием"""
        role_emoji = "👤" if role == "User" else "🤖"
        timestamp = datetime.now().strftime("%H:%M:%S")

        print(f"\n[{timestamp}] {role_emoji} {role}:")
        print(f"  {message}")
        if source:
            print(f"  📍 Источник: {source}")

    async def send_message(self, user_message: str) -> str:
        """Отправить сообщение боту и получить ответ"""
        self.print_message("User", user_message)

        # Формируем историю в формате (message, sender, timestamp, type)
        history = [
            (msg, sender, ts, "text")
            for msg, sender, ts in self.conversation
        ]

        # Генерируем ответ
        response = await self.bot.generate_response(
            user_message=user_message,
            instagram_id=self.test_instagram_id,
            history=history,
            client_language='ru'
        )

        # Сохраняем в историю
        now = datetime.now().isoformat()
        self.conversation.append((user_message, "client", now))
        self.conversation.append((response, "assistant", now))

        self.print_message("Bot", response)

        return response

    def check_response(self, response: str, expected_parts: list, avoid_parts: list = None):
        """Проверить что ответ содержит/не содержит определенные части"""
        self.print_section("ПРОВЕРКА ОТВЕТА")

        all_good = True

        # Проверяем что должно быть
        for expected in expected_parts:
            if expected.lower() in response.lower():
                print(f"  ✅ Найдено: '{expected}'")
            else:
                print(f"  ❌ НЕ найдено: '{expected}'")
                all_good = False

        # Проверяем что НЕ должно быть
        if avoid_parts:
            for avoid in avoid_parts:
                if avoid.lower() in response.lower():
                    print(f"  ❌ Найдено (НЕ должно быть): '{avoid}'")
                    all_good = False
                else:
                    print(f"  ✅ НЕ найдено (правильно): '{avoid}'")

        return all_good

    def analyze_services(self):
        """Проанализировать услуги и их цены"""
        self.print_section("АНАЛИЗ УСЛУГ И ЦЕН")

        services = get_all_services(active_only=True)

        print(f"\nВсего активных услуг: {len(services)}")
        print("\nПримеры форматирования цен:")

        for service in services[:5]:
            service_name = service[3] or service[2]
            price_formatted = format_service_price_for_bot(service)

            print(f"\n  • {service_name}")
            print(f"    Цена: {price_formatted}")

            # Проверяем форматирование
            if ".0" in price_formatted and "дирхам" in price_formatted:
                print(f"    ⚠️ ПРОБЛЕМА: Есть .0 в цене!")
            if "от" in price_formatted and "до" in price_formatted:
                print(f"    ⚠️ СТАРЫЙ ФОРМАТ: Используется 'от ... до'")
            if "всего лишь" in price_formatted.lower():
                print(f"    ✅ НОВЫЙ ФОРМАТ: Показана ценность!")

    def analyze_masters_by_service(self, service_name: str):
        """Проанализировать мастеров для конкретной услуги"""
        self.print_section(f"АНАЛИЗ МАСТЕРОВ ДЛЯ '{service_name}'")

        # Находим услугу
        services = get_all_services(active_only=True)
        service_found = None

        for service in services:
            if service_name.lower() in (service[2] or "").lower() or \
               service_name.lower() in (service[3] or "").lower():
                service_found = service
                break

        if not service_found:
            print(f"  ❌ Услуга '{service_name}' не найдена!")
            return

        service_id = service_found[0]
        print(f"\n  Услуга найдена: {service_found[3] or service_found[2]} (ID: {service_id})")

        # Получаем мастеров для этой услуги
        masters = get_employees_by_service(service_id)

        print(f"\n  Мастеров, которые делают эту услугу: {len(masters)}")

        if masters:
            print("\n  Список мастеров:")
            for master in masters:
                emp_id = master[0]
                emp_name = master[1] if len(master) > 1 else "?"
                print(f"    • {emp_name} (ID: {emp_id})")
        else:
            print("  ⚠️ НЕТ МАСТЕРОВ для этой услуги!")

        # Проверяем всех мастеров
        all_masters = get_all_employees(active_only=True, service_providers_only=True)
        print(f"\n  Всего активных мастеров в салоне: {len(all_masters)}")

        if len(masters) < len(all_masters):
            print(f"  ✅ ПРАВИЛЬНО: Не все мастера делают эту услугу (фильтр работает)")
        else:
            print(f"  ❌ ПРОБЛЕМА: Все мастера делают эту услугу? (проверьте настройки)")

    async def test_full_flow(self):
        """Полный тест флоу записи"""
        self.print_section("НАЧАЛО ТЕСТИРОВАНИЯ ПОЛНОГО ФЛОУ")

        # Шаг 1: Приветствие
        self.print_section("ШАГ 1: Приветствие")
        response1 = await self.send_message("Привет")
        self.check_response(
            response1,
            expected_parts=["привет", "салон"],
            avoid_parts=["tool_code", "check_masters"]
        )

        # Шаг 2: Запрос на услугу (кератин)
        self.print_section("ШАГ 2: Запрос на кератин")
        response2 = await self.send_message("кератин")
        self.check_response(
            response2,
            expected_parts=["волос", "уход"],
            avoid_parts=[
                "tool_code",
                "check_masters",
                "симо, местан, ляззат",  # Не должно быть перечисления
                "эту услугу делают:",
                ".0 дирхам",  # Не должно быть .0
                "от 600 до 1500"  # Не должно быть диапазона
            ]
        )

        # Проверяем что бот предложил время
        if any(word in response2.lower() for word in ["окно", "время", "удобно", "когда"]):
            print("\n  ✅ Бот предложил время!")
        else:
            print("\n  ⚠️ Бот НЕ предложил время...")

        # Шаг 3: Согласие
        self.print_section("ШАГ 3: Согласие на запись")
        response3 = await self.send_message("да давай")
        self.check_response(
            response3,
            expected_parts=["запис", "время", "удобно"],
            avoid_parts=[
                "tool_code",
                "может быть",
                "попробую"  # Не должно быть неуверенности
            ]
        )

        # Проверяем решительность
        if any(word in response3.lower() for word in ["записываю", "беру", "отлично"]):
            print("\n  ✅ Бот решительный!")
        else:
            print("\n  ⚠️ Бот недостаточно уверен...")

        self.print_section("ТЕСТИРОВАНИЕ ЗАВЕРШЕНО")


async def main():
    """Главная функция"""
    tester = BookingFlowTester()

    print("\n" + "="*70)
    print("  ТЕСТИРОВАНИЕ ЧАТ-БОТА - ПОЛНЫЙ ФЛОУ ЗАПИСИ")
    print("="*70)

    # Анализируем услуги и цены
    tester.analyze_services()

    # Анализируем мастеров для волос
    tester.analyze_masters_by_service("Hair")

    # Запускаем полный тест
    await tester.test_full_flow()

    print("\n" + "="*70)
    print("  ТЕСТ ЗАВЕРШЁН")
    print("="*70 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
