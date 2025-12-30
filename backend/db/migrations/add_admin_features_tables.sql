-- Миграция для таблиц админских функций
-- Challenges, Referrals, Loyalty, Notifications, Gallery

-- ============================================================================
-- CHALLENGES
-- ============================================================================

-- Проверка и создание поля challenge_type если его нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'active_challenges' AND column_name = 'challenge_type'
    ) THEN
        ALTER TABLE active_challenges ADD COLUMN challenge_type VARCHAR(50) DEFAULT 'visits';
    END IF;
END$$;

-- Проверка и создание поля target_value если его нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'active_challenges' AND column_name = 'target_value'
    ) THEN
        ALTER TABLE active_challenges ADD COLUMN target_value INTEGER DEFAULT 0;
    END IF;
END$$;

-- Проверка и создание полей start_date и end_date
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'active_challenges' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE active_challenges ADD COLUMN start_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'active_challenges' AND column_name = 'end_date'
    ) THEN
        ALTER TABLE active_challenges ADD COLUMN end_date DATE;
    END IF;
END$$;

-- Создание таблицы для прогресса челленджей
CREATE TABLE IF NOT EXISTS challenge_progress (
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
-- LOYALTY
-- ============================================================================

-- Создание таблицы уровней лояльности
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    min_points INTEGER DEFAULT 0,
    discount NUMERIC(5,2) DEFAULT 0,
    color VARCHAR(20) DEFAULT '#CD7F32',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставка дефолтных уровней если их еще нет
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

-- Переименовать loyalty_transactions.transaction_type если нужно
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loyalty_transactions' AND column_name = 'type'
    ) THEN
        ALTER TABLE loyalty_transactions RENAME COLUMN type TO transaction_type;
    END IF;
EXCEPTION
    WHEN undefined_column THEN
        NULL;
END$$;

-- Добавить поле transaction_type если его нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loyalty_transactions' AND column_name = 'transaction_type'
    ) THEN
        ALTER TABLE loyalty_transactions ADD COLUMN transaction_type VARCHAR(20) DEFAULT 'adjust';
    END IF;
END$$;

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- Создание таблицы истории уведомлений
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

-- Создание таблицы шаблонов уведомлений
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

-- Создание таблицы фото галереи
CREATE TABLE IF NOT EXISTS gallery_photos (
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

-- Создание таблицы настроек если её нет
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_challenge_progress_client ON challenge_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge ON challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_category ON gallery_photos(category);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_featured ON gallery_photos(is_featured);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
