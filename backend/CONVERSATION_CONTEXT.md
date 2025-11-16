# 💬 Conversation Context - Управление контекстом разговоров

## 📋 Обзор

ConversationContext - это система управления состоянием многоступенчатых диалогов между клиентами и AI-ботом.

**Зачем это нужно:**
- Запоминает, на каком этапе записи находится клиент
- Отслеживает ожидаемые ответы (да/нет, выбор из опций)
- Сохраняет промежуточные данные между сообщениями
- Автоматически удаляет истекшие контексты

## 🗄️ Структура базы данных

### Таблица `conversation_context`

```sql
CREATE TABLE conversation_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    context_type TEXT NOT NULL,         -- Тип контекста
    context_data TEXT,                  -- JSON с данными
    created_at TEXT,                    -- Когда создан
    expires_at TEXT                     -- Когда истекает
)
```

## 🎯 Типы контекстов

### 1. `booking_in_progress` - Процесс записи

Отслеживает многоступенчатый процесс создания записи.

**Данные:**
```json
{
  "step": "select_service",
  "service": null,
  "master": null,
  "date": null,
  "time": null,
  "phone": null
}
```

**Шаги:**
1. `select_service` - Выбор услуги
2. `select_master` - Выбор мастера
3. `select_date` - Выбор даты
4. `select_time` - Выбор времени
5. `confirm` - Подтверждение
6. `completed` - Завершено

### 2. `awaiting_confirmation` - Ожидание подтверждения

Бот задал вопрос и ждет ответа да/нет.

**Данные:**
```json
{
  "question": "Записать вас на маникюр 25 ноября в 15:00?",
  "booking_details": {
    "service": "Маникюр",
    "master": "Jennifer",
    "date": "2025-11-25",
    "time": "15:00"
  },
  "expected_response": ["да", "yes", "подтверждаю", "записывай"]
}
```

### 3. `awaiting_choice` - Ожидание выбора из опций

Бот предложил несколько вариантов и ждет выбора.

**Данные:**
```json
{
  "question": "Когда вам удобно?",
  "options": [
    {"id": 1, "text": "Завтра в 10:00"},
    {"id": 2, "text": "Послезавтра в 14:00"},
    {"id": 3, "text": "В пятницу в 16:00"}
  ],
  "context": "time_selection"
}
```

### 4. `waiting_for_info` - Ожидание информации

Бот запросил дополнительную информацию (телефон, email и т.д.).

**Данные:**
```json
{
  "info_type": "phone",
  "prompt": "Подскажите ваш номер телефона для связи",
  "validation": "^\\+?[0-9]{10,15}$"
}
```

## 🔌 API Endpoints

### 1. Получить контекст

```bash
# Все контексты клиента
GET /api/chat/{client_id}/context

# Конкретный тип контекста
GET /api/chat/{client_id}/context?context_type=booking_in_progress
```

**Ответ:**
```json
{
  "client_id": "client_123",
  "contexts": {
    "booking_in_progress": {
      "data": {
        "step": "select_master",
        "service": "Маникюр",
        "master": null,
        "date": null,
        "time": null
      },
      "expires_at": "2025-11-16T15:30:00",
      "created_at": "2025-11-16T15:00:00"
    }
  },
  "count": 1
}
```

### 2. Сохранить контекст

```bash
POST /api/chat/{client_id}/context
Content-Type: application/json

{
  "context_type": "booking_in_progress",
  "context_data": {
    "step": "select_service",
    "service": null,
    "master": null,
    "date": null,
    "time": null
  },
  "expires_in_minutes": 30
}
```

### 3. Обновить контекст

```bash
PUT /api/chat/{client_id}/context/booking_in_progress
Content-Type: application/json

{
  "update_data": {
    "step": "select_master",
    "service": "Маникюр"
  },
  "extend_expiry": true,
  "expires_in_minutes": 30
}
```

### 4. Удалить контекст

```bash
# Удалить конкретный тип
DELETE /api/chat/{client_id}/context?context_type=booking_in_progress

# Удалить все контексты
DELETE /api/chat/{client_id}/context
```

## 💻 Использование в коде

