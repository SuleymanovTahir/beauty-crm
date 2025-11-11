# backend/bot/core.py
import google.generativeai as genai
import httpx
import os
import asyncio
from typing import Dict, Optional, List, Tuple
from datetime import datetime, timedelta

from config import GEMINI_API_KEY
from db import (
    get_salon_settings,
    get_bot_settings,
)


class SalonBot:
    """
    Главный класс AI-бота для салона красоты

    Отвечает за:
    - Загрузку настроек из БД
    - Построение промптов
    - Генерацию ответов через Gemini (с прокси)
    - Обработку логики диалогов
    """

    def __init__(self):
        """Инициализация бота - загружаем настройки из БД"""
        self.reload_settings()

        # ✅ Настройка прокси для обхода геоблокировки
        environment = os.getenv("ENVIRONMENT")
        proxy_url_raw = os.getenv("PROXY_URL")

        print("=" * 50)
        print(f"🔍 DEBUG: ENVIRONMENT = '{environment}'")
        print(f"🔍 DEBUG: PROXY_URL exists = {proxy_url_raw is not None}")
        if proxy_url_raw:
            print(f"🔍 DEBUG: PROXY_URL = '{proxy_url_raw[:30]}...'")

        self.proxy_url = proxy_url_raw if environment == "production" else None

        if self.proxy_url:
            print(f"✅ Прокси АКТИВЕН: {self.proxy_url.split('@')[1] if '@' in self.proxy_url else self.proxy_url[:30]}...")
        else:
            print(f"❌ Прокси ОТКЛЮЧЕН (env={environment}, proxy={proxy_url_raw is not None})")
        print("=" * 50)

        # Настраиваем Gemini (для fallback без прокси)
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')

        print("✅ Бот инициализирован (Gemini через прокси)")

    def reload_settings(self):
        """Перезагрузить настройки из БД"""
        self.salon = get_salon_settings()
        self.bot_settings = get_bot_settings()
        print(f"✅ Настройки загружены: {self.salon['name']}")

    def build_system_prompt(
        self,
        instagram_id: str,
        history: List[Tuple],
        booking_progress: Optional[Dict] = None,
        client_language: str = 'ru'
    ) -> str:
        """
        Построить system prompt из настроек БД

        Args:
            instagram_id: ID клиента в Instagram
            history: История сообщений
            booking_progress: Прогресс записи (deprecated)
            client_language: Язык клиента (ru/en/ar)

        Returns:
            str: Полный system prompt для Gemini
        """
        from .prompts import PromptBuilder

        builder = PromptBuilder(
            salon=self.salon,
            bot_settings=self.bot_settings
        )

        return builder.build_full_prompt(
            instagram_id=instagram_id,
            history=history,
            booking_progress=booking_progress or {},
            client_language=client_language
        )

    async def generate_response(
        self,
        user_message: str,
        instagram_id: str,
        history: Optional[List[Tuple]] = None,
        booking_progress: Optional[Dict] = None,
        client_language: str = 'ru'
    ) -> str:
        """
        Генерировать ответ используя Gemini через прокси

        Args:
            user_message: Сообщение от клиента
            instagram_id: ID клиента
            history: История чата
            booking_progress: Прогресс записи
            client_language: Язык клиента

        Returns:
            str: Ответ бота
        """
        # Построить system prompt
        system_prompt = self.build_system_prompt(
            instagram_id=instagram_id,
            history=history or [],
            booking_progress=booking_progress or {},
            client_language=client_language
        )
        full_prompt = f"{system_prompt}\n\nUser: {user_message}\nAssistant:"

        try:
            print("=" * 50)
            print("🤖 Generating AI response (Gemini via proxy)...")
            print(f"📝 User message: {user_message[:100]}")
            print(f"👤 Instagram ID: {instagram_id}")
            print(f"🌐 Language: {client_language}")
            supported = self.bot_settings.get('languages_supported', 'ru,en,ar')
            print(f"🗂️ Supported langs from DB: {supported}")
            print(f"✅ Client lang matches: {client_language in supported.split(',')}")
            print(f"📊 History length: {len(history) if history else 0}")

            # ✅ ВСЕГДА используем REST API через прокси
            ai_response = await self._generate_via_proxy(full_prompt)

            print(f"✅ AI response generated: {ai_response[:100]}")
            print("=" * 50)

            return ai_response

        except Exception as e:
            print("=" * 50)
            print(f"❌ Gemini API Error: {e}")
            print(f"📋 Тип ошибки: {type(e).__name__}")

            import traceback
            print(f"📋 Полный traceback:\n{traceback.format_exc()}")
            print("=" * 50)

            return self._get_fallback_response(client_language)

    async def _generate_via_proxy(self, prompt: str, max_retries: int = 3) -> str:
        """Генерация через Gemini REST API с прокси и retry механизмом"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={GEMINI_API_KEY}"

        max_chars = self.bot_settings.get('max_message_chars', 500)
        max_tokens = int(max_chars / 2.5)

        prompt_with_limit = f"""{prompt}

    ⚠️ КРИТИЧЕСКИ ВАЖНО: Твой ответ должен быть СТРОГО не более {max_chars} символов! Если не уложишься - обрежут принудительно.
    """

        payload = {
            "contents": [{
                "parts": [{"text": prompt_with_limit}]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": max_tokens,
                "stopSequences": []
            }
        }

        if self.proxy_url:
            print(f"🌐 Отправка через прокси: {self.proxy_url.split('@')[1] if '@' in self.proxy_url else self.proxy_url[:30]}")
        else:
            print("ℹ️ Прямое подключение к Gemini API (localhost режим)")

        for attempt in range(max_retries):
            try:
                if self.proxy_url:
                    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True, proxy=self.proxy_url) as client:
                        response = await client.post(url, json=payload)
                        data = response.json()
                else:
                    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                        response = await client.post(url, json=payload)
                        data = response.json()

                # ✅ ПРОВЕРКА 429 - RATE LIMIT
                if "error" in data:
                    error_code = data["error"].get("code")
                    error_msg = data["error"].get("message", "")

                    if error_code == 429:
                        if attempt < max_retries - 1:
                            wait_time = (2 ** attempt) * 2  # 2s, 4s, 8s
                            print(f"⚠️ Rate limit 429 (попытка {attempt + 1}/{max_retries}), ждём {wait_time}s...")
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            print(f"❌ Rate limit 429 после {max_retries} попыток, используем fallback")
                            raise Exception("Rate limit exceeded after retries")
                    else:
                        raise Exception(f"Gemini API error {error_code}: {error_msg}")

                # Извлекаем текст ответа
                if "candidates" in data and len(data["candidates"]) > 0:
                    candidate = data["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        parts = candidate["content"]["parts"]
                        if len(parts) > 0 and "text" in parts[0]:
                            response_text = parts[0]["text"].strip()

                            if len(response_text) > max_chars:
                                response_text = response_text[:max_chars-3] + "..."

                            print(f"✅ Успешно получен ответ (попытка {attempt + 1})")
                            return response_text

                raise Exception(f"Unexpected Gemini response structure")

            except httpx.HTTPError as e:
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 2
                    print(f"❌ HTTP Error (попытка {attempt + 1}/{max_retries}): {e}, retry через {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
                print(f"❌ HTTP Error после {max_retries} попыток: {e}")
                raise
            except Exception as e:
                if "Rate limit" in str(e) and attempt < max_retries - 1:
                    continue
                print(f"❌ Unexpected error: {e}")
                raise
            
        # Если все попытки исчерпаны
        raise Exception("All retry attempts exhausted")

    def _get_fallback_response(self, language: str = 'ru') -> str:
        """Резервный ответ при ошибке"""
        responses = {
            'ru': "Извините, я сейчас перегружен запросами 🤖 Наш менеджер скоро вам ответит! 💎",
            'en': "Sorry, I'm overloaded with requests 🤖 Our manager will reply soon! 💎",
            'ar': "عذراً، أنا محمل بالطلبات 🤖 سيرد عليك مديرنا قريباً! 💎"
        }
        return responses.get(language, responses['ru'])

    def should_greet(self, history: List[Tuple]) -> bool:
        """
        Определить нужно ли здороваться

        Returns:
            bool: True если нужно поздороваться
        """
        # Если это первое сообщение
        if len(history) <= 1:
            return True

        # Если прошло много времени (>6 часов + новый деловой день)
        if len(history) > 0:
            try:
                last_msg = history[-1]
                last_timestamp = datetime.fromisoformat(last_msg[2])
                now = datetime.now()
                time_diff = now - last_timestamp

                if time_diff > timedelta(hours=6):
                    # Проверяем смену "делового дня" (08:00 - следующий день)
                    last_business_day = (
                        last_timestamp.date()
                        if last_timestamp.hour >= 8
                        else (last_timestamp - timedelta(days=1)).date()
                    )
                    current_business_day = (
                        now.date()
                        if now.hour >= 8
                        else (now - timedelta(days=1)).date()
                    )

                    return current_business_day > last_business_day
            except:
                pass

        return False


# Глобальный экземпляр бота
_bot_instance = None


def get_bot() -> SalonBot:
    """Получить глобальный экземпляр бота (singleton)"""
    global _bot_instance
    if _bot_instance is None:
        _bot_instance = SalonBot()
    return _bot_instance