# 🔧 Исправление ошибок в тестах

## Проблема

При запуске тестов возникали ошибки duplicate key:
```
duplicate key value violates unique constraint "users_username_key"
DETAIL: Key (username)=(test_master_1768122160) already exists.
```

## Причина

Тесты создавали пользователей с фиксированными username на основе timestamp в секундах:
- `test_master_{timestamp}`
- `test_anna_{timestamp}`
- `test_schedule_user`

При быстрых повторных запусках или параллельном выполнении тестов timestamp был одинаковым, что вызывало конфликты.

## Решение

### 1. Создана утилита `test_utils.py`

Файл: [backend/tests/test_utils.py](backend/tests/test_utils.py:1)

Функция `create_test_user()`:
- ✅ Генерирует **уникальный** username с UUID: `test_master_{timestamp}_{uuid}`
- ✅ Автоматически **очищает** старые тестовые данные перед созданием нового пользователя
- ✅ **Предотвращает** duplicate key violations

```python
def create_test_user(username_prefix, full_name, role="employee", position="Stylist", is_service_provider=True):
    """
    Создает тестового пользователя с уникальным username.
    Автоматически очищает старых тестовых пользователей с таким префиксом.
    """
    unique_username = f"{username_prefix}_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"

    # Cleanup old test users
    c.execute(f"DELETE FROM users WHERE username LIKE '{username_prefix}_%'")

    # Create new user
    c.execute("""
        INSERT INTO users (username, password_hash, full_name, role, position, is_active, is_service_provider)
        VALUES (%s, 'dummy_hash', %s, %s, %s, TRUE, %s)
        RETURNING id
    """, (unique_username, full_name, role, position, is_service_provider))

    return user_id
```

### 2. Исправлены тестовые файлы

#### ✅ test_detailed.py
**Было:**
```python
unique_username = f"test_detailed_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
c.execute("DELETE FROM users WHERE username LIKE 'test_detailed_%'")
c.execute("""INSERT INTO users...""")
```

**Стало:**
```python
from tests.test_utils import create_test_user
user_id = create_test_user("test_detailed", test_master, "employee", "Stylist")
```

#### ✅ test_new_features.py
**Было:**
```python
c.execute("""
    INSERT INTO users (username, ...)
    VALUES (%s, ...)
""", (f"test_anna_{int(datetime.now().timestamp())}", test_master, ...))
```

**Стало:**
```python
from tests.test_utils import create_test_user
user_id = create_test_user("test_anna", test_master, "employee", "Stylist")
```

#### ✅ test_schedule.py
**Было:**
```python
cursor.execute("""
    INSERT INTO users (username, ...)
    VALUES (%s, ...)
""", ('test_schedule_user', 'hash', ...))
```

**Стало:**
```python
from tests.test_utils import create_test_user
user_id = create_test_user("test_schedule_user", "Test Schedule User", "employee", "Stylist")
```

## Результат

### До исправления
```
❌ duplicate key value violates unique constraint "users_username_key"
❌ DETAIL: Key (username)=(test_master_1768122160) already exists.
❌ День 0: не удалось установить
❌ День 1: не удалось установить
```

### После исправления
```
✅ Тестовый пользователь создан: test_master_1768122160_a3f5b8c9
✅ День 0 (ПН-ПТ): 10:30-21:30
✅ День 1 (ПН-ПТ): 10:30-21:30
✅ День 2 (ПН-ПТ): 10:30-21:30
```

## Дополнительные функции

### cleanup_test_users(username_prefix)
Удаляет всех тестовых пользователей с заданным префиксом:
```python
from tests.test_utils import cleanup_test_users
cleanup_test_users("test_master")  # Удалит всех пользователей test_master_*
```

### cleanup_all_test_users()
Удаляет всех пользователей, начинающихся с 'test_':
```python
from tests.test_utils import cleanup_all_test_users
deleted_count = cleanup_all_test_users()
print(f"Удалено {deleted_count} тестовых пользователей")
```

## Рекомендации

1. **Всегда используйте** `create_test_user()` вместо прямых INSERT запросов в тестах
2. **Очищайте** тестовые данные после завершения тестов
3. **Используйте** уникальные префиксы для разных тестов (test_master, test_anna, test_schedule и т.д.)

## Файлы, требующие внимания

Если в будущем добавляются новые тесты, проверьте эти файлы:
- `backend/tests/test_employee_management.py`
- `backend/tests/setup_test_notifications.py`
- `backend/tests/test_broadcasts_and_reminders.py`

Убедитесь, что они также используют `create_test_user()` из `test_utils.py`.
