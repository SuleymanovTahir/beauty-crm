"""
Скрипт для заполнения базы данных публичным контентом с автоматическим переводом
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlite3
from core.config import DATABASE_NAME
from services.translation_service import translate_to_all_languages
from utils.logger import log_info, log_error

# Расширенные отзывы
REVIEWS = [
    {
        "author_name": "Анна Петрова",
        "rating": 5,
        "text_ru": "Потрясающий салон! Мастера настоящие профессионалы. Маникюр держится больше 3 недель, а результат превосходит все ожидания. Обязательно вернусь!",
        "display_order": 10
    },
    {
        "author_name": "Мария Соколова",
        "rating": 5,
        "text_ru": "Делала окрашивание волос - результат просто шикарный! Цвет получился именно такой, как я хотела. Спасибо за профессионализм!",
        "display_order": 9
    },
    {
        "author_name": "Елена Волкова",
        "rating": 5,
        "text_ru": "Лучший салон в городе! Атмосфера уютная, мастера внимательные. Особенно понравился макияж на свадьбу - держался весь день и выглядел безупречно.",
        "display_order": 8
    },
    {
        "author_name": "Ольга Иванова",
        "rating": 5,
        "text_ru": "Хожу в этот салон уже год. Всегда довольна результатом! Цены адекватные, качество на высоте. Рекомендую всем подругам!",
        "display_order": 7
    },
    {
        "author_name": "Наталья Смирнова",
        "rating": 5,
        "text_ru": "Прекрасный сервис! Записалась онлайн за пару минут, пришла вовремя, без ожидания. Мастер сделала все быстро и качественно. Очень довольна!",
        "display_order": 6
    },
    {
        "author_name": "Дарья Козлова",
        "rating": 5,
        "text_ru": "Делала педикюр и маникюр - все на высшем уровне! Стерильность, качественные материалы, приятная атмосфера. Буду ходить только сюда!",
        "display_order": 5
    },
]

# Расширенные FAQ
FAQ_ITEMS = [
    {
        "question_ru": "Как записаться на процедуру?",
        "answer_ru": "Вы можете записаться онлайн через форму на нашем сайте, позвонив по телефону или написав нам в социальных сетях. Мы работаем ежедневно с 10:30 до 21:30.",
        "category": "booking",
        "display_order": 10
    },
    {
        "question_ru": "Можно ли отменить или перенести запись?",
        "answer_ru": "Да, вы можете отменить или перенести запись, предупредив нас не менее чем за 24 часа. Просьба сообщать об изменениях заранее, чтобы мы могли предложить время другим клиентам.",
        "category": "booking",
        "display_order": 9
    },
    {
        "question_ru": "Какие материалы вы используете?",
        "answer_ru": "Мы используем только профессиональные материалы премиум-класса от ведущих мировых брендов: OPI, CND, L'Oreal Professional, Kerastase, MAC и другие. Все продукты сертифицированы и безопасны.",
        "category": "services",
        "display_order": 8
    },
    {
        "question_ru": "Есть ли у вас программа лояльности?",
        "answer_ru": "Да, у нас действует накопительная система скидок для постоянных клиентов. При первом посещении вы получаете карту клиента, на которую начисляются бонусы. Также действуют специальные предложения и акции.",
        "category": "loyalty",
        "display_order": 7
    },
    {
        "question_ru": "Сколько времени занимает процедура?",
        "answer_ru": "Длительность зависит от выбранной процедуры. В среднем: маникюр - 60-90 минут, окрашивание волос - 2-3 часа, макияж - 60-90 минут. Точное время уточняйте при записи.",
        "category": "services",
        "display_order": 6
    },
    {
        "question_ru": "Можно ли делать несколько процедур за одно посещение?",
        "answer_ru": "Конечно! Вы можете комбинировать различные услуги. Например, маникюр + педикюр, окрашивание + стрижка + укладка. При бронировании нескольких услуг сообщите об этом администратору для корректного планирования времени.",
        "category": "services",
        "display_order": 5
    },
    {
        "question_ru": "Есть ли противопоказания к процедурам?",
        "answer_ru": "Некоторые процедуры имеют противопоказания (беременность, аллергические реакции, кожные заболевания). Наши мастера проведут консультацию перед процедурой и подберут безопасные варианты.",
        "category": "health",
        "display_order": 4
    },
    {
        "question_ru": "Какие способы оплаты вы принимаете?",
        "answer_ru": "Мы принимаем наличные, банковские карты (Visa, Mastercard), а также оплату через мобильные приложения. Оплата производится после оказания услуги.",
        "category": "payment",
        "display_order": 3
    },
]


def populate_reviews():
    """Заполнить базу отзывами с переводами"""
    log_info("⭐ Заполнение отзывов с переводами...", "populate")
    
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    try:
        # Очистка существующих отзывов
        cursor.execute("DELETE FROM public_reviews")
        
        for review in REVIEWS:
            log_info(f"Переводим отзыв от {review['author_name']}", "populate")
            
            # Переводим текст отзыва
            text_translations = translate_to_all_languages(review['text_ru'], 'ru')
            
            # Вставляем в БД
            cursor.execute("""
                INSERT INTO public_reviews (
                    author_name, rating, 
                    text_ru, text_en, text_ar, text_de, text_es,
                    text_fr, text_hi, text_kk, text_pt,
                    avatar_url, is_active, display_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                review['author_name'],
                review['rating'],
                text_translations.get('ru'),
                text_translations.get('en'),
                text_translations.get('ar'),
                text_translations.get('de'),
                text_translations.get('es'),
                text_translations.get('fr'),
                text_translations.get('hi'),
                text_translations.get('kk'),
                text_translations.get('pt'),
                review.get('avatar_url'),
                1,
                review['display_order']
            ))
        
        conn.commit()
        log_info(f"✅ Добавлено {len(REVIEWS)} отзывов с переводами", "populate")
        
    except Exception as e:
        log_error(f"Ошибка при заполнении отзывов: {e}", "populate")
        import traceback
        log_error(traceback.format_exc(), "populate")
        conn.rollback()
    finally:
        conn.close()


