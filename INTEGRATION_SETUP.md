# 📘 Руководство по настройке интеграций Beauty CRM

## 🎯 Содержание

1. [Подготовка системы](#подготовка-системы)
2. [Настройка Email](#настройка-email)
3. [Настройка Telegram](#настройка-telegram)
4. [Настройка WhatsApp](#настройка-whatsapp)
5. [Платежные системы](#платежные-системы)
6. [Маркетплейсы](#маркетплейсы)
7. [Проверка работоспособности](#проверка-работоспособности)

---

## 🔧 Подготовка системы

### 1. Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

### 2. Установка шрифтов для PDF (Linux/Mac)

**Ubuntu/Debian:**

```bash
sudo apt-get install fonts-dejavu fonts-dejavu-core fonts-dejavu-extra
```

**macOS:**

```bash
brew install --cask font-dejavu
```

**CentOS/RHEL:**

```bash
sudo yum install dejavu-sans-fonts
```

### 3. Создание директорий

```bash
mkdir -p /tmp/crm_pdfs
mkdir -p /var/www/crm/documents
chmod 755 /tmp/crm_pdfs
chmod 755 /var/www/crm/documents
```

### 4. Копирование .env файла

```bash
cp .env.example .env
nano .env  # Отредактируйте настройки
```

---

## 📧 Настройка Email

### Gmail

1. Включите двухфакторную аутентификацию
2. Создайте пароль приложения: https://myaccount.google.com/apppasswords
3. Добавьте в `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Yandex Mail

```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=587
SMTP_USER=your-email@yandex.ru
SMTP_PASSWORD=your-password
```

### Mail.ru

```env
SMTP_HOST=smtp.mail.ru
SMTP_PORT=587
SMTP_USER=your-email@mail.ru
SMTP_PASSWORD=your-password
```

### Собственный SMTP сервер

```env
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-password
```

---

## 🤖 Настройка Telegram

### 1. Создание бота

1. Откройте [@BotFather](https://t.me/botfather)
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен

### 2. Настройка

```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 3. Получение chat_id

Отправьте боту любое сообщение, затем:

```bash
curl https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
```

---

## 💬 Настройка WhatsApp

### WhatsApp Business API (официальный)

1. Зарегистрируйтесь: https://business.facebook.com/
2. Создайте приложение WhatsApp Business
3. Получите токен доступа
4. Настройте вебхук

```env
WHATSAPP_API_URL=https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID
WHATSAPP_API_TOKEN=your-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
```

### Альтернативные решения

- **Twilio**: https://www.twilio.com/whatsapp
- **MessageBird**: https://messagebird.com/
- **360Dialog**: https://www.360dialog.com/

---

## 💳 Платежные системы

### Stripe

1. Регистрация: https://dashboard.stripe.com/register
2. Получите API ключи: Dashboard → Developers → API keys
3. Настройте вебхук: Dashboard → Developers → Webhooks

```env
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**URL вебхука:** `https://your-domain.com/api/webhook/stripe`

### Yookassa (ЮKassa)

1. Регистрация: https://yookassa.ru/
2. Личный кабинет → Настройки → API
3. Создайте магазин

```env
YOOKASSA_SHOP_ID=123456
YOOKASSA_SECRET_KEY=live_...
```

### Tinkoff

1. Подключение: https://www.tinkoff.ru/business/internet-acquiring/
2. Получите Terminal Key и Password

```env
TINKOFF_TERMINAL_KEY=TinkoffBankTest
TINKOFF_SECRET_KEY=your-password
```

### Kaspi.kz

1. Регистрация: https://kaspi.kz/merchantcabinet/
2. Раздел "Интеграция"

```env
KASPI_MERCHANT_ID=your-merchant-id
KASPI_API_KEY=your-api-key
```

### Emirates NBD (ОАЭ)

1. Свяжитесь с банком для подключения
2. Получите Merchant ID и API ключ

```env
EMIRATES_NBD_MERCHANT_ID=your-merchant-id
EMIRATES_NBD_API_KEY=your-api-key
```

---

## 🛒 Маркетплейсы

### Яндекс.Карты

1. Зарегистрируйте организацию: https://business.yandex.ru/
2. API ключ: https://developer.tech.yandex.ru/

```env
YANDEX_MAPS_API_KEY=your-api-key
YANDEX_MAPS_ORG_ID=your-org-id
```

### 2GIS

1. Регистрация: https://partner.2gis.ru/
2. Раздел "API"

```env
TWOGIS_API_KEY=your-api-key
TWOGIS_FIRM_ID=your-firm-id
```

### Google Business

1. Google My Business: https://business.google.com/
2. Google Cloud Console: https://console.cloud.google.com/
3. Включите Google My Business API

```env
GOOGLE_BUSINESS_API_KEY=your-api-key
GOOGLE_BUSINESS_LOCATION_ID=your-location-id
```

### Booksy

1. Регистрация: https://booksy.com/
2. Настройки → Интеграции

```env
BOOKSY_API_KEY=your-api-key
BOOKSY_BUSINESS_ID=your-business-id
```

### YCLIENTS

1. Регистрация: https://yclients.com/
2. Настройки → API

```env
YCLIENTS_LOGIN=your-login
YCLIENTS_PASSWORD=your-password
YCLIENTS_COMPANY_ID=your-company-id
```

### Wildberries

1. Личный кабинет: https://seller.wildberries.ru/
2. Настройки → API

```env
WILDBERRIES_API_KEY=your-api-key
WILDBERRIES_SUPPLIER_ID=your-supplier-id
```

### Ozon

1. Личный кабинет: https://seller.ozon.ru/
2. Настройки → API ключи

```env
OZON_CLIENT_ID=your-client-id
OZON_API_KEY=your-api-key
```

### Amazon

1. Seller Central: https://sellercentral.amazon.com/
2. Settings → User Permissions → Developer

```env
AMAZON_ACCESS_KEY=your-access-key
AMAZON_SECRET_KEY=your-secret-key
AMAZON_SELLER_ID=your-seller-id
```

---

## ✅ Проверка работоспособности

### 1. Проверка PDF генерации

```bash
cd backend
python3 -c "from services.pdf_generator import PDFGenerator; print('PDF OK')"
```

### 2. Проверка Email

```bash
python3 -c "
from services.document_sender import DocumentSender
import asyncio
sender = DocumentSender()
print('SMTP configured:', bool(sender.smtp_user))
"
```

### 3. Проверка миграций

```bash
cd backend/db/migrations
python3 run_all_migrations.py
```

### 4. Тест отправки документа

```python
# test_integration.py
import asyncio
from services.pdf_generator import generate_contract_pdf
from services.document_sender import send_document

async def test():
    # Генерация PDF
    pdf_data = {
        "id": 1,
        "contract_number": "TEST-001",
        "client_name": "Тестовый клиент",
        "client_phone": "+7 999 123-45-67",
        "amount": 5000
    }
    pdf_path = generate_contract_pdf(pdf_data)
    print(f"PDF создан: {pdf_path}")

    # Отправка по email
    result = await send_document(
        method="email",
        recipient="test@example.com",
        subject="Тестовый договор",
        message="Это тестовое сообщение",
        file_path=pdf_path
    )
    print(f"Отправка: {'✅ OK' if result else '❌ FAILED'}")

asyncio.run(test())
```

---

## 🔐 Безопасность

### Важные рекомендации:

1. **Никогда не коммитьте `.env` файл в Git**

   ```bash
   echo ".env" >> .gitignore
   ```

2. **Используйте разные ключи для dev и production**

3. **Регулярно обновляйте токены и пароли**

4. **Ограничьте права доступа к файлам**

   ```bash
   chmod 600 .env
   ```

5. **Используйте HTTPS для всех вебхуков**

---

## 🆘 Решение проблем

### PDF не генерируется

**Проблема:** Ошибка "Font not found"

**Решение:**

```bash
# Проверьте наличие шрифтов
fc-list | grep -i dejavu

# Если нет, установите
sudo apt-get install fonts-dejavu-core
```

### Email не отправляется

**Проблема:** "Authentication failed"

**Решение:**

- Проверьте пароль приложения (не основной пароль)
- Убедитесь, что включена двухфакторная аутентификация
- Проверьте настройки SMTP порта (587 или 465)

### Вебхуки не работают

**Проблема:** Вебхуки не приходят

**Решение:**

- Убедитесь, что сервер доступен из интернета
- Проверьте настройки файрвола
- Используйте ngrok для локального тестирования:
  ```bash
  ngrok http 8000
  ```

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи: `tail -f backend/logs/app.log`
2. Проверьте переменные окружения: `env | grep SMTP`
3. Обратитесь к документации конкретного сервиса

---

**Версия документа:** 1.0  
**Дата обновления:** 2026-01-09
