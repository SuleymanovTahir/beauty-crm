"""
API endpoints для управления публичным контентом
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.cache import cache
from api.uploads import delete_upload_file
from utils.logger import log_info, log_error

router = APIRouter(tags=["Public Admin"], prefix="/public-admin")

# ============================================================================
# MODELS
# ============================================================================

class ReviewCreate(BaseModel):
    author_name: str
    rating: int
    text: str
    avatar_url: Optional[str] = None
    employee_position: Optional[str] = None

class ReviewUpdate(BaseModel):
    author_name: Optional[str] = None
    rating: Optional[int] = None
    text: Optional[str] = None
    avatar_url: Optional[str] = None
    employee_position: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class BannerCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    bg_pos_desktop_x: Optional[int] = 50
    bg_pos_desktop_y: Optional[int] = 50
    bg_pos_mobile_x: Optional[int] = 50
    bg_pos_mobile_y: Optional[int] = 50
    is_flipped_horizontal: Optional[bool] = False
    is_flipped_vertical: Optional[bool] = False

class FAQCreate(BaseModel):
    question: str
    answer: str
    category: Optional[str] = "general"

class GalleryCreate(BaseModel):
    image_url: str
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = "works"

# ============================================================================
# REVIEWS ENDPOINTS
# ============================================================================

@router.get("/reviews")
async def get_all_reviews():
    """Получить все отзывы (для админки)"""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        SELECT * FROM public_reviews
        ORDER BY display_order ASC, created_at DESC
    """)

    columns = [desc[0] for desc in c.description]
    reviews = [dict(zip(columns, row)) for row in c.fetchall()]
    conn.close()

    return {"reviews": reviews}

@router.post("/reviews")
async def create_review(review: ReviewCreate):
    """Создать новый отзыв"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            INSERT INTO public_reviews
            (author_name, rating, text, avatar_url)
            VALUES (%s,%s,%s,%s)
        """, (
            review.author_name,
            review.rating,
            review.text,
            review.avatar_url
        ))

        review_id = c.lastrowid
        conn.commit()

        return {"success": True, "id": review_id, "message": "Отзыв создан"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/reviews/{review_id}")
async def update_review(review_id: int, review: ReviewUpdate):
    """Обновить отзыв"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        updates = []
        params = []

        if review.author_name is not None:
            updates.append("author_name = %s")
            params.append(review.author_name)

        if review.rating is not None:
            updates.append("rating = %s")
            params.append(review.rating)

        if review.text is not None:
            updates.append("text = %s")
            params.append(review.text)

        if review.avatar_url is not None:
            updates.append("avatar_url = %s")
            params.append(review.avatar_url)

        if review.is_active is not None:
            updates.append("is_active = %s")
            params.append(True if review.is_active else False)

        if review.display_order is not None:
            updates.append("display_order = %s")
            params.append(review.display_order)

        if not updates:
            return {"success": True, "message": "Нечего обновлять"}

        query = f"UPDATE public_reviews SET {', '.join(updates)} WHERE id = %s"
        params.append(review_id)

        c.execute(query, params)
        conn.commit()

        return {"success": True, "message": "Отзыв обновлен"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/reviews/{review_id}")
async def delete_review(review_id: int):
    """Удалить отзыв"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM public_reviews WHERE id =%s", (review_id,))
        conn.commit()
        return {"success": True, "message": "Отзыв удален"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.patch("/reviews/{review_id}/toggle")
async def toggle_review(review_id: int):
    """Переключить активность отзыва"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("SELECT is_active FROM public_reviews WHERE id =%s", (review_id,))
        row = c.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Отзыв не найден")
        
        new_status = False if row[0] else True
        c.execute("UPDATE public_reviews SET is_active =%s WHERE id =%s", (new_status, review_id))
        conn.commit()
        
        return {"success": True, "is_active": bool(new_status)}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ============================================================================
# BANNERS ENDPOINTS
# ============================================================================

@router.get("/banners")
async def get_all_banners():
    """Получить все баннеры"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM public_banners ORDER BY display_order ASC")
    columns = [desc[0] for desc in c.description]
    banners = [dict(zip(columns, row)) for row in c.fetchall()]
    conn.close()
    
    return {"banners": banners}

