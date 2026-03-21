const fs = require('fs');
const path = require('path');

const languages = ['ru', 'en', 'es', 'ar', 'hi', 'kk', 'pt', 'fr', 'de'];

// 🎯 Логичное разделение по функционалу
const namespaces = [
  'common',          // Общие: кнопки, действия, статусы, ошибки
  'auth',            // Авторизация и вход
  'dashboard',       // CRM dashboard
  'clients',         // Клиенты CRM
  'bookings',        // Записи CRM
  'chat',            // Чат, сообщения, шаблоны
  'analytics',       // Аналитика, воронка, отчёты
  'services',        // Услуги CRM
  'settings',        // Настройки CRM
  'users',           // Команда и роли CRM
  'employee',        // Страницы сотрудника
  'manager',         // Страницы менеджера
  'layouts',         // Навигация, меню, футер
];

const localesDir = path.join(__dirname, 'src', 'locales');

console.log('🚀 Создание структуры локализации...\n');

// Создаём структуру папок
for (const lang of languages) {
  const langDir = path.join(localesDir, lang);
  
  if (!fs.existsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
    console.log(`✅ Создана папка: locales/${lang}/`);
  }
  
  // Создаём файлы для каждого namespace
  for (const ns of namespaces) {
    const filePath = path.join(langDir, `${ns}.json`);
    
    if (!fs.existsSync(filePath)) {
      // Для русского создаём с примерами, для остальных - пустые
      const content = lang === 'ru' ? getExampleTranslations(ns) : JSON.stringify({}, null, 2);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   📄 Создан: locales/${lang}/${ns}.json`);
    }
  }
}

console.log('\n📝 Создание конфигурационных файлов...\n');

// Создаём i18n.ts
const i18nContent = `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const languages = ${JSON.stringify(languages)};
const namespaces = ${JSON.stringify(namespaces)};

const resources: any = {};

for (const lang of languages) {
  resources[lang] = {};
  for (const ns of namespaces) {
    try {
      resources[lang][ns] = require(\`./locales/\${lang}/\${ns}.json\`);
    } catch (e) {
      console.warn(\`Missing: \${lang}/\${ns}.json\`);
    }
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    defaultNS: 'common',
    ns: namespaces,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
`;

fs.writeFileSync(path.join(__dirname, 'src', 'i18n.ts'), i18nContent, 'utf8');
console.log('✅ Создан: src/i18n.ts');

// Создаём конфиг парсера
const parserConfig = `module.exports = {
  locales: ${JSON.stringify(languages)},
  output: 'src/locales/$LOCALE/$NAMESPACE.json',
  input: ['src/**/*.{js,jsx,ts,tsx}'],
  defaultNamespace: 'common',
  keySeparator: false,
  namespaceSeparator: ':',
  createOldCatalogs: false,
  keepRemoved: false,
  sort: true,
  verbose: true,
  lexers: {
    tsx: ['JsxLexer'],
    ts: ['JsxLexer']
  }
};
`;

fs.writeFileSync(path.join(__dirname, '../../i18next-parser.config.js'), parserConfig, 'utf8');
console.log('✅ Создан: i18next-parser.config.js');

console.log('\n🎉 Готово! Структура создана.');
console.log('\n📚 Доступные namespaces:');
namespaces.forEach(ns => console.log(`   - ${ns}`));
console.log('\n📝 Следующие шаги:');
console.log('1. Добавь "import \'./i18n\'" в начало App.tsx');
console.log('2. Используй t("текст") для common');
console.log('3. Используй t("clients:текст") для других namespaces');
console.log('4. Запусти: npm run i18n:extract');

// Функция для примеров переводов (только для ru)
function getExampleTranslations(namespace) {
  const examples = {
    common: {
      "save": "Сохранить",
      "cancel": "Отмена",
      "delete": "Удалить",
      "edit": "Редактировать",
      "add": "Добавить",
      "search": "Поиск...",
      "loading": "Загрузка...",
      "error": "Ошибка",
      "success": "Успешно",
      "logout": "Выйти",
      "login": "Войти",
      "refresh": "Обновить",
      "export": "Экспорт",
      "import": "Импорт",
      "actions": "Действия",
      "status": "Статус",
      "created": "Создано",
      "updated": "Обновлено"
    },
    auth: {
      "login_title": "Вход в систему",
      "username": "Имя пользователя",
      "password": "Пароль",
      "remember_me": "Запомнить меня",
      "forgot_password": "Забыли пароль?"
    },
    dashboard: {
      "title": "Панель управления",
      "welcome": "Добро пожаловать",
      "overview": "Обзор",
      "quick_actions": "Быстрые действия"
    },
    clients: {
      "title": "Клиенты",
      "client_list": "База клиентов",
      "add_client": "Добавить клиента",
      "client_details": "Информация о клиенте",
      "total_clients": "Всего клиентов"
    },
    bookings: {
      "title": "Записи",
      "booking_list": "Управление записями",
      "add_booking": "Добавить запись",
      "booking_details": "Детали записи",
      "date": "Дата",
      "time": "Время"
    },
    chat: {
      "title": "Чат",
      "send_message": "Отправить сообщение",
      "type_message": "Введите сообщение...",
      "templates": "Шаблоны",
      "quick_replies": "Быстрые ответы"
    },
    analytics: {
      "title": "Аналитика",
      "reports": "Отчёты",
      "statistics": "Статистика",
      "revenue": "Доход",
      "conversion": "Конверсия"
    },
    services: {
      "title": "Услуги",
      "service_list": "Прайс-лист",
      "add_service": "Добавить услугу",
      "special_packages": "Специальные пакеты",
      "price": "Цена"
    },
    settings: {
      "title": "Настройки",
      "general": "Общие",
      "bot_settings": "Настройки бота",
      "notifications": "Уведомления",
      "security": "Безопасность"
    },
    users: {
      "title": "Пользователи",
      "user_list": "Управление пользователями",
      "add_user": "Создать пользователя",
      "edit_user": "Редактировать пользователя",
      "role": "Роль"
    },
    employee: {
      "title": "Личный кабинет",
      "my_bookings": "Мои записи",
      "profile": "Профиль"
    },
    manager: {
      "title": "Менеджер",
      "funnel": "Воронка продаж"
    },
    layouts: {
      "navigation": "Навигация",
      "crm_panel": "CRM",
      "manager_panel": "Панель менеджера",
      "employee_panel": "Панель сотрудника"
    }
  };
  
  return JSON.stringify(examples[namespace] || {}, null, 2);
}
