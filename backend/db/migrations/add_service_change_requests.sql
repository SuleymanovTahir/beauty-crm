-- Миграция для системы запросов на изменение услуг сотрудниками
-- Сотрудники могут запрашивать изменения своих услуг, которые одобряются админом

-- ============================================================================
-- SERVICE CHANGE REQUESTS (Запросы на изменение услуг)
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_change_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,

    -- Запрашиваемые изменения (NULL = не менять)
    requested_price NUMERIC(10, 2),
    requested_price_min NUMERIC(10, 2),
    requested_price_max NUMERIC(10, 2),
    requested_duration INTEGER,
    requested_is_online_booking_enabled BOOLEAN,
    requested_is_calendar_enabled BOOLEAN,

    -- Тип запроса: 'add', 'update', 'remove'
    request_type VARCHAR(20) NOT NULL DEFAULT 'update',

    -- Комментарий сотрудника
    employee_comment TEXT,

    -- Статус: 'pending', 'approved', 'rejected'
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Ответ админа
    admin_id INTEGER REFERENCES users(id),
    admin_comment TEXT,

    -- Даты
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,

    -- Индексы будут ниже
    UNIQUE(user_id, service_id, status) -- Только один pending запрос на услугу
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_service_change_requests_user_id ON service_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_change_requests_status ON service_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_change_requests_created ON service_change_requests(created_at DESC);

-- Функция для автообновления updated_at
CREATE OR REPLACE FUNCTION update_service_change_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления
DROP TRIGGER IF EXISTS trg_service_change_requests_updated ON service_change_requests;
CREATE TRIGGER trg_service_change_requests_updated
    BEFORE UPDATE ON service_change_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_service_change_requests_timestamp();

-- Удаляем unique constraint если он конфликтует (позволяем несколько pending на разные услуги)
ALTER TABLE service_change_requests DROP CONSTRAINT IF EXISTS service_change_requests_user_id_service_id_status_key;

-- Добавляем правильный unique constraint (только один pending запрос на конкретную услугу)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_service_change_pending'
    ) THEN
        CREATE UNIQUE INDEX uq_service_change_pending
        ON service_change_requests(user_id, service_id)
        WHERE status = 'pending';
    END IF;
END$$;
