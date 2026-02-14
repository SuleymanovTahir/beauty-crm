"""
Telegram Bot Integration
Обработка сообщений от Telegram Bot API
"""
from db.connection import get_db_connection
import httpx
from datetime import datetime
from typing import Optional, Dict, Any

from core.config import TELEGRAM_BOT_TOKEN
from utils.logger import log_info, log_error
from db.settings import get_salon_settings


async def _notify_chat_ws_new_message(client_id: str, message_data: Dict[str, Any]) -> None:
    """
    Best-effort WS notification for admin chat.
    Site runtime must stay operational even if chat WS module is unavailable.
    """
    try:
        from api.chat_ws import notify_new_message
    except Exception as error:
        log_info(f"Chat WS module unavailable, skip notify_new_message: {error}", "telegram")
        return

    try:
        await notify_new_message(client_id, message_data)
    except Exception as error:
        log_error(f"Error sending Telegram WS notification: {error}", "telegram")


class TelegramBot:
    """Класс для работы с Telegram Bot API"""

    def __init__(self):
        """Инициализация бота"""
        self.token = None
        self.base_url = None
        self.load_token()

    def load_token(self):
        """Загрузить токен из переменных окружения или БД"""
        try:
            # Сначала пробуем загрузить из .env
            if TELEGRAM_BOT_TOKEN:
                self.token = TELEGRAM_BOT_TOKEN
                self.base_url = f"https://api.telegram.org/bot{self.token}"
                log_info("Telegram bot token loaded from .env", "telegram")
                return

            # Fallback: загрузка из БД (для обратной совместимости)
            conn = get_db_connection()
            c = conn.cursor()
            c.execute("""
                SELECT api_token
                FROM messenger_settings
                WHERE messenger_type = 'telegram' AND is_enabled = TRUE
            """)
            result = c.fetchone()
            conn.close()

            if result and result[0]:
                self.token = result[0]
                self.base_url = f"https://api.telegram.org/bot{self.token}"
                log_info("Telegram bot token loaded from database", "telegram")
            else:
                log_error("Telegram bot token not found in .env or database", "telegram")
        except Exception as e:
            log_error(f"Error loading Telegram token: {e}", "telegram")

    async def set_webhook(self, webhook_url: str) -> Dict[str, Any]:
        """
        Установить webhook для получения обновлений
        Args:
            webhook_url: URL для webhook (например: https://yourdomain.com/webhooks/telegram)
        """
        if not self.token:
            return {"success": False, "error": "Token not loaded"}

        try:
            url = f"{self.base_url}/setWebhook"
            data = {
                "url": webhook_url,
                "allowed_updates": ["message", "callback_query"]
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=data)
            result = response.json()

            if result.get("ok"):
                log_info(f"Webhook set successfully: {webhook_url}", "telegram")
            else:
                log_error(f"Failed to set webhook: {result}", "telegram")

            return result
        except Exception as e:
            log_error(f"Error setting webhook: {e}", "telegram")
            return {"success": False, "error": str(e)}

    async def send_message(self, chat_id: int, text: str, parse_mode: str = "HTML") -> Dict[str, Any]:
        """
        Отправить сообщение
        Args:
            chat_id: ID чата
            text: Текст сообщения
            parse_mode: Режим парсинга (HTML или Markdown)
        """
        if not self.token:
            return {"success": False, "error": "Token not loaded"}

        try:
            url = f"{self.base_url}/sendMessage"
            data = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": parse_mode
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=data)
            result = response.json()

            if result.get("ok"):
                log_info(f"Message sent to {chat_id}", "telegram")
            else:
                log_error(f"Failed to send message: {result}", "telegram")

            return result
        except Exception as e:
            log_error(f"Error sending message: {e}", "telegram")
            return {"success": False, "error": str(e)}

    async def get_webhook_info(self) -> Dict[str, Any]:
        """Получить информацию о текущем webhook"""
        if not self.token:
            return {"success": False, "error": "Token not loaded"}

        try:
            url = f"{self.base_url}/getWebhookInfo"
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
            return response.json()
        except Exception as e:
            log_error(f"Error getting webhook info: {e}", "telegram")
            return {"success": False, "error": str(e)}

    async def process_update(self, update: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Обработать входящее обновление от Telegram
        Args:
            update: JSON с обновлением от Telegram API
        Returns:
            Ответное сообщение или None
        """
        try:
            # Обрабатываем текстовое сообщение
            if "message" in update:
                message = update["message"]
                chat_id = message["chat"]["id"]
                user = message["from"]
                text = message.get("text", "")

                # Логируем получение сообщения
                log_info(f"Received Telegram message from {user.get('username', user.get('first_name'))}: {text}", "telegram")

                # Уведомляем админов через WebSocket
                client_id = f"telegram_{chat_id}"
                
                ws_message = {
                    "id": message["message_id"],
                    "message_text": text,
                    "sender_type": "client",
                    "created_at": datetime.now().isoformat(),
                    "message_type": "text"
                }
                
                await _notify_chat_ws_new_message(client_id, ws_message)

                # Сохраняем сообщение в БД
                self.save_message(
                    chat_id=chat_id,
                    message_id=message["message_id"],
                    from_user=user,
                    text=text,
                    sender_type="client"
                )

                # Получаем или создаем клиента
                self.get_or_create_client(chat_id, user)

                # Формируем ответ
                from db.settings import get_bot_settings
                bot_settings = get_bot_settings()

                if text == "/start":
                    greeting = bot_settings.get("greeting_message")
                    if isinstance(greeting, str) and greeting.strip():
                        return await self.send_message(chat_id, greeting.strip())

                    log_info("Telegram /start received, but greeting_message is not configured", "telegram")
                    return None

                auto_reply = bot_settings.get("telegram_auto_reply_message")
                if not isinstance(auto_reply, str) or not auto_reply.strip():
                    log_info(
                        f"Telegram auto-reply skipped for {client_id}: telegram_auto_reply_message is not configured",
                        "telegram",
                    )
                    return None

                response_text = auto_reply.strip()

                # Сохраняем ответ в БД
                self.save_message(
                    chat_id=chat_id,
                    message_id=0,  # Временное ID
                    from_user={"username": "bot", "first_name": "Assistant"},
                    text=response_text,
                    sender_type="bot"
                )

                # Уведомляем через WS
                await _notify_chat_ws_new_message(
                    client_id,
                    {
                        "id": f"bot_{chat_id}_{int(datetime.now().timestamp())}",
                        "message_text": response_text,
                        "sender_type": "bot",
                        "created_at": datetime.now().isoformat(),
                        "message_type": "text",
                    },
                )

                return await self.send_message(chat_id, response_text)

            return None
        except Exception as e:
            log_error(f"Error processing Telegram update: {e}", "telegram")
            return None

    def save_message(self, chat_id: int, message_id: int, from_user: Dict, text: str, sender_type: str):
        """Сохранить сообщение в БД"""
        try:
            conn = get_db_connection()
            c = conn.cursor()

            # Используем chat_id как client_id для Telegram
            client_id = f"telegram_{chat_id}"

            c.execute("""
                INSERT INTO messenger_messages
                (messenger_type, client_id, external_message_id, sender_type, message_text, is_read, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                'telegram',
                client_id,
                str(message_id),
                sender_type,
                text,
                True if sender_type == 'admin' else False,
                datetime.now().isoformat()
            ))

            conn.commit()
            conn.close()
            log_info(f"Telegram message saved: {message_id}", "telegram")
        except Exception as e:
            log_error(f"Error saving Telegram message: {e}", "telegram")

    def get_or_create_client(self, chat_id: int, user: Dict) -> Optional[Dict]:
        """Получить или создать клиента в БД"""
        try:
            conn = get_db_connection()
            c = conn.cursor()

            client_id = f"telegram_{chat_id}"
            username = user.get("username", "")
            first_name = user.get("first_name", "")
            last_name = user.get("last_name", "")
            full_name = f"{first_name} {last_name}".strip()

            # Проверяем есть ли клиент
            c.execute("SELECT instagram_id, name FROM clients WHERE instagram_id = %s", (client_id,))
            existing = c.fetchone()

            if existing:
                conn.close()
                return {"id": existing[0], "name": existing[1]}

            # Создаем нового клиента
            c.execute("""
                INSERT INTO clients (instagram_id, username, name, first_contact, last_contact, status)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                client_id,
                username or f"tg_{chat_id}",
                full_name or first_name or "Telegram User",
                datetime.now().isoformat(),
                datetime.now().isoformat(),
                'lead'
            ))

            conn.commit()
            conn.close()

            log_info(f"New Telegram client created: {client_id}", "telegram")
            return {"id": client_id, "name": full_name}
        except Exception as e:
            log_error(f"Error creating Telegram client: {e}", "telegram")
            return None

    # ... (process_update and other methods remain unchanged) ...

# Глобальный экземпляр бота
telegram_bot = TelegramBot()

# ... (skip to send_telegram_alert) ...

async def send_telegram_alert(message: str, chat_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Отправить алерт менеджеру в Telegram
    
    Args:
        message: Текст сообщения (поддерживает HTML)
        chat_id: ID чата (если None, берется из .env или настроек салона)
                 Можно указать несколько ID через запятую: "123,456,789"
    
    Returns:
        Результат отправки
    """
    try:
        
        # Если chat_id не указан, берем из переменных окружения или настроек
        if chat_id is None:
            import os
            # Приоритет: .env > база данных
            chat_ids_str = os.getenv('TELEGRAM_MANAGER_CHAT_ID')
            
            if not chat_ids_str:
                # Fallback: берем из настроек салона
                salon_settings = get_salon_settings()
                chat_ids_str = salon_settings.get('telegram_manager_chat_id')
            
            if not chat_ids_str:
                log_error("Telegram manager chat_id not configured in .env or salon settings", "telegram")
                return {"success": False, "error": "Manager chat_id not configured"}
            
            # Убираем скобки если есть: (123,456) -> 123,456
            chat_ids_str = str(chat_ids_str).strip('()')

            # Поддержка нескольких ID через запятую
            chat_ids = [id.strip() for id in chat_ids_str.split(',')]
        else:
            chat_ids = [str(chat_id)]
        
        # Отправляем сообщение всем указанным чатам
        results = []
        for cid in chat_ids:
            try:
                # Reverting to synchronous call to fix boot error
                # Timeout is handled inside send_message
                result = await telegram_bot.send_message(int(cid), message, parse_mode="HTML")
                results.append({"chat_id": cid, "result": result})
                
                if result.get("ok"):
                    log_info(f"Alert sent to Telegram chat {cid}", "telegram")
                else:
                    log_error(f"Failed to send Telegram alert to {cid}: {result}", "telegram")
            except Exception as e:
                log_error(f"Error sending to chat {cid}: {e}", "telegram")
                results.append({"chat_id": cid, "error": str(e)})
        
        # Проверяем, хотя бы одно сообщение отправлено успешно
        success_count = sum(1 for r in results if r.get("result", {}).get("ok"))
        
        if success_count > 0:
            log_info(f"Alert sent to {success_count}/{len(chat_ids)} Telegram chats", "telegram")
            return {"success": True, "results": results, "sent_count": success_count}
        else:
            log_error(f"Failed to send Telegram alert to all chats", "telegram")
            return {"success": False, "error": "Failed to send to all chats", "results": results}
            
    except Exception as e:
        log_error(f"Error sending Telegram alert: {e}", "telegram")
        return {"success": False, "error": str(e)}
