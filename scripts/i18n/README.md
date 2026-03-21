# Команды для работы с переводами (i18n)

Текущий репозиторий использует только автоматизированный поток через `crm/frontend/package.json`.
Ручные root-скрипты удалены как legacy, чтобы не плодить дубли, не править отдельные языки вручную и не расходиться с SSOT.

## Основные команды

Извлечение ключей из кода:

```bash
cd /Users/tahir/Desktop/beauty-crm/crm/frontend
npm run i18n:extract
```

Проверка структуры переводов и пустых значений:

```bash
cd /Users/tahir/Desktop/beauty-crm/crm/frontend
npm run i18n:check-only
```

Полный автоматический цикл переводов:

```bash
cd /Users/tahir/Desktop/beauty-crm/crm/frontend
npm run db:i18n:auto
```

## Если PostgreSQL локально недоступен

Можно выполнить только frontend-часть без ручного редактирования JSON:

```bash
cd /Users/tahir/Desktop/beauty-crm/crm/frontend
npm run i18n:extract
npm run i18n:sync
npm run i18n:check-only
```

## Важно

- Не создавайте новые одноразовые `scripts/i18n/*.py` для отдельных языков.
- Не редактируйте locale JSON вручную, если задача решается через `db:i18n:auto`.
- Проблема в одном языке означает проверку всего контура переводов, а не точечный hotfix одного файла.
