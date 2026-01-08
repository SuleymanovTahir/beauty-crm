# Анализ прав доступа для роли "Продажник" (Sales)

## Текущие права роли Sales (ОБНОВЛЕНО)

Согласно `frontend/src/utils/permissions.ts` и `backend/core/config.py`, роль **sales** имеет следующие права:

```typescript
sales: {
  name: 'Продажник',
  permissions: [
    'instagram_chat_view',           // Просмотр Instagram чата
    'clients_view_limited',          // Ограниченный просмотр клиентов
    'analytics_view_stats_only',     // Только статистика (без финансов)
    'staff_chat_own',                // Внутренняя связь
    'calendar_view_all',             // ✅ ОБНОВЛЕНО: Полный доступ к календарю
    'bot_settings_view',             // Просмотр настроек бота
    'bookings_create',               // ✅ ДОБАВЛЕНО: Право создавать записи
    'bookings_view',                 // ✅ ДОБАВЛЕНО: Право просматривать записи
    'telephony_access',              // ✅ ДОБАВЛЕНО: Доступ к телефонии
  ],
  can_manage_roles: [],              // Не может управлять ролями
  hierarchy_level: 40,               // Уровень 40 (ниже manager=60, admin=80, director=100)
}
```

## Что ДОСТУПНО продажнику

### ✅ Доступные разделы меню:

1. **Мои клиенты** (Dashboard для Sales) - `/sales/clients`
   - Видит ограниченный список клиентов
   - Может работать только со своими клиентами

2. **✅ Календарь** - `/sales/calendar` **(ОБНОВЛЕНО)**
   - Полный доступ к календарю всех сотрудников
   - Может просматривать и создавать записи

3. **✅ Записи** - `/sales/bookings` **(ДОБАВЛЕНО)**
   - Может просматривать все записи
   - Может создавать новые записи для клиентов

4. **Задачи** - `/sales/tasks`
   - Может просматривать и создавать задачи

5. **Чат** - `/sales/chat`
   - Доступ к Instagram чату
   - Может общаться с клиентами через мессенджеры

6. **Профиль** - `/sales/profile`
   - Свой профиль

7. **Воронка** - `/sales/funnel`
   - Может видеть воронку продаж

8. **Рассылки** - `/sales/broadcasts`
   - Может отправлять рассылки клиентам

9. **✅ Телефония** - `/sales/telephony` **(ДОБАВЛЕНО)**
   - Может звонить клиентам
   - Доступ к истории звонков

10. **Внутренняя связь** - `/sales/internal-chat`
    - Общение с коллегами

11. **Настройки** - `/sales/settings`
    - Ограниченные настройки (свой профиль, язык и т.д.)

12. **Настройки бота** - `/sales/bot-settings`
    - Может просматривать настройки бота

## Что НЕ ДОСТУПНО продажнику (и должно быть скрыто)

### ❌ Разделы, которые НЕ должны быть видны:

#### 1. **✅ Календарь** (`/sales/calendar`) - **РЕШЕНО**
**Статус:** ✅ Теперь ДОСТУПЕН с полными правами
```typescript
requirePermission: () => permissions.canViewAllCalendars && user?.role !== 'employee'
```
**Изменения:**
- Изменили `calendar_view_all_readonly` → `calendar_view_all`
- Продажник теперь может просматривать календарь и создавать записи

#### 2. **Клиенты** (`/sales/clients`)
**Проблема:** Сейчас скрыт из основного меню
```typescript
requirePermission: () => permissions.canViewAllClients && user?.role !== 'sales'
```
**Статус:** ✅ Правильно настроено (скрыто)

#### 3. **Услуги** (`/sales/services`)
**Проблема:** Продажник не должен редактировать услуги
```typescript
requirePermission: () => permissions.canViewServices
```
**Статус:** ❌ Сейчас НЕТ прав у sales (нет 'services_view')
**Рекомендация:** ✅ Правильно

#### 4. **Пользователи** (`/sales/users`)
**Проблема:** Продажник не должен управлять сотрудниками
```typescript
requirePermission: () => permissions.canViewAllUsers
```
**Статус:** ❌ Сейчас НЕТ прав (только director, admin)
**Рекомендация:** ✅ Правильно

#### 5. **Аналитика** (`/sales/analytics`)
**Проблема:** Полная финансовая аналитика не должна быть доступна
```typescript
requirePermission: () => permissions.canViewAnalytics && user?.role !== 'marketer' && user?.role !== 'sales'
```
**Статус:** ✅ Правильно скрыто (только admin, director, manager)
**Рекомендация:** Продажник должен видеть только свою статистику (не финансы)

#### 6. **Посетители** (`/sales/visitor-analytics`)
**Проблема:** Аналитика сайта не нужна продажнику
```typescript
requirePermission: () => permissions.canViewAnalytics
```
**Статус:** ❌ Сейчас НЕТ доступа
**Рекомендация:** ✅ Правильно

#### 7. **Публичный контент** (`/sales/public-content`)
**Проблема:** Продажник не должен редактировать контент сайта
```typescript
requirePermission: () => permissions.canViewSettings && permissions.roleLevel >= 80
```
**Статус:** ❌ Сейчас НЕТ доступа (roleLevel sales = 40)
**Рекомендация:** ✅ Правильно

#### 8. **✅ Телефония** (`/sales/telephony`) - **РЕШЕНО**
**Статус:** ✅ Теперь ДОСТУПНА
```typescript
requirePermission: () => permissions.roleLevel >= 80 || user?.role === 'sales'
```
**Изменения:**
- ✅ Добавлено право `telephony_access`
- Продажник теперь может звонить клиентам через интегрированную телефонию

