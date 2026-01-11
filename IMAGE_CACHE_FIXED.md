# ✅ Исправлено кэширование изображений

**Дата:** 11.01.2026
**Статус:** ✅ Готово к деплою

## Проблема

Разные изображения сотрудников и портфолио в разных браузерах из-за:
1. Файлы сохранялись с одинаковыми именами
2. Браузеры кэшировали старые версии
3. При загрузке нового файла с тем же именем - показывалось старое

## Решение

Добавлен **timestamp** в имя файла при загрузке, чтобы каждая загрузка создавала уникальное имя.

---

## Изменения в коде

### 1. Файл: `backend/api/uploads.py`

**Что изменено:**
- Добавлены импорты `datetime` и `re`
- При загрузке файла генерируется уникальное имя с timestamp

**Было:**
```python
filename = file.filename or 'uploaded_file'
# Пример: employee_photo.jpg
```

**Стало:**
```python
original_filename = file.filename or 'uploaded_file'
timestamp = int(datetime.now().timestamp())

# Разделяем имя и расширение
if '.' in original_filename:
    name_parts = original_filename.rsplit('.', 1)
    base_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name_parts[0])
    extension = name_parts[1]
    filename = f"{base_name}_{timestamp}.{extension}"
# Пример: employee_photo_1736607600.jpg
```

**Строки изменены:** 1-7, 53-78

---

### 2. Файл: `backend/api/gallery.py`

**Что изменено:**
- Добавлена такая же логика в endpoint загрузки галереи/портфолио
- Генерация уникальных имен с timestamp

**Было:**
```python
file_path = target_dir / file.filename
image_path = f"/static/uploads/images/{category}/{file.filename}"
```

**Стало:**
```python
# Генерируем уникальное имя
original_filename = file.filename or 'image'
timestamp = int(datetime.now().timestamp())

if '.' in original_filename:
    name_parts = original_filename.rsplit('.', 1)
    base_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name_parts[0])
    extension = name_parts[1]
    unique_filename = f"{base_name}_{timestamp}.{extension}"

file_path = target_dir / unique_filename
image_path = f"/static/uploads/images/{category}/{unique_filename}"
# Пример: portfolio_image_1736607600.jpg
```

**Строки изменены:** 193-247

---

## Примеры имен файлов

### До исправления:
```
/static/uploads/images/photos/employee_1.jpg
/static/uploads/images/photos/employee_1.jpg  (новая загрузка, то же имя!)
/static/uploads/images/portfolio/work_1.jpg
/static/uploads/images/portfolio/work_1.jpg   (новая загрузка, то же имя!)
```

### После исправления:
```
/static/uploads/images/photos/employee_1_1736607600.jpg
/static/uploads/images/photos/employee_1_1736610200.jpg  (уникальное!)
/static/uploads/images/portfolio/work_1_1736607700.jpg
/static/uploads/images/portfolio/work_1_1736610300.jpg   (уникальное!)
```

---

## Преимущества

✅ **Уникальность:** Каждая загрузка = уникальное имя файла
✅ **Нет кэширования:** Браузер видит новый URL = загружает новое изображение
✅ **Работает везде:** Не зависит от браузера или домена
✅ **Безопасность:** Санитизация имени файла (убираем спецсимволы)
✅ **История:** Старые версии файлов сохраняются на диске (можно вручную удалить)

---

## Затронутые функции

### uploads.py:
- `upload_file()` - основная функция загрузки файлов

### gallery.py:
- `upload_gallery_image()` - загрузка фото в галерею/портфолио

---

## Тестирование после деплоя

### 1. Фотографии сотрудников:

1. Зайти в админку → Сотрудники
2. Выбрать сотрудника → Загрузить новое фото
3. **Проверить:**
   - Фото сразу отобразилось новое
   - В консоли браузера (Network) видно новый URL с timestamp
   - Открыть в другом браузере → видно новое фото
   - Открыть в режиме инкогнито → видно новое фото

### 2. Фотографии портфолио:

1. Зайти в админку → Галерея/Портфолио
2. Загрузить новое фото
3. **Проверить:**
   - Фото отображается
   - URL содержит timestamp
   - Открыть публичную страницу → видно новое фото
   - В другом браузере → видно новое фото

### 3. Проверка в базе данных:

```sql
-- Проверить что image_path содержит timestamp
SELECT id, image_path, title FROM gallery_images
WHERE category = 'portfolio'
ORDER BY id DESC LIMIT 5;

-- Должно быть:
-- /static/uploads/images/portfolio/work_1_1736607700.jpg
```

---

## Дополнительные улучшения (опционально)

### Автоматическая очистка старых файлов:

Можно добавить функцию для удаления старых версий при загрузке нового файла:

```python
# В uploads.py
def cleanup_old_versions(category, entity_id, new_filename):
    """Удалить старые версии файла этого entity"""
    pattern = f"{entity_id}_*.{extension}"
    old_files = UPLOAD_DIR_PATH.glob(f"{category}/{pattern}")
    for old_file in old_files:
        if old_file.name != new_filename:
            old_file.unlink()
```

Это сэкономит место на диске, но удалит историю версий.

---

## Команды для деплоя

```bash
# Синхронизация только измененных файлов
rsync -avz \
  ./backend/api/uploads.py \
  ./backend/api/gallery.py \
  ubuntu@91.201.215.32:/home/ubuntu/beauty_crm/backend/api/

# Перезапуск сервиса
ssh ubuntu@91.201.215.32 << 'EOF'
  sudo systemctl restart beauty_crm
  sudo journalctl -u beauty_crm -n 20 --no-pager
EOF
```

---

## Итого

✅ **Исправлено:** Кэширование изображений сотрудников
✅ **Исправлено:** Кэширование фотографий портфолио
✅ **Файлы изменены:** 2 (uploads.py, gallery.py)
✅ **Готово к деплою**

После деплоя все новые загрузки будут иметь уникальные имена и браузеры не будут показывать старые закэшированные версии.

---

**Важно:** Для существующих изображений (уже загруженных) проблема останется до первой перезагрузки. После загрузки нового файла - проблема исчезнет.
