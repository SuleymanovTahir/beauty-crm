# Анализ системы разделения прав и возможностей

## 📊 Текущая система ролей

### Иерархия ролей (от высшего к низшему)

| Роль         | Название           | Уровень | Может управлять                           |
| ------------ | ------------------ | ------- | ----------------------------------------- |
| **director** | Директор           | 100     | admin, manager, sales, marketer, employee |
| **admin**    | Администратор      | 80      | manager, sales, marketer, employee        |
| **manager**  | Менеджер           | 60      | -                                         |
| **sales**    | Продажник          | 40      | -                                         |
| **marketer** | Таргетолог         | 30      | -                                         |
| **employee** | Сотрудник (мастер) | 20      | -                                         |

---

## ✅ Что работает правильно

### 1. Backend - Защита эндпоинтов

#### ✅ Критичные операции (только director)

```python
# main.py - Миграции
if user["role"] != 'director':
    return JSONResponse({"error": "Forbidden"}, status_code=403)

# main.py - Диагностика
if user["role"] != 'director':
    return JSONResponse({"error": "Forbidden"}, status_code=403)

# permissions.py - Кастомные права
if user["role"] != "director":
    raise HTTPException(status_code=403)
```

#### ✅ Административные операции (director + admin)

```python
# employees.py - Управление сотрудниками
if user["role"] not in ["admin", "director"]:
    raise HTTPException(status_code=403)

# gallery.py - Управление галереей
if user["role"] not in ["admin", "director"]:
    raise HTTPException(status_code=403)

# visitor_analytics.py - Аналитика посетителей
if user["role"] not in ["admin", "director"]:
    raise HTTPException(status_code=403)
```

#### ✅ Менеджерские операции (director + admin + manager)

```python
# loyalty.py - Программы лояльности
if user["role"] not in ["admin", "manager", "director"]:
    raise HTTPException(status_code=403)
```

### 2. Система прав (RBAC)

#### ✅ Определение прав по ролям

```python
ROLES = {
    'director': {
        'permissions': '*',  # ВСЕ ПРАВА
        'can_manage_roles': ['admin', 'manager', 'sales', 'marketer', 'employee']
    },
    'admin': {
        'permissions': [
            'clients_view', 'clients_create', 'clients_edit',
            'bookings_view', 'bookings_create', 'bookings_edit',
            'users_view', 'users_create',
            'analytics_view_anonymized'
        ]
    },
    'employee': {
        'permissions': [
            'bookings_view_own',  # Только свои записи
            'calendar_view_own',   # Только свой календарь
            'clients_view_own'     # Только свои клиенты
        ]
    }
}
```

#### ✅ Проверка прав

```python
def has_permission(user_role: str, permission: str) -> bool:
    role_data = ROLES.get(user_role, {})
    permissions = role_data.get('permissions', [])

    if permissions == '*':  # Director имеет все права
        return True

    return permission in permissions
```

---

## ⚠️ Найденные проблемы

### 1. **КРИТИЧНО**: Отсутствие проверки прав на некоторых эндпоинтах

#### ❌ Проблема: Аналитика доступна всем авторизованным

```python
# api/analytics.py
@router.get("/analytics/revenue")
async def get_revenue_analytics(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if user["role"] == "client":  # Блокируем только клиентов!
        raise HTTPException(status_code=403)
    # ⚠️ employee, sales, marketer могут видеть всю аналитику!
```

**Должно быть:**

```python
if user["role"] not in ["admin", "director", "manager"]:
    raise HTTPException(status_code=403)
```

### 2. **СРЕДНЕ**: Нет проверки прав на frontend

#### ❌ Проблема: Меню отображается для всех

Frontend не скрывает пункты меню в зависимости от роли. Хотя backend защищен, пользователь видит недоступные разделы и получает ошибку 403.

**Рекомендация:** Добавить проверку роли на frontend:

```typescript
// Пример для AdminLayout.tsx
const canViewAnalytics = ["admin", "director", "manager"].includes(user.role);
const canManageUsers = ["admin", "director"].includes(user.role);

{
  canViewAnalytics && <Link to="/crm/analytics">Аналитика</Link>;
}
```

### 3. **НИЗКО**: Нет логирования изменений прав

#### ⚠️ Проблема: Изменения ролей не логируются в отдельную таблицу

```python
# permissions.py - есть log_info, но нет записи в audit_log
log_info(f"User {user['username']} changed role...", "permissions")
```

**Рекомендация:** Создать таблицу `audit_log` для отслеживания:

- Кто изменил права
- Какому пользователю
- Старая и новая роль
- Дата и время

---

## 🔒 Рекомендации по улучшению

### Приоритет 1: КРИТИЧНО - Исправить аналитику

<parameter name="Complexity">8
