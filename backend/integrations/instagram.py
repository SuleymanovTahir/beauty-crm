
"""
Интеграция с Instagram Graph API
"""
import httpx
from config import PAGE_ACCESS_TOKEN
from logger import log_error,log_info


async def send_message(recipient_id: str, message: str) -> dict:
    """
    Отправить сообщение в Instagram
    
    Args:
        recipient_id: Instagram ID получателя
        message: Текст сообщения
    
    Returns:
        dict: Ответ от API или {"error": ...}
    """
    url = "https://graph.facebook.com/v18.0/me/messages"
    
    params = {"access_token": PAGE_ACCESS_TOKEN}
    
    data = {
        "recipient": {"id": recipient_id},
        "message": {"text": message}
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, params=params, json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Ошибка отправки в Instagram: {e}")
            return {"error": str(e)}



# ✅ НОВАЯ ФУНКЦИЯ: Отправка файлов
async def send_file(recipient_id: str, file_url: str, file_type: str = "image") -> dict:
    """
    Отправить файл в Instagram
    
    Args:
        recipient_id: Instagram ID получателя
        file_url: URL файла (должен быть доступен публично)
        file_type: Тип файла ("image", "file", "audio", "video")
    
    Returns:
        dict: Ответ от API или {"error": ...}
    """
    url = "https://graph.facebook.com/v18.0/me/messages"
    
    params = {"access_token": PAGE_ACCESS_TOKEN}
    
    # Формируем payload в зависимости от типа
    if file_type == "image":
        attachment = {
            "type": "image",
            "payload": {"url": file_url, "is_reusable": True}
        }
    elif file_type == "file":
        attachment = {
            "type": "file",
            "payload": {"url": file_url, "is_reusable": True}
        }
    elif file_type == "audio":
        attachment = {
            "type": "audio",
            "payload": {"url": file_url, "is_reusable": True}
        }
    elif file_type == "video":
        attachment = {
            "type": "video",
            "payload": {"url": file_url, "is_reusable": True}
        }
    else:
        return {"error": f"Unsupported file type: {file_type}"}
    
    data = {
        "recipient": {"id": recipient_id},
        "message": {"attachment": attachment}
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            log_info(f"📤 Отправка файла ({file_type}): {file_url[:50]}...", "instagram")
            response = await client.post(url, params=params, json=data)
            response.raise_for_status()
            
            log_info(f"✅ Файл отправлен успешно", "instagram")
            return response.json()
        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP {e.response.status_code}: {e.response.text}"
            log_error(f"❌ Ошибка отправки файла: {error_msg}", "instagram")
            return {"error": error_msg}
        except Exception as e:
            log_error(f"❌ Ошибка отправки файла: {e}", "instagram")
            return {"error": str(e)}


async def send_typing_indicator(recipient_id: str) -> None:
    """
    Показать индикатор печати
    
    Args:
        recipient_id: Instagram ID получателя
    """
    url = "https://graph.facebook.com/v18.0/me/messages"
    
    params = {"access_token": PAGE_ACCESS_TOKEN}
    
    data = {
        "recipient": {"id": recipient_id},
        "sender_action": "typing_on"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.post(url, params=params, json=data)
        except Exception as e:
            print(f"⚠️ Не удалось показать typing: {e}")


async def mark_as_seen(recipient_id: str) -> None:
    """
    Отметить сообщение как прочитанное
    
    Args:
        recipient_id: Instagram ID отправителя
    """
    url = "https://graph.facebook.com/v18.0/me/messages"
    
    params = {"access_token": PAGE_ACCESS_TOKEN}
    
    data = {
        "recipient": {"id": recipient_id},
        "sender_action": "mark_seen"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.post(url, params=params, json=data)
        except Exception as e:
            print(f"⚠️ Не удалось отметить как прочитанное: {e}")

# ✅ НОВАЯ ФУНКЦИЯ: Отправка реакции
async def send_reaction(recipient_id: str, message_id: str, reaction: str = "❤️") -> dict:
    """
    Отправить реакцию на сообщение
    
    Args:
        recipient_id: Instagram ID получателя
        message_id: ID сообщения для реакции
        reaction: Эмодзи реакции (по умолчанию ❤️)
    
    Returns:
        dict: Ответ от API или {"error": ...}
    """
    url = "https://graph.facebook.com/v18.0/me/messages"
    
    params = {"access_token": PAGE_ACCESS_TOKEN}
    
    data = {
        "recipient": {"id": recipient_id},
        "sender_action": "react",
        "reaction": {
            "message_id": message_id,
            "reaction": reaction,
            "action": "react"  # или "unreact" для удаления
        }
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            log_info(f"❤️ Отправка реакции {reaction} на сообщение {message_id}", "instagram")
            response = await client.post(url, params=params, json=data)
            response.raise_for_status()
            
            log_info(f"✅ Реакция отправлена", "instagram")
            return response.json()
        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP {e.response.status_code}: {e.response.text}"
            log_error(f"❌ Ошибка отправки реакции: {error_msg}", "instagram")
            return {"error": error_msg}
        except Exception as e:
            log_error(f"❌ Ошибка отправки реакции: {e}", "instagram")
            return {"error": str(e)}