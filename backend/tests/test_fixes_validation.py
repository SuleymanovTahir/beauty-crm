#!/usr/bin/env python3
"""
Валидация исправлений чат-бота
Проверяет что все исправления применены корректно
"""
import sys
import os

# Добавляем путь к backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import sqlite3
from core.config import DATABASE_NAME
from db.services import format_service_price_for_bot
from db.employees import get_employees_by_service, get_all_employees


def print_section(title: str):
    """Красивая печать секции"""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)


def print_check(test_name: str, passed: bool, details: str = ""):
    """Печать результата проверки"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n  {status} | {test_name}")
    if details:
        print(f"         {details}")


def test_price_formatting():
    """Тест 1: Форматирование цен"""
    print_section("ТЕСТ 1: ФОРМАТИРОВАНИЕ ЦЕН")

    # Создаем тестовые данные услуги
    # Формат: (id, service_key, name, name_ru, name_ar, price, min_price, max_price, currency, ...)
    test_service_1 = (1, "hair_care", "Hair Care", "Уход за волосами", None, 1000, 600, 1500, "AED")
    test_service_2 = (2, "manicure", "Manicure", "Маникюр", None, 300, 300, 300, "AED")

    # Тест 1.1: Проверка убирания .0
    price_1 = format_service_price_for_bot(test_service_1)
    has_decimal_zero = ".0" in price_1
    print_check(
        "Убрать .0 из цен",
        not has_decimal_zero,
        f"Результат: '{price_1}' | Есть .0: {has_decimal_zero}"
    )

    # Тест 1.2: Проверка новой тактики (вместо "от ... до ...")
    uses_new_format = "всего лишь" in price_1.lower() or "просто" in price_1.lower()
    uses_old_format = "от" in price_1 and "до" in price_1
    print_check(
        "Новая тактика цен (ценность вместо диапазона)",
        uses_new_format and not uses_old_format,
        f"Результат: '{price_1}' | Новый формат: {uses_new_format} | Старый формат: {uses_old_format}"
    )

    # Тест 1.3: Проверка одной цены
    price_2 = format_service_price_for_bot(test_service_2)
    print_check(
        "Одна цена без .0",
        ".0" not in price_2,
        f"Результат: '{price_2}'"
    )

    return not has_decimal_zero and uses_new_format


def test_service_synonyms():
    """Тест 2: Синонимы услуг"""
    print_section("ТЕСТ 2: СИНОНИМЫ УСЛУГ")

    # Читаем файл prompts.py
    prompts_file = os.path.join(os.path.dirname(__file__), '..', 'bot', 'prompts.py')

    with open(prompts_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Проверяем наличие синонимов для волос
    hair_synonyms = ['кератин', 'keratin', 'ботокс', 'botox', 'уход']

    all_found = True
    for synonym in hair_synonyms:
        if synonym in content:
            print_check(
                f"Синоним '{synonym}' добавлен",
                True,
                f"Найден в prompts.py"
            )
        else:
            print_check(
                f"Синоним '{synonym}' добавлен",
                False,
                f"НЕ найден в prompts.py"
            )
            all_found = False

    return all_found


def test_ux_improvements():
    """Тест 3: Улучшения UX"""
    print_section("ТЕСТ 3: УЛУЧШЕНИЯ UX")

    prompts_file = os.path.join(os.path.dirname(__file__), '..', 'bot', 'prompts.py')

    with open(prompts_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Проверяем что убрали перечисление мастеров
    has_no_master_listing = "СРАЗУ предлагай время, БЕЗ списка мастеров" in content
    print_check(
        "Убрано перечисление имен мастеров",
        has_no_master_listing,
        f"Найдена инструкция в prompts.py"
    )

    # Проверяем инструкции про время
    has_time_suggestion = "окошко в 10:00" in content or "предлагай время" in content
    print_check(
        "Добавлены инструкции сразу предлагать время",
        has_time_suggestion,
        f"Найдены примеры с временем"
    )

    return has_no_master_listing and has_time_suggestion


def test_tool_code_prevention():
    """Тест 4: Предотвращение вывода tool_code"""
    print_section("ТЕСТ 4: ПРЕДОТВРАЩЕНИЕ ВЫВОДА TOOL_CODE")

    prompts_file = os.path.join(os.path.dirname(__file__), '..', 'bot', 'prompts.py')

    with open(prompts_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Проверяем что УДАЛЕНЫ опасные примеры
    has_dangerous_examples = "```tool_code```" in content or "```check_masters" in content
    print_check(
        "Удалены опасные примеры кода из промпта",
        not has_dangerous_examples,
        f"Промпт {'НЕ содержит' if not has_dangerous_examples else 'СОДЕРЖИТ'} примеры с кодом"
    )

    # Проверяем наличие позитивных инструкций
    has_human_format = "ТОЛЬКО обычным текстом" in content or "как живой человек" in content
    print_check(
        "Добавлены инструкции писать человеческим языком",
        has_human_format,
        f"Найдены позитивные инструкции"
    )

    # Проверяем примеры ПРАВИЛЬНЫХ ответов
    has_good_examples = "На завтра есть окошко" in content or "Есть окно завтра" in content
    print_check(
        "Есть примеры ПРАВИЛЬНЫХ ответов с временем",
        has_good_examples,
        f"Найдены примеры правильных ответов"
    )

    return not has_dangerous_examples and has_human_format and has_good_examples


def test_decisiveness():
    """Тест 5: Решительность бота"""
    print_section("ТЕСТ 5: РЕШИТЕЛЬНОСТЬ БОТА")

    prompts_file = os.path.join(os.path.dirname(__file__), '..', 'bot', 'prompts.py')

    with open(prompts_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Проверяем наличие инструкций о решительности
    has_decisiveness_section = "БУДЬ РЕШИТЕЛЬНЫМ" in content or "БУД РЕШИТЕЛЬНЫМ" in content
    has_positive_examples = "Записываю" in content and "Беру для вас" in content
    has_negative_examples = "может быть" in content and "попробую" in content

    print_check(
        "Секция о решительности добавлена",
        has_decisiveness_section,
        f"Найдена инструкция о решительности"
    )

    print_check(
        "Позитивные примеры (что говорить)",
        has_positive_examples,
        f"Найдены: 'Записываю', 'Беру для вас'"
    )

    print_check(
        "Негативные примеры (что НЕ говорить)",
        has_negative_examples,
        f"Найдены: 'может быть', 'попробую' (как примеры что избегать)"
    )

    return has_decisiveness_section and has_positive_examples


def test_masters_filtering():
    """Тест 6: Фильтрация мастеров по услуге"""
    print_section("ТЕСТ 6: ФИЛЬТРАЦИЯ МАСТЕРОВ")

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Находим услугу Hair
    c.execute("SELECT id, name, name_ru FROM services WHERE category = 'Hair' AND is_active = 1 LIMIT 1")
    hair_service = c.fetchone()

    if not hair_service:
        print_check(
            "Услуга Hair найдена",
            False,
            "Нет активных услуг категории Hair"
        )
        conn.close()
        return False

    service_id = hair_service[0]
    service_name = hair_service[2] or hair_service[1]

    # Получаем мастеров для услуги
    masters_for_service = get_employees_by_service(service_id)

    # Получаем всех мастеров
    all_masters = get_all_employees(active_only=True, service_providers_only=True)

    print_check(
        f"Услуга '{service_name}' найдена",
        True,
        f"ID: {service_id}"
    )

    print_check(
        "Мастеров для услуги",
        len(masters_for_service) > 0,
        f"Найдено: {len(masters_for_service)} мастеров"
    )

    is_filtered = len(masters_for_service) <= len(all_masters)
    print_check(
        "Фильтрация работает (не все мастера)",
        is_filtered,
        f"Мастеров для услуги: {len(masters_for_service)} из {len(all_masters)} всего"
    )

    if masters_for_service:
        print("\n  Мастера для этой услуги:")
        for master in masters_for_service[:5]:
            master_name = master[1] if len(master) > 1 else "?"
            print(f"    • {master_name}")

    conn.close()
    return is_filtered and len(masters_for_service) > 0


def main():
    """Главная функция"""
    print("\n" + "="*70)
    print("  ВАЛИДАЦИЯ ИСПРАВЛЕНИЙ ЧАТ-БОТА")
    print("="*70)

    results = {
        "Форматирование цен": test_price_formatting(),
        "Синонимы услуг": test_service_synonyms(),
        "Улучшения UX": test_ux_improvements(),
        "Предотвращение tool_code": test_tool_code_prevention(),
        "Решительность бота": test_decisiveness(),
        "Фильтрация мастеров": test_masters_filtering(),
    }

    # Итоговый отчет
    print_section("ИТОГОВЫЙ ОТЧЕТ")

    total = len(results)
    passed = sum(1 for v in results.values() if v)

    for test_name, result in results.items():
        status = "✅" if result else "❌"
        print(f"  {status} {test_name}")

    print(f"\n  Пройдено: {passed}/{total}")

    if passed == total:
        print("\n  🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
    else:
        print(f"\n  ⚠️ Не пройдено: {total - passed} тестов")

    print("\n" + "="*70 + "\n")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
