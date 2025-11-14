"""
Автоматическая транслитерация имен сотрудников
Универсальное решение без ручных переводов
"""

# Таблица транслитерации Латиница → Кириллица
LATIN_TO_CYRILLIC = {
    'A': 'А', 'B': 'Б', 'C': 'К', 'D': 'Д', 'E': 'Е',
    'F': 'Ф', 'G': 'Г', 'H': 'Х', 'I': 'И', 'J': 'Дж',
    'K': 'К', 'L': 'Л', 'M': 'М', 'N': 'Н', 'O': 'О',
    'P': 'П', 'Q': 'К', 'R': 'Р', 'S': 'С', 'T': 'Т',
    'U': 'У', 'V': 'В', 'W': 'В', 'X': 'Кс', 'Y': 'Й',
    'Z': 'З',
    'a': 'а', 'b': 'б', 'c': 'к', 'd': 'д', 'e': 'е',
    'f': 'ф', 'g': 'г', 'h': 'х', 'i': 'и', 'j': 'дж',
    'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о',
    'p': 'п', 'q': 'к', 'r': 'р', 's': 'с', 't': 'т',
    'u': 'у', 'v': 'в', 'w': 'в', 'x': 'кс', 'y': 'й',
    'z': 'з'
}

# Таблица транслитерации Латиница → Арабский (фонетическая)
LATIN_TO_ARABIC = {
    'A': 'ا', 'B': 'ب', 'C': 'ك', 'D': 'د', 'E': 'ي',
    'F': 'ف', 'G': 'ج', 'H': 'ه', 'I': 'ي', 'J': 'ج',
    'K': 'ك', 'L': 'ل', 'M': 'م', 'N': 'ن', 'O': 'و',
    'P': 'ب', 'Q': 'ق', 'R': 'ر', 'S': 'س', 'T': 'ت',
    'U': 'و', 'V': 'ف', 'W': 'و', 'X': 'كس', 'Y': 'ي',
    'Z': 'ز',
    'a': 'ا', 'b': 'ب', 'c': 'ك', 'd': 'د', 'e': 'ي',
    'f': 'ف', 'g': 'ج', 'h': 'ه', 'i': 'ي', 'j': 'ج',
    'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن', 'o': 'و',
    'p': 'ب', 'q': 'ق', 'r': 'ر', 's': 'س', 't': 'ت',
    'u': 'و', 'v': 'ف', 'w': 'و', 'x': 'كس', 'y': 'ي',
    'z': 'ز'
}


def is_latin(text: str) -> bool:
    """Проверить содержит ли текст латиницу"""
    return any(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' for c in text)


def is_cyrillic(text: str) -> bool:
    """Проверить содержит ли текст кириллицу"""
    return any('\u0400' <= c <= '\u04FF' for c in text)


def transliterate_to_cyrillic(text: str) -> str:
    """
    Транслитерировать латиницу в кириллицу

    Примеры:
        Takhir → Такхир
        JENNIFER → ДЖЕННИФЕР
        Lyazzat → Ляззат
    """
    if not text:
        return text

    # Если уже кириллица - оставить как есть
    if is_cyrillic(text):
        return text

    result = []
    for char in text:
        result.append(LATIN_TO_CYRILLIC.get(char, char))

    return ''.join(result)


def transliterate_to_arabic(text: str) -> str:
    """
    Транслитерировать латиницу в арабский

    Примеры:
        Takhir → تاكهير
        JENNIFER → جيننيفير
        Lyazzat → ليازات
    """
    if not text:
        return text

    # Если уже арабский - оставить как есть
    if any('\u0600' <= c <= '\u06FF' for c in text):
        return text

    result = []
    for char in text:
        result.append(LATIN_TO_ARABIC.get(char, char))

    return ''.join(result)


def transliterate_name(name: str, target_language: str) -> str:
    """
    Универсальная транслитерация имени в зависимости от языка

    Args:
        name: Имя на латинице (например "SIMO", "Jennifer", "Takhir")
        target_language: Целевой язык ('ru', 'en', 'ar')

    Returns:
        Транслитерированное имя

    Примеры:
        transliterate_name("SIMO", "ru") → "СИМО"
        transliterate_name("Jennifer", "ru") → "Дженнифер"
        transliterate_name("Takhir", "ar") → "تاكهير"
        transliterate_name("SIMO", "en") → "SIMO"  # без изменений
    """
    if not name:
        return name

    if target_language == 'ru':
        return transliterate_to_cyrillic(name)
    elif target_language == 'ar':
        return transliterate_to_arabic(name)
    else:  # 'en' или любой другой
        return name  # Оставить латиницу как есть


def transliterate_employees_for_language(employees: list, language: str) -> list:
    """
    Транслитерировать имена всех сотрудников для определенного языка

    Args:
        employees: Список сотрудников с полем 'full_name'
        language: Язык клиента ('ru', 'en', 'ar')

    Returns:
        Список сотрудников с транслитерированными именами

    Пример:
        employees = [
            {'id': 1, 'full_name': 'SIMO', 'position': 'HAIR STYLIST'},
            {'id': 2, 'full_name': 'Jennifer', 'position': 'NAIL MASTER'}
        ]

        # Для русского клиента:
        transliterate_employees_for_language(employees, 'ru')
        → [
            {'id': 1, 'full_name': 'СИМО', 'position': 'HAIR STYLIST'},
            {'id': 2, 'full_name': 'Дженнифер', 'position': 'NAIL MASTER'}
        ]
    """
    result = []
    for emp in employees:
        emp_copy = emp.copy()
        if 'full_name' in emp_copy:
            emp_copy['full_name'] = transliterate_name(emp_copy['full_name'], language)
        if 'position' in emp_copy:
            emp_copy['position'] = transliterate_name(emp_copy['position'], language)
        result.append(emp_copy)

    return result


if __name__ == "__main__":
    # Тесты
    print("=" * 70)
    print("🧪 ТЕСТИРОВАНИЕ ТРАНСЛИТЕРАЦИИ")
    print("=" * 70)

    test_names = ["SIMO", "MESTAN", "LYAZZAT", "GULYA", "JENNIFER", "Takhir"]

    print("\n🇷🇺 РУССКИЙ:")
    for name in test_names:
        transliterated = transliterate_name(name, 'ru')
        print(f"  {name:15} → {transliterated}")

    print("\n🇸🇦 АРАБСКИЙ:")
    for name in test_names:
        transliterated = transliterate_name(name, 'ar')
        print(f"  {name:15} → {transliterated}")

    print("\n🇬🇧 АНГЛИЙСКИЙ (без изменений):")
    for name in test_names:
        transliterated = transliterate_name(name, 'en')
        print(f"  {name:15} → {transliterated}")

    print("\n" + "=" * 70)
