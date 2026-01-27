"""
Модуль для работы с публичным контентом (отзывы, FAQ, галерея)
"""

from typing import List, Dict, Optional
from datetime import datetime
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def get_active_reviews(language: str = 'ru', limit: Optional[int] = None) -> List[Dict]:
    """
    Получить активные отзывы на указанном языке БЕЗ ДУБЛИКАТОВ
    
    Args:
        language: Код языка (ru, en, ar, es, de, fr, hi, kk, pt)
        limit: Максимальное количество отзывов (None = все)
    
    Returns:
        List[Dict]: Список отзывов
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Sanitize language to prevent SQL injection and errors
        valid_languages = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
        if language not in valid_languages:
            language = 'en'

        # Determine text column based on language
        text_field = f'text_{language}'
        
        # CRITICAL FIX: Use DISTINCT ON to prevent duplicates
        # Same person in different languages (Fatima/Фатима) should show only once
        query = f"""
            SELECT DISTINCT ON (
                LOWER(COALESCE(author_name_{language}, author_name_en, author_name_ru, author_name)),
                LOWER(COALESCE({text_field}, text_ru, text_en))
            )
                id,
                COALESCE(author_name_{language}, author_name_en, author_name_ru, author_name) as name,
                rating,
                COALESCE({text_field}, text_ru, text_en) as text,
                avatar_url,
                display_order,
                COALESCE(employee_name_{language}, employee_name_en, employee_name_ru, employee_name) as employee_name,
                COALESCE(employee_position_{language}, employee_position_en, employee_position_ru, employee_position) as employee_position,
                created_at
            FROM public_reviews
            WHERE is_active = TRUE
            ORDER BY 
                LOWER(COALESCE(author_name_{language}, author_name_en, author_name_ru, author_name)),
                LOWER(COALESCE({text_field}, text_ru, text_en)),
                display_order DESC, 
                created_at DESC
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        reviews = [dict(zip(columns, row)) for row in rows]
        
        log_info(f"Получено {len(reviews)} уникальных отзывов на языке {language}", "db")
        return reviews
        
    except Exception as e:
        log_error(f"Ошибка получения отзывов: {e}", "db")
        return []
    finally:
        conn.close()

def get_active_faq(language: str = 'ru', category: Optional[str] = None) -> List[Dict]:
    """
    Получить активные FAQ на указанном языке
    
    Args:
        language: Код языка
        category: Категория (опционально)
    
    Returns:
        List[Dict]: Список вопросов и ответов
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Sanitize language
        valid_languages = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
        if language not in valid_languages:
            language = 'ru'

        question_field = f'question_{language}'
        answer_field = f'answer_{language}'
        
        query = f"""
            SELECT 
                id,
                COALESCE({question_field}, question_ru, question_en) as question,
                COALESCE({answer_field}, answer_ru, answer_en) as answer,
                category,
                display_order
            FROM public_faq
            WHERE is_active = TRUE
        """
        
        if category:
            query += f" AND category = '{category}'"
        
        query += " ORDER BY display_order DESC, created_at DESC"
        
        cursor.execute(query)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        faq = [dict(zip(columns, row)) for row in rows]
        
        log_info(f"Получено {len(faq)} FAQ на языке {language}", "db")
        return faq
        
    except Exception as e:
        log_error(f"Ошибка получения FAQ: {e}", "db")
        return []
    finally:
        conn.close()

def get_active_gallery(category: Optional[str] = None, limit: Optional[int] = None) -> List[Dict]:
    """
    Получить активные элементы галереи из media_library
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Use media_library with context='gallery'
        query = """
            SELECT 
                id, 
                url as image_url, 
                title as title_ru, 
                description as description_ru, 
                category, 
                sort_order, 
                created_at
            FROM media_library
            WHERE context = 'gallery' AND is_public = TRUE
        """
        params = []
        
        if category:
            query += " AND category = %s"
            params.append(category)
            
        query += " ORDER BY sort_order ASC, created_at DESC"
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        gallery = [dict(zip(columns, row)) for row in rows]

        log_info(f"📸 [Gallery DB] Получено {len(gallery)} элементов из media_library (category: {category})", "db")
        return gallery
        
    except Exception as e:
        log_error(f"Ошибка получения галереи: {e}", "db")
        return []
    finally:
        conn.close()

