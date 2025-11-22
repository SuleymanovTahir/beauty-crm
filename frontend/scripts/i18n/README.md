# Frontend i18n Scripts

This folder contains scripts for managing internationalization in the frontend application.

## Scripts

### setup-i18n.js
**Purpose:** Initial setup of i18n infrastructure

**Usage:**
```bash
cd /Users/tahir/Desktop/beauty-crm/frontend
npm run i18n:setup
```

**What it does:**
- Creates locale folder structure
- Generates i18next-parser.config.js
- Sets up initial translation files

---

### auto-translate.js
**Purpose:** Auto-translates missing keys using Google Translate

**Usage:**
```bash
cd /Users/tahir/Desktop/beauty-crm/frontend
npm run i18n:sync
```

**What it does:**
- Scans locale files for empty values
- Translates from Russian to other languages
- Updates JSON files with translations

---

### create-locale-structure.js
**Purpose:** Creates folder structure for new languages

**Usage:**
```bash
cd /Users/tahir/Desktop/beauty-crm/frontend
node scripts/i18n/create-locale-structure.js
```

**What it does:**
- Creates locale folders for all supported languages
- Copies structure from Russian locale
- Initializes empty translation files

---

## Package.json Scripts

```json
{
  "i18n:setup": "node scripts/i18n/setup-i18n.js",
  "i18n:extract": "i18next-parser",
  "i18n:sync": "node scripts/i18n/auto-translate.js"
}
```

---

## Configuration

The `i18next-parser.config.js` file is located in the frontend root directory and configures:
- Source file patterns
- Output locale paths
- Namespace structure
- Key extraction rules

---

## Notes

- Scripts are designed to work from frontend root directory
- Always run via npm scripts for proper path resolution
- Auto-translation requires internet connection
- Review auto-translated content for accuracy

## Русская документация

### Скрипты

#### setup-i18n.js
**Назначение:** Первоначальная настройка инфраструктуры i18n

**Использование:**
```bash
cd /Users/tahir/Desktop/beauty-crm/frontend
npm run i18n:setup
```

**Что делает:**
- Создаёт структуру папок локалей
- Генерирует `i18next-parser.config.js`
- Настраивает начальные файлы переводов

#### auto-translate.js
**Назначение:** Автоматический перевод недостающих ключей с помощью Google Translate

**Использование:**
```bash
cd /Users/tahir/Desktop/beauty-crm/frontend
npm run i18n:sync
```

**Что делает:**
- Сканирует файлы локалей на пустые значения
- Переводит с русского на другие языки
- Обновляет JSON‑файлы переводов

#### create-locale-structure.js
**Назначение:** Создаёт структуру папок для новых языков

**Использование:**
```bash
cd /Users/tahir/Desktop/beauty-crm/frontend
node scripts/i18n/create-locale-structure.js
```

**Что делает:**
- Создаёт папки локалей для всех поддерживаемых языков
- Копирует структуру из русской локали
- Инициализирует пустые файлы переводов

### Скрипты в package.json
```json
{
  "i18n:setup": "node scripts/i18n/setup-i18n.js",
  "i18n:extract": "i18next-parser",
  "i18n:sync": "node scripts/i18n/auto-translate.js"
}
```

### Конфигурация
Файл `i18next-parser.config.js` находится в корне фронтенда и задаёт:
- Шаблоны исходных файлов
- Путь вывода локалей
- Структуру неймспейсов
- Правила извлечения ключей

### Примечания
- Скрипты рассчитаны на запуск из корня фронтенда
- Всегда используйте npm‑скрипты для корректного разрешения путей
- Автоперевод требует интернет‑соединения
- Проверяйте автоматически переведённый контент на точность
