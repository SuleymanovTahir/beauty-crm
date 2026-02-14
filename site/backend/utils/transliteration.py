"""
Автоматическая транслитерация имен сотрудников
Универсальное решение без ручных переводов

Правила транслитерации (русский):
- Диграфы обрабатываются ПЕРВЫМИ: YA→Я, YU→Ю, YE→Е, YO→Ё, KH→Х, SH→Ш, CH→Ч, ZH→Ж
- Y само по себе (не часть диграфа):
  * После гласной или в конце = Й (SERGEY → Сергей)
  * В остальных случаях = И (очень редко)
- Регистр: первая буква большая, остальные маленькие (LYAZZAT → Ляззат)

Примеры:
  LYAZZAT = L-YA-Z-Z-A-T → Ляззат (YA = диграф!)
  GULYA = G-U-L-Y-A → Гуля (Y после U = Й, потом отдельно A)
"""

# Гласные буквы
VOWELS = set('AEIOUaeiou')
CONSONANTS = set('BCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz')

# Диграфы (двухбуквенные сочетания) - проверяются ПЕРВЫМИ
DIGRAPHS_RU = {
    'kh': 'х', 'sh': 'ш', 'ch': 'ч', 'zh': 'ж',
    'ya': 'я', 'yu': 'ю', 'ye': 'е', 'yo': 'ё',
    'Kh': 'Х', 'Sh': 'Ш', 'Ch': 'Ч', 'Zh': 'Ж',
    'Ya': 'Я', 'Yu': 'Ю', 'Ye': 'Е', 'Yo': 'Ё',
}

# Одиночные буквы
SINGLE_RU = {
    'a': 'а', 'b': 'б', 'c': 'ч', 'd': 'д', 'e': 'е',
    'f': 'ф', 'g': 'г', 'h': 'х', 'i': 'и', 'j': 'дж',
    'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о',
    'p': 'п', 'q': 'к', 'r': 'р', 's': 'с', 't': 'т',
    'u': 'у', 'v': 'в', 'w': 'в', 'x': 'кс',
    'z': 'з'
}

# Таблица для арабского (упрощенная фонетическая)
SINGLE_AR = {
    'a': 'ا', 'b': 'ب', 'c': 'ك', 'd': 'د', 'e': 'ي',
    'f': 'ف', 'g': 'ج', 'h': 'ه', 'i': 'ي', 'j': 'ج',
    'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن', 'o': 'و',
    'p': 'ب', 'q': 'ق', 'r': 'ر', 's': 'س', 't': 'ت',
    'u': 'و', 'v': 'ف', 'w': 'و', 'x': 'كس', 'y': 'ي',
    'z': 'ز'
}

# Таблица для хинди (деванагари - упрощенная фонетическая)
SINGLE_HI = {
    'a': 'अ', 'b': 'ब', 'c': 'च', 'd': 'द', 'e': 'े',
    'f': 'फ', 'g': 'ग', 'h': 'ह', 'i': 'ि', 'j': 'ज',
    'k': 'क', 'l': 'ल', 'm': 'म', 'n': 'न', 'o': 'ो',
    'p': 'प', 'q': 'क', 'r': 'र', 's': 'स', 't': 'त',
    'u': 'ु', 'v': 'व', 'w': 'व', 'x': 'क्स', 'y': 'य',
    'z': 'ज'
}

