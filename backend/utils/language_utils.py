"""
Утилиты для работы с языками - универсальные функции без хардкода
"""
from typing import List, Optional

# Поддерживаемые языки - единый источник истины
SUPPORTED_LANGUAGES = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
DEFAULT_LANGUAGE = 'ru'
FALLBACK_LANGUAGE = 'en'

def get_language_field_name(base_field: str, language: str) -> str:
    """
    Получить имя поля БД для указанного языка
    
    Args:
        base_field: Базовое имя поля (например 'name', 'full_name', 'title')
        language: Код языка
        
    Returns:
        Имя поля с суффиксом языка (например 'name_ru', 'full_name_en')
    """
    if language not in SUPPORTED_LANGUAGES:
        language = DEFAULT_LANGUAGE
    
    # Специальный случай: 'en' использует базовое поле без суффикса
    if language == 'en':
        return base_field
    
    return f"{base_field}_{language}"

def get_service_name_field(language: str) -> str:
    """Получить имя поля для названия услуги на указанном языке"""
    return get_language_field_name('name', language)

def get_master_name_field(language: str) -> str:
    """Получить имя поля для имени мастера на указанном языке"""
    return get_language_field_name('full_name', language)

def get_position_field(language: str) -> str:
    """Получить имя поля для должности на указанном языке"""
    return get_language_field_name('position', language)

def validate_language(language: str) -> str:
    """Валидировать и нормализовать код языка"""
    if language in SUPPORTED_LANGUAGES:
        return language
    return DEFAULT_LANGUAGE

def get_service_name_index(language: str) -> int:
    """
    Получить индекс поля названия услуги в tuple из БД
    
    Структура services: 0:id, 1:code, 2:name (en), 3:name_ru, 4:name_ar, 
                        5:name_es, 6:name_de, 7:name_fr, 8:name_pt, 9:name_hi, 10:name_kk
    """
    index_map = {
        'ru': 3,
        'en': 2,
        'ar': 4,
        'es': 5,
        'de': 6,
        'fr': 7,
        'pt': 8,
        'hi': 9,
        'kk': 10
    }
    return index_map.get(language, 2)  # По умолчанию английский

def build_coalesce_query(field_base: str, language: str, fallback_fields: Optional[List[str]] = None) -> str:
    """
    Построить COALESCE запрос для получения локализованного значения с fallback
    
    Args:
        field_base: Базовое имя поля
        language: Код языка
        fallback_fields: Дополнительные поля для fallback (по умолчанию: en, ru, base)
    
    Returns:
        SQL выражение COALESCE
    """
    if fallback_fields is None:
        fallback_fields = ['en', 'ru']
    
    language = validate_language(language)
    primary_field = get_language_field_name(field_base, language)
    
    # Строим список полей для COALESCE
    fields = [primary_field]
    
    # Добавляем fallback поля
    for fallback_lang in fallback_fields:
        if fallback_lang != language:
            fallback_field = get_language_field_name(field_base, fallback_lang)
            if fallback_field not in fields:
                fields.append(fallback_field)
    
    # Добавляем базовое поле в конце
    if field_base not in fields:
        fields.append(field_base)
    
    return f"COALESCE({', '.join(fields)})"

def get_localized_name(emp_id: int, full_name: str, language: str = 'ru') -> str:
    """
    Универсальная функция для получения локализованного имени мастера из БД
    Используется в prompts.py и smart_scheduler.py
    
    Args:
        emp_id: ID мастера в таблице users
        full_name: Полное имя (fallback если локализация не найдена)
        language: Код языка
    
    Returns:
        Локализованное имя или full_name если не найдено
    """
    from db.connection import get_db_connection
    import logging
    
    logger = logging.getLogger(__name__)
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Проверяем, что мастер существует
        cursor.execute("SELECT id, is_active FROM users WHERE id = %s", (emp_id,))
        master_check = cursor.fetchone()
        
        if not master_check:
            logger.error(f"❌ ERROR: Master with id={emp_id} NOT FOUND in DB! Using fallback: {full_name}")
            print(f"❌ ERROR: Master with id={emp_id} NOT FOUND in DB! Using fallback: {full_name}")
            return full_name
        
        if not master_check[1]:
            logger.warning(f"⚠️ WARNING: Master id={emp_id} is NOT ACTIVE! Using fallback: {full_name}")
            print(f"⚠️ WARNING: Master id={emp_id} is NOT ACTIVE! Using fallback: {full_name}")
        
        # Валидация языка
        language = validate_language(language)
        
        # Получаем локализованное имя с универсальным COALESCE
        coalesce_expr = build_coalesce_query('full_name', language)
        cursor.execute(f"""
            SELECT {coalesce_expr}
            FROM users 
            WHERE id = %s
        """, (emp_id,))
        
        result = cursor.fetchone()
        localized_name = result[0] if result and result[0] else full_name
        
        if localized_name != full_name:
            logger.debug(f"✅ Localized name for id={emp_id}: {full_name} -> {localized_name} ({language})")
        
        return localized_name
        
    except Exception as e:
        logger.error(f"❌ ERROR in get_localized_name for id={emp_id}: {e}", exc_info=True)
        print(f"❌ ERROR in get_localized_name for id={emp_id}: {e}")
        return full_name
    finally:
        conn.close()

