"""
Migration: Account Enhancements
Adds tables and fields for enhanced client account features:
- Referral codes
- Client gallery (before/after photos)
- Client achievements
- Client favorite masters
- Beauty metrics tracking
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_warning
import secrets
import string


def generate_referral_code():
    """Generate unique 8-character referral code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(8))


def migrate_account_enhancements():
    """Run all account enhancement migrations"""
    conn = get_db_connection()
    c = conn.cursor()
    
    log_info("🔧 Running account enhancements migration...", "db")
    
    # === 1. Add new columns to clients table ===
    try:
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='clients'
        """)
        client_columns = [row[0] for row in c.fetchall()]
    except:
        client_columns = []
    
    client_migrations = {
        'referral_code': 'TEXT',
        'member_since': 'TEXT',
        'total_saved': 'REAL DEFAULT 0',
        'avatar_url': 'TEXT',
        'loyalty_level': "TEXT DEFAULT 'bronze'",
    }
    
    for col, col_type in client_migrations.items():
        if col not in client_columns:
            try:
                c.execute(f"ALTER TABLE clients ADD COLUMN {col} {col_type}")
                log_info(f"➕ Added column {col} to clients", "db")
            except Exception as e:
                log_warning(f"⚠️ Could not add column {col}: {e}", "db")
    
    # === 2. Create client_gallery table ===
    c.execute('''CREATE TABLE IF NOT EXISTS client_gallery (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        booking_id INTEGER,
        service_id INTEGER,
        master_id INTEGER,
        before_photo TEXT,
        after_photo TEXT,
        category TEXT,
        notes TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(instagram_id),
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (master_id) REFERENCES users(id)
    )''')
    log_info("✅ Table client_gallery created/verified", "db")
    
    # === 3. Create client_achievements table ===
    c.execute('''CREATE TABLE IF NOT EXISTS client_achievements (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        achievement_type TEXT NOT NULL,
        title TEXT NOT NULL,
        title_ru TEXT,
        title_en TEXT,
        title_ar TEXT,
        description TEXT,
        description_ru TEXT,
        description_en TEXT,
        description_ar TEXT,
        icon TEXT,
        points_awarded INTEGER DEFAULT 0,
        unlocked_at TIMESTAMP,
        progress INTEGER DEFAULT 0,
        max_progress INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    log_info("✅ Table client_achievements created/verified", "db")
    
    # === 4. Create client_favorite_masters table ===
    c.execute('''CREATE TABLE IF NOT EXISTS client_favorite_masters (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        master_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, master_id),
        FOREIGN KEY (client_id) REFERENCES clients(instagram_id),
        FOREIGN KEY (master_id) REFERENCES users(id)
    )''')
    log_info("✅ Table client_favorite_masters created/verified", "db")
    
    # === 5. Create client_beauty_metrics table ===
    c.execute('''CREATE TABLE IF NOT EXISTS client_beauty_metrics (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value INTEGER DEFAULT 100,
        last_service_date TEXT,
        last_service_id INTEGER,
        days_since_last INTEGER DEFAULT 0,
        status TEXT DEFAULT 'good',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, metric_name),
        FOREIGN KEY (client_id) REFERENCES clients(instagram_id),
        FOREIGN KEY (last_service_id) REFERENCES services(id)
    )''')
    log_info("✅ Table client_beauty_metrics created/verified", "db")
    
    # === 6. Generate referral codes for existing clients without one ===
    try:
        c.execute("SELECT instagram_id FROM clients WHERE referral_code IS NULL OR referral_code = ''")
        clients_without_code = c.fetchall()
        
        for client in clients_without_code:
            code = generate_referral_code()
            c.execute("UPDATE clients SET referral_code = %s WHERE instagram_id = %s", (code, client[0]))
        
        if clients_without_code:
            log_info(f"➕ Generated referral codes for {len(clients_without_code)} clients", "db")
    except Exception as e:
        log_warning(f"⚠️ Could not generate referral codes: {e}", "db")
    
    # === 7. Seed default achievements ===
    c.execute("SELECT COUNT(*) FROM client_achievements WHERE achievement_type = 'template'")
    if c.fetchone()[0] == 0:
        default_achievements = [
            {
                'type': 'first_visit',
                'title': 'First Steps',
                'title_ru': 'Первые шаги',
                'description': 'Complete your first booking',
                'description_ru': 'Завершите свою первую запись',
                'icon': '⭐',
                'points': 50,
                'max_progress': 1
            },
            {
                'type': 'regular',
                'title': 'Regular Client',
                'title_ru': 'Постоянный клиент',
                'description': 'Visit 5 times',
                'description_ru': 'Посетите салон 5 раз',
                'icon': '❤️',
                'points': 100,
                'max_progress': 5
            },
            {
                'type': 'beauty_guru',
                'title': 'Beauty Guru',
                'title_ru': 'Бьюти-гуру',
                'description': 'Try 10 different services',
                'description_ru': 'Попробуйте 10 разных услуг',
                'icon': '✨',
                'points': 150,
                'max_progress': 10
            },
            {
                'type': 'loyal',
                'title': 'Loyal Customer',
                'title_ru': 'Лояльный клиент',
                'description': 'Earn 1000 loyalty points',
                'description_ru': 'Заработайте 1000 баллов лояльности',
                'icon': '👑',
                'points': 200,
                'max_progress': 1000
            },
            {
                'type': 'streak_3',
                'title': 'On Fire!',
                'title_ru': 'В ударе!',
                'description': 'Visit 3 months in a row',
                'description_ru': 'Посещайте салон 3 месяца подряд',
                'icon': '🔥',
                'points': 100,
                'max_progress': 3
            },
            {
                'type': 'referral',
                'title': 'Friend Finder',
                'title_ru': 'Друг салона',
                'description': 'Invite 3 friends',
                'description_ru': 'Пригласите 3 друзей',
                'icon': '👥',
                'points': 300,
                'max_progress': 3
            },
        ]
        
        # Insert as template achievements (client_id = 'template')
        for ach in default_achievements:
            c.execute("""
                INSERT INTO client_achievements 
                (client_id, achievement_type, title, title_ru, title_en, description, description_ru, description_en, icon, points_awarded, max_progress)
                VALUES ('template', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                ach['type'],
                ach['title'],
                ach['title_ru'],
                ach['title'],
                ach['description'],
                ach['description_ru'],
                ach['description'],
                ach['icon'],
                ach['points'],
                ach['max_progress']
            ))
        
        log_info(f"➕ Seeded {len(default_achievements)} default achievement templates", "db")
    
    conn.commit()
    log_info("✅ Account enhancements migration completed", "db")


if __name__ == "__main__":
    migrate_account_enhancements()
