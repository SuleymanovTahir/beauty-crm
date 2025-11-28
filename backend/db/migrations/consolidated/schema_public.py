"""
Consolidated Public Content Schema Migration
All schema changes for public content (banners, reviews, faq, gallery)
"""
import sqlite3

def migrate_public_schema(db_path="salon_bot.db"):
    """
    Apply all public content schema changes
    """
    print("\n" + "="*60)
    print("🔧 PUBLIC CONTENT SCHEMA MIGRATION")
    print("="*60)
    
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    try:
        # 1. Create public_banners table
        c.execute("""
            CREATE TABLE IF NOT EXISTS public_banners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title_ru TEXT NOT NULL,
                title_en TEXT,
                title_ar TEXT,
                subtitle_ru TEXT,
                subtitle_en TEXT,
                subtitle_ar TEXT,
                image_url TEXT,
                link_url TEXT,
                display_order INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ public_banners table ensured")
        
        # 2. Create public_reviews table
        c.execute("""
            CREATE TABLE IF NOT EXISTS public_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                author_name TEXT NOT NULL,
                rating INTEGER DEFAULT 5,
                text_ru TEXT,
                text_en TEXT,
                text_ar TEXT,
                text_de TEXT,
                text_es TEXT,
                text_fr TEXT,
                text_hi TEXT,
                text_kk TEXT,
                text_pt TEXT,
                avatar_url TEXT,
                display_order INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ public_reviews table ensured")
        
        # 3. Create public_faq table
        c.execute("""
            CREATE TABLE IF NOT EXISTS public_faq (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_ru TEXT NOT NULL,
                question_en TEXT,
                question_ar TEXT,
                answer_ru TEXT NOT NULL,
                answer_en TEXT,
                answer_ar TEXT,
                category TEXT DEFAULT 'general',
                display_order INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ public_faq table ensured")
        
        # 4. Create public_gallery table
        c.execute("""
            CREATE TABLE IF NOT EXISTS public_gallery (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_url TEXT NOT NULL,
                title_ru TEXT,
                title_en TEXT,
                title_ar TEXT,
                description_ru TEXT,
                description_en TEXT,
                description_ar TEXT,
                category TEXT DEFAULT 'works',
                display_order INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ public_gallery table ensured")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_public_schema()
