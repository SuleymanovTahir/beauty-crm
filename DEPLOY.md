# 🚀 Быстрый деплой Beauty CRM

## Автоматический деплой (рекомендуется)

Используйте скрипт `deploy.sh` для быстрого деплоя:

```bash
cd ~/Desktop/beauty-crm
./deploy.sh
```

Скрипт предложит выбрать режим:

1. **Полный деплой** - backend + frontend
2. **Только backend** - быстрое обновление API
3. **Только frontend** - быстрое обновление UI

## Ручной деплой

### Только Backend

```bash
# 1. Удалить старый backend
ssh ubuntu@91.201.215.32 "rm -rf /home/ubuntu/beauty_crm/backend"

# 2. Загрузить новый backend
rsync -avz --progress --exclude 'venv' --exclude '__pycache__' --exclude '.git' \
  ~/Desktop/beauty-crm/backend/ ubuntu@91.201.215.32:/home/ubuntu/beauty_crm/backend/

# 3. Перезапустить сервис
ssh ubuntu@91.201.215.32 "sudo systemctl restart beauty_crm"
```

### Только Frontend

```bash
# 1. Удалить старый frontend
ssh ubuntu@91.201.215.32 "rm -rf /home/ubuntu/beauty_crm/frontend"

# 2. Загрузить новый frontend
rsync -avz --progress --exclude 'node_modules' --exclude '.git' \
  ~/Desktop/beauty-crm/frontend/ ubuntu@91.201.215.32:/home/ubuntu/beauty_crm/frontend/

# 3. Перезапустить nginx
ssh ubuntu@91.201.215.32 "sudo systemctl restart nginx"
```

### Полный деплой

```bash
# 1. Очистить все
ssh ubuntu@91.201.215.32 "rm -rf /home/ubuntu/beauty_crm/*"

# 2. Загрузить все файлы
rsync -avz --progress --exclude 'venv' --exclude 'node_modules' --exclude '.git' \
  ~/Desktop/beauty-crm/ ubuntu@91.201.215.32:/home/ubuntu/beauty_crm/

# 3. Перезапустить все сервисы
ssh ubuntu@91.201.215.32 "sudo systemctl daemon-reload && sudo systemctl restart beauty_crm && sudo systemctl restart nginx"
```

## Проверка статуса

```bash
# Проверить статус backend
ssh ubuntu@91.201.215.32 "sudo systemctl status beauty_crm"

# Посмотреть логи в реальном времени
ssh ubuntu@91.201.215.32 "sudo journalctl -u beauty_crm -f"

# Проверить последние 50 строк логов
ssh ubuntu@91.201.215.32 "sudo journalctl -u beauty_crm -n 50"
```

## Переменные окружения на сервере

Убедитесь, что на сервере настроен файл `.env`:

```bash
ssh ubuntu@91.201.215.32
cd /home/ubuntu/beauty_crm/backend
nano .env
```

Должны быть установлены:

- `PRODUCTION_URL=https://mlediamant.com`
- `DATABASE_URL=postgresql://...`
- `SMTP_*` настройки
- `PAYPAL_*` настройки
- И другие из `ENV_VARIABLES.md`

## Важные команды

```bash
# Перезапустить backend
ssh ubuntu@91.201.215.32 "sudo systemctl restart beauty_crm"

# Перезапустить nginx
ssh ubuntu@91.201.215.32 "sudo systemctl restart nginx"

# Посмотреть ошибки
ssh ubuntu@91.201.215.32 "sudo journalctl -u beauty_crm -p err -n 20"

# Проверить, что сервис запущен
ssh ubuntu@91.201.215.32 "sudo systemctl is-active beauty_crm"
```

## После деплоя

1. Проверьте сайт: https://mlediamant.com
2. Проверьте админку: https://mlediamant.com/admin
3. Проверьте API: https://mlediamant.com/api/docs
4. Проверьте логи на наличие ошибок

## Откат изменений

Если что-то пошло не так:

```bash
# Откатить backend к предыдущей версии
ssh ubuntu@91.201.215.32 "cd /home/ubuntu/beauty_crm/backend && git checkout HEAD~1"
ssh ubuntu@91.201.215.32 "sudo systemctl restart beauty_crm"
```
