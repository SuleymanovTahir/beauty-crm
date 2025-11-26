# ✅ Все миграции добавлены в автоматический запуск

## 1. В `db/init.py` (основная инициализация БД)

Добавлены следующие таблицы:

### Таблица `ratings`
```sql
CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER,
    instagram_id TEXT,
    rating INTEGER,
    comment TEXT,
    created_at TEXT,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
)
```

### Таблица `reminder_logs`
```sql
CREATE TABLE IF NOT EXISTS reminder_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER,
    client_id TEXT,
    reminder_type TEXT,
    sent_at TEXT,
    status TEXT
)
```

### Поле `telegram_manager_chat_id`
```sql
ALTER TABLE salon_settings ADD COLUMN telegram_manager_chat_id TEXT
```

## 2. В `db/migrations/run_all_migrations.py`

Добавлены миграции:
- `add_telegram_chat_id` - Telegram Chat ID для менеджера
- `add_ratings_table` - Таблица отзывов
- `add_reminder_logs` - Таблица логов напоминаний

## 3. Скрипты миграций (scripts/)

Исправлены импорты в:
- `scripts/add_telegram_chat_id.py`
- `scripts/add_ratings_table.py`
- `scripts/add_reminder_logs.py`

Все скрипты теперь используют:
```python
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.config import DATABASE_NAME
```

## Результат

✅ При запуске `init_database()` - все таблицы создаются автоматически
✅ При запуске `run_all_migrations()` - все миграции выполняются
✅ Скрипты можно запускать вручную: `python3 scripts/add_ratings_table.py`

Теперь при любой инициализации БД все необходимые таблицы будут созданы!
