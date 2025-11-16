# Тестирование Рассылок и Напоминаний

## Обзор

Этот документ описывает как протестировать:
1. **Акционные рассылки** на email `ii3391609@gmail.com`
2. **Напоминания в Instagram** для пользователя `@stz_192`

---

## Предварительные требования

1. **База данных должна быть инициализирована**
   ```bash
   cd backend
   python3 db/migrations/run_all_migrations.py
   ```

2. **Сервер должен быть запущен**
   ```bash
   cd backend
   python3 main.py
   # или
   uvicorn main:app --reload
   ```

---

## Тест 1: Акционные рассылки на Email

### Шаг 1: Создание тестового пользователя

Выполните через API или базу данных:

```sql
-- 1. Создать пользователя с тестовым email
INSERT INTO users (
    username, email, password_hash, full_name, role,
    is_active, email_verified, created_at
)
VALUES (
    'test_broadcast',
    'ii3391609@gmail.com',
    'test_hash',
    'Тестовый Пользователь',
    'client',
    1,
    1,
    datetime('now')
);

-- 2. Получить ID пользователя
SELECT id FROM users WHERE email = 'ii3391609@gmail.com';

-- 3. Создать подписку на акции
INSERT INTO user_subscriptions (
    user_id, subscription_type, is_subscribed,
    email_enabled, telegram_enabled, instagram_enabled,
    created_at
)
VALUES (
    1,  -- Замените на реальный ID из шага 2
    'promotions',
    1,
    1,
    0,
    0,
    datetime('now')
);
```

### Шаг 2: Отправка тестовой рассылки

**Через API (рекомендуется):**

```bash
curl -X POST http://localhost:8000/api/broadcasts/send \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=YOUR_SESSION_TOKEN" \
  -d '{
    "subscription_type": "promotions",
    "channels": ["email"],
    "subject": "🎉 Специальное предложение!",
    "message": "Здравствуйте!\n\nУ нас для вас отличная новость!\n\n🎁 Только сегодня - скидка 30% на все услуги!\n\nУспейте записаться по телефону или через Instagram.\n\nС уважением,\nКоманда Beauty CRM"
  }'
```

**Через Python скрипт:**

```python
import requests

# Авторизуйтесь и получите session_token
response = requests.post('http://localhost:8000/api/broadcasts/send',
    headers={'Cookie': 'session_token=YOUR_TOKEN'},
    json={
        "subscription_type": "promotions",
        "channels": ["email"],
        "subject": "🎉 Специальное предложение!",
        "message": "Ваше сообщение здесь..."
    }
)

print(response.json())
```

### Шаг 3: Проверка результата

**Email должен быть отправлен на `ii3391609@gmail.com`**

Проверьте:
1. Папку "Входящие"
2. Папку "Спам" (если не пришло)
3. Логи backend:
   ```bash
   tail -f logs/app.log | grep broadcast
   ```

### Шаг 4: Просмотр истории рассылок

```bash
curl http://localhost:8000/api/broadcasts/history \
  -H "Cookie: session_token=YOUR_SESSION_TOKEN"
```

---

## Тест 2: Напоминания в Instagram для @stz_192

### Шаг 1: Создание клиента

```sql
-- 1. Создать или найти клиента @stz_192
INSERT INTO clients (
    instagram_id, username, name, phone,
    first_contact, last_contact, total_messages,
    status, created_at
)
VALUES (
    'stz_192_id',
    'stz_192',
    'Тестовый Клиент',
    '+79991234567',
    datetime('now'),
    datetime('now'),
    0,
    'active',
    datetime('now')
);

-- 2. Получить instagram_id
SELECT instagram_id FROM clients WHERE username = 'stz_192';
```

### Шаг 2: Создание напоминания

**Через API:**

```bash
curl -X POST http://localhost:8000/api/reminders \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=YOUR_SESSION_TOKEN" \
  -d '{
    "client_id": "stz_192_id",
    "title": "Напомнить о записи",
    "description": "Напомнить клиенту о записи на завтра",
    "reminder_date": "2025-11-17T10:00:00",
    "reminder_type": "booking"
  }'
```

**Через SQL:**

```sql
INSERT INTO reminders (
    client_id, title, description, reminder_date,
    reminder_type, is_completed, created_by, created_at
)
VALUES (
    'stz_192_id',
    'Напомнить о записи',
    'Напомнить клиенту о записи на завтра в 14:00',
    datetime('now', '+1 day'),
    'booking',
    0,
    'admin',
    datetime('now')
);
```

### Шаг 3: Просмотр напоминаний

**Все напоминания для клиента:**

