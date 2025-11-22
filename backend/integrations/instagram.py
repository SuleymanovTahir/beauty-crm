"""
Интеграция с Instagram Graph API
"""
import httpx
from core.config import PAGE_ACCESS_TOKEN
from utils.logger import log_error,log_info
import os


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
    
    proxy_url = os.getenv("PROXY_URL") if os.getenv("ENVIRONMENT") == "production" else None

    try:
        if proxy_url:
            async with httpx.AsyncClient(timeout=30.0, proxy=proxy_url) as client:
                response = await client.post(url, params=params, json=data)
        else:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, params=params, json=data)
        
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        error_msg = f"HTTP {e.response.status_code}: {e.response.text}"
        log_error(f"❌ Instagram API error: {error_msg}", "instagram")
        return {"error": error_msg}
    except Exception as e:
        log_error(f"❌ Ошибка отправки в Instagram: {e}", "instagram", exc_info=True)
        return {"error": str(e)}


async def send_file(recipient_id: str, file_url: str, file_type: str = "image") -> dict:
    """
    Отправить файл в Instagram
    
    Args:
        recipient_id: Instagram ID получателя
        file_url: URL файла (ОБЯЗАТЕЛЬНО публичный HTTPS без авторизации)
        file_type: Тип файла ("image", "file", "audio", "video")
    
    Returns:
        dict: Ответ от API или {"error": ...}
    """
    url = "https://graph.facebook.com/v18.0/me/messages"
    
    params = {"access_token": PAGE_ACCESS_TOKEN}
    
    # ✅ ИСПРАВЛЕНИЕ: Instagram API требует строгий формат
    if file_type == "image":
        attachment = {
            "type": "image",
            "payload": {
                "url": file_url,
                "is_reusable": False
            }
        }
    elif file_type == "video":
        attachment = {
            "type": "video",
            "payload": {
                "url": file_url,
                "is_reusable": False
            }
        }
    elif file_type == "audio":
        attachment = {
            "type": "audio",
            "payload": {
                "url": file_url,
                "is_reusable": False
            }
        }
    elif file_type == "file":
        attachment = {
            "type": "file",
            "payload": {
                "url": file_url,
                "is_reusable": False
            }
        }
    else:
        return {"error": f"Unsupported file type: {file_type}"}
    
    data = {
        "recipient": {"id": recipient_id},
        "message": {"attachment": attachment}
    }
    
    proxy_url = os.getenv("PROXY_URL") if os.getenv("ENVIRONMENT") == "production" else None

    try:
        log_info(f"📤 Отправка файла ({file_type}): {file_url[:80]}...", "instagram")
        log_info(f"📦 Payload: {data}", "instagram")
        
        if proxy_url:
            async with httpx.AsyncClient(timeout=120.0, proxy=proxy_url) as client:
                response = await client.post(url, params=params, json=data)
        else:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, params=params, json=data)
        
        if response.status_code != 200:
            error_text = response.text
            log_error(f"❌ Instagram API error {response.status_code}: {error_text}", "instagram")
            return {"error": f"HTTP {response.status_code}: {error_text}"}
        
        log_info(f"✅ Файл отправлен успешно", "instagram")
        return response.json()
        
    except httpx.HTTPStatusError as e:
        error_msg = f"HTTP {e.response.status_code}: {e.response.text}"
        log_error(f"❌ Ошибка отправки файла: {error_msg}", "instagram")
        return {"error": error_msg}
    except httpx.TimeoutException:
        log_error(f"⏱️ Timeout при отправке файла (120 секунд)", "instagram")
        return {"error": "Timeout: файл не был загружен за 120 секунд"}
    except Exception as e:
        log_error(f"❌ Неожиданная ошибка: {e}", "instagram", exc_info=True)
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
    
    proxy_url = os.getenv("PROXY_URL") if os.getenv("ENVIRONMENT") == "production" else None

    try:
        if proxy_url:
            async with httpx.AsyncClient(timeout=30.0, proxy=proxy_url) as client:
                await client.post(url, params=params, json=data)
        else:
            async with httpx.AsyncClient(timeout=30.0) as client:
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
    
    proxy_url = os.getenv("PROXY_URL") if os.getenv("ENVIRONMENT") == "production" else None

    try:
        if proxy_url:
            async with httpx.AsyncClient(timeout=30.0, proxy=proxy_url) as client:
                await client.post(url, params=params, json=data)
        else:
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.post(url, params=params, json=data)
    except Exception as e:
        print(f"⚠️ Не удалось отметить как прочитанное: {e}")


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
            "action": "react"
        }
    }
    
    proxy_url = os.getenv("PROXY_URL") if os.getenv("ENVIRONMENT") == "production" else None

    try:
        log_info(f"❤️ Отправка реакции {reaction} на сообщение {message_id}", "instagram")
        
        if proxy_url:
            async with httpx.AsyncClient(timeout=30.0, proxy=proxy_url) as client:
                response = await client.post(url, params=params, json=data)
        else:
            async with httpx.AsyncClient(timeout=30.0) as client:
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