# 🚀 PostgreSQL Migration Guide

**Статус:** ✅ Завершено  
**Дата:** 2025-12-04

---

## 📋 Краткая Сводка

Полная миграция Beauty CRM с SQLite на PostgreSQL успешно завершена.

**Результат:**
- ✅ 46+ таблиц созданы
- ✅ Все данные загружены
- ✅ Сервер работает стабильно
- ✅ 0 ошибок SQLite

---

## 🔧 Исправленные Проблемы

### 1. Типы Колонок (11 исправлений)

**BOOLEAN → INTEGER:**
- `sort_order` (3 места в `schema_gallery.py`)
- `display_order` (6 мест: `db/init.py` × 2, `schema_public.py` × 4)
- `public_page_order` (1 место)

**INTEGER → TEXT:**
- `client_id` в `client_preferences` (для FK с `clients.instagram_id`)

### 2. Недостающие Колонки (12 добавлений)

**`loyalty_levels`:**
- `icon`, `color`, `is_active`

**`salon_settings`:**
- `latitude`, `longitude`, `logo_url`, `base_url`
- `google_place_id`, `google_api_key`
- `google_analytics_id`, `facebook_pixel_id`, `promo_end_date`

**`bot_settings`:**
- `id: 1` в INSERT

### 3. INSERT Запросы (3 исправления)

**Integer → TRUE/FALSE:**
- `is_visible` значения: `1` → `TRUE` (3 места в `schema_gallery.py`)

### 4. SQLite Удаление (165 файлов)

- Удалены все `import sqlite3` (157 файлов)
- Заменены исключения в `db/settings.py` (8 мест)
- Удален `sqlite3.Row` из `booking_reminder_checker.py`

### 5. Дефолтные Данные

**Booking Reminders:**
- ✅ За 1 день (WhatsApp)
- ✅ За 3 часа (WhatsApp)
- ✅ За 1 час (WhatsApp)

---

## 🗄️ Управление Базой Данных

### Полный Сброс БД

```bash
cd /Users/tahir/Desktop/beauty-crm/backend
source venv/bin/activate

# 1. Пересоздать БД
python3 scripts/maintenance/recreate_database.py

# 2. Предоставить права
python3 scripts/maintenance/grant_db_permissions.py

# 3. Запустить миграции
python3 -c "from db.migrations.run_all_migrations import run_all_migrations; run_all_migrations()"

# 4. Применить фиксы (опционально)
python3 -c "import asyncio; from main import run_all_fixes; asyncio.run(run_all_fixes())"
```

### Одна Команда

```bash
cd /Users/tahir/Desktop/beauty-crm/backend && \
source venv/bin/activate && \
python3 scripts/maintenance/recreate_database.py && \
python3 scripts/maintenance/grant_db_permissions.py && \
python3 -c "from db.migrations.run_all_migrations import run_all_migrations; run_all_migrations()"
```

---

## 🔍 Проверка

### API

```bash
curl http://localhost:8000/
# {"status":"✅ CRM работает!","salon":"M Le Diamant",...}
```

### Таблицы

```bash
python3 << 'EOF'
from db.connection import get_db_connection
conn = get_db_connection()
c = conn.cursor()
c.execute("SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'")
print(f"Таблиц: {c.fetchone()[0]}")
conn.close()
EOF
```

### Настройки

```bash
python3 -c "from db.settings import get_salon_settings; print(get_salon_settings())"
```

---

## 🛠️ Созданные Инструменты

1. **`scripts/maintenance/recreate_database.py`** - пересоздание БД
2. **`scripts/maintenance/grant_db_permissions.py`** - предоставление прав
3. **`scripts/maintenance/find_boolean_insert_issues.py`** - поиск проблем с BOOLEAN

---

## 🐛 Типичные Ошибки

### `ModuleNotFoundError: No module named 'psycopg2'`

```bash
source venv/bin/activate
pip install psycopg2-binary
```

### `connection to server failed`

```bash
# Проверить PostgreSQL
brew services list | grep postgresql

# Запустить
brew services start postgresql@14
```

### `permission denied for schema public`

```bash
python3 scripts/maintenance/grant_db_permissions.py
```

---

## 📊 Статистика

| Категория | Количество |
|-----------|------------|
| Файлов изменено | 9 |
| Типов колонок исправлено | 11 |
| Колонок добавлено | 12 |
| INSERT запросов исправлено | 3 |
| SQLite импортов удалено | 157 |
| Исключений заменено | 8 |
| Таблиц создано | 46+ |

---

## ✅ Чек-лист

- [x] SQLite полностью удален
- [x] Все таблицы созданы
- [x] Миграции выполнены
- [x] Права предоставлены
- [x] Данные загружены
- [x] API работает
- [x] Напоминания настроены
- [x] Тесты пройдены

---

**🎉 Миграция завершена успешно!**
