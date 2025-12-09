-- Скрипт для проверки услуг без мастеров
-- Выполнить: psql -d beauty_crm -f check_services_without_masters.sql

\echo '================================================================================'
\echo '🔍 ПРОВЕРКА УСЛУГ БЕЗ МАСТЕРОВ'
\echo '================================================================================'
\echo ''

-- Подсчет всех активных услуг
SELECT COUNT(*) as total_active_services
FROM services
WHERE is_active = TRUE;

\echo ''
\echo '================================================================================'
\echo '❌ УСЛУГИ БЕЗ МАСТЕРОВ:'
\echo '================================================================================'
\echo ''

-- Услуги без мастеров (с группировкой по категориям)
SELECT 
    s.id,
    s.name_ru as "Название (RU)",
    s.name as "Название (EN)",
    s.category as "Категория"
FROM services s
WHERE s.is_active = TRUE
AND s.id NOT IN (
    SELECT DISTINCT us.service_id
    FROM user_services us
    JOIN users u ON u.id = us.user_id
    WHERE u.is_active = TRUE 
    AND u.is_service_provider = TRUE
    AND u.role NOT IN ('director', 'admin', 'manager')
    AND (us.is_online_booking_enabled = TRUE OR us.is_online_booking_enabled IS NULL)
)
ORDER BY s.category, s.name_ru;

\echo ''
\echo '================================================================================'
\echo '📊 СТАТИСТИКА ПО КАТЕГОРИЯМ:'
\echo '================================================================================'
\echo ''

-- Статистика по категориям
SELECT 
    s.category as "Категория",
    COUNT(*) as "Услуг без мастеров"
FROM services s
WHERE s.is_active = TRUE
AND s.id NOT IN (
    SELECT DISTINCT us.service_id
    FROM user_services us
    JOIN users u ON u.id = us.user_id
    WHERE u.is_active = TRUE 
    AND u.is_service_provider = TRUE
    AND u.role NOT IN ('director', 'admin', 'manager')
    AND (us.is_online_booking_enabled = TRUE OR us.is_online_booking_enabled IS NULL)
)
GROUP BY s.category
ORDER BY COUNT(*) DESC;

\echo ''
\echo '================================================================================'
\echo '📋 СПИСОК ID УСЛУГ БЕЗ МАСТЕРОВ (для копирования):'
\echo '================================================================================'
\echo ''

-- Список ID для копирования
SELECT string_agg(s.id::text, ', ' ORDER BY s.id) as "ID услуг без мастеров"
FROM services s
WHERE s.is_active = TRUE
AND s.id NOT IN (
    SELECT DISTINCT us.service_id
    FROM user_services us
    JOIN users u ON u.id = us.user_id
    WHERE u.is_active = TRUE 
    AND u.is_service_provider = TRUE
    AND u.role NOT IN ('director', 'admin', 'manager')
    AND (us.is_online_booking_enabled = TRUE OR us.is_online_booking_enabled IS NULL)
);

\echo ''
\echo '================================================================================'
\echo '✅ УСЛУГИ С МАСТЕРАМИ (топ-10 по количеству мастеров):'
\echo '================================================================================'
\echo ''

-- Топ услуг с наибольшим количеством мастеров
SELECT 
    s.id,
    s.name_ru as "Название (RU)",
    s.category as "Категория",
    COUNT(DISTINCT u.id) as "Количество мастеров"
FROM services s
JOIN user_services us ON s.id = us.service_id
JOIN users u ON u.id = us.user_id
WHERE s.is_active = TRUE
AND u.is_active = TRUE 
AND u.is_service_provider = TRUE
AND u.role NOT IN ('director', 'admin', 'manager')
AND (us.is_online_booking_enabled = TRUE OR us.is_online_booking_enabled IS NULL)
GROUP BY s.id, s.name_ru, s.category
ORDER BY COUNT(DISTINCT u.id) DESC
LIMIT 10;

\echo ''
\echo '================================================================================'

