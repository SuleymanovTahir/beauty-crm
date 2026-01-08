# Рекомендации по дальнейшей оптимизации

## 1. Мониторинг производительности

### Скрипт мониторинга

Создан скрипт `scripts/monitoring/monitor_performance.py` для отслеживания:

- Размера таблицы `sessions`
- Количества активных и истекших сессий
- Общего размера базы данных
- Использования индексов
- Неиспользуемых индексов (которые можно удалить)

### Запуск мониторинга

```bash
cd /Users/tahir/Desktop/beauty-crm/backend
python3 scripts/monitoring/monitor_performance.py
```

### Автоматический мониторинг

Добавьте в `main.py` для запуска каждые 24 часа:

```python
from scripts.monitoring.monitor_performance import monitor_sessions, monitor_database_performance

scheduler.add_job(
    monitor_sessions,
    'interval',
    hours=24,
    id='monitor_sessions'
)
```

## 2. Индексы для часто используемых полей

### Рекомендуемые индексы при росте БД

#### Таблица `clients`

```sql
-- Для поиска по телефону
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- Для фильтрации по статусу
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Для сортировки по последнему контакту
CREATE INDEX IF NOT EXISTS idx_clients_last_contact ON clients(last_contact);
```

#### Таблица `bookings`

```sql
-- Для фильтрации по дате
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);

-- Для фильтрации по мастеру
CREATE INDEX IF NOT EXISTS idx_bookings_master ON bookings(master);

-- Для фильтрации по статусу
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Композитный индекс для частых запросов
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(date, status);
```

#### Таблица `messages`

```sql
-- Для фильтрации по клиенту и времени
CREATE INDEX IF NOT EXISTS idx_messages_client_time ON messages(client_id, timestamp);
```

### Когда добавлять индексы?

- **Таблица > 10,000 записей**: Рассмотрите индексы на часто используемых полях
- **Запрос > 100ms**: Проанализируйте план запроса (`EXPLAIN ANALYZE`)
- **Частые фильтрации**: Добавьте индексы на поля WHERE/ORDER BY

## 3. Кэширование с Redis

### Зачем нужен Redis?

#### Текущая ситуация (PostgreSQL sessions)

- ✅ Простота реализации
- ⚠️ Нагрузка на БД при каждом запросе
- ⚠️ Медленнее при большом количестве сессий

#### С Redis

- ✅ Скорость: ~0.1ms vs ~5-10ms (PostgreSQL)
- ✅ Снижение нагрузки на основную БД
- ✅ Автоматическое истечение (TTL)
- ⚠️ Дополнительный сервис

### Когда переходить на Redis?

| Метрика                | Порог              | Действие            |
| ---------------------- | ------------------ | ------------------- |
| Сессий в БД            | > 10,000           | Рассмотрите Redis   |
| Активных пользователей | > 100 одновременно | Переходите на Redis |
| Время проверки сессии  | > 50ms             | Redis обязателен    |

### Пример реализации с Redis

```python
# requirements.txt
redis==5.0.1

# config.py
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_DB = int(os.getenv('REDIS_DB', 0))

# utils/redis_session.py
import redis
import json
from datetime import timedelta

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=REDIS_DB,
    decode_responses=True
)

def create_session_redis(user_id: int, session_token: str):
    """Создать сессию в Redis"""
    session_data = {
        'user_id': user_id,
        'created_at': datetime.now().isoformat()
    }
    # TTL = 7 дней
    redis_client.setex(
        f"session:{session_token}",
        timedelta(days=7),
        json.dumps(session_data)
    )

def get_session_redis(session_token: str):
    """Получить сессию из Redis"""
    data = redis_client.get(f"session:{session_token}")
    return json.loads(data) if data else None

def delete_session_redis(session_token: str):
    """Удалить сессию из Redis"""
    redis_client.delete(f"session:{session_token}")
```

### Гибридный подход (PostgreSQL + Redis)

```python
def get_session(session_token: str):
    # Сначала проверяем Redis (быстро)
    session = get_session_redis(session_token)
    if session:
        return session

    # Если нет в Redis, проверяем БД (медленнее)
    session = get_session_postgres(session_token)
    if session:
        # Кэшируем в Redis для следующих запросов
        create_session_redis(session['user_id'], session_token)

    return session
```

## 4. Оптимизация логирования в Production

### Текущее состояние

- ✅ Отключено детальное логирование для API запросов
- ✅ Логируются только медленные запросы (> 1с)

### Дополнительные оптимизации

#### Опция 1: Полное отключение middleware логирования

```python
# main.py
if os.getenv("ENVIRONMENT") != "production":
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        # Логирование только в development
        ...
```

#### Опция 2: Логирование только ошибок

```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        # Логируем только ошибки
        if response.status_code >= 400:
            log_error(f"❌ {request.method} {path} → {response.status_code}")
        return response
    except Exception as e:
        log_error(f"❌ ОШИБКА: {request.method} {path}", exc_info=True)
        raise
```

#### Опция 3: Структурированное логирование (JSON)

```python
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module
        }
        return json.dumps(log_data)

# Использование
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
```

### Ротация логов

```python
# config/logging.py
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler(
    'logs/app.log',
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
```

## 5. Дополнительные рекомендации

### Сжатие ответов (уже реализовано)

```python
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

### HTTP/2 (для production)

```bash
# Используйте Nginx или Caddy в качестве reverse proxy
# nginx.conf
http2 on;
```

### CDN для статических файлов

- Используйте CloudFlare, AWS CloudFront или аналоги
- Кэшируйте статику на edge серверах

### Database Connection Pooling (уже реализовано)

```python
# db/connection.py
_connection_pool = pool.ThreadedConnectionPool(
    minconn=10,  # ✅ Оптимизировано
    maxconn=50,
    ...
)
```

## Приоритеты внедрения

| Приоритет  | Оптимизация             | Когда внедрять                   |
| ---------- | ----------------------- | -------------------------------- |
| 🔴 Высокий | Мониторинг              | Сейчас                           |
| 🔴 Высокий | Индексы на bookings     | При > 1000 записей               |
| 🟡 Средний | Redis для сессий        | При > 100 активных пользователей |
| 🟡 Средний | Отключение логов в prod | Перед запуском production        |
| 🟢 Низкий  | CDN                     | При > 1000 посетителей/день      |

## Мониторинг эффективности

### Метрики для отслеживания

1. **Время ответа API**: < 200ms (95 перцентиль)
2. **Размер БД**: Рост не более 10% в месяц
3. **Количество сессий**: Автоочистка работает
4. **Использование индексов**: > 80% индексов используются

### Инструменты

- **PostgreSQL**: `pg_stat_statements` для анализа медленных запросов
- **Мониторинг**: Grafana + Prometheus
- **APM**: New Relic, DataDog (для production)
