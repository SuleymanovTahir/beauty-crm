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
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                
                -- Translations for author name
                author_name_ru TEXT, author_name_en TEXT, author_name_ar TEXT,
                author_name_es TEXT, author_name_de TEXT, author_name_fr TEXT,
                author_name_hi TEXT, author_name_kk TEXT, author_name_pt TEXT,
                
                -- Employee info (snapshot)
                employee_name TEXT,
                employee_name_ru TEXT, employee_name_en TEXT, employee_name_ar TEXT,
                employee_name_es TEXT, employee_name_de TEXT, employee_name_fr TEXT,
                employee_name_hi TEXT, employee_name_kk TEXT, employee_name_pt TEXT,
                
                employee_position TEXT,
                employee_position_ru TEXT, employee_position_en TEXT, employee_position_ar TEXT,
                employee_position_es TEXT, employee_position_de TEXT, employee_position_fr TEXT,
                employee_position_hi TEXT, employee_position_kk TEXT, employee_position_pt TEXT
            )
        """)
        
        # Check and add columns if they don't exist (for existing tables)
        c.execute("PRAGMA table_info(public_reviews)")
        existing_columns = {col[1] for col in c.fetchall()}
        
        columns_to_add = {
            'author_name_ru': 'TEXT', 'author_name_en': 'TEXT', 'author_name_ar': 'TEXT',
            'author_name_es': 'TEXT', 'author_name_de': 'TEXT', 'author_name_fr': 'TEXT',
            'author_name_hi': 'TEXT', 'author_name_kk': 'TEXT', 'author_name_pt': 'TEXT',
            
            'employee_name': 'TEXT',
            'employee_name_ru': 'TEXT', 'employee_name_en': 'TEXT', 'employee_name_ar': 'TEXT',
            'employee_name_es': 'TEXT', 'employee_name_de': 'TEXT', 'employee_name_fr': 'TEXT',
            'employee_name_hi': 'TEXT', 'employee_name_kk': 'TEXT', 'employee_name_pt': 'TEXT',
            
            'employee_position': 'TEXT',
            'employee_position_ru': 'TEXT', 'employee_position_en': 'TEXT', 'employee_position_ar': 'TEXT',
            'employee_position_es': 'TEXT', 'employee_position_de': 'TEXT', 'employee_position_fr': 'TEXT',
            'employee_position_hi': 'TEXT', 'employee_position_kk': 'TEXT', 'employee_position_pt': 'TEXT'
        }
        
        for col, dtype in columns_to_add.items():
            if col not in existing_columns:
                print(f"  ➕ Adding column to public_reviews: {col}")
                c.execute(f"ALTER TABLE public_reviews ADD COLUMN {col} {dtype}")
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
