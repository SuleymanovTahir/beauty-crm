#!/usr/bin/env python3
"""
Быстрая настройка Telegram webhook
"""
import sys
import os

# Добавляем backend в путь
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from integrations.telegram_bot import telegram_bot

# URL вашего сервера (zrok или production)
WEBHOOK_URL = "https://yznjajbkmllc.share.zrok.io/webhooks/telegram"

def main():
    print("=" * 70)
    print("🤖 НАСТРОЙКА TELEGRAM WEBHOOK")
    print("=" * 70)

    if not telegram_bot.token:
        print("❌ Telegram токен не найден!")
        print("   Проверьте файл .env.local или .env.production")
        return

    print(f"\n📍 Webhook URL: {WEBHOOK_URL}")
    print(f"🔑 Token: {telegram_bot.token[:10]}...{telegram_bot.token[-5:]}")

    # Получаем информацию о боте
    try:
        import requests
        me = requests.get(f"https://api.telegram.org/bot{telegram_bot.token}/getMe").json()
        if me.get("ok"):
            bot_info = me["result"]
            print(f"\n✅ Бот найден:")
            print(f"   Имя: {bot_info.get('first_name')}")
            print(f"   Username: @{bot_info.get('username')}")
            print(f"   ID: {bot_info.get('id')}")
    except Exception as e:
        print(f"\n⚠️ Не удалось получить информацию о боте: {e}")

    # Устанавливаем webhook
    print(f"\n🔧 Устанавливаю webhook...")
    result = telegram_bot.set_webhook(WEBHOOK_URL)

    if result.get("ok"):
        print("✅ Webhook успешно установлен!")
        print(f"   Описание: {result.get('description', 'OK')}")
    else:
        print("❌ Ошибка установки webhook:")
        print(f"   {result}")
        return

    # Проверяем webhook
    print(f"\n🔍 Проверяю webhook...")
    info = telegram_bot.get_webhook_info()

    if info.get("ok"):
        webhook_info = info["result"]
        print("✅ Статус webhook:")
        print(f"   URL: {webhook_info.get('url', 'не установлен')}")
        print(f"   Pending updates: {webhook_info.get('pending_update_count', 0)}")
        if webhook_info.get('last_error_message'):
            print(f"   ⚠️ Последняя ошибка: {webhook_info['last_error_message']}")
            print(f"   Время ошибки: {webhook_info.get('last_error_date', 'н/д')}")
        else:
            print(f"   ✅ Ошибок нет")

    print("\n" + "=" * 70)
    print("🎉 НАСТРОЙКА ЗАВЕРШЕНА!")
    print("=" * 70)
    print("\n📱 Протестируйте бота:")
    print("   1. Найдите вашего бота в Telegram")
    print("   2. Нажмите /start")
    print("   3. Отправьте любое сообщение")
    print("   4. Проверьте логи сервера\n")

if __name__ == "__main__":
    main()
