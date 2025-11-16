# Список улучшений и TODO

## ✅ Реализовано (Backend)

### 1. Настройки уведомлений для мастеров
- ✅ Добавлены поля в таблицу `users`:
  - `notify_telegram` - получать уведомления в Telegram
  - `notify_email` - получать уведомления на email
  - `notify_whatsapp` - получать уведомления в WhatsApp
  - `notify_on_new_booking` - уведомления о новых записях
  - `notify_on_booking_change` - уведомления об изменении записей
  - `notify_on_booking_cancel` - уведомления об отмене записей

- ✅ API endpoints:
  - `GET /api/users/{user_id}/notification-settings` - получить настройки
  - `POST /api/users/{user_id}/notification-settings` - обновить настройки

### 2. Уведомления об изменении/отмене записей
- ✅ `PUT /api/bookings/{booking_id}` - обновление записи с уведомлением
- ✅ `DELETE /api/bookings/{booking_id}` - удаление записи с уведомлением
- ✅ Параметр `notification_type` в функции `notify_master_about_booking`:
  - `new_booking` - новая запись 🔔
  - `booking_change` - изменение записи ✏️
  - `booking_cancel` - отмена записи ❌

### 3. Улучшенная логика уведомлений
- ✅ Проверка настроек мастера перед отправкой
- ✅ Отправка только по выбранным каналам
- ✅ Разные сообщения для разных типов уведомлений
- ✅ Логирование всех уведомлений

## 🚧 TODO (Требуется реализация)

### 3. Улучшить UI редактирования клиента

**Что нужно сделать:**
- [ ] Создать красивый модальный диалог для редактирования клиента
- [ ] Добавить поля:
  - Имя
  - Телефон
  - Email (важно для уведомлений!)
  - Preferred Messenger (выбор предпочтительного мессенджера)
  - День рождения
  - Заметки
- [ ] Валидация полей
- [ ] Сохранение изменений через API

**Где реализовать:**
- Страница: `/admin/clients`
- Компонент: `frontend/src/pages/admin/Clients.tsx`

**API endpoint (уже существует):**
```bash
POST /api/clients/{client_id}
{
  "name": "Client Name",
  "phone": "+1234567890",
  "email": "client@example.com",
  "birthday": "1990-01-01",
  "notes": "VIP клиент"
}
```

### 4. Добавить поле email при создании записи

**Что нужно сделать:**
- [ ] Добавить поле email в форму создания записи (`/admin/bookings`)
- [ ] Обновить backend API `/api/bookings` для сохранения email в таблицу `clients`
- [ ] Если email введен, сохранять его в профиле клиента

**Где реализовать:**
- Страница: `/admin/bookings`
- Компонент: `frontend/src/pages/admin/Bookings.tsx`
- Диалог: `showAddDialog` форма

**Пример кода:**
```typescript
// В состоянии формы добавить:
const [addForm, setAddForm] = useState({
  phone: '',
  email: '',  // ← Добавить
  date: '',
  time: '',
  revenue: 0,
  master: '',
});

// В JSX формы добавить:
<div>
  <label>Email (опционально)</label>
  <input
    type="email"
    value={addForm.email}
    onChange={(e) => setAddForm({...addForm, email: e.target.value})}
    placeholder="client@example.com"
  />
</div>
```

**Backend изменения:**
```python
# В api/bookings.py, функция create_booking_api:
email = data.get('email', '')

# После создания клиента, если email есть:
if email:
    update_client_info(instagram_id, email=email)
```

### 5. Создать систему новостей и акций

**Что нужно сделать:**

#### Backend:

- [ ] Создать таблицу `news_and_promotions`:
```sql
CREATE TABLE news_and_promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,  -- 'news' или 'promotion'
    image_url TEXT,
    created_by INTEGER,
    created_at TEXT,
    published_at TEXT,
    is_published INTEGER DEFAULT 0,
    target_audience TEXT DEFAULT 'all',  -- 'all', 'vip', 'active'
    FOREIGN KEY (created_by) REFERENCES users(id)
)
```