#### 9. **Логи аудита** (`/sales/audit-log`)
**Проблема:** Только для директора
```typescript
requirePermission: () => user?.role === 'director'
```
**Статус:** ✅ Правильно (только director)

#### 10. **Корзина** (`/sales/trash`)
**Проблема:** Восстановление удаленных данных - только для высоких ролей
```typescript
requirePermission: () => permissions.roleLevel >= 80
```
**Статус:** ✅ Правильно (только director, admin)

## ✅ Записи (Bookings) - **РЕШЕНО**

**Обновленная конфигурация:**
```typescript
requirePermission: () => permissions.canViewAllBookings || permissions.canCreateBookings || user?.role === 'employee'
```

**Статус:** ✅ Теперь продажник ВИДИТ и МОЖЕТ создавать записи

**Изменения:**
- ✅ Добавлено право `bookings_view` - просмотр всех записей
- ✅ Добавлено право `bookings_create` - создание записей
- Продажник теперь может записывать клиентов на услуги

## Рекомендации по улучшению

### 1. Добавить права на записи (если нужно)

Если продажник должен записывать клиентов, обновите `permissions.ts`:

```typescript
sales: {
  name: 'Продажник',
  permissions: [
    'instagram_chat_view',
    'clients_view_limited',
    'analytics_view_stats_only',
    'staff_chat_own',
    'calendar_view_all_readonly',
    'bot_settings_view',
    'bookings_create',        // ← ДОБАВИТЬ
    'bookings_view_own',      // ← ДОБАВИТЬ (только свои записи)
  ],
  ...
}
```

### 2. Ограничить просмотр календаря

Если календарь не нужен продажнику, измените условие:

```typescript
{
  icon: Calendar,
  label: t('menu.calendar'),
  path: `${rolePrefix}/calendar`,
  requirePermission: () => permissions.canViewAllCalendars &&
                           user?.role !== 'employee' &&
                           user?.role !== 'sales'  // ← ДОБАВИТЬ
}
```

### 3. Дать доступ к телефонии (опционально)

Если продажникам нужно звонить клиентам:

```typescript
{
  icon: Phone,
  label: t('menu.telephony'),
  path: `${rolePrefix}/telephony`,
  requirePermission: () => permissions.roleLevel >= 40  // ← Изменить с 80 на 40
}
```

### 4. Скрыть настройки бота от sales

Если настройки бота не нужны:

```typescript
sales: {
  permissions: [
    // Убрать 'bot_settings_view'
  ]
}
```

## Итоговая таблица доступа

| Раздел меню | Director | Admin | Manager | Sales | Employee |
|-------------|----------|-------|---------|-------|----------|
| Dashboard | ✅ | ✅ | ✅ | ✅ (Мои клиенты) | ✅ (Календарь) |
| Календарь | ✅ | ✅ | ✅ | ✅ **ОБНОВЛЕНО** | ✅ (свой) |
| Записи | ✅ | ✅ | ✅ | ✅ **ДОБАВЛЕНО** | ✅ (свои) |
| Задачи | ✅ | ✅ | ✅ | ✅ | ❌ |
| Чат | ✅ | ✅ | ✅ | ✅ | ❌ |
| Профиль | ✅ | ✅ | ✅ | ✅ | ✅ |
| Клиенты | ✅ | ✅ | ✅ | ❌ | ❌ |
| Услуги | ✅ | ✅ | ✅ | ❌ | ❌ |
| Пользователи | ✅ | ✅ | ❌ | ❌ | ❌ |
| Аналитика | ✅ | ✅ | ✅ | ❌ | ❌ |
| Воронка | ✅ | ✅ | ✅ | ✅ | ❌ |
| Посетители | ✅ | ✅ | ✅ | ❌ | ❌ |
| Рассылки | ✅ | ✅ | ❌ | ✅ | ❌ |
| Публичный контент | ✅ | ✅ | ❌ | ❌ | ❌ |
| Телефония | ✅ | ✅ | ❌ | ✅ **ДОБАВЛЕНО** | ❌ |
| Внутренняя связь | ✅ | ✅ | ✅ | ✅ | ❌ |
| Настройки | ✅ | ✅ | ✅ | ⚠️ (ограниченные) | ⚠️ (свой профиль) |
| Настройки бота | ✅ | ✅ | ❌ | ✅ | ❌ |
| Логи аудита | ✅ | ❌ | ❌ | ❌ | ❌ |
| Корзина | ✅ | ✅ | ❌ | ❌ | ❌ |

## ✅ Все изменения внесены!

### Выполнено:
1. ✅ Добавлены права на создание записей (`bookings_create`, `bookings_view`)
2. ✅ Добавлен полный доступ к календарю (`calendar_view_all`)
3. ✅ Добавлен доступ к телефонии (`telephony_access`)
4. ✅ Обновлены права в frontend (`frontend/src/utils/permissions.ts`)
5. ✅ Обновлены права в backend (`backend/core/config.py`)
6. ✅ Обновлено меню в MainLayout.tsx
7. ✅ Убраны hardcoded переводы из меню
8. ✅ Клиенты правильно скрыты от sales
9. ✅ Финансовая аналитика правильно скрыта от sales

### Что теперь доступно продажнику:
- ✅ Календарь (полный доступ)
- ✅ Записи (просмотр и создание)
- ✅ Телефония (звонки клиентам)
- ✅ Все остальные права без изменений

### Что осталось недоступным (правильно):
- ❌ Полный список клиентов
- ❌ Финансовая аналитика
- ❌ Управление пользователями
- ❌ Логи аудита (только director)
- ❌ Корзина (только director/admin)