@router.post("/banners")
async def create_banner(banner: BannerCreate):
    """Создать новый баннер"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            INSERT INTO public_banners
            (title, subtitle, image_url, link_url, bg_pos_desktop_x, bg_pos_desktop_y, bg_pos_mobile_x, bg_pos_mobile_y, is_flipped_horizontal, is_flipped_vertical)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            banner.title,
            banner.subtitle,
            banner.image_url,
            banner.link_url,
            banner.bg_pos_desktop_x,
            banner.bg_pos_desktop_y,
            banner.bg_pos_mobile_x,
            banner.bg_pos_mobile_y,
            banner.is_flipped_horizontal,
            banner.is_flipped_vertical
        ))

        banner_id = c.lastrowid
        conn.commit()

        return {"success": True, "id": banner_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    bg_pos_desktop_x: Optional[int] = None
    bg_pos_desktop_y: Optional[int] = None
    bg_pos_mobile_x: Optional[int] = None
    bg_pos_mobile_y: Optional[int] = None
    is_flipped_horizontal: Optional[bool] = None
    is_flipped_vertical: Optional[bool] = None

@router.put("/banners/{banner_id}")
async def update_banner(banner_id: int, banner: BannerUpdate):
    """Обновить баннер"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Проверяем существование баннера
        c.execute("SELECT id FROM public_banners WHERE id = %s", (banner_id,))
        if not c.fetchone():
            raise HTTPException(status_code=404, detail="Баннер не найден")

        updates = []
        params = []

        if banner.title is not None:
            updates.append("title = %s")
            params.append(banner.title)

        if banner.subtitle is not None:
            updates.append("subtitle = %s")
            params.append(banner.subtitle)

        if banner.image_url is not None:
            updates.append("image_url = %s")
            params.append(banner.image_url)

        if banner.link_url is not None:
            updates.append("link_url = %s")
            params.append(banner.link_url)

        if banner.display_order is not None:
            updates.append("display_order = %s")
            params.append(banner.display_order)

        if banner.is_active is not None:
            updates.append("is_active = %s")
            params.append(True if banner.is_active else False)

        if banner.bg_pos_desktop_x is not None:
            updates.append("bg_pos_desktop_x = %s")
            params.append(banner.bg_pos_desktop_x)

        if banner.bg_pos_desktop_y is not None:
            updates.append("bg_pos_desktop_y = %s")
            params.append(banner.bg_pos_desktop_y)

        if banner.bg_pos_mobile_x is not None:
            updates.append("bg_pos_mobile_x = %s")
            params.append(banner.bg_pos_mobile_x)

        if banner.bg_pos_mobile_y is not None:
            updates.append("bg_pos_mobile_y = %s")
            params.append(banner.bg_pos_mobile_y)

        if banner.is_flipped_horizontal is not None:
            updates.append("is_flipped_horizontal = %s")
            params.append(banner.is_flipped_horizontal)

        if banner.is_flipped_vertical is not None:
            updates.append("is_flipped_vertical = %s")
            params.append(banner.is_flipped_vertical)

        if not updates:
            return {"success": True, "message": "Нечего обновлять"}

        query = f"UPDATE public_banners SET {', '.join(updates)} WHERE id = %s"
        params.append(banner_id)

        c.execute(query, params)
        conn.commit()

        return {"success": True, "message": "Баннер обновлен"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: int):
    """Удалить баннер и связанный файл изображения"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получаем URL изображения перед удалением
        c.execute("SELECT image_url FROM public_banners WHERE id = %s", (banner_id,))
        row = c.fetchone()
        
        if row and row[0]:
            delete_upload_file(row[0])
        
        # Удаляем запись из базы данных
        c.execute("DELETE FROM public_banners WHERE id = %s", (banner_id,))
        conn.commit()

        # Инвалидируем кеш лендинга (для всех языков)
        for lang in ['ru', 'en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']:
            cache.delete(f"public_banners_{lang}")
            cache.delete(f"initial_load_{lang}")
        
        return {"success": True, "message": "Баннер и файл удалены"}
    except Exception as e:
        conn.rollback()
        log_error(f"Error deleting banner: {e}", "public_admin")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ============================================================================
# FAQ ENDPOINTS
# ============================================================================

@router.get("/faq")
async def get_all_faq():
    """Получить все FAQ"""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT * FROM public_faq ORDER BY category, display_order ASC")
    columns = [desc[0] for desc in c.description]
    faq = [dict(zip(columns, row)) for row in c.fetchall()]
    conn.close()

    return {"faq": faq}

@router.post("/faq")
async def create_faq(faq: FAQCreate):
    """Создать новый FAQ"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            INSERT INTO public_faq
            (question, answer, category)
            VALUES (%s,%s,%s)
        """, (
            faq.question,
            faq.answer,
            faq.category
        ))

        faq_id = c.lastrowid
        conn.commit()

        return {"success": True, "id": faq_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    display_order: Optional[int] = None

@router.put("/faq/{faq_id}")
async def update_faq(faq_id: int, faq: FAQUpdate):
    """Обновить FAQ"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        updates = []
        params = []

        if faq.question is not None:
            updates.append("question = %s")
            params.append(faq.question)

        if faq.answer is not None:
            updates.append("answer = %s")
            params.append(faq.answer)

        if faq.category is not None:
            updates.append("category = %s")
            params.append(faq.category)

        if faq.display_order is not None:
            updates.append("display_order = %s")
            params.append(faq.display_order)

        if not updates:
            return {"success": True, "message": "Нечего обновлять"}

        query = f"UPDATE public_faq SET {', '.join(updates)} WHERE id = %s"
        params.append(faq_id)

        c.execute(query, params)
        conn.commit()

        return {"success": True, "message": "FAQ обновлен"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/faq/{faq_id}")
async def delete_faq(faq_id: int):
    """Удалить FAQ"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM public_faq WHERE id =%s", (faq_id,))
        conn.commit()
        return {"success": True, "message": "FAQ удален"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ============================================================================
# GALLERY ENDPOINTS
# ============================================================================

@router.get("/gallery")
async def get_all_gallery():
    """Получить всю галерею"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM public_gallery ORDER BY category, display_order ASC")
    columns = [desc[0] for desc in c.description]
    gallery = [dict(zip(columns, row)) for row in c.fetchall()]
    conn.close()
    
    return {"gallery": gallery}

@router.post("/gallery")
async def create_gallery_item(item: GalleryCreate):
    """Добавить фото в галерею"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            INSERT INTO public_gallery
            (image_url, title, description, category)
            VALUES (%s,%s,%s,%s)
        """, (
            item.image_url,
            item.title,
            item.description,
            item.category
        ))

        item_id = c.lastrowid
        conn.commit()

        return {"success": True, "id": item_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/gallery/{item_id}")
async def delete_gallery_item(item_id: int):
    """Удалить фото из галереи и физический файл"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получаем URL перед удалением
        c.execute("SELECT image_url FROM public_gallery WHERE id = %s", (item_id,))
        row = c.fetchone()
        
        if row and row[0]:
            delete_upload_file(row[0])
            
        c.execute("DELETE FROM public_gallery WHERE id = %s", (item_id,))
        conn.commit()
        
        # Инвалидируем кеш лендинга
        for lang in ['ru', 'en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']:
            cache.delete(f"public_gallery_{lang}")
            cache.delete(f"initial_load_{lang}")

        return {"success": True, "message": "Фото удалено"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
