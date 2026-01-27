"""
Скрипт для заполнения базы данных публичным контентом с автоматическим переводом
Обновлено: Исправлены пути к изображениям и добавлены переводы имен
"""
import sys
import os
import json
import asyncio

# Fix path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


from db.connection import get_db_connection
from services.translation_service import translate_to_all_languages
from utils.logger import log_info, log_error

# 1. Расширенные отзывы (Диверсифицированные имена)
REVIEWS = [
    {
        "author_name": "Sarah Johnson",
        "rating": 5,
        "text_ru": "Потрясающий салон! Мастера настоящие профессионалы. Маникюр держится больше 3 недель, а результат превосходит все ожидания. Обязательно вернусь!",
        "display_order": 10
    },
    {
        "author_name": "Fatima Al-Sayed",
        "rating": 5,
        "text_ru": "Делала окрашивание волос - результат просто шикарный! Цвет получился именно такой, как я хотела. Спасибо за профессионализм!",
        "display_order": 9
    },
    {
        "author_name": "Elena Petrova",
        "rating": 5,
        "text_ru": "Лучший салон в городе! Атмосфера уютная, мастера внимательные. Особенно понравился макияж на свадьбу - держался весь день и выглядел безупречно.",
        "display_order": 8
    },
    {
        "author_name": "Linda Moore",
        "rating": 5,
        "text_ru": "Хожу в этот салон уже год. Всегда довольна результатом! Цены адекватные, качество на высоте. Рекомендую всем подругам!",
        "display_order": 7
    },
    {
        "author_name": "Ayesha Khan",
        "rating": 5,
        "text_ru": "Прекрасный сервис! Записалась онлайн за пару минут, пришла вовремя, без ожидания. Мастер сделала все быстро и качественно. Очень довольна!",
        "display_order": 6
    },
    {
        "author_name": "Isabella Rossi",
        "rating": 5,
        "text_ru": "Делала педикюр и маникюр - все на высшем уровне! Стерильность, качественные материалы, приятная атмосфера. Буду ходить только сюда!",
        "display_order": 5
    },
]

# 2. Расширенные FAQ
FAQ_ITEMS = [
    {
        "question_ru": "Как записаться на процедуру?",
        "answer_ru": "Вы можете записаться онлайн через форму на нашем сайте, позвонив по телефону или написав нам в WhatsApp, Instagram.",
        "category": "booking",
        "display_order": 10
    },
    {
        "question_ru": "Можно ли отменить или перенести запись?",
        "answer_ru": "Да, вы можете отменить или перенести запись, предупредив нас не менее чем за 24 часа. Просьба сообщать об изменениях заранее.",
        "category": "booking",
        "display_order": 9
    },
    {
        "question_ru": "Какие материалы вы используете?",
        "answer_ru": "Мы используем только профессиональные материалы премиум-класса. Все инструменты проходят медицинскую стерилизацию.",
        "category": "services",
        "display_order": 8
    },
    {
        "question_ru": "Делаете ли вы процедуры в 4 руки?",
        "answer_ru": "Да, мы ценим ваше время и можем организовать одновременное выполнение нескольких процедур.",
        "category": "services",
        "display_order": 6
    },
    {
        "question_ru": "Где вы находитесь?",
        "answer_ru": "Наш салон расположен в удобном месте с прекрасным видом и уютной атмосферой. Точный адрес вы найдете в разделе контактов.",
        "category": "general",
        "display_order": 5
    }
]

# 3. Баннеры (Исправленные пути)
BANNERS = [
    {
        "title_ru": "Красота и Элегантность",
        "subtitle_ru": "Профессиональные услуги красоты высшего класса",
        "image_url": "/static/uploads/images/faces/banner.webp",
        "display_order": 1
    },
    {
        "title_ru": "Премиальный сервис",
        "subtitle_ru": "Забота о вашем стиле и здоровье",
        "image_url": "/static/uploads/images/faces/main.webp",
        "display_order": 2
    },
    {
        "title_ru": "Марокканская Баня",
        "subtitle_ru": "Ощутите полное расслабление и ритуал очищения",
        "image_url": "/static/uploads/images/faces/moroccan_bath.webp",
        "display_order": 3
    }
]

# 4. Галерея (media_library)
GALLERY = [
    {"url": "/static/uploads/images/portfolio/nails1.webp", "title_ru": "Маникюр", "category": "nails", "order": 1},
    {"url": "/static/uploads/images/portfolio/hair1.webp", "title_ru": "Окрашивание волос", "category": "hair", "order": 2},
    {"url": "/static/uploads/images/portfolio/spa1.webp", "title_ru": "SPA уход", "category": "spa", "order": 3},
    {"url": "/static/uploads/images/portfolio/lips1.webp", "title_ru": "Перманентный макияж", "category": "makeup", "order": 4}
]

