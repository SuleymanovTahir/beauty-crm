"""
Настройка Telegram Webhook

Этот скрипт настраивает webhook для Telegram бота.
"""
import requests
import sys
import os

# Добавляем корневую директорию в PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from integrations.telegram_bot import telegram_bot

def setup_webhook(webhook_url: str):
    """
    Настроить webhook для Telegram бота

    Args:
        webhook_url: Полный URL для webhook (например: https://yourdomain.com/webhooks/telegram)
    """
    print("=" * 70)
    print("🔧 НАСТРОЙКА TELEGRAM WEBHOOK")
    print("=" * 70)

    # Проверяем что токен загружен
    if not telegram_bot.token:
        print("❌ Telegram bot token not found!")
        print("   Please add token in: Settings → Messengers → Telegram")
        print("   Or run: python scripts/setup/save_telegram_token.py")
        return False

    print(f"✅ Token loaded: {telegram_bot.token[:20]}...")
    print(f"🌐 Webhook URL: {webhook_url}")

    # Проверяем информацию о боте
    try:
        url = f"https://api.telegram.org/bot{telegram_bot.token}/getMe"
        response = requests.get(url, timeout=10)
        bot_info = response.json()

        if bot_info.get("ok"):
            bot_data = bot_info["result"]
            print(f"\n📱 Bot Information:")
            print(f"   ID: {bot_data.get('id')}")
            print(f"   Username: @{bot_data.get('username')}")
            print(f"   Name: {bot_data.get('first_name')}")
        else:
            print(f"❌ Invalid bot token: {bot_info.get('description')}")
            return False
    except Exception as e:
        print(f"❌ Error getting bot info: {e}")
        return False

    # Настраиваем webhook
    print(f"\n🔗 Setting webhook...")
    result = telegram_bot.set_webhook(webhook_url)

    if result.get("ok"):
        print(f"✅ Webhook set successfully!")
        print(f"\n📊 Webhook Details:")
        webhook_result = result.get("result", {})
        if isinstance(webhook_result, bool):
            print(f"   Status: Active")
            print(f"   URL: {webhook_url}")
        else:
            print(f"   {webhook_result}")
    else:
        print(f"❌ Failed to set webhook!")
        print(f"   Error: {result.get('description', 'Unknown error')}")
        return False

    # Проверяем установленный webhook
    print(f"\n🔍 Verifying webhook...")
    info = telegram_bot.get_webhook_info()

    if info.get("ok"):
        webhook_info = info.get("result", {})
        print(f"✅ Webhook verified!")
        print(f"   URL: {webhook_info.get('url', 'Not set')}")
        print(f"   Pending updates: {webhook_info.get('pending_update_count', 0)}")

        if webhook_info.get('last_error_message'):
            print(f"   ⚠️  Last error: {webhook_info.get('last_error_message')}")
    else:
        print(f"⚠️  Could not verify webhook: {info.get('description')}")

    print("\n" + "=" * 70)
    print("✅ TELEGRAM WEBHOOK SETUP COMPLETE!")
    print("=" * 70)
    print("\n📝 Next steps:")
    print("   1. Make sure your server is accessible from the internet")
    print(f"   2. Test the webhook at: {webhook_url}")
    print("   3. Send a message to your bot in Telegram")
    print("   4. Check backend logs to see incoming messages")
    print("\n💡 Tip: You can test the endpoint locally using ngrok or similar tools")
    print("=" * 70)

    return True

def remove_webhook():
    """Удалить webhook (для testing с polling)"""
    if not telegram_bot.token:
        print("❌ Token not loaded")
        return False

    result = telegram_bot.set_webhook("")
    if result.get("ok"):
        print("✅ Webhook removed successfully!")
        return True
    else:
        print(f"❌ Failed to remove webhook: {result.get('description')}")
        return False

if __name__ == '__main__':
    print("\n🤖 Telegram Webhook Setup")
    print("\nOptions:")
    print("1. Set webhook (for production)")
    print("2. Remove webhook (for local testing)")
    print("3. Check webhook status")

    choice = input("\nEnter your choice (1-3): ").strip()

    if choice == '1':
        print("\n📝 Enter your webhook URL")
        print("Example: https://yourdomain.com/webhooks/telegram")
        print("For ngrok: https://abc123.ngrok.io/webhooks/telegram")

        webhook_url = input("\nWebhook URL: ").strip()

        if not webhook_url:
            print("❌ Webhook URL cannot be empty!")
            sys.exit(1)

        if not webhook_url.startswith('https://'):
            print("⚠️  Warning: Telegram requires HTTPS!")
            confirm = input("Continue anyway%s (y/n): ").strip().lower()
            if confirm != 'y':
                sys.exit(0)

        setup_webhook(webhook_url)

    elif choice == '2':
        confirm = input("Remove webhook%s (y/n): ").strip().lower()
        if confirm == 'y':
            remove_webhook()

    elif choice == '3':
        if not telegram_bot.token:
            print("❌ Token not loaded")
        else:
            print("\n🔍 Checking webhook status...")
            info = telegram_bot.get_webhook_info()
            if info.get("ok"):
                webhook_info = info.get("result", {})
                print(f"\n📊 Webhook Status:")
                print(f"   URL: {webhook_info.get('url') or 'Not set'}")
                print(f"   Pending updates: {webhook_info.get('pending_update_count', 0)}")
                print(f"   Max connections: {webhook_info.get('max_connections', 40)}")
                if webhook_info.get('last_error_date'):
                    from datetime import datetime
                    error_date = datetime.fromtimestamp(webhook_info.get('last_error_date'))
                    print(f"   Last error: {error_date} - {webhook_info.get('last_error_message')}")
            else:
                print(f"❌ Error: {info.get('description')}")
    else:
        print("❌ Invalid choice!")