```bash
curl "http://localhost:8000/api/reminders?client_id=stz_192_id" \
  -H "Cookie: session_token=YOUR_SESSION_TOKEN"
```

**Предстоящие напоминания (на 7 дней):**

```bash
curl "http://localhost:8000/api/reminders?upcoming=true" \
  -H "Cookie: session_token=YOUR_SESSION_TOKEN"
```

### Шаг 4: Отправка напоминания в Instagram

**ВАЖНО:** Для отправки в Instagram нужно:

1. Настроить Instagram Graph API в `integrations/instagram.py`
2. Убедиться что у клиента есть активный диалог
3. Иметь валидный access token

**Пример кода отправки:**

```python
from integrations.instagram import send_instagram_dm

# Отправить напоминание
message = """
Здравствуйте! Напоминаем о вашей записи:

📅 Дата: 17 ноября 2025
🕐 Время: 14:00
💅 Услуга: Маникюр

Ждем вас!
"""

try:
    send_instagram_dm('stz_192', message)
    print("✅ Напоминание отправлено")
except Exception as e:
    print(f"❌ Ошибка: {e}")
```

### Шаг 5: Отметить напоминание как выполненное

```bash
curl -X PUT "http://localhost:8000/api/reminders/1/complete" \
  -H "Cookie: session_token=YOUR_SESSION_TOKEN"
```

---

## Автоматический тест

Для быстрого тестирования используйте готовый скрипт:

```bash
cd backend/tests
python3 test_broadcasts_and_reminders.py
```

**Что делает скрипт:**
1. Проверяет/создает таблицы
2. Создает тестового пользователя с email `ii3391609@gmail.com`
3. Настраивает подписку на акции
4. Создает тестового клиента `@stz_192`
5. Создает тестовое напоминание
6. Выводит инструкции по использованию API

---

## Настройка Email (SMTP)

Для отправки email нужно настроить SMTP в `utils/email.py`:

```python
# Пример конфигурации
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "your-email@gmail.com"
SMTP_PASSWORD = "your-app-password"
```

**Для Gmail:**
1. Включите 2FA в аккаунте Google
2. Создайте App Password: https://myaccount.google.com/apppasswords
3. Используйте App Password вместо обычного пароля

---

## Настройка Instagram API

Для отправки сообщений в Instagram через Graph API:

1. **Создать Facebook App**
   - https://developers.facebook.com/apps/

2. **Получить Instagram Business Account**
   - Привязать к Facebook странице

3. **Получить Access Token**
   - С правами `instagram_basic`, `instagram_manage_messages`

4. **Настроить в `integrations/instagram.py`**
   ```python
   INSTAGRAM_ACCESS_TOKEN = "your_access_token"
   INSTAGRAM_ACCOUNT_ID = "your_account_id"
   ```

---

## Troubleshooting

### Email не отправляется

1. **Проверьте SMTP настройки** в `utils/email.py`
2. **Проверьте логи:**
   ```bash
   tail -f logs/app.log | grep email
   ```
3. **Проверьте что user.email_verified = 1**

### Instagram сообщения не отправляются

1. **Проверьте access token:**
   ```bash
   curl "https://graph.instagram.com/me?access_token=YOUR_TOKEN"
   ```
2. **Проверьте что есть активный диалог с клиентом**
3. **Проверьте rate limits** (не более 1 сообщения в 5 секунд)

### Напоминания не появляются

1. **Проверьте таблицу reminders:**
   ```sql
   SELECT * FROM reminders WHERE client_id = 'stz_192_id';
   ```
2. **Проверьте формат даты:** должен быть ISO 8601 (`2025-11-17T14:00:00`)

---

## Полезные SQL запросы

```sql
-- Все подписки на рассылки
SELECT u.email, us.subscription_type, us.email_enabled
FROM users u
JOIN user_subscriptions us ON u.id = us.user_id
WHERE us.is_subscribed = 1;

-- Все предстоящие напоминания
SELECT c.username, r.title, r.reminder_date
FROM reminders r
JOIN clients c ON r.client_id = c.instagram_id
WHERE r.is_completed = 0
ORDER BY r.reminder_date ASC;

-- История рассылок
SELECT created_at, subject, total_sent, results
FROM broadcast_history
ORDER BY created_at DESC
LIMIT 10;
```

---

## Результаты теста

После успешного тестирования вы должны:

✅ Получить email на `ii3391609@gmail.com` с акционным предложением
✅ Увидеть напоминание для `@stz_192` в системе
✅ (Опционально) Отправить напоминание в Instagram DM

---

*Последнее обновление: 2025-11-16*
