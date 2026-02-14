"""
Модуль для работы с публичным контентом (отзывы, FAQ, галерея)
"""

from typing import List, Dict, Optional
from datetime import datetime
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def get_active_reviews(language: str = 'ru', limit: Optional[int] = None) -> List[Dict]:
    """Получить активные отзывы на указанном языке"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Базовый запрос без локализованных колонок
        query = """
            SELECT DISTINCT ON (TRIM(LOWER(author_name)))
                id,
                author_name as name,
                text,
                rating,
                avatar_url,
                display_order,
                employee_name,
                employee_position,
                created_at
            FROM public_reviews
            WHERE is_active = TRUE
            ORDER BY TRIM(LOWER(author_name)), display_order DESC, created_at DESC
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        reviews = [dict(zip(columns, row)) for row in rows]
        return reviews
    except Exception as e:
        log_error(f"Ошибка получения отзывов: {e}", "db")
        return []
    finally:
        conn.close()

def get_active_faq(language: str = 'ru', category: Optional[str] = None) -> List[Dict]:
    """Получить активные FAQ на указанном языке"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
            SELECT 
                id,
                question,
                answer,
                category,
                display_order
            FROM public_faq
            WHERE is_active = TRUE
        """
        
        if category:
            query += " AND category = %s"
            cursor.execute(query + " ORDER BY display_order DESC, created_at DESC", (category,))
        else:
            cursor.execute(query + " ORDER BY display_order DESC, created_at DESC")
            
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        faq = [dict(zip(columns, row)) for row in rows]
        return faq
        
    except Exception as e:
        log_error(f"Ошибка получения FAQ: {e}", "db")
        return []
    finally:
        conn.close()

def get_active_gallery(language: str = 'ru', category: Optional[str] = None, limit: Optional[int] = None) -> List[Dict]:
    """
    Получить активные элементы галереи
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
            SELECT 
                id, 
                image_url, 
                title, 
                description, 
                category, 
                display_order, 
                created_at
            FROM public_gallery
            WHERE is_active = TRUE
        """
        params = []
        
        if category:
            query += " AND category = %s"
            params.append(category)
            
        query += " ORDER BY display_order ASC, created_at DESC"
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        gallery = [dict(zip(columns, row)) for row in rows]

        log_info(f"📸 [Gallery DB] Получено {len(gallery)} элементов из public_gallery", "db")
        return gallery
        
    except Exception as e:
        log_error(f"Ошибка получения галереи: {e}", "db")
        return []
    finally:
        conn.close()

def add_review(data: Dict) -> Optional[int]:
    """Добавить новый отзыв (динамический INSERT)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Автоматическое определение колонок из переданных данных
        columns = [k for k in data.keys() if k != 'id']
        placeholders = ["%s"] * len(columns)
        values = [data[k] for k in columns]
        
        query = f"INSERT INTO public_reviews ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING id"
        cursor.execute(query, values)
        review_id = cursor.fetchone()[0]
        conn.commit()
        return review_id
    except Exception as e:
        log_error(f"Ошибка добавления отзыва: {e}", "db")
        conn.rollback()
        return None
    finally:
        conn.close()

def add_faq(data: Dict) -> Optional[int]:
    """Добавить новый FAQ (динамический INSERT)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        columns = [k for k in data.keys() if k != 'id']
        placeholders = ["%s"] * len(columns)
        values = [data[k] for k in columns]
        
        query = f"INSERT INTO public_faq ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING id"
        cursor.execute(query, values)
        faq_id = cursor.fetchone()[0]
        conn.commit()
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
            data.get('title'),
            data.get('description'),
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
