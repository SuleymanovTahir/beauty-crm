"""
API endpoints для управления публичным контентом
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from services.translation_service import translate_to_all_languages

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
    bg_pos_desktop_x: Optional[int] = 50
    bg_pos_desktop_y: Optional[int] = 50
    bg_pos_mobile_x: Optional[int] = 50
    bg_pos_mobile_y: Optional[int] = 50
    is_flipped_horizontal: Optional[bool] = False
    is_flipped_vertical: Optional[bool] = False

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
    """Создать новый отзыв с автопереводом"""
    # Переводим на все языки
    translations = await translate_to_all_languages(review.text_ru)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO public_reviews 
            (author_name, rating, text_ru, text_en, text_ar, text_de, text_es, text_fr, text_hi, text_kk, text_pt, avatar_url)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
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
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        updates = []
        params = []
        
        if review.author_name is not None:
            updates.append("author_name =%s")
            params.append(review.author_name)
        
        if review.rating is not None:
            updates.append("rating =%s")
            params.append(review.rating)
        
        if review.text_ru is not None:
            # Если текст изменился, переводим заново
            translations = await translate_to_all_languages(review.text_ru)
            updates.extend([
                "text_ru =%s", "text_en =%s", "text_ar =%s", "text_de =%s",
                "text_es =%s", "text_fr =%s", "text_hi =%s", "text_kk =%s", "text_pt =%s"
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
            updates.append("avatar_url =%s")
            params.append(review.avatar_url)
        
        if review.is_active is not None:
            updates.append("is_active =%s")
            params.append(True if review.is_active else False)
        
        if review.display_order is not None:
            updates.append("display_order =%s")
            params.append(review.display_order)
        
        if not updates:
            return {"success": True, "message": "Нечего обновлять"}
        
        query = f"UPDATE public_reviews SET {', '.join(updates)} WHERE id =%s"
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
    """Создать новый баннер с автопереводом"""
    translations_title = await translate_to_all_languages(banner.title_ru)
    translations_subtitle = {}
    if banner.subtitle_ru:
        translations_subtitle = await translate_to_all_languages(banner.subtitle_ru)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO public_banners 
            (title_ru, title_en, title_ar, subtitle_ru, subtitle_en, subtitle_ar, image_url, link_url, bg_pos_desktop_x, bg_pos_desktop_y, bg_pos_mobile_x, bg_pos_mobile_y, is_flipped_horizontal, is_flipped_vertical)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            banner.title_ru,
            translations_title.get('en', ''),
            translations_title.get('ar', ''),
            banner.subtitle_ru,
            translations_subtitle.get('en', ''),
            translations_subtitle.get('ar', ''),
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
    title_ru: Optional[str] = None
    subtitle_ru: Optional[str] = None
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
        # Получаем текущие данные баннера для проверки изменений текста
        c.execute("SELECT title_ru, subtitle_ru FROM public_banners WHERE id = %s", (banner_id,))
        current = c.fetchone()
        if not current:
            raise HTTPException(status_code=404, detail="Баннер не найден")
            
        current_title_ru, current_subtitle_ru = current
        
        updates = []
        params = []
        
        if banner.title_ru is not None:
            # Переводим только если текст реально изменился
            if banner.title_ru != current_title_ru:
                from utils.logger import log_info
                log_info(f" Banner {banner_id} title changed, translating...", "api")
                translations = await translate_to_all_languages(banner.title_ru)
                updates.extend(["title_ru = %s", "title_en = %s", "title_ar = %s"])
                params.extend([banner.title_ru, translations.get('en', ''), translations.get('ar', '')])
            else:
                # Если не изменился, все равно можем обновить title_ru (хотя это излишне)
                # Но лучше не добавлять в updates чтобы сэкономить время
                pass
            
        if banner.subtitle_ru is not None:
            if banner.subtitle_ru != current_subtitle_ru:
                from utils.logger import log_info
                log_info(f" Banner {banner_id} subtitle changed, translating...", "api")
                translations = await translate_to_all_languages(banner.subtitle_ru)
                updates.extend(["subtitle_ru = %s", "subtitle_en = %s", "subtitle_ar = %s"])
                params.extend([banner.subtitle_ru, translations.get('en', ''), translations.get('ar', '')])
            
        if banner.image_url is not None:
            updates.append("image_url =%s")
            params.append(banner.image_url)
            
        if banner.link_url is not None:
            updates.append("link_url =%s")
            params.append(banner.link_url)
            
        if banner.display_order is not None:
            updates.append("display_order =%s")
            params.append(banner.display_order)
            
        if banner.is_active is not None:
            updates.append("is_active =%s")
            params.append(True if banner.is_active else False)
            
        if banner.bg_pos_desktop_x is not None:
            updates.append("bg_pos_desktop_x =%s")
            params.append(banner.bg_pos_desktop_x)
            
        if banner.bg_pos_desktop_y is not None:
            updates.append("bg_pos_desktop_y =%s")
            params.append(banner.bg_pos_desktop_y)
            
        if banner.bg_pos_mobile_x is not None:
            updates.append("bg_pos_mobile_x =%s")
            params.append(banner.bg_pos_mobile_x)
            
        if banner.bg_pos_mobile_y is not None:
            updates.append("bg_pos_mobile_y =%s")
            params.append(banner.bg_pos_mobile_y)

        if banner.is_flipped_horizontal is not None:
            updates.append("is_flipped_horizontal =%s")
            params.append(banner.is_flipped_horizontal)

        if banner.is_flipped_vertical is not None:
            updates.append("is_flipped_vertical =%s")
            params.append(banner.is_flipped_vertical)
            
        if not updates:
            return {"success": True, "message": "Нечего обновлять"}
            
        query = f"UPDATE public_banners SET {', '.join(updates)} WHERE id =%s"
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
    import os
    from pathlib import Path
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получаем URL изображения перед удалением
        c.execute("SELECT image_url FROM public_banners WHERE id =%s", (banner_id,))
        row = c.fetchone()
        
        if row and row[0]:
            image_url = row[0]
            # Проверяем, что это локальный файл (начинается с /static/)
            if image_url.startswith('/static/'):
                # Преобразуем URL в путь к файлу
                # /static/uploads/images/filename.jpg -> backend/static/uploads/images/filename.jpg
                file_path = Path(__file__).parent.parent / image_url.lstrip('/')
                
                # Удаляем файл, если он существует
                if file_path.exists():
                    try:
                        os.remove(file_path)
                        from utils.logger import log_info
                        log_info(f"Deleted file: {file_path}", "api")
                    except Exception as e:
                        from utils.logger import log_warning
                        log_warning(f"Failed to delete file {file_path}: {e}", "api")
        
        # Удаляем запись из базы данных
        c.execute("DELETE FROM public_banners WHERE id =%s", (banner_id,))
        conn.commit()
        return {"success": True, "message": "Баннер и файл удалены"}
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
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM public_faq ORDER BY category, display_order ASC")
    columns = [desc[0] for desc in c.description]
    faq = [dict(zip(columns, row)) for row in c.fetchall()]
    conn.close()
    
    return {"faq": faq}

@router.post("/faq")
async def create_faq(faq: FAQCreate):
    """Создать новый FAQ с автопереводом"""
    translations_q = await translate_to_all_languages(faq.question_ru)
    translations_a = await translate_to_all_languages(faq.answer_ru)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO public_faq 
            (question_ru, question_en, question_ar, answer_ru, answer_en, answer_ar, category)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
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

class FAQUpdate(BaseModel):
    question_ru: Optional[str] = None
    answer_ru: Optional[str] = None
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
        
        if faq.question_ru is not None:
            translations = await translate_to_all_languages(faq.question_ru)
            updates.extend(["question_ru =%s", "question_en =%s", "question_ar =%s"])
            params.extend([faq.question_ru, translations.get('en', ''), translations.get('ar', '')])
            
        if faq.answer_ru is not None:
            translations = await translate_to_all_languages(faq.answer_ru)
            updates.extend(["answer_ru =%s", "answer_en =%s", "answer_ar =%s"])
            params.extend([faq.answer_ru, translations.get('en', ''), translations.get('ar', '')])
            
        if faq.category is not None:
            updates.append("category =%s")
            params.append(faq.category)
            
        if faq.display_order is not None:
            updates.append("display_order =%s")
            params.append(faq.display_order)
            
        if not updates:
            return {"success": True, "message": "Нечего обновлять"}
            
        query = f"UPDATE public_faq SET {', '.join(updates)} WHERE id =%s"
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
    translations_title = {}
    translations_desc = {}
    
    if item.title_ru:
        translations_title = await translate_to_all_languages(item.title_ru)
    if item.description_ru:
        translations_desc = await translate_to_all_languages(item.description_ru)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO public_gallery 
            (image_url, title_ru, title_en, title_ar, description_ru, description_en, description_ar, category)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
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
