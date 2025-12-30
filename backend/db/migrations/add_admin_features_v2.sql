-- Обновленная миграция для админских функций

-- Удаляем старые таблицы если они были созданы неправильно
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS challenge_progress CASCADE;
DROP TABLE IF EXISTS gallery_photos CASCADE;

-- ============================================================================
-- CHALLENGES
-- ============================================================================

-- Добавить поля в active_challenges
ALTER TABLE active_challenges ADD COLUMN IF NOT EXISTS challenge_type VARCHAR(50) DEFAULT 'visits';
ALTER TABLE active_challenges ADD COLUMN IF NOT EXISTS target_value INTEGER DEFAULT 0;
ALTER TABLE active_challenges ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE active_challenges ADD COLUMN IF NOT EXISTS end_date DATE;

-- Создание таблицы прогресса челленджей
CREATE TABLE challenge_progress (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER REFERENCES active_challenges(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES clients(instagram_id) ON DELETE CASCADE,
    current_value INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(challenge_id, client_id)
);

-- ============================================================================
-- REFERRALS (обновление существующей таблицы client_referrals)
-- ============================================================================

ALTER TABLE client_referrals ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE client_referrals ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 0;
ALTER TABLE client_referrals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Обновить статус для существующих записей
UPDATE client_referrals
SET status = CASE WHEN bonus_given THEN 'completed' ELSE 'pending' END
WHERE status IS NULL;

-- ============================================================================
-- LOYALTY
-- ============================================================================

CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    min_points INTEGER DEFAULT 0,
    discount NUMERIC(5,2) DEFAULT 0,
    color VARCHAR(20) DEFAULT '#CD7F32',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставка дефолтных тиров
INSERT INTO loyalty_tiers (name, min_points, discount, color)
SELECT 'Bronze', 0, 0, '#CD7F32'
WHERE NOT EXISTS (SELECT 1 FROM loyalty_tiers WHERE name = 'Bronze');

INSERT INTO loyalty_tiers (name, min_points, discount, color)
SELECT 'Silver', 1000, 5, '#C0C0C0'
WHERE NOT EXISTS (SELECT 1 FROM loyalty_tiers WHERE name = 'Silver');

INSERT INTO loyalty_tiers (name, min_points, discount, color)
SELECT 'Gold', 5000, 10, '#FFD700'
WHERE NOT EXISTS (SELECT 1 FROM loyalty_tiers WHERE name = 'Gold');

INSERT INTO loyalty_tiers (name, min_points, discount, color)
SELECT 'Platinum', 10000, 15, '#E5E4E2'
WHERE NOT EXISTS (SELECT 1 FROM loyalty_tiers WHERE name = 'Platinum');

-- Добавить transaction_type в loyalty_transactions если нет
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'adjust';

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_history (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    message TEXT,
    notification_type VARCHAR(20) DEFAULT 'push',
    recipients_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    notification_type VARCHAR(20) DEFAULT 'push',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- GALLERY
-- ============================================================================

CREATE TABLE gallery_photos (
    id SERIAL PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    category VARCHAR(50) DEFAULT 'other',
    uploaded_by VARCHAR(255),
    client_id TEXT REFERENCES clients(instagram_id) ON DELETE SET NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    views INTEGER DEFAULT 0,
    before_photo_url VARCHAR(500),
    after_photo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_challenge_progress_client ON challenge_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge ON challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_category ON gallery_photos(category);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_featured ON gallery_photos(is_featured);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
