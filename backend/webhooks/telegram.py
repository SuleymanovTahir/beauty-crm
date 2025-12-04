"""
Обработчик webhook для Telegram Bot
Путь: /webhooks/telegram (отличается от Instagram webhook: /webhook)
"""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import json

from integrations.telegram_bot import telegram_bot
from utils.logger import log_info, log_error, log_warning

router = APIRouter(tags=["Telegram Webhook"])

@router.post("/webhooks/telegram")
async def handle_telegram_webhook(request: Request):
    """
    Обработка входящих обновлений от Telegram Bot API

    Telegram отправляет POST запросы на этот endpoint когда:
    - Пользователь пишет боту
    - Пользователь нажимает на кнопку
    - Происходят другие события
    """
    try:
        log_info("=" * 70, "telegram_webhook")
        log_info("📨 TELEGRAM WEBHOOK: POST request received", "telegram_webhook")

        # Получаем JSON от Telegram
        body_bytes = await request.body()
        body_str = body_bytes.decode('utf-8')
        update = json.loads(body_str)

        log_info(f"📦 Telegram update: {json.dumps(update, indent=2, ensure_ascii=False)[:500]}...", "telegram_webhook")

        # Обрабатываем обновление
        telegram_bot.process_update(update)

        log_info("✅ Telegram update processed successfully", "telegram_webhook")
        log_info("=" * 70, "telegram_webhook")

        # Telegram ожидает пустой 200 OK ответ
        return {"ok": True}

    except json.JSONDecodeError as e:
        log_error(f"❌ Invalid JSON from Telegram: {e}", "telegram_webhook")
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)
    except Exception as e:
        log_error(f"❌ Error processing Telegram webhook: {e}", "telegram_webhook", exc_info=True)
        # Telegram требует 200 OK даже при ошибке, чтобы не переотправлять обновления
        return {"ok": True}

@router.get("/webhooks/telegram/test")
async def test_telegram_webhook():
    """Тестовый эндпоинт для проверки работы Telegram webhook"""
    from datetime import datetime

    # Проверяем что токен загружен
    if not telegram_bot.token:
        return {
            "status": "error",
            "message": "Telegram bot token not loaded",
            "instructions": "Add token in Settings → Messengers → Telegram"
        }

    # Получаем информацию о боте
    try:
        import requests
        url = f"https://api.telegram.org/bot{telegram_bot.token}/getMe"
        response = requests.get(url, timeout=5)
        bot_info = response.json()

        if bot_info.get("ok"):
            bot_data = bot_info.get("result", {})
            return {
                "status": "ok",
                "message": "Telegram webhook is ready",
                "bot": {
                    "id": bot_data.get("id"),
                    "username": bot_data.get("username"),
                    "first_name": bot_data.get("first_name"),
                    "can_read_all_group_messages": bot_data.get("can_read_all_group_messages")
                },
                "webhook_url": "/webhooks/telegram",
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "status": "error",
                "message": "Invalid bot token",
                "error": bot_info.get("description")
            }
    except Exception as e:
        log_error(f"Error getting bot info: {e}", "telegram_webhook")
        return {
            "status": "error",
            "message": f"Error: {str(e)}"
        }

@router.get("/webhooks/telegram/info")
async def get_telegram_webhook_info():
    """Получить информацию о текущем webhook"""
    info = telegram_bot.get_webhook_info()

    if info.get("ok"):
        result = info.get("result", {})
        return {
            "status": "ok",
            "webhook": {
                "url": result.get("url", "Not set"),
                "has_custom_certificate": result.get("has_custom_certificate", False),
                "pending_update_count": result.get("pending_update_count", 0),
                "last_error_date": result.get("last_error_date"),
                "last_error_message": result.get("last_error_message"),
                "max_connections": result.get("max_connections", 40)
            }
        }
    else:
        return {
            "status": "error",
            "error": info.get("description", "Unknown error")
        }