### Backend (Python)

```python
from services.conversation_context import ConversationContext

# 1. Создать контекст для клиента
context = ConversationContext(client_id="client_123")

# 2. Сохранить новый контекст
context.save_context(
    context_type="booking_in_progress",
    context_data={
        "step": "select_service",
        "service": None,
        "master": None
    },
    expires_in_minutes=30  # Истекает через 30 минут
)

# 3. Получить контекст
current = context.get_context("booking_in_progress")
if current:
    print(f"Текущий шаг: {current['data']['step']}")
    print(f"Услуга: {current['data'].get('service')}")

# 4. Обновить контекст (объединяет с существующими данными)
context.update_context(
    "booking_in_progress",
    {
        "step": "select_master",
        "service": "Маникюр"
    },
    extend_expiry=True  # Продлить срок действия
)

# 5. Проверить наличие контекста
if context.has_context("booking_in_progress"):
    print("Есть незавершенная запись!")

# 6. Получить все активные контексты
all_contexts = context.get_all_active_contexts()
for ctx_type, ctx_data in all_contexts.items():
    print(f"{ctx_type}: {ctx_data}")

# 7. Удалить контекст
context.clear_context("booking_in_progress")  # Конкретный тип
context.clear_context()  # Все контексты
```

### Интеграция с AI-ботом

ConversationContext автоматически интегрирован в `bot/core.py`:

```python
# В методе generate_response()

# Проверяем активные контексты
conv_context = ConversationContext(instagram_id)
active_contexts = conv_context.get_all_active_contexts()

if "booking_in_progress" in active_contexts:
    booking_ctx = active_contexts["booking_in_progress"]["data"]
    additional_context += f"\n🔄 НЕЗАВЕРШЕННАЯ ЗАПИСЬ:\n"
    additional_context += f"   Текущий шаг: {booking_ctx['step']}\n"
    additional_context += "⚠️ ПРОДОЛЖИ этот процесс записи!\n"
```

Бот получает эту информацию в промпте и автоматически продолжает процесс!

## 📊 Примеры сценариев

### Сценарий 1: Многоступенчатая запись

```python
context = ConversationContext("client_123")

# Шаг 1: Клиент начал запись
context.save_context(
    "booking_in_progress",
    {
        "step": "select_service",
        "service": None,
        "master": None,
        "date": None,
        "time": None
    }
)

# Шаг 2: Клиент выбрал услугу
context.update_context(
    "booking_in_progress",
    {
        "step": "select_master",
        "service": "Маникюр"
    },
    extend_expiry=True
)

# Шаг 3: Клиент выбрал мастера
context.update_context(
    "booking_in_progress",
    {
        "step": "select_date",
        "master": "Jennifer"
    },
    extend_expiry=True
)

# Шаг 4: Клиент выбрал дату и время
context.update_context(
    "booking_in_progress",
    {
        "step": "confirm",
        "date": "2025-11-25",
        "time": "15:00"
    },
    extend_expiry=True
)

# Шаг 5: Запись завершена - удаляем контекст
context.clear_context("booking_in_progress")
```

**Диалог с клиентом:**
```
Клиент: Хочу записаться на маникюр
Бот: [Создает context booking_in_progress, step=select_service]
     Отлично! К какому мастеру хотите записаться?

Клиент: К Jennifer
Бот: [Обновляет context: step=select_master, master="Jennifer"]
     Супер! На какую дату?

Клиент: На завтра
Бот: [Обновляет context: step=select_date, date="2025-11-17"]
     В какое время удобно?

Клиент: В 15:00
Бот: [Обновляет context: step=confirm, time="15:00"]
     Записываю: Маникюр к Jennifer завтра в 15:00. Подтверждаете?

Клиент: Да
Бот: [Создает запись, удаляет контекст]
     Отлично! Запись создана!
```

### Сценарий 2: Прерванный диалог

```python
# Клиент начал запись, но ушел
context.save_context(
    "booking_in_progress",
    {
        "step": "select_master",
        "service": "Маникюр",
        "master": None
    },
    expires_in_minutes=30
)

# ...клиент вернулся через 10 минут...

# Проверяем контекст
if context.has_context("booking_in_progress"):
    current = context.get_context("booking_in_progress")
    print("Продолжаем запись с шага:", current["data"]["step"])
```

