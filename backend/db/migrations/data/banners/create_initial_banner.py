import sqlite3
from pathlib import Path

def create_initial_banner(db_path="salon_bot.db"):
    """Create initial banner with hero image"""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    try:
        # Check if banner already exists
        c.execute("SELECT COUNT(*) FROM public_banners")
        count = c.fetchone()[0]
        
        if count == 0:
            # Insert initial banner
            c.execute("""
                INSERT INTO public_banners (
                    title_ru, title_en, title_ar,
                    subtitle_ru, subtitle_en, subtitle_ar,
                    image_url, link_url, display_order, is_active
                ) VALUES (
                    'Красота и Элегантность',
                    'Beauty and Elegance',
                    'الجمال والأناقة',
                    'Профессиональные услуги красоты',
                    'Professional Beauty Services',
                    'خدمات تجميل احترافية',
                    'https://images.unsplash.com/photo-1648065460033-5c59f2ef1d97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwd29tYW4lMjBiZWF1dHl8ZW58MXx8fHwxNzY0MjIzNDE5fDA&ixlib=rb-4.1.0&q=80&w=1080',
                    '/services',
                    1,
                    1
                )
            """)
            conn.commit()
            print("✅ Initial banner created")
        else:
            print(f"ℹ️  {count} banner(s) already exist")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    # Get the backend directory
    backend_dir = Path(__file__).parent.parent.parent.parent
    db_path = backend_dir / "salon_bot.db"
    create_initial_banner(str(db_path))