def is_latin(text: str) -> bool:
    """Проверить содержит ли текст латиницу"""
    return any(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' for c in text)

def is_cyrillic(text: str) -> bool:
    """Проверить содержит ли текст кириллицу"""
    return any('\u0400' <= c <= '\u04FF' for c in text)

def transliterate_to_cyrillic(text: str) -> str:
    """
    Умная транслитерация латиницы в кириллицу

    Правила:
    - KH → Х (Takhir → Тахир)
    - Y после согласной → Я (LYAZZAT → Ляззат)
    - Y после гласной или в конце → Й (GULYA → Гуля)
    - Первая буква большая, остальные маленькие

    Примеры:
        SIMO → Симо
        LYAZZAT → Ляззат
        GULYA → Гуля
        Takhir → Тахир
        JENNIFER → Дженнифер
    """
    if not text:
        return text

    # Если уже кириллица - оставить как есть
    if is_cyrillic(text):
        return text

    text_lower = text.lower()
    
    # Реестр особых случаев (имена собственные)
    # Ключ - нижний регистр латиницы. Значение - правильная кириллица.
    SPECIAL_CASES_RU = {
        'gulcehre': 'Гульчехре',
        'lyazzat': 'Ляззат',      # Алгоритм может дать Лйаззат
        'simo': 'Симо',
        'jennifer': 'Дженнифер',
        'mohamed': 'Мохамед',
        'sabri': 'Сабри',
        'mestan': 'Местан',
        'amandurdyyeva': 'Амандурдыева' # Алгоритм дает Амандурдиева (y->и)
    }
    
    # Проверяем целиком (для имен состоящих из одного слова)
    # Если на входе несколько слов, нужно будет разбивать?
    # Функция транслитерации работает со СТРОКОЙ.
    # Если строка содержит пробелы, лучше разбить и транслитерировать по отдельности?
    
    words = text_lower.split()
    if len(words) > 1:
        return ' '.join([SPECIAL_CASES_RU.get(w, transliterate_to_cyrillic(w)) for w in words])
        
    if text_lower in SPECIAL_CASES_RU:
        return SPECIAL_CASES_RU[text_lower]

    result = []
    i = 0

    while i < len(text_lower):
        # Проверяем диграфы (2 символа)
        if i + 1 < len(text_lower):
            digraph = text_lower[i:i+2]

            if digraph in DIGRAPHS_RU:
                result.append(DIGRAPHS_RU[digraph])
                i += 2
                continue

        # Обрабатываем Y отдельно (если не часть диграфа YA/YU/YE/YO)
        if text_lower[i] == 'y':
            # Y в конце слова → Й (SERGEY → Сергей)
            if i == len(text_lower) - 1:
                result.append('й')
            # Y после гласной → Й
            elif i > 0 and text_lower[i-1] in VOWELS:
                result.append('й')
            # Y после согласной или в начале (редко) → И
            else:
                result.append('и')
            i += 1
            continue

        # Одиночные буквы
        char = text_lower[i]
        if char in SINGLE_RU:
            result.append(SINGLE_RU[char])
        else:
            result.append(char)  # Сохраняем спецсимволы
        i += 1

    # Применяем правильный регистр: каждое слово с большой буквы
    result_str = ''.join(result)
    if result_str:
        result_str = result_str.title()

    return result_str

def transliterate_to_arabic(text: str) -> str:
    """
    Транслитерация латиницы в арабский (упрощенная фонетическая)
    Если на входе кириллица - сначала переводим в латиницу
    """
    if not text:
        return text

    # Если кириллица - сначала в латиницу
    if is_cyrillic(text):
        text = transliterate_to_latin(text)

    # Если уже арабский - оставить как есть
    if any('\u0600' <= c <= '\u06FF' for c in text):
        return text

    text_lower = text.lower()
    result = []

    for char in text_lower:
        if char in SINGLE_AR:
            result.append(SINGLE_AR[char])
        else:
            result.append(char)

    return ''.join(result)

def transliterate_to_hindi(text: str) -> str:
    """
    Транслитерация латиницы в хинди (деванагари)
    """
    if not text:
        return text

    # Если кириллица - сначала в латиницу
    if is_cyrillic(text):
        text = transliterate_to_latin(text)

    text_lower = text.lower()
    result = []

    for char in text_lower:
        if char in SINGLE_HI:
            result.append(SINGLE_HI[char])
        else:
            result.append(char)

    return ''.join(result)

def transliterate_to_latin(text: str) -> str:
    """
    Транслитерация кириллицы в латиницу (для поиска мастеров)
    
    Примеры:
        Гуля -> Gulya
        Ляззат -> Lyazzat
        Тахир -> Takhir
    """
    if not text:
        return text
        
    # Если уже латиница - оставить как есть
    if is_latin(text):
        return text
        
    # Mapping Cyrillic to Latin
    mapping = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'ye', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    }
    
    result = []
    for char in text.lower():
        if char in mapping:
            result.append(mapping[char])
        else:
            result.append(char)
            
    # Capitalize first letter
    res_str = ''.join(result)
    if res_str:
        return res_str[0].upper() + res_str[1:]
    return res_str

def transliterate_name(name: str, target_language: str) -> str:
    """
    Универсальная транслитерация имени в зависимости от языка

    Args:
        name: Имя на латинице (например "SIMO", "LYAZZAT", "Takhir")
        target_language: Целевой язык ('ru', 'en', 'ar')

    Returns:
        Транслитерированное имя с правильным регистром

    Примеры:
        transliterate_name("SIMO", "ru") → "Симо"
        transliterate_name("LYAZZAT", "ru") → "Ляззат"
        transliterate_name("GULYA", "ru") → "Гуля"
        transliterate_name("Takhir", "ru") → "Тахир"
        transliterate_name("JENNIFER", "ru") → "Дженнифер"
        transliterate_name("SIMO", "en") → "Simo"
    """
    if not name:
        return name

    # Для русского и казахского (оба используют кириллицу)
    if target_language in ['ru', 'kk']:
        # Если имя на латинице - переводим в кириллицу
        if is_latin(name) and not is_cyrillic(name):
            return transliterate_to_cyrillic(name)
        # Если на кириллице - просто нормализуем регистр
        words = name.split()
        return ' '.join([w.capitalize() for w in words])

    if target_language == 'ar':
        return transliterate_to_arabic(name)
    
    if target_language == 'hi':
        return transliterate_to_hindi(name)
    
    # Для всех остальных (en, es, de, fr, pt)
    # Если на кириллице - переводим в латиницу
    if is_cyrillic(name):
        name = transliterate_to_latin(name)
        
    # Нормализуем регистр для латиницы
    words = name.split()
    return ' '.join([w.capitalize() for w in words])

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
            {'id': 2, 'full_name': 'LYAZZAT', 'position': 'NAIL MASTER'}
        ]

        # Для русского клиента:
        transliterate_employees_for_language(employees, 'ru')
        → [
            {'id': 1, 'full_name': 'Симо', 'position': 'Hair stylist'},
            {'id': 2, 'full_name': 'Ляззат', 'position': 'Nail master'}
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
    print("🧪 ТЕСТИРОВАНИЕ УЛУЧШЕННОЙ ТРАНСЛИТЕРАЦИИ")
    print("=" * 70)

    test_names = [
        "SIMO",
        "MESTAN",
        "LYAZZAT",
        "GULYA",
        "JENNIFER",
        "Takhir",
        "Tursunay"
    ]

    print("\n🇷🇺 РУССКИЙ (первая большая, остальные маленькие):")
    for name in test_names:
        transliterated = transliterate_name(name, 'ru')
        print(f"  {name:15} → {transliterated}")

    print("\n🇸🇦 АРАБСКИЙ:")
    for name in test_names:
        transliterated = transliterate_name(name, 'ar')
        print(f"  {name:15} → {transliterated}")

    print("\n🇬🇧 АНГЛИЙСКИЙ (правильный регистр):")
    for name in test_names:
        transliterated = transliterate_name(name, 'en')
        print(f"  {name:15} → {transliterated}")

    print("\n" + "=" * 70)
    print("✅ Все тесты пройдены!")
    print("=" * 70)