def add_review(data: Dict) -> Optional[int]:
    """
    Добавить новый отзыв
    
    Args:
        data: Данные отзыва (author_name, rating, text_ru, text_en, etc.)
    
    Returns:
        int: ID созданного отзыва или None при ошибке
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO public_reviews (
                author_name, rating, text_ru, text_en, text_ar, text_de, text_es, 
                text_fr, text_hi, text_kk, text_pt, avatar_url, is_active, display_order,
                employee_name, employee_name_ru, employee_name_en, employee_name_ar,
                employee_position, employee_position_ru, employee_position_en, employee_position_ar,
                employee_position_es, employee_position_de, employee_position_fr, employee_position_hi,
                employee_position_kk, employee_position_pt
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('author_name'),
            data.get('rating', 5),
            data.get('text_ru'),
            data.get('text_en'),
            data.get('text_ar'),
            data.get('text_de'),
            data.get('text_es'),
            data.get('text_fr'),
            data.get('text_hi'),
            data.get('text_kk'),
            data.get('text_pt'),
            data.get('avatar_url'),
            data.get('is_active', 1),
            data.get('display_order', 0),
            data.get('employee_name'),
            data.get('employee_name_ru'),
            data.get('employee_name_en'),
            data.get('employee_name_ar'),
            data.get('employee_name_es'),
            data.get('employee_name_de'),
            data.get('employee_name_fr'),
            data.get('employee_name_hi'),
            data.get('employee_name_kk'),
            data.get('employee_name_pt'),
            data.get('employee_position'),
            data.get('employee_position_ru'),
            data.get('employee_position_en'),
            data.get('employee_position_ar'),
            data.get('employee_position_es'),
            data.get('employee_position_de'),
            data.get('employee_position_fr'),
            data.get('employee_position_hi'),
            data.get('employee_position_kk'),
            data.get('employee_position_pt')
        ))
        
        conn.commit()
        review_id = cursor.lastrowid
        log_info(f"Добавлен отзыв ID {review_id} от {data.get('author_name')}", "db")
        return review_id
        
    except Exception as e:
        log_error(f"Ошибка добавления отзыва: {e}", "db")
        conn.rollback()
        return None
    finally:
        conn.close()

def add_faq(data: Dict) -> Optional[int]:
    """
    Добавить новый FAQ
    
    Args:
        data: Данные FAQ (question_ru, answer_ru, question_en, answer_en, etc.)
    
    Returns:
        int: ID созданного FAQ или None при ошибке
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO public_faq (
                question_ru, question_en, question_ar, question_de, question_es, question_fr, question_hi, question_kk, question_pt,
                answer_ru, answer_en, answer_ar, answer_de, answer_es, answer_fr, answer_hi, answer_kk, answer_pt,
                category, is_active, display_order
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('question_ru'),
            data.get('question_en'),
            data.get('question_ar'),
            data.get('question_de'),
            data.get('question_es'),
            data.get('question_fr'),
            data.get('question_hi'),
            data.get('question_kk'),
            data.get('question_pt'),
            data.get('answer_ru'),
            data.get('answer_en'),
            data.get('answer_ar'),
            data.get('answer_de'),
            data.get('answer_es'),
            data.get('answer_fr'),
            data.get('answer_hi'),
            data.get('answer_kk'),
            data.get('answer_pt'),
            data.get('category', 'general'),
            data.get('is_active', 1),
            data.get('display_order', 0)
        ))
        
        conn.commit()
        faq_id = cursor.lastrowid
        log_info(f"Добавлен FAQ ID {faq_id}", "db")
        return faq_id
        
    except Exception as e:
        log_error(f"Ошибка добавления FAQ: {e}", "db")
        conn.rollback()
        return None
    finally:
        conn.close()

def add_gallery_item(data: Dict) -> Optional[int]:
    """
    Добавить элемент в галерею в media_library
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO media_library (
                context, url, title, description, category, sort_order, is_public
            ) VALUES ('gallery', %s, %s, %s, %s, %s, TRUE)
            RETURNING id
        """, (
            data.get('image_url'),
            data.get('title_ru'),
            data.get('description_ru'),
            data.get('category', 'works'),
            data.get('display_order', 0)
        ))
        
        item_id = cursor.fetchone()[0]
        conn.commit()
        log_info(f"Добавлен элемент галереи ID {item_id} в media_library", "db")
        return item_id
        
    except Exception as e:
        log_error(f"Ошибка добавления элемента галереи: {e}", "db")
        conn.rollback()
        return None
    finally:
        conn.close()