async def populate_reviews():
    log_info("⭐ Заполнение отзывов...", "populate")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM public_reviews")
        for r in REVIEWS:
            name_trans = await translate_to_all_languages(r['author_name'], 'ru')
            text_trans = await translate_to_all_languages(r['text_ru'], 'ru')
            
            cols = ['author_name_ru', 'author_name_en', 'author_name_ar', 'author_name_de', 'author_name_es', 'author_name_fr', 'author_name_hi', 'author_name_kk', 'author_name_pt',
                    'text_ru', 'text_en', 'text_ar', 'text_de', 'text_es', 'text_fr', 'text_hi', 'text_kk', 'text_pt', 'rating', 'display_order', 'is_active']
            vals = [name_trans.get(l) for l in ['ru','en','ar','de','es','fr','hi','kk','pt']] + \
                   [text_trans.get(l) for l in ['ru','en','ar','de','es','fr','hi','kk','pt']] + \
                   [r['rating'], r['display_order'], True]
            
            c.execute(f"INSERT INTO public_reviews ({', '.join(cols)}) VALUES ({', '.join(['%s']*len(cols))})", vals)
        conn.commit()
    finally: conn.close()

async def populate_faq():
    log_info("📝 Заполнение FAQ...", "populate")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM public_faq")
        for f in FAQ_ITEMS:
            q_trans = await translate_to_all_languages(f['question_ru'], 'ru')
            a_trans = await translate_to_all_languages(f['answer_ru'], 'ru')
            
            cols = ['question_ru', 'question_en', 'question_ar', 'question_de', 'question_es', 'question_fr', 'question_hi', 'question_kk', 'question_pt',
                    'answer_ru', 'answer_en', 'answer_ar', 'answer_de', 'answer_es', 'answer_fr', 'answer_hi', 'answer_kk', 'answer_pt', 'category', 'display_order']
            vals = [q_trans.get(l) for l in ['ru','en','ar','de','es','fr','hi','kk','pt']] + \
                   [a_trans.get(l) for l in ['ru','en','ar','de','es','fr','hi','kk','pt']] + \
                   [f['category'], f['display_order']]
            
            c.execute(f"INSERT INTO public_faq ({', '.join(cols)}) VALUES ({', '.join(['%s']*len(cols))})", vals)
        conn.commit()
    finally: conn.close()

async def populate_banners():
    log_info("🖼 Заполнение баннеров...", "populate")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM public_banners")
        for b in BANNERS:
            t_trans = await translate_to_all_languages(b['title_ru'], 'ru')
            s_trans = await translate_to_all_languages(b['subtitle_ru'], 'ru')
            
            cols = ['title_ru', 'title_en', 'title_ar', 'title_de', 'title_es', 'title_fr', 'title_hi', 'title_kk', 'title_pt',
                    'subtitle_ru', 'subtitle_en', 'subtitle_ar', 'subtitle_de', 'subtitle_es', 'subtitle_fr', 'subtitle_hi', 'subtitle_kk', 'subtitle_pt',
                    'image_url', 'display_order', 'is_active']
            vals = [t_trans.get(l) for l in ['ru','en','ar','de','es','fr','hi','kk','pt']] + \
                   [s_trans.get(l) for l in ['ru','en','ar','de','es','fr','hi','kk','pt']] + \
                   [b['image_url'], b['display_order'], True]
            
            c.execute(f"INSERT INTO public_banners ({', '.join(cols)}) VALUES ({', '.join(['%s']*len(cols))})", vals)
        conn.commit()
    finally: conn.close()

async def populate_gallery():
    log_info("📸 Заполнение галереи (media_library)...", "populate")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Также очищаем старую таблицу для синхронизации
        c.execute("DELETE FROM public_gallery")
        c.execute("DELETE FROM media_library WHERE context = 'gallery'")
        
        for g in GALLERY:
            t_trans = await translate_to_all_languages(g['title_ru'], 'ru')
            
            # Вставляем в media_library (SSOT для новых API)
            c.execute("""
                INSERT INTO media_library (url, context, title, category, sort_order, is_public)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (g['url'], 'gallery', t_trans.get('ru'), g['category'], g['order'], True))
            
            # Для обратной совместимости
            c.execute("""
                INSERT INTO public_gallery (image_url, title_ru, title_en, title_ar, category, display_order)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (g['url'], t_trans.get('ru'), t_trans.get('en'), t_trans.get('ar'), g['category'], g['order']))
            
        conn.commit()
    finally: conn.close()

async def main():
    log_info("🚀 Запуск восстановления контента...", "restore")
    await populate_banners()
    await populate_gallery()
    await populate_faq()
    await populate_reviews()
    log_info("🏁 Восстановление завершено!", "restore")

if __name__ == "__main__":
    asyncio.run(main())
