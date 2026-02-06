# Ключи hCaptcha для Beauty CRM

Капча используется на страницах **логина** и **регистрации** (публичный лендинг и CRM).

## Где взять ключи

1. **Регистрация / вход**  
   [https://dashboard.hcaptcha.com/signup](https://dashboard.hcaptcha.com/signup)

2. **Site Key (для фронтенда)**  
   В дашборде: вкладка **Sites** → создайте сайт или выберите существующий → скопируйте **Site Key**.  
   Прямая ссылка: [https://dashboard.hcaptcha.com/sites](https://dashboard.hcaptcha.com/sites)

3. **Secret Key (для бэкенда)**  
   В дашборде: **Settings** → **Secret Keys** → **Generate New Secret**.  
   Прямая ссылка: [https://dashboard.hcaptcha.com/settings](https://dashboard.hcaptcha.com/settings)

## Куда прописать

| Переменная | Где | Описание |
|------------|-----|----------|
| `VITE_HCAPTCHA_SITE_KEY` | Frontend (`.env` / `.env.production`) | Site Key — публичный, используется в браузере |
| `HCAPTCHA_SECRET_KEY` | Backend (`.env`) | Secret Key — только на сервере для проверки ответа капчи |

Если ключи не заданы, на фронте подставляется **тестовый** ключ hCaptcha (`10000000-ffff-...`); в продакшене лучше задать свои ключи из дашборда.

Документация: [https://docs.hcaptcha.com/](https://docs.hcaptcha.com/)
