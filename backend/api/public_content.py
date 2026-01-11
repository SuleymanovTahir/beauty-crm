"""
API endpoints для публичного контента
"""
from fastapi import APIRouter, Query
from typing import Optional, List, Dict
from db.public_content import (
    get_active_reviews,
    get_active_faq,
    get_active_gallery
)
from utils.logger import log_info

router = APIRouter()

@router.get("/public/reviews")
async def get_reviews(
    language: str = Query('ru', description="Language code (ru, en, ar, es, de, fr, hi, kk, pt)"),
    limit: Optional[int] = Query(None, description="Maximum number of reviews")
) -> Dict:
    """
    Получить активные отзывы на указанном языке
    
    - **language**: Код языка (по умолчанию 'ru')
    - **limit**: Максимальное количество отзывов
    """
    log_info(f"API: Запрос отзывов на языке {language}", "api")
    reviews = get_active_reviews(language=language, limit=limit)
    return {"reviews": reviews}

@router.get("/public/testimonials")
async def get_testimonials(
    language: str = Query('ru', description="Language code"),
    limit: Optional[int] = Query(6, description="Maximum number of testimonials")
) -> Dict:
    """
    Алиас для /public/reviews (для совместимости)
    """
    reviews = get_active_reviews(language=language, limit=limit)
    return {"reviews": reviews}

@router.get("/public/faq")
async def get_faq(
    language: str = Query('ru', description="Language code"),
    category: Optional[str] = Query(None, description="FAQ category")
) -> Dict:
    """
    Получить FAQ на указанном языке
    
    - **language**: Код языка
    - **category**: Категория (опционально)
    """
    log_info(f"API: Запрос FAQ на языке {language}", "api")
    faq = get_active_faq(language=language, category=category)
    return {"faq": faq}

@router.get("/public/gallery")
async def get_gallery(
    category: Optional[str] = Query(None, description="Gallery category"),
    limit: Optional[int] = Query(None, description="Maximum number of items")
) -> Dict:
    """
    Получить элементы галереи
    
    - **category**: Категория (опционально)
    - **limit**: Максимальное количество элементов
    """
    log_info(f"API: Запрос галереи (category: {category})", "api")
    try:
        gallery = get_active_gallery(category=category, limit=limit)
        log_info(f"API: Получено {len(gallery)} изображений", "api")
        return {"success": True, "images": gallery}
    except Exception as e:
        log_info(f"API: Ошибка получения галереи: {e}", "api")
        import traceback
        log_info(f"API: Traceback: {traceback.format_exc()}", "api")
        return {"success": False, "images": [], "error": str(e)}
