# 🔍 Дополнительный аудит системы прав - Фильтрация данных

**Дата:** 2026-01-08  
**Статус:** ⚠️ ТРЕБУЕТ ВНИМАНИЯ

---

## 📋 Проверка фильтрации данных для employee

### ✅ Что работает ПРАВИЛЬНО

#### 1. Записи (Bookings) - ФИЛЬТРАЦИЯ РАБОТАЕТ

**Файл:** `api/bookings.py` (строки 134-140)

```python
@router.get("/bookings")
async def list_bookings(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)

    # ✅ Employee видит только свои записи
    if user["role"] == "employee":
        full_name = user.get("full_name", "")
        bookings = get_bookings_by_master(full_name)
    else:
        bookings = get_all_bookings()
```

**Статус:** ✅ РАБОТАЕТ КОРРЕКТНО

---

### ⚠️ Что НЕ работает (требует исправления)

#### 1. Клиенты (Clients) - ФИЛЬТРАЦИЯ ОТСУТСТВУЕТ

**Файл:** `api/clients.py` (строка 94)

**Проблема:**

```python
@router.get("/clients")
async def list_clients(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)

    # ⚠️ НЕТ ПРОВЕРКИ РОЛИ!
    # Employee видит ВСЕХ клиентов
    clients = get_clients_by_messenger(messenger)
    return {"clients": clients}
```

**Должно быть:**

```python
@router.get("/clients")
async def list_clients(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)

    # Проверка роли
    if user["role"] == "employee":
        # Employee видит только клиентов, у которых есть записи к нему
        full_name = user.get("full_name", "")
        clients = get_clients_by_master(full_name)
    else:
        # Admin/Manager видят всех
        clients = get_clients_by_messenger(messenger)

    return {"clients": clients}
```

**Функция для добавления:**

```python
# db/clients.py
def get_clients_by_master(master_name: str):
    """Получить клиентов конкретного мастера"""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        SELECT DISTINCT c.*
        FROM clients c
        INNER JOIN bookings b ON c.instagram_id = b.instagram_id
        WHERE b.master = %s
        ORDER BY c.last_contact DESC
    """, (master_name,))

    clients = c.fetchall()
    conn.close()
    return clients
```

---

#### 2. Календарь - ТРЕБУЕТ ПРОВЕРКИ

**Файл:** `api/calendar.py` (если существует)

**Проблема:**  
Employee с правом `calendar_view_own` должен видеть только свой календарь, но может видеть календари всех мастеров.

**Рекомендация:**  
Проверить эндпоинты календаря и добавить фильтрацию.

---

#### 3. Детали клиента - ТРЕБУЕТ ПРОВЕРКИ

**Файл:** `api/clients.py`

**Проблема:**  
Employee может открыть детали ЛЮБОГО клиента по прямой ссылке `/api/clients/{id}`, даже если у него нет записей к этому мастеру.

**Рекомендация:**

```python
@router.get("/clients/{client_id}")
async def get_client_detail(client_id: str, session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)

    # Проверка для employee
    if user["role"] == "employee":
        # Проверяем, есть ли у этого клиента записи к данному мастеру
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT COUNT(*) FROM bookings
            WHERE instagram_id = %s AND master = %s
        """, (client_id, user.get("full_name")))

        if c.fetchone()[0] == 0:
            conn.close()
            raise HTTPException(status_code=403, detail="Access denied")
        conn.close()

    # Получаем данные клиента
    client = get_client_by_id(client_id)
    return client
```

---

## 📊 Матрица доступа к данным (ОБНОВЛЕНО)

### Клиенты

| Операция       | director | admin | manager | employee           | sales | marketer |
| -------------- | -------- | ----- | ------- | ------------------ | ----- | -------- |
| Просмотр всех  | ✅       | ✅    | ✅      | ❌                 | ❌    | ❌       |
| Просмотр своих | ✅       | ✅    | ✅      | ⚠️ **НЕ РАБОТАЕТ** | ❌    | ❌       |
| Создание       | ✅       | ✅    | ✅      | ❌                 | ❌    | ❌       |
| Редактирование | ✅       | ✅    | ✅      | ❌                 | ❌    | ❌       |
| Удаление       | ✅       | ✅    | ❌      | ❌                 | ❌    | ❌       |

### Записи (Bookings)

| Операция          | director | admin | manager | employee                | sales | marketer |
| ----------------- | -------- | ----- | ------- | ----------------------- | ----- | -------- |
| Просмотр всех     | ✅       | ✅    | ✅      | ❌                      | ❌    | ❌       |
| Просмотр своих    | ✅       | ✅    | ✅      | ✅ **РАБОТАЕТ**         | ❌    | ❌       |
| Создание          | ✅       | ✅    | ✅      | ❌                      | ❌    | ❌       |
| Редактирование    | ✅       | ✅    | ✅      | ❌                      | ❌    | ❌       |
| Изменение статуса | ✅       | ✅    | ✅      | ⚠️ **ТРЕБУЕТ ПРОВЕРКИ** | ❌    | ❌       |

### Календарь

| Операция        | director | admin | manager | employee                | sales | marketer |
| --------------- | -------- | ----- | ------- | ----------------------- | ----- | -------- |
| Просмотр всех   | ✅       | ✅    | ✅      | ❌                      | ❌    | ❌       |
| Просмотр своего | ✅       | ✅    | ✅      | ⚠️ **ТРЕБУЕТ ПРОВЕРКИ** | ❌    | ❌       |

---

## 🔧 План исправления

### Приоритет 1: ВАЖНО (2-3 часа)