**Диалог:**
```
Клиент: Хочу маникюр
Бот: К какому мастеру?
[Клиент ушел на 10 минут]

Клиент: Привет!
Бот: [Видит активный контекст booking_in_progress]
     Привет! Продолжим запись на маникюр? К какому мастеру хотите?
```

### Сценарий 3: Ожидание подтверждения

```python
# Бот предложил запись
context.save_context(
    "awaiting_confirmation",
    {
        "question": "Записать вас на маникюр 25 ноября в 15:00?",
        "booking_details": {
            "service": "Маникюр",
            "master": "Jennifer",
            "date": "2025-11-25",
            "time": "15:00"
        }
    },
    expires_in_minutes=15
)

# ...клиент отвечает...

# Проверяем ответ
confirmation = context.get_context("awaiting_confirmation")
if confirmation and user_message.lower() in ["да", "yes", "конечно"]:
    # Создаем запись
    create_booking(confirmation["data"]["booking_details"])
    context.clear_context("awaiting_confirmation")
```

## 🔄 Автоматическая очистка

Истекшие контексты автоматически не учитываются при запросе.

Для физического удаления из БД (запускать периодически через cron):

```python
from services.conversation_context import cleanup_expired_contexts

# Удалить все истекшие контексты
deleted_count = cleanup_expired_contexts()
print(f"Удалено {deleted_count} истекших контекстов")
```

## ✅ Преимущества

- **Стейтфул диалоги**: Бот помнит контекст между сообщениями
- **Прерываемость**: Клиент может вернуться к диалогу позже
- **Гибкость**: Легко добавлять новые типы контекстов
- **Автоматическая очистка**: Старые контексты истекают сами
- **JSON данные**: Любая структура данных в контексте
- **Временные рамки**: Контроль срока жизни контекста

## 🎯 Best Practices

### 1. Используйте короткие TTL для подтверждений
```python
# Подтверждения истекают быстро (15 минут)
context.save_context("awaiting_confirmation", data, expires_in_minutes=15)

# Процессы записи живут дольше (30-60 минут)
context.save_context("booking_in_progress", data, expires_in_minutes=30)
```

### 2. Продлевайте срок при активности
```python
# Клиент активен - продлеваем контекст
context.update_context(
    "booking_in_progress",
    {"step": "next_step"},
    extend_expiry=True  # ← Важно!
)
```

### 3. Очищайте контекст после завершения
```python
# Запись создана - удаляем контекст
if booking_created:
    context.clear_context("booking_in_progress")
```

### 4. Проверяйте наличие перед использованием
```python
if context.has_context("booking_in_progress"):
    current = context.get_context("booking_in_progress")
    # Работаем с контекстом
```

### 5. Используйте типизированные ключи
```python
# Плохо
context.save_context("some_context", {...})

# Хорошо
CONTEXT_BOOKING = "booking_in_progress"
CONTEXT_CONFIRMATION = "awaiting_confirmation"
context.save_context(CONTEXT_BOOKING, {...})
```

## 🔧 Troubleshooting

### Контекст не найден

**Проблема:** `get_context()` возвращает `None`

**Решения:**
1. Проверить, что контекст не истек
2. Убедиться, что `client_id` правильный
3. Проверить, что `context_type` совпадает

### Контекст не продлевается

**Проблема:** Контекст истекает слишком быстро

**Решение:**
```python
# При каждом обновлении продлевайте срок
context.update_context(
    "booking_in_progress",
    update_data,
    extend_expiry=True,  # ← Обязательно
    expires_in_minutes=30
)
```

### Старые контексты засоряют БД

**Решение:** Настроить cron для очистки
```bash
# Каждый час удалять истекшие контексты
0 * * * * python3 -c "from services.conversation_context import cleanup_expired_contexts; cleanup_expired_contexts()"
```

---

**Создано:** 2025-11-16
**Версия:** 1.0
**Статус:** ✅ Полностью реализовано
