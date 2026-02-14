# Notification Scheduler Service

## Описание

Служба планировщика уведомлений обрабатывает запланированные и повторяющиеся уведомления.

## Установка

### Вариант 1: Запуск как отдельный процесс

```bash
cd /Users/tahir/Desktop/beauty-crm/crm/backend
PYTHONPATH=/Users/tahir/Desktop/beauty-crm/crm/backend python3 services/notification_scheduler.py
```

### Вариант 2: Настройка как Cron Job (рекомендуется)

Добавьте следующую строку в crontab для запуска каждую минуту:

```bash
# Открыть crontab
crontab -e

# Добавить строку (запуск каждую минуту)
* * * * * cd /Users/tahir/Desktop/beauty-crm/crm/backend && PYTHONPATH=/Users/tahir/Desktop/beauty-crm/crm/backend python3 services/notification_scheduler.py >> /tmp/notification_scheduler.log 2>&1
```

### Вариант 3: Системный сервис (Linux/macOS)

Создайте файл `/etc/systemd/system/notification-scheduler.service`:

```ini
[Unit]
Description=Beauty CRM Notification Scheduler
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/Users/tahir/Desktop/beauty-crm/crm/backend
Environment="PYTHONPATH=/Users/tahir/Desktop/beauty-crm/crm/backend"
ExecStart=/usr/bin/python3 /Users/tahir/Desktop/beauty-crm/crm/backend/services/notification_scheduler.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Затем активируйте сервис:

```bash
sudo systemctl daemon-reload
sudo systemctl enable notification-scheduler
sudo systemctl start notification-scheduler
```

## Функционал

Планировщик выполняет следующие задачи:

1. **Обработка запланированных уведомлений** - Отправляет уведомления в назначенное время
2. **Поддержка повторяющихся уведомлений** - Создает новые задачи для повторяющихся уведомлений (daily/weekly/monthly)
3. **Фильтрация получателей** - Применяет все фильтры (по записям, услугам, уровню лояльности)
4. **Обработка ошибок** - Помечает неудачные уведомления как 'failed'

## Логирование

Логи записываются через `utils.logger`. Проверьте файлы логов для отслеживания работы планировщика.

## Требования

- PostgreSQL база данных с таблицей `notification_history` с полями для планирования
- Миграция `add_notification_scheduling.sql` должна быть применена

## Примечания

- Планировщик проверяет базу данных каждую минуту
- Для production рекомендуется использовать cron или systemd
- Для масштабирования можно использовать Celery или RQ
