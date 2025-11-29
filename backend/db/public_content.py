"""
Модуль для работы с публичным контентом (отзывы, FAQ, галерея)
"""
import sqlite3
from typing import List, Dict, Optional
from datetime import datetime
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def get_active_reviews(language: str = 'ru', limit: Optional[int] = None) -> List[Dict]:
    """
    Получить активные отзывы на указанном языке
    
    Args:
        language: Код языка (ru, en, ar, es, de, fr, hi, kk, pt)
        limit: Максимальное количество отзывов (None = все)
    
    Returns:
        List[Dict]: Список отзывов
    """
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Determine text column based on language
        text_field = f'text_{language}'
        
        # Check if column exists (safe fallback)
        # Actually, we know we added them. But let's be safe and use COALESCE with ru/en
        
        query = f"""
            SELECT 
                id,
                COALESCE(author_name_{language}, author_name_en, author_name_ru, author_name) as name,
                rating,
                COALESCE({text_field}, text_ru, text_en) as text,
                avatar_url,
                display_order,
                COALESCE(employee_name_{language}, employee_name_en, employee_name_ru, employee_name) as employee_name,
                COALESCE(employee_position_{language}, employee_position_en, employee_position_ru, employee_position) as employee_position
            FROM public_reviews
            WHERE is_active = 1
            ORDER BY display_order DESC, created_at DESC
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query)
        reviews = [dict(row) for row in cursor.fetchall()]
        
        log_info(f"Получено {len(reviews)} отзывов на языке {language}", "db")
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
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
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
            WHERE is_active = 1
        """
        
        if category:
            query += f" AND category = '{category}'"
        
        query += " ORDER BY display_order DESC, created_at DESC"
        
        cursor.execute(query)
        faq = [dict(row) for row in cursor.fetchall()]
        
        log_info(f"Получено {len(faq)} FAQ на языке {language}", "db")
        return faq
        
    except Exception as e:
        log_error(f"Ошибка получения FAQ: {e}", "db")
        return []
    finally:
        conn.close()


def get_active_gallery(category: Optional[str] = None, limit: Optional[int] = None) -> List[Dict]:
    """
    Получить активные элементы галереи
    
    Args:
        category: Категория (опционально)
        limit: Максимальное количество
    
    Returns:
        List[Dict]: Список элементов галереи
    """
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Note: Gallery usually returns ALL fields because frontend might need them?
        # But here we are returning specific fields.
        # Wait, the previous implementation returned title_ru, description_ru hardcoded!
        # We should return ALL localized fields or at least the requested language?
        # The API signature doesn't take language.
        # Let's look at how it's used.
        # Frontend `Portfolio.tsx` calls `getPublicGallery`.
        # It expects `title`.
        # If we don't pass language, we should probably return ALL fields so frontend can choose?
        # OR we should update the API to take language.
        # `backend/api/public_content.py` -> `get_gallery` DOES NOT take language.
        # But `backend/api/public.py` -> `get_public_gallery` DOES NOT take language.
        
        # Let's return ALL language columns so frontend can pick.
        # Or better, let's just select * because we added columns to the table.
        
        query = """
            SELECT *
            FROM gallery_images
            WHERE is_visible = 1
        """
        
        if category:
            query += " AND category = ?"
            params = [category]
        else:
            params = []
            
        query += " ORDER BY sort_order ASC, created_at DESC"
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query, params)
        gallery = [dict(row) for row in cursor.fetchall()]
        
        log_info(f"Получено {len(gallery)} элементов галереи", "db")
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
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO public_reviews (
                author_name, rating, text_ru, text_en, text_ar, text_de, text_es, 
                text_fr, text_hi, text_kk, text_pt, avatar_url, is_active, display_order,
                employee_name, employee_name_ru, employee_name_en, employee_name_ar,
                employee_position, employee_position_ru, employee_position_en, employee_position_ar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            data.get('employee_position'),
            data.get('employee_position_ru'),
            data.get('employee_position_en'),
            data.get('employee_position_ar')
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
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO public_faq (
                question_ru, question_en, question_ar,
                answer_ru, answer_en, answer_ar,
                category, is_active, display_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get('question_ru'),
            data.get('question_en'),
            data.get('question_ar'),
            data.get('answer_ru'),
            data.get('answer_en'),
            data.get('answer_ar'),
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
    Добавить элемент в галерею
    
    Args:
        data: Данные элемента (image_url, title_ru, description_ru, etc.)
    
    Returns:
        int: ID созданного элемента или None при ошибке
    """
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO public_gallery (
                title_ru, title_en, title_ar,
                description_ru, description_en, description_ar,
                image_url, category, is_active, display_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get('title_ru'),
            data.get('title_en'),
            data.get('title_ar'),
            data.get('description_ru'),
            data.get('description_en'),
            data.get('description_ar'),
            data.get('image_url'),
            data.get('category', 'works'),
            data.get('is_active', 1),
            data.get('display_order', 0)
        ))
        
        conn.commit()
        item_id = cursor.lastrowid
        log_info(f"Добавлен элемент галереи ID {item_id}", "db")
        return item_id
        
    except Exception as e:
        log_error(f"Ошибка добавления элемента галереи: {e}", "db")
        conn.rollback()
        return None
    finally:
        conn.close()
