"""
Утилита для автоматического перевода имён мастеров
"""

def transliterate_to_russian(name: str) -> str:
    """
    Транслитерация имени на русский язык

    Args:
        name: Имя на английском

    Returns:
        Транслитерированное имя на русском
    """
    # Словарь транслитерации английских букв в русские
    translit_map = {
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

    # Специальные правила для распространённых сочетаний
    name = name.replace('sh', 'ш').replace('Sh', 'Ш')
    name = name.replace('ch', 'ч').replace('Ch', 'Ч')
    name = name.replace('zh', 'ж').replace('Zh', 'Ж')
    name = name.replace('kh', 'х').replace('Kh', 'Х')
    name = name.replace('ts', 'ц').replace('Ts', 'Ц')
    name = name.replace('ya', 'я').replace('Ya', 'Я')
    name = name.replace('ye', 'е').replace('Ye', 'Е')
    name = name.replace('yo', 'ё').replace('Yo', 'Ё')
    name = name.replace('yu', 'ю').replace('Yu', 'Ю')
    name = name.replace('ii', 'ий').replace('Ii', 'Ий')

    result = ''
    i = 0
    while i < len(name):
        char = name[i]
        if char in translit_map:
            result += translit_map[char]
        else:
            result += char
        i += 1

    return result

def transliterate_to_arabic(name: str) -> str:
    """
    Транслитерация имени на арабский язык

    Args:
        name: Имя на английском

    Returns:
        Транслитерированное имя на арабском
    """
    # Словарь транслитерации английских букв в арабские
    # Используем стандартные правила транслитерации
    translit_map = {
        'a': 'ا', 'b': 'ب', 'c': 'ك', 'd': 'د', 'e': 'ي',
        'f': 'ف', 'g': 'ج', 'h': 'ه', 'i': 'ي', 'j': 'ج',
        'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن', 'o': 'و',
        'p': 'ب', 'q': 'ق', 'r': 'ر', 's': 'س', 't': 'ت',
        'u': 'و', 'v': 'ف', 'w': 'و', 'x': 'كس', 'y': 'ي',
        'z': 'ز'
    }

    name_lower = name.lower()

    # Специальные правила для распространённых сочетаний
    name_lower = name_lower.replace('sh', 'ش')
    name_lower = name_lower.replace('ch', 'ش')
    name_lower = name_lower.replace('th', 'ث')
    name_lower = name_lower.replace('kh', 'خ')
    name_lower = name_lower.replace('dh', 'ذ')
    name_lower = name_lower.replace('gh', 'غ')

    result = ''
    i = 0
    while i < len(name_lower):
        char = name_lower[i]
        if char in translit_map:
            result += translit_map[char]
        else:
            result += char
        i += 1

    return result

def auto_translate_name(name: str) -> dict:
    """
    Автоматически переводит имя на русский и арабский

    Args:
        name: Имя на английском

    Returns:
        Словарь с переводами {'ru': '...', 'ar': '...'}
    """
    return {
        'ru': transliterate_to_russian(name),
        'ar': transliterate_to_arabic(name)
    }

if __name__ == "__main__":
    # Тестирование
    test_names = ['Simo', 'Mestan', 'Lyazzat', 'Gulya', 'Jennifer', 'Tursunay', 'Karina']

    print("🌍 ТЕСТИРОВАНИЕ АВТОПЕРЕВОДА ИМЁН")
    print("=" * 70)

    for name in test_names:
        translations = auto_translate_name(name)
        print(f"{name:15} → RU: {translations['ru']:20} AR: {translations['ar']}")
