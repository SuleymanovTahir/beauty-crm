# Инструкция по интеграции Email Verification для клиентов

## Что реализовано

### ✅ CRM Users (Сотрудники/Менеджеры/Админы)

- **Email verification**: КОД на почту (6 цифр)
- **Admin approval**: Обязательно после email verification
- **Flow**: Регистрация → Email код → Подтверждение email → Ожидание админа → вход

### ✅ Clients (Клиенты личного кабинета)

- **Email verification**: КОД на почту (6 цифр)
- **Admin approval**: НЕ требуется!
- **Flow**: Регистрация → Email код → Подтверждение email → Вход

---

## Файлы для интеграции

### 1. Добавить в `client_auth.py`

Скопировать код из файла `client_email_verification_endpoints.py` и вставить в `backend/api/client_auth.py`:

```python
# После ClientLogin class добавить:
class VerifyClientEmailRequest(BaseModel):
    email: str
    code: str

# После register_client endpoint добавить 2 новых endpoint:
# 1. verify_client_email() - из строки 12
# 2. resend_client_verification() - из строки 141
```

### 2. Обновить `login_client` endpoint

В `client_auth.py` найти функцию `login_client` и добавить проверку email verification:

```python
@router.post("/login")
async def login_client(data: ClientLogin):
    """Вход клиента"""
    client = get_client_by_email(data.email)

    if not client:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    instagram_id, email, password_hash, name, phone, birthday, created_at, last_login, is_verified = client

    # Проверяем пароль
    if hash_password(data.password) != password_hash:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    # ====== ДОБАВИТЬ ЭТУ ПРОВЕРКУ ======
    if not is_verified:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Email не подтвержден",
                "error_type": "email_not_verified",
                "email": email,
                "message": "Пожалуйста, подтвердите ваш email"
            }
        )
    # ==================================

    # Остальной код без изменений...
```

### 3. Проверить функцию `get_client_by_email`

Убедиться что она возвращает `is_verified`:

```python
def get_client_by_email(email: str):
    conn = get_db_connection()
    c = conn.cursor()

    # Проверяем есть ли колонка is_verified
    c.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name='clients' AND column_name='is_verified'
    """)
    has_is_verified = c.fetchone() is not None

    if has_is_verified:
        c.execute("""
            SELECT instagram_id, email, password_hash, name, phone, birthday,
                   created_at, last_login, is_verified
            FROM clients
            WHERE LOWER(email) = LOWER(%s)
        """, (email,))
    else:
        # Если колонки нет - считаем всех верифицированными (обратная совместимость)
        c.execute("""
            SELECT instagram_id, email, password_hash, name, phone, birthday,
                   created_at, last_login, TRUE as is_verified
            FROM clients
            WHERE LOWER(email) = LOWER(%s)
        """, (email,))

    result = c.fetchone()
    conn.close()
    return result
```

---

## Frontend Integration

### Client Login/Register Pages

**Местонахождение**: Проверить есть ли отдельные страницы для клиентов:

- `frontend/src/pages/client/Login.tsx`
- `frontend/src/pages/client/Register.tsx`

Если НЕТ - использовать те же страницы что и для CRM users (они уже готовы):

- `frontend/src/pages/auth/Login.tsx` ✅ (готов)
- `frontend/src/pages/auth/Register.tsx` ✅ (готов с verification flow)

**Важно**: В Register.tsx уже есть 3-step flow:

1. Register form
2. Verify code input
3. Success message

Просто убедиться что API endpoint для клиентов правильный:

```typescript
// В api.ts или аналогичном файле
export const registerClient = async (data) => {
  return await fetch("/client/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const verifyClientEmail = async (email, code) => {
  return await fetch("/client/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
};
```

---

## Database Migration (если нужно)

Если в таблице `clients` нет колонок для verification:

```sql
ALTER TABLE clients
ADD COLUMN is_verified BOOLEAN DEFAULT TRUE,
ADD COLUMN verification_code VARCHAR(10),
ADD COLUMN verification_code_expires TIMESTAMP;

-- Для новых клиентов будет is_verified=FALSE
-- Старые клиенты останутся is_verified=TRUE (обратная совместимость)
```

Или использовать готовую миграцию `create_email_verification_tables.py` - она создаст таблицу `client_email_verifications`.

---

## Testing

### 1. Тест регистрации клиента

```bash
curl -X POST http://localhost:8000/client/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test Client",
    "phone": "+1234567890"
  }'

# Response:
# {
#   "success": true,
#   "message": "Регистрация успешна! Код верификации отправлен на вашу почту.",
#   "client_id": "web_...",
#   "verification_code": "123456"  // только в development
# }
```

### 2. Тест верификации email

```bash
curl -X POST http://localhost:8000/client/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'

# Response:
# {
#   "success": true,
#   "message": "Email подтвержден! Добро пожаловать!"
# }
```

### 3. Тест входа (до верификации - должна быть ошибка)

```bash
curl -X POST http://localhost:8000/client/login \
  -H "Content-Type": application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Response (до verify):
# {
#   "detail": {
#     "error": "Email не подтвержден",
#     "error_type": "email_not_verified",
#     "email": "test@example.com"
#   }
# }

# Response (после verify):
# {
#   "success": true,
#   "token": "...",
#   "client": {...}
# }
```

---

## Краткий checklist

- [ ] Скопировать endpoints из `client_email_verification_endpoints.py` в `client_auth.py`
- [ ] Обновить `login_client` - добавить проверку `is_verified`
- [ ] Проверить `get_client_by_email` - возвращает `is_verified`
- [ ] Запустить миграцию БД (если нужно)
- [ ] Проверить что frontend использует правильные endpoints
- [ ] Протестировать full flow: register → verify → login

---

## Отличия от CRM users

| Параметр           | CRM Users       | Clients                |
| ------------------ | --------------- | ---------------------- |
| Email verification | ✅ КОД          | ✅ КОД                 |
| Admin approval     | ✅ Требуется    | ❌ НЕ требуется        |
| После email verify | Ожидание админа | Сразу вход             |
| Бонусы             | Нет             | 100 points при verify  |
| Уведомления        | Админам         | Приветственное клиенту |

Это сделано! 🎉