- [ ] API endpoints:
  - `GET /api/news` - получить все новости/акции
  - `POST /api/news` - создать новость/акцию
  - `PUT /api/news/{news_id}` - обновить
  - `DELETE /api/news/{news_id}` - удалить
  - `POST /api/news/{news_id}/publish` - опубликовать (отправить всем клиентам)

#### Frontend (Admin):

- [ ] Страница `/admin/news` для управления новостями
- [ ] Форма создания/редактирования
- [ ] Кнопка "Опубликовать" для рассылки
- [ ] Выбор целевой аудитории (все/VIP/активные)

#### Frontend (Client):

- [ ] Страница `/client/news` для просмотра новостей
- [ ] Карточки с новостями и акциями
- [ ] Фильтры по типу (новости/акции)

### 6. Добавить уведомления в личный кабинет клиента

**Что нужно сделать:**

#### Backend:

- [ ] Расширить таблицу `notifications`:
```sql
ALTER TABLE notifications ADD COLUMN target_type TEXT DEFAULT 'user';  -- 'user' или 'client'
ALTER TABLE notifications ADD COLUMN target_id TEXT;  -- user_id или instagram_id
```

- [ ] API endpoints для клиентов:
  - `GET /api/client/notifications` - получить уведомления клиента
  - `POST /api/client/notifications/{notification_id}/read` - отметить прочитанным
  - `GET /api/client/notifications/unread-count` - количество непрочитанных

- [ ] Автоматическое создание уведомлений для клиента:
  - При создании записи
  - При изменении записи
  - При отмене записи
  - При публикации новостей/акций

#### Frontend (Client):

- [ ] Иконка колокольчика в header личного кабинета клиента
- [ ] Бейдж с количеством непрочитанных
- [ ] Dropdown меню с последними уведомлениями
- [ ] Страница `/client/notifications` со всеми уведомлениями

**Пример структуры:**

```typescript
// В ClientLayout.tsx
const [unreadNotifications, setUnreadNotifications] = useState(0);

useEffect(() => {
  const loadUnreadCount = async () => {
    const data = await api.getClientUnreadNotifications();
    setUnreadNotifications(data.count);
  };

  loadUnreadCount();
  const interval = setInterval(loadUnreadCount, 30000);
  return () => clearInterval(interval);
}, []);

// В header:
<div className="notification-bell">
  <Bell size={24} />
  {unreadNotifications > 0 && (
    <span className="badge">{unreadNotifications}</span>
  )}
</div>
```

### 7. Страница настроек уведомлений для мастеров (Frontend)

**Что нужно сделать:**
- [ ] Создать раздел "Настройки уведомлений" в профиле мастера
- [ ] Чекбоксы для выбора каналов:
  - ☐ Telegram (показывать только если есть telegram_chat_id)
  - ☐ Email (показывать только если есть email)
  - ☐ WhatsApp (показывать только если есть phone)
- [ ] Чекбоксы для типов уведомлений:
  - ☐ О новых записях
  - ☐ Об изменении записей
  - ☐ Об отмене записей
- [ ] Кнопка "Сохранить"

**Где реализовать:**
- Страница: `/admin/profile` или `/admin/settings`
- Использовать API: `GET/POST /api/users/{user_id}/notification-settings`

## 📝 Инструкции по использованию

### Как настроить уведомления для мастера

1. **Через API:**
```bash
# Получить текущие настройки
curl http://localhost:8000/api/users/2/notification-settings \
  -b "session_token=TOKEN"

# Обновить настройки
curl -X POST http://localhost:8000/api/users/2/notification-settings \
  -H "Content-Type: application/json" \
  -b "session_token=TOKEN" \
  -d '{
    "notify_telegram": true,
    "notify_email": true,
    "notify_whatsapp": false,
    "notify_on_new_booking": true,
    "notify_on_booking_change": true,
    "notify_on_booking_cancel": false
  }'
```