def populate_faq():
    """Заполнить базу FAQ с переводами"""
    log_info("📝 Заполнение FAQ с переводами...", "populate")
    
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    try:
        # Очистка существующих FAQ
        cursor.execute("DELETE FROM public_faq")
        
        for faq in FAQ_ITEMS:
            log_info(f"Переводим вопрос: {faq['question_ru'][:50]}...", "populate")
            
            # Переводим вопрос
            question_translations = translate_to_all_languages(faq['question_ru'], 'ru')
            
            # Переводим ответ
            answer_translations = translate_to_all_languages(faq['answer_ru'], 'ru')
            
            # Вставляем в БД
            cursor.execute("""
                INSERT INTO public_faq (
                    question_ru, question_en, question_ar, question_de, question_es, 
                    question_fr, question_hi, question_kk, question_pt,
                    answer_ru, answer_en, answer_ar, answer_de, answer_es,
                    answer_fr, answer_hi, answer_kk, answer_pt,
                    category, is_active, display_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                question_translations.get('ru'),
                question_translations.get('en'),
                question_translations.get('ar'),
                question_translations.get('de'),
                question_translations.get('es'),
                question_translations.get('fr'),
                question_translations.get('hi'),
                question_translations.get('kk'),
                question_translations.get('pt'),
                answer_translations.get('ru'),
                answer_translations.get('en'),
                answer_translations.get('ar'),
                answer_translations.get('de'),
                answer_translations.get('es'),
                answer_translations.get('fr'),
                answer_translations.get('hi'),
                answer_translations.get('kk'),
                answer_translations.get('pt'),
                faq['category'],
                1,
                faq['display_order']
            ))
        
        conn.commit()
        log_info(f"✅ Добавлено {len(FAQ_ITEMS)} FAQ с переводами", "populate")
        
    except Exception as e:
        log_error(f"Ошибка при заполнении FAQ: {e}", "populate")
        import traceback
        log_error(traceback.format_exc(), "populate")
        conn.rollback()
    finally:
        conn.close()


def update_employee_schema():
    """Обновить схему сотрудников для переводов"""
    log_info("👥 Обновление схемы сотрудников...", "populate")
    
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    try:
        # Проверяем наличие нужных колонок
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Добавляем колонки для переводов если их нет
        needed_columns = {
            'position_en': 'TEXT',
            'position_ar': 'TEXT',
            'position_de': 'TEXT',
            'position_es': 'TEXT',
            'position_fr': 'TEXT',
            'position_hi': 'TEXT',
            'position_kk': 'TEXT',
            'position_pt': 'TEXT',
            'bio_en': 'TEXT',
            'bio_ar': 'TEXT',
            'bio_de': 'TEXT',
            'bio_es': 'TEXT',
            'bio_fr': 'TEXT',
            'bio_hi': 'TEXT',
            'bio_kk': 'TEXT',
            'bio_pt': 'TEXT',
        }
        
        for col_name, col_type in needed_columns.items():
            if col_name not in columns:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                log_info(f"Добавлена колонка {col_name}", "populate")
        
        conn.commit()
        log_info("✅ Схема users обновлена для переводов", "populate")
        
    except Exception as e:
        log_error(f"Ошибка при обновлении схемы users: {e}", "populate")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    log_info("=" * 70, "populate")
    log_info("🚀 Заполнение базы данных публичным контентом", "populate")
    log_info("=" * 70, "populate")
    
    try:
        # Обновляем схему сотрудников
        update_employee_schema()
        
        # Заполняем FAQ
        populate_faq()
        
        # Заполняем отзывы
        populate_reviews()
        
        log_info("=" * 70, "populate")
        log_info("✅ Заполнение завершено!", "populate")
        log_info("=" * 70, "populate")
        
    except Exception as e:
        log_error(f"Критическая ошибка: {e}", "populate")
        import traceback
        log_error(traceback.format_exc(), "populate")

