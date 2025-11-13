# Beauty CRM - Структура проекта

## 📁 Организация кода

```
backend/
├── api/                    # FastAPI endpoints (REST API)
│   ├── analytics.py        # Аналитика и статистика
│   ├── automation.py       # Автоматизация задач
│   ├── bookings.py         # Управление записями
│   ├── chat.py             # Чат с клиентами
│   ├── clients.py          # Управление клиентами
│   ├── diagnostics.py      # Диагностика системы
│   ├── employees.py        # Управление сотрудниками
│   ├── export.py           # Экспорт данных
│   ├── internal_chat.py    # Внутренний чат команды
│   ├── notes.py            # Заметки о клиентах
│   ├── notifications.py    # Уведомления
│   ├── proxy.py            # Прокси для Gemini API
│   ├── public.py           # Публичные эндпоинты
│   ├── reminders.py        # Напоминания
│   ├── reports.py          # Отчёты
│   ├── roles.py            # Управление ролями
│   ├── services.py         # Управление услугами
│   ├── settings.py         # Настройки салона
│   ├── statuses.py         # Статусы клиентов
│   ├── tags.py             # Теги
│   ├── templates.py        # Шаблоны сообщений
│   ├── uploads.py          # Загрузка файлов
│   └── users.py            # Пользователи системы
│
├── bot/                    # AI Bot (Gemini)
│   ├── core.py             # Основная логика бота
│   └── prompts.py          # Построение промптов
│
├── core/                   # Ядро приложения
│   ├── auth.py             # Аутентификация JWT
│   └── config.py           # Конфигурация окружения
│
├── db/                     # Database layer
│   ├── migrations/         # Миграции БД
│   ├── analytics.py        # Аналитика БД
│   ├── bookings.py         # Записи БД
│   ├── clients.py          # Клиенты БД
│   ├── employees.py        # Сотрудники БД
│   ├── init.py             # Инициализация БД
│   ├── messages.py         # Сообщения БД
│   ├── services.py         # Услуги БД
│   ├── settings.py         # Настройки БД
│   └── users.py            # Пользователи БД
│
├── integrations/           # External integrations
│   ├── gemini.py           # Google Gemini AI
│   └── instagram.py        # Instagram/Facebook API
│
├── scheduler/              # Background tasks
│   └── birthday_checker.py # Проверка дней рождения
│
├── tests/                  # Тесты
│   ├── check_bot.py        # Интеграционные тесты бота
│   ├── check_bot2.py       # Мини-тесты бота
│   ├── check_migrations.py # Проверка миграций
│   ├── check_services.py   # Проверка услуг
│   └── test_30_features.py # Unit-тесты 30 фишек
│
├── utils/                  # Utilities
│   ├── cache.py            # Кэширование
│   ├── logger.py           # Логирование
│   └── utils.py            # Вспомогательные функции
│
├── main.py                 # Точка входа FastAPI
├── webhooks.py             # Instagram webhooks
├── diagnose.py             # Диагностика системы
├── find_best_model.py      # Поиск лучшей модели Gemini
├── requirements.txt        # Python зависимости
├── salon_bot.db            # SQLite база данных
├── .env.local              # Конфигурация для localhost
└── .env.production         # Конфигурация для production
```

## 🎯 Основные компоненты

### API Layer (`api/`)
REST API эндпоинты для фронтенда. Каждый файл отвечает за свою область:
- Управление клиентами, записями, сотрудниками
- Чат и уведомления
- Аналитика и отчёты
- Настройки и автоматизация

### Bot (`bot/`)
AI-бот на базе Google Gemini:
- Автоматические ответы на сообщения клиентов
- 30+ умных фишек (персонализация, upsell, автоматизация)
- Мультиязычность (RU, EN, AR)

### Core (`core/`)
Ядро приложения:
- Конфигурация и переменные окружения
- JWT аутентификация
- Автоопределение окружения (localhost/production)

### Database (`db/`)
Слой работы с SQLite:
- CRUD операции
- Миграции
- Аналитика и агрегации

### Integrations (`integrations/`)
Интеграции с внешними сервисами:
- Google Gemini AI
- Instagram/Facebook Messenger API

### Tests (`tests/`)
Комплексное тестирование:
- Unit-тесты (100% прохождение)
- Интеграционные тесты
- Проверка миграций и услуг

### Utils (`utils/`)
Вспомогательные модули:
- Логирование с цветами и эмодзи
- Кэширование
- Утилиты (загрузка файлов, валидация)

## 🚀 Запуск

### Development
```bash
cd backend
python main.py
```

### Тесты
```bash
# Unit-тесты 30 фишек
python tests/test_30_features.py

# Интеграционные тесты бота
python tests/check_bot.py

# Быстрые тесты
python tests/check_bot2.py
```

## 🔧 Конфигурация

Проект автоматически определяет окружение:
- **Localhost** → использует `.env.local`
- **Production server** → использует `.env.production`

Обязательные переменные:
- `PAGE_ACCESS_TOKEN` - Instagram/Facebook API token
- `GEMINI_API_KEY` - Google Gemini API key

## 📊 Улучшения

### ✅ Выполнено:
1. Реорганизация файлов по логическим папкам
2. Обновление всех импортов
3. Исправление багов (emp_name_display.upper())
4. Все тесты проходят (100%)
5. Чистая структура проекта

### 🎯 Универсальность кода:
- Модульная архитектура
- Разделение ответственности (API, DB, Bot, Core)
- Простота добавления новых модулей
- Централизованная конфигурация