2. **Через SQL (временно, пока нет UI):**
```sql
UPDATE users
SET notify_telegram = 1,
    notify_email = 1,
    notify_whatsapp = 0,
    notify_on_new_booking = 1,
    notify_on_booking_change = 1,
    notify_on_booking_cancel = 0
WHERE id = 2;
```

### Как протестировать уведомления

**1. Новая запись:**
```bash
curl -X POST http://localhost:8000/api/bookings \
  -H "Content-Type: application/json" \
  -b "session_token=TOKEN" \
  -d '{
    "instagram_id": "test_client",
    "name": "Test Client",
    "service": "Массаж",
    "date": "2025-11-18",
    "time": "15:00",
    "phone": "+1234567890",
    "master": "Jennifer"
  }'
```

**2. Изменение записи:**
```bash
curl -X PUT http://localhost:8000/api/bookings/1 \
  -H "Content-Type: application/json" \
  -b "session_token=TOKEN" \
  -d '{
    "service": "Маникюр",
    "date": "2025-11-19",
    "time": "16:00",
    "name": "Test Client",
    "phone": "+1234567890",
    "master": "Jennifer"
  }'
```

**3. Отмена записи:**
```bash
curl -X DELETE http://localhost:8000/api/bookings/1 \
  -b "session_token=TOKEN"
```

## 🎯 Приоритеты

### Высокий приоритет (сделать в первую очередь):
1. **UI для редактирования клиента** - важно для добавления email
2. **Поле email при создании записи** - нужно для email-уведомлений
3. **UI настроек уведомлений для мастеров** - чтобы мастера могли управлять уведомлениями

### Средний приоритет:
4. **Система новостей и акций** - полезно для маркетинга
5. **Уведомления в личном кабинете клиента** - улучшит UX

### Низкий приоритет:
- Дополнительные фильтры и сортировки
- Статистика по уведомлениям
- Отчеты и аналитика

## 🔧 Технические детали

### Структура базы данных

**Таблица `users` (обновлена):**
```sql
-- Новые поля:
notify_telegram INTEGER DEFAULT 1
notify_email INTEGER DEFAULT 1
notify_whatsapp INTEGER DEFAULT 0
notify_on_new_booking INTEGER DEFAULT 1
notify_on_booking_change INTEGER DEFAULT 1
notify_on_booking_cancel INTEGER DEFAULT 1
telegram_chat_id TEXT
```

**Таблица `clients` (существует):**
```sql
email TEXT  -- уже есть, нужно использовать
preferred_messenger TEXT  -- уже есть для выбора канала напоминаний
```

### API Endpoints

**Уведомления мастеров:**
- ✅ `POST /api/bookings` - создание записи (отправляет уведомление)
- ✅ `PUT /api/bookings/{booking_id}` - обновление (отправляет уведомление)
- ✅ `DELETE /api/bookings/{booking_id}` - удаление (отправляет уведомление)
- ✅ `GET /api/users/{user_id}/notification-settings` - настройки мастера
- ✅ `POST /api/users/{user_id}/notification-settings` - обновление настроек

**Напоминания клиентам:**
- ✅ `POST /api/notifications/reminders/send` - отправить напоминание
- ✅ `POST /api/notifications/reminders/send-batch` - массовая отправка
- ✅ `POST /api/notifications/broadcast` - рекламная рассылка

## 📚 Документация

- `backend/TESTING_NOTIFICATIONS.md` - инструкции по тестированию уведомлений
- Этот файл - план улучшений и TODO список

## ⚡ Быстрый старт для разработки

1. Запустить миграции:
```bash
cd backend
python3 run_migration_notification_preferences.py
python3 run_migration_telegram_chat_id.py
```

2. Настроить переменные окружения в `.env`:
```env
TELEGRAM_BOT_TOKEN=your_token
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email
SMTP_PASSWORD=your_password
```

3. Запустить сервер:
```bash
python3 main.py
```

4. Начать с фронтенда - добавить UI для настроек уведомлений
