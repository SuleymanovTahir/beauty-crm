import os
from db.connection import get_db_connection

def create_tables():
    """Создание таблиц для управления публичным контентом"""
    print(f"Creating public content tables...")
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Таблица отзывов
        c.execute("""
            CREATE TABLE IF NOT EXISTS public_reviews (
                id SERIAL PRIMARY KEY,
                author_name TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                text_ru TEXT NOT NULL,
                text_en TEXT,
                text_ar TEXT,
                text_de TEXT,
                text_es TEXT,
                text_fr TEXT,
                text_hi TEXT,
                text_kk TEXT,
                text_pt TEXT,
                avatar_url TEXT,
                is_active INTEGER DEFAULT 1,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Created public_reviews table")

        # Таблица баннеров
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public_banners (
                id SERIAL PRIMARY KEY,
                title_ru TEXT NOT NULL,
                title_en TEXT,
                title_ar TEXT,
                subtitle_ru TEXT,
                subtitle_en TEXT,
                subtitle_ar TEXT,
                image_url TEXT,
                link_url TEXT,
                is_active INTEGER DEFAULT 1,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Created public_banners table")

        # Таблица FAQ
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public_faq (
                id SERIAL PRIMARY KEY,
                question_ru TEXT NOT NULL,
                question_en TEXT,
                question_ar TEXT,
                question_de TEXT,
                question_es TEXT,
                question_fr TEXT,
                question_hi TEXT,
                question_kk TEXT,
                question_pt TEXT,
                answer_ru TEXT NOT NULL,
                answer_en TEXT,
                answer_ar TEXT,
                answer_de TEXT,
                answer_es TEXT,
                answer_fr TEXT,
                answer_hi TEXT,
                answer_kk TEXT,
                answer_pt TEXT,
                category TEXT DEFAULT 'general',
                is_active INTEGER DEFAULT 1,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Created public_faq table")

        # Таблица галереи
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public_gallery (
                id SERIAL PRIMARY KEY,
                title_ru TEXT,
                title_en TEXT,
                title_ar TEXT,
                title_de TEXT,
                title_es TEXT,
                title_fr TEXT,
                title_hi TEXT,
                title_kk TEXT,
                title_pt TEXT,
                description_ru TEXT,
                description_en TEXT,
                description_ar TEXT,
                description_de TEXT,
                description_es TEXT,
                description_fr TEXT,
                description_hi TEXT,
                description_kk TEXT,
                description_pt TEXT,
                image_url TEXT NOT NULL,
                category TEXT DEFAULT 'works',
                is_active INTEGER DEFAULT 1,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Created public_gallery table")

        # Таблица баннеров
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public_banners (
                id SERIAL PRIMARY KEY,
                title_ru TEXT NOT NULL,
                title_en TEXT,
                title_ar TEXT,
                title_de TEXT,
                title_es TEXT,
                title_fr TEXT,
                title_hi TEXT,
                title_kk TEXT,
                title_pt TEXT,
                subtitle_ru TEXT,
                subtitle_en TEXT,
                subtitle_ar TEXT,
                subtitle_de TEXT,
                subtitle_es TEXT,
                subtitle_fr TEXT,
                subtitle_hi TEXT,
                subtitle_kk TEXT,
                subtitle_pt TEXT,
                image_url TEXT,
                link_url TEXT,
                is_active INTEGER DEFAULT 1,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Created public_banners table")

        conn.commit()
        print("✅ All public content tables created successfully")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    create_public_content_tables()