#### Исправить фильтрацию клиентов для employee

**Шаг 1:** Добавить функцию в `db/clients.py`

```python
def get_clients_by_master(master_name: str):
    """Получить клиентов конкретного мастера"""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        SELECT DISTINCT c.*
        FROM clients c
        INNER JOIN bookings b ON c.instagram_id = b.instagram_id
        WHERE b.master = %s
        ORDER BY c.last_contact DESC
    """, (master_name,))

    clients = c.fetchall()
    conn.close()
    return clients
```

**Шаг 2:** Обновить `api/clients.py`

```python
@router.get("/clients")
async def list_clients(
    session_token: Optional[str] = Cookie(None),
    messenger: Optional[str] = Query('instagram')
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    # Фильтрация для employee
    if user["role"] == "employee":
        from db.clients import get_clients_by_master
        full_name = user.get("full_name", "")
        clients = get_clients_by_master(full_name)
    else:
        # Admin/Manager видят всех
        clients = get_clients_by_messenger(messenger)

    return {"clients": [format_client(c) for c in clients]}
```

**Шаг 3:** Защитить детали клиента

```python
@router.get("/clients/{client_id}")
async def get_client_detail(client_id: str, session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)

    # Проверка для employee
    if user["role"] == "employee":
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT COUNT(*) FROM bookings
            WHERE instagram_id = %s AND master = %s
        """, (client_id, user.get("full_name")))

        has_access = c.fetchone()[0] > 0
        conn.close()

        if not has_access:
            log_warning(f"Employee {user['username']} attempted to access client {client_id}", "security")
            raise HTTPException(status_code=403, detail="Access denied")

    client = get_client_by_id(client_id)
    return client
```

---

### Приоритет 2: ЖЕЛАТЕЛЬНО (1-2 часа)

#### Проверить и исправить календарь

**Файлы для проверки:**

- `api/calendar.py`
- `api/schedule.py`

**Логика:**

- Employee должен видеть только свой календарь
- Фильтровать события по `master = user.full_name`

---

### Приоритет 3: МОЖНО ПОЗЖЕ (1 час)

#### Добавить проверку изменения статуса записи

**Файл:** `api/bookings.py`

**Логика:**

```python
@router.post("/bookings/{booking_id}/status")
async def update_booking_status_api(booking_id: int, ...):
    user = require_auth(session_token)

    # Employee может менять статус только своих записей
    if user["role"] == "employee":
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT master FROM bookings WHERE id = %s", (booking_id,))
        row = c.fetchone()
        conn.close()

        if not row or row[0] != user.get("full_name"):
            raise HTTPException(status_code=403, detail="Access denied")

    # Обновляем статус
    ...
```

---

## 🎯 Тест-кейсы

### Тест 1: Employee пытается получить всех клиентов

```bash
# Логин как employee (мастер "Иван")
curl -X GET "http://localhost:8000/api/clients" \
  -H "Cookie: session_token=EMPLOYEE_TOKEN"

# Ожидаемый результат:
# Только клиенты с записями к мастеру "Иван"
# НЕ должны показываться клиенты других мастеров
```

### Тест 2: Employee пытается открыть чужого клиента

```bash
# Логин как employee
curl -X GET "http://localhost:8000/api/clients/client_123" \
  -H "Cookie: session_token=EMPLOYEE_TOKEN"

# Если у client_123 НЕТ записей к этому мастеру:
# Status: 403 Forbidden
# Log: ⚠️ Employee ivan_master attempted to access client client_123
```

### Тест 3: Employee получает свои записи

```bash
# Логин как employee
curl -X GET "http://localhost:8000/api/bookings" \
  -H "Cookie: session_token=EMPLOYEE_TOKEN"

# Ожидаемый результат:
# Status: 200 OK
# Только записи где master = "Иван"
```

---

## 📈 Итоговая оценка безопасности (ОБНОВЛЕНО)

| Аспект                         | Оценка         | Комментарий           |
| ------------------------------ | -------------- | --------------------- |
| **Архитектура RBAC**           | ✅ Отлично     | Четкая иерархия       |
| **Backend защита (аналитика)** | ✅ Отлично     | Исправлено            |
| **Backend защита (данные)**    | ⚠️ Хорошо      | Записи ✅, Клиенты ❌ |
| **Frontend UX**                | ⚠️ Хорошо      | Можно улучшить        |
| **Audit trail**                | ❌ Отсутствует | Рекомендовано         |

### Общая оценка: **8/10** (Хорошо) ⬇️ было 9/10

**Критичные проблемы:** 0  
**Средние проблемы:** 3 ⬆️ (было 2)

- ⚠️ Employee видит всех клиентов (НОВАЯ)
- ⚠️ Frontend показывает недоступные разделы
- ⚠️ Нет защиты деталей клиента

**Низкие проблемы:** 1

- Нет audit log

---

## 📝 Выводы

### Что исправлено ✅

1. Аналитика - доступ ограничен (admin, director, manager)
2. Записи - employee видит только свои
3. Логирование попыток несанкционированного доступа

### Что требует исправления ⚠️

1. **Клиенты** - employee видит всех клиентов (должен видеть только своих)
2. **Детали клиента** - нет проверки доступа
3. **Календарь** - требует проверки фильтрации

### Рекомендации

1. **СРОЧНО**: Исправить фильтрацию клиентов (2-3 часа)
2. **ВАЖНО**: Добавить защиту деталей клиента (1 час)
3. **ЖЕЛАТЕЛЬНО**: Проверить календарь (1-2 часа)

---

**Следующий шаг:** Исправить фильтрацию клиентов для employee
