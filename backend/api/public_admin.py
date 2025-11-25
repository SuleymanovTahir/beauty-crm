"""
API endpoints для управления публичным контентом
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
from core.config import DATABASE_NAME
from services.auto_translate import translate_to_all_languages

router = APIRouter(tags=["Public Admin"], prefix="/public-admin")

# ============================================================================
# MODELS
# ============================================================================

class ReviewCreate(BaseModel):
    author_name: str
    rating: int
    text_ru: str
    avatar_url: Optional[str] = None

class ReviewUpdate(BaseModel):
    author_name: Optional[str] = None
    rating: Optional[int] = None
    text_ru: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class BannerCreate(BaseModel):
    title_ru: str
    subtitle_ru: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None

class FAQCreate(BaseModel):
    question_ru: str
    answer_ru: str
    category: Optional[str] = "general"

class GalleryCreate(BaseModel):
    image_url: str
    title_ru: Optional[str] = None
    description_ru: Optional[str] = None
    category: Optional[str] = "works"

# ============================================================================
# REVIEWS ENDPOINTS
# ============================================================================

@router.get("/reviews")
async def get_all_reviews():
    """Получить все отзывы (для админки)"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("""
        SELECT * FROM public_reviews 
        ORDER BY display_order ASC, created_at DESC
    """)
    
    reviews = [dict(row) for row in c.fetchall()]
    conn.close()
    
    return {"reviews": reviews}

@router.post("/reviews")
async def create_review(review: ReviewCreate):
    """Создать новый отзыв с автопереводом"""
    # Переводим на все языки
    translations = await translate_to_all_languages(review.text_ru)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO public_reviews 
            (author_name, rating, text_ru, text_en, text_ar, text_de, text_es, text_fr, text_hi, text_kk, text_pt, avatar_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            review.author_name,
            review.rating,
            review.text_ru,
            translations.get('en', ''),
            translations.get('ar', ''),
            translations.get('de', ''),
            translations.get('es', ''),
            translations.get('fr', ''),
            translations.get('hi', ''),
            translations.get('kk', ''),
            translations.get('pt', ''),
            review.avatar_url
        ))
        
        review_id = c.lastrowid
        conn.commit()
        
        return {"success": True, "id": review_id, "message": "Отзыв создан и переведен"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/reviews/{review_id}")
async def update_review(review_id: int, review: ReviewUpdate):
    """Обновить отзыв"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        updates = []
        params = []
        
        if review.author_name is not None:
            updates.append("author_name = ?")
            params.append(review.author_name)
        
        if review.rating is not None:
            updates.append("rating = ?")
            params.append(review.rating)
        
        if review.text_ru is not None:
            # Если текст изменился, переводим заново
            translations = await translate_to_all_languages(review.text_ru)
            updates.extend([
                "text_ru = ?", "text_en = ?", "text_ar = ?", "text_de = ?",
                "text_es = ?", "text_fr = ?", "text_hi = ?", "text_kk = ?", "text_pt = ?"
            ])
            params.extend([
                review.text_ru,
                translations.get('en', ''),
                translations.get('ar', ''),
                translations.get('de', ''),
                translations.get('es', ''),
                translations.get('fr', ''),
                translations.get('hi', ''),
                translations.get('kk', ''),
                translations.get('pt', '')
            ])
        
        if review.avatar_url is not None:
            updates.append("avatar_url = ?")
            params.append(review.avatar_url)
        
        if review.is_active is not None:
            updates.append("is_active = ?")
            params.append(1 if review.is_active else 0)
        
        if review.display_order is not None:
            updates.append("display_order = ?")
            params.append(review.display_order)
        
        if not updates:
            return {"success": True, "message": "Нечего обновлять"}
        
        query = f"UPDATE public_reviews SET {', '.join(updates)} WHERE id = ?"
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
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM public_reviews WHERE id = ?", (review_id,))
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
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("SELECT is_active FROM public_reviews WHERE id = ?", (review_id,))
        row = c.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Отзыв не найден")
        
        new_status = 0 if row[0] else 1
        c.execute("UPDATE public_reviews SET is_active = ? WHERE id = ?", (new_status, review_id))
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
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT * FROM public_banners ORDER BY display_order ASC")
    banners = [dict(row) for row in c.fetchall()]
    conn.close()
    
    return {"banners": banners}

@router.post("/banners")
async def create_banner(banner: BannerCreate):
    """Создать новый баннер с автопереводом"""
    translations_title = await translate_to_all_languages(banner.title_ru)
    translations_subtitle = {}
    if banner.subtitle_ru:
        translations_subtitle = await translate_to_all_languages(banner.subtitle_ru)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO public_banners 
            (title_ru, title_en, title_ar, subtitle_ru, subtitle_en, subtitle_ar, image_url, link_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            banner.title_ru,
            translations_title.get('en', ''),
            translations_title.get('ar', ''),
            banner.subtitle_ru,
            translations_subtitle.get('en', ''),
            translations_subtitle.get('ar', ''),
            banner.image_url,
            banner.link_url
        ))
        
        banner_id = c.lastrowid
        conn.commit()
        
        return {"success": True, "id": banner_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ============================================================================
# FAQ ENDPOINTS
# ============================================================================

@router.get("/faq")
async def get_all_faq():
    """Получить все FAQ"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT * FROM public_faq ORDER BY category, display_order ASC")
    faq = [dict(row) for row in c.fetchall()]
    conn.close()
    
    return {"faq": faq}

@router.post("/faq")
async def create_faq(faq: FAQCreate):
    """Создать новый FAQ с автопереводом"""
    translations_q = await translate_to_all_languages(faq.question_ru)
    translations_a = await translate_to_all_languages(faq.answer_ru)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO public_faq 
            (question_ru, question_en, question_ar, answer_ru, answer_en, answer_ar, category)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            faq.question_ru,
            translations_q.get('en', ''),
            translations_q.get('ar', ''),
            faq.answer_ru,
            translations_a.get('en', ''),
            translations_a.get('ar', ''),
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

# ============================================================================
# GALLERY ENDPOINTS
# ============================================================================

@router.get("/gallery")
async def get_all_gallery():
    """Получить всю галерею"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT * FROM public_gallery ORDER BY category, display_order ASC")
    gallery = [dict(row) for row in c.fetchall()]
    conn.close()
    
    return {"gallery": gallery}

@router.post("/gallery")
async def create_gallery_item(item: GalleryCreate):
    """Добавить фото в галерею"""
    translations_title = {}
    translations_desc = {}
    
    if item.title_ru:
        translations_title = await translate_to_all_languages(item.title_ru)
    if item.description_ru:
        translations_desc = await translate_to_all_languages(item.description_ru)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO public_gallery 
            (image_url, title_ru, title_en, title_ar, description_ru, description_en, description_ar, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item.image_url,
            item.title_ru,
            translations_title.get('en', ''),
            translations_title.get('ar', ''),
            item.description_ru,
            translations_desc.get('en', ''),
            translations_desc.get('ar', ''),
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
