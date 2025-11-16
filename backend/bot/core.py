# backend/bot/core.py
import google.generativeai as genai
import httpx
import os
import asyncio
from typing import Dict, Optional, List, Tuple
from datetime import datetime, timedelta

from core.config import GEMINI_API_KEY, GEMINI_MODEL
from db import (
    get_salon_settings,
    get_bot_settings,
    get_client_by_id,
)
from services.smart_assistant import SmartAssistant
from services.conversation_context import ConversationContext


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
        environment = os.getenv("ENVIRONMENT", "development")
        proxy_url_raw = os.getenv("PROXY_URL", "")

        print("=" * 50)
        print(f"🔍 ENVIRONMENT: {environment}")
        print(f"🔍 PROXY_URL: {'установлен' if proxy_url_raw else 'не установлен'}")

        # Прокси активны только если:
        # 1. Окружение = production
        # 2. PROXY_URL не пустой
        if environment == "production" and proxy_url_raw:
            self.proxy_url = proxy_url_raw
            proxy_display = self.proxy_url.split('@')[1] if '@' in self.proxy_url else self.proxy_url[:30]
            print(f"✅ Прокси АКТИВЕН: {proxy_display}...")
        else:
            self.proxy_url = None
            print(f"❌ Прокси ОТКЛЮЧЕН")

        # Настраиваем Gemini (для fallback без прокси)
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel(GEMINI_MODEL)

        print("✅ Бот инициализирован (Gemini через прокси)")

    def reload_settings(self):
        """Перезагрузить настройки из БД"""
        from .prompts import PromptBuilder

        self.salon = get_salon_settings()
        self.bot_settings = get_bot_settings()

        # ✅ Инициализируем prompt_builder
        self.prompt_builder = PromptBuilder(
            salon=self.salon,
            bot_settings=self.bot_settings
        )

        print(f"✅ Настройки загружены: {self.salon['name']}")

    def build_system_prompt(
        self,
        instagram_id: str,
        history: List[Tuple],
        booking_progress: Optional[Dict] = None,
        client_language: str = 'ru'
    ) -> str:
        """..."""
        from .prompts import PromptBuilder

        builder = PromptBuilder(
            salon=self.salon,
            bot_settings=self.bot_settings
        )

        # ✅ СНАЧАЛА СОЗДАЁМ ПРОМПТ
        system_prompt = builder.build_full_prompt(
            instagram_id=instagram_id,
            history=history,
            booking_progress=booking_progress or {},
            client_language=client_language
        )

        # ✅ ПОТОМ ПРОВЕРЯЕМ
        if "ДОСТУПНЫЕ МАСТЕРА" in system_prompt:
            print(f"   ✅ Блок мастеров найден")
        else:
            print(f"   ⚠️ Блок мастеров ОТСУТСТВУЕТ!")

        return system_prompt

    async def generate_response(
        self,
        user_message: str,
        instagram_id: str,
        history: List[Tuple],
        client_language: str = 'ru',
        booking_progress: Optional[Dict] = None,
        context_flags: Optional[Dict] = None
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


        # ✅ ИСПРАВЛЕНИЕ: Сначала строим additional_context, ПОТОМ промпт
        additional_context = ""

        # 🧠 УМНЫЙ АССИСТЕНТ: Персонализация на основе истории клиента
        try:
            assistant = SmartAssistant(instagram_id)

            # Если это приветствие или начало диалога
            if self.should_greet(history):
                client = get_client_by_id(instagram_id)
                client_name = client[3] if client and client[3] else "друг"

                personalized_greeting = assistant.get_personalized_greeting(client_name)
                additional_context += f"\n\n💎 ПЕРСОНАЛИЗИРОВАННОЕ ПРИВЕТСТВИЕ:\n{personalized_greeting}\n"
                additional_context += "⚠️ ИСПОЛЬЗУЙ ЭТО ПРИВЕТСТВИЕ вместо стандартного!\n"

            # Умное предложение записи (если есть история)
            if len(history) > 0:
                suggestion = assistant.suggest_next_booking()
                if suggestion and suggestion.get('confidence', 0) > 0.6:
                    suggestion_message = assistant.generate_booking_suggestion_message(
                        client[3] if client and client[3] else "друг"
                    )
                    additional_context += f"\n\n🎯 УМНОЕ ПРЕДЛОЖЕНИЕ ЗАПИСИ:\n{suggestion_message}\n"
                    additional_context += f"Рекомендуемая дата: {suggestion['recommended_date']}\n"
                    additional_context += f"Уверенность: {suggestion['confidence']*100:.0f}%\n"
                    additional_context += "💡 Если клиент спрашивает о записи - используй это предложение!\n"
        except Exception as e:
            # Не критично, если SmartAssistant не сработал
            print(f"ℹ️ SmartAssistant skipped: {e}")

        # 💬 КОНТЕКСТ РАЗГОВОРА: Проверяем активные контексты
        try:
            conv_context = ConversationContext(instagram_id)
            active_contexts = conv_context.get_all_active_contexts()

            if active_contexts:
                additional_context += f"\n\n📋 АКТИВНЫЕ КОНТЕКСТЫ РАЗГОВОРА:\n"

                # Процесс записи в процессе
                if "booking_in_progress" in active_contexts:
                    booking_ctx = active_contexts["booking_in_progress"]["data"]
                    additional_context += f"\n🔄 НЕЗАВЕРШЕННАЯ ЗАПИСЬ:\n"
                    additional_context += f"   Текущий шаг: {booking_ctx.get('step', '?')}\n"
                    additional_context += f"   Услуга: {booking_ctx.get('service', 'не выбрана')}\n"
                    additional_context += f"   Мастер: {booking_ctx.get('master', 'не выбран')}\n"
                    additional_context += f"   Дата: {booking_ctx.get('date', 'не выбрана')}\n"
                    additional_context += f"   Время: {booking_ctx.get('time', 'не выбрано')}\n"
                    additional_context += "⚠️ ПРОДОЛЖИ этот процесс записи! Спроси про следующий шаг.\n"

                # Ожидание подтверждения
                if "awaiting_confirmation" in active_contexts:
                    confirm_ctx = active_contexts["awaiting_confirmation"]["data"]
                    additional_context += f"\n⏳ ОЖИДАЕТСЯ ПОДТВЕРЖДЕНИЕ:\n"
                    additional_context += f"   Вопрос: {confirm_ctx.get('question', '?')}\n"
                    if "booking_details" in confirm_ctx:
                        details = confirm_ctx["booking_details"]
                        additional_context += f"   Детали записи: {details}\n"
                    additional_context += "⚠️ Проверь, является ли сообщение подтверждением (да/нет).\n"

                # Ожидание выбора из опций
                if "awaiting_choice" in active_contexts:
                    choice_ctx = active_contexts["awaiting_choice"]["data"]
                    additional_context += f"\n🎯 ОЖИДАЕТСЯ ВЫБОР:\n"
                    additional_context += f"   Вопрос: {choice_ctx.get('question', '?')}\n"
                    additional_context += f"   Опции: {choice_ctx.get('options', [])}\n"
                    additional_context += "⚠️ Проверь, выбрал ли клиент одну из опций.\n"

        except Exception as e:
            print(f"ℹ️ ConversationContext skipped: {e}")

        if context_flags:
            if context_flags.get('has_incomplete_booking'):
                incomplete = context_flags['incomplete_booking']
                additional_context += f"\n\n⚠️ У КЛИЕНТА ЕСТЬ НЕЗАВЕРШЁННАЯ ЗАПИСЬ:\n"
                additional_context += f"Услуга: {incomplete.get('service_name', '?')}\n"
                additional_context += f"Шаг: {incomplete.get('step', '?')}\n"
                additional_context += "ПРЕДЛОЖИ ПРОДОЛЖИТЬ ЭТУ ЗАПИСЬ!\n"

            if context_flags.get('is_urgent'):
                additional_context += "\n\n🚨 СРОЧНОСТЬ! КЛИЕНТ УЕЗЖАЕТ/ВАЖНОЕ СОБЫТИЕ!\n"
                additional_context += "⚠️ НЕ ЗАДАВАЙ ВОПРОСЫ 'На какой день?' - СРАЗУ ПОКАЖИ ВСЕ ДОСТУПНЫЕ ОКНА!\n"
                additional_context += "Формат: 'Понял срочность! Завтра есть: 11:00, 14:00, 17:00. Что удобно?'\n"

            if context_flags.get('is_corporate'):
                additional_context += "\n\n🏢 КОРПОРАТИВНАЯ ЗАЯВКА (группа 5+ человек)\n"
                additional_context += "ПЕРЕКЛЮЧИ НА МЕНЕДЖЕРА: 'Для корпоративных групп есть спецусловия! Передаю менеджеру'\n"

            # ✅ #5 - Проверка "горячего" клиента
            from db.clients import is_hot_client, get_client_interest_count
            if is_hot_client(instagram_id):
                service_interest = None
                for service in ['Manicure', 'Pedicure', 'Hair', 'Massage']:
                    count = get_client_interest_count(instagram_id, service)
                    if count >= 3:
                        service_interest = service
                        break
                    
                if service_interest:
                    additional_context += f"\n\n🔥 ГОРЯЧИЙ КЛИЕНТ!\n"
                    additional_context += f"Спрашивал про {service_interest} {count} раз\n"

            # ✅ #10 - UPSELL: Проверка давно ли делал другие услуги
            from bot.prompts import get_last_service_date
            from datetime import datetime
            now = datetime.now()

            message_lower = user_message.lower()

            for upsell_service in ['Pedicure', 'Manicure']:
                service_ru = 'педикюр' if upsell_service == 'Pedicure' else 'маникюр'

                if service_ru not in message_lower and upsell_service.lower() not in message_lower:
                    last_date = get_last_service_date(instagram_id, upsell_service)

                    if last_date:
                        try:
                            from datetime import datetime
                            last_dt = datetime.fromisoformat(last_date)
                            days_since = (now - last_dt).days

                            if days_since > 21:
                                additional_context += f"\n\n💡 UPSELL! Клиент не был на {service_ru} {days_since} дней!\n"
                                additional_context += f"⚠️ ОБЯЗАТЕЛЬНО ПРЕДЛОЖИ: 'Кстати, давно не обновляли {service_ru} - добавить к записи?'\n"
                                break
                        except:
                            pass
                        
        # ✅ ТЕПЕРЬ строим промпт с уже готовым additional_context
        system_prompt = self.prompt_builder.build_full_prompt(
            instagram_id=instagram_id,
            history=history,
            booking_progress=booking_progress,
            client_language=client_language,
            additional_context=additional_context  # ✅ ПЕРЕДАЁМ В ПРОМПТ
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
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

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

        # ✅ РОТАЦИЯ ПРОКСИ
        proxy_urls = []
        if self.proxy_url:
            proxy_urls.append(self.proxy_url)
        proxy_2 = os.getenv("PROXY_URL_2")
        proxy_3 = os.getenv("PROXY_URL_3")
        if proxy_2:
            proxy_urls.append(proxy_2)
        if proxy_3:
            proxy_urls.append(proxy_3)

        if not proxy_urls:
            print("ℹ️ Прямое подключение к Gemini API (localhost режим)")

        for attempt in range(max_retries):
            try:
                # ✅ Выбираем прокси по кругу
                current_proxy = proxy_urls[attempt % len(proxy_urls)] if proxy_urls else None

                if current_proxy:
                    proxy_display = current_proxy.split('@')[1] if '@' in current_proxy else current_proxy[:30]
                    print(f"🌐 Попытка {attempt + 1}/{max_retries} через прокси: {proxy_display}")

                    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True, proxy=current_proxy) as client:
                        response = await client.post(url, json=payload)
                        data = response.json()
                else:
                    print(f"ℹ️ Попытка {attempt + 1}/{max_retries} (прямое подключение)")
                    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                        response = await client.post(url, json=payload)
                        data = response.json()

                # ✅ ПРОВЕРКА 429 - RATE LIMIT
                if "error" in data:
                    error_code = data["error"].get("code")
                    error_msg = data["error"].get("message", "")

                    if error_code == 429:
                        if attempt < max_retries - 1:
                            wait_time = (2 ** attempt) * 5  # 5s, 10s, 20s (увеличено!)
                            print(f"⚠️ Rate limit 429 (попытка {attempt + 1}/{max_retries}), ждём {wait_time}s...")
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            print(f"❌ Rate limit 429 после {max_retries} попыток через все прокси")
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

                            print(f"✅ Успешно получен ответ (попытка {attempt + 1}, прокси {attempt % len(proxy_urls) + 1 if proxy_urls else 'direct'})")
                            return response_text

                raise Exception(f"Unexpected Gemini response structure")

            except httpx.HTTPError as e:
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 5
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