# backend/bot/core.py
import sqlite3
import google.generativeai as genai
import httpx
import os
import asyncio
from typing import Dict, Optional, List, Tuple
from datetime import datetime, timedelta
from bot.tools import get_available_time_slots, check_time_slot_available


from core.config import DATABASE_NAME, GEMINI_API_KEY, GEMINI_MODEL
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
        instagram_id: str,
        user_message: str,
        history: List[Tuple],
        bot_settings: Dict,
        salon_info: Dict,
        booking_progress: Optional[Dict] = None,
        client_language: str = 'ru',
        context_flags: Optional[Dict] = None  # ✅ ДОБАВЛЕНО
    ) -> str:
        """
        Генерация ответа от AI с проверкой доступных слотов в БД

        Args:
            instagram_id: ID клиента
            user_message: Сообщение от клиента
            history: История диалога
            bot_settings: Настройки бота из БД
            salon_info: Информация о салоне
            booking_progress: Прогресс бронирования
            client_language: Язык клиента
            context_flags: Флаги контекста (срочность, незавершённая запись и т.д.)

        Returns:
            str: Ответ от AI
        """
        try:
            from datetime import datetime, timedelta
            import re
            from bot.tools import get_available_time_slots, check_time_slot_available

            if context_flags is None:
                context_flags = {}

            print("=" * 50)
            print(f"🤖 Generating AI response (Gemini via proxy)...")
            print(f"📝 User message: {user_message}")
            print(f"👤 Instagram ID: {instagram_id}")
            print(f"🌐 Language: {client_language}")

            # Получаем поддерживаемые языки из БД
            supported_langs = bot_settings.get('languages_supported', 'ru,en,ar')
            print(f"🗂️ Supported langs from DB: {supported_langs}")

            # Проверяем соответствие языка клиента поддерживаемым
            client_lang_matches = client_language in supported_langs.split(',')
            print(f"✅ Client lang matches: {client_lang_matches}")

            # Логируем историю для отладки
            print(f"📊 History length: {len(history)}")

            # ========================================
            # ✅ ПРОВЕРКА КОНТЕКСТНЫХ ФЛАГОВ
            # ========================================

            additional_context = ""

            # ✅ #4 - Незавершённая запись
            if context_flags.get('has_incomplete_booking'):
                incomplete = context_flags.get('incomplete_booking')
                if incomplete:
                    additional_context += f"""
    🔄 У КЛИЕНТА ЕСТЬ НЕЗАВЕРШЁННАЯ ЗАПИСЬ:
    - Услуга: {incomplete.get('service_name', 'не указана')}
    - Дата: {incomplete.get('date', 'не указана')}
    - Время: {incomplete.get('time', 'не указано')}
    - Телефон: {incomplete.get('phone', 'не указан')}

    ⚠️ СПРОСИ: "Вижу вы начали запись. Продолжим?"
    """

            # ✅ #18 - Срочная запись
            if context_flags.get('is_urgent'):
                additional_context += """
    ⚡ КЛИЕНТ СРОЧНО НУЖДАЕТСЯ В ЗАПИСИ!
    Слова вроде "срочно", "уезжаю", "скоро уезжаю" в сообщении.

    ⚠️ ДЕЙСТВУЙ БЫСТРО:
    - Предложи БЛИЖАЙШИЕ доступные слоты (сегодня/завтра)
    - Упрости процесс - сразу предлагай конкретное время
    - Будь решительным: "Могу записать вас на сегодня в 17:00. Согласны?"
    """

            # ✅ #27 - Корпоративная заявка
            if context_flags.get('is_corporate'):
                additional_context += """
    🏢 КОРПОРАТИВНАЯ ЗАЯВКА (группа >5 человек)!

    ⚠️ НЕ ЗАПИСЫВАЙ САМОСТОЯТЕЛЬНО!
    Скажи: "Для группового визита свяжу вас с менеджером. Он подберёт оптимальное время и условия. Один момент!"

    Менеджер УЖЕ получил уведомление.
    """

            # ========================================
            # ✅ ПРОВЕРКА ДОСТУПНОСТИ ВРЕМЕНИ В БД
            # ========================================

            today = datetime.now().date()
            tomorrow = today + timedelta(days=1)
            
            # Явно передаем текущую дату в контекст
            additional_context += f"\n📅 СЕГОДНЯ: {today.strftime('%Y-%m-%d')} ({today.strftime('%A')})\n"

            target_date = None

            # Определяем дату из сообщения клиента
            user_msg_lower = user_message.lower()

            if 'сегодня' in user_msg_lower or 'today' in user_msg_lower:
                target_date = today.strftime("%Y-%m-%d")
            elif 'завтра' in user_msg_lower or 'tomorrow' in user_msg_lower:
                target_date = tomorrow.strftime("%Y-%m-%d")
            else:
                # Ищем дату в формате DD.MM, DD/MM, DD-MM
                date_match = re.search(r'(\d{1,2})[./-](\d{1,2})', user_message)
                if date_match:
                    day, month = date_match.groups()
                    # Пытаемся угадать год (текущий или следующий)
                    current_year = today.year
                    try:
                        parsed_date = datetime.strptime(f"{current_year}-{month}-{day}", "%Y-%m-%d").date()
                        if parsed_date < today:
                            parsed_date = parsed_date.replace(year=current_year + 1)
                        target_date = parsed_date.strftime("%Y-%m-%d")
                    except:
                        pass

            if target_date:
                print(f"📅 Target date detected: {target_date}")

                # Определяем услугу и мастера из прогресса бронирования
                service_name = booking_progress.get('service_name') if booking_progress else None
                master_name = booking_progress.get('master') if booking_progress else None

                print(f"🔍 Looking for slots: service={service_name}, master={master_name}")

                # Получаем реальные свободные слоты из БД
                # Теперь вся логика фильтрации мастеров внутри этой функции
                available_slots = get_available_time_slots(
                    date=target_date,
                    service_name=service_name,
                    master_name=master_name,
                    duration_minutes=60
                )

                if available_slots:
                    print(f"✅ Found {len(available_slots)} available slots")
                    
                    slots_text = "\n".join([
                        f"  • {slot['time']} у мастера {slot['master']}"
                        for slot in available_slots[:5]
                    ])

                    additional_context += f"""

    🔴 РЕАЛЬНЫЕ СВОБОДНЫЕ СЛОТЫ НА {target_date} (из БД):
    {slots_text}

    ⚠️ КРИТИЧНО:
    - ТЫ ОБЯЗАН ПРЕДЛАГАТЬ ТОЛЬКО ЭТИ ВРЕМЕНА!
    - НЕ ПРИДУМЫВАЙ ДРУГОЕ ВРЕМЯ!
    - ЕСЛИ КЛИЕНТ ПРОСИТ ВРЕМЯ КОТОРОГО НЕТ В СПИСКЕ - СКАЖИ ЧТО ЗАНЯТО И ПРЕДЛОЖИ ИЗ СПИСКА!
    - Время выше РЕАЛЬНО СВОБОДНО - проверено в базе данных!"""
                else:
                    print(f"❌ No available slots found for {target_date}")

                    additional_context += f"""

    🔴 НА {target_date} ВСЕ СЛОТЫ ЗАНЯТЫ (проверено в БД)!
    
    ⚠️ СТРОГИЙ ЗАПРЕТ:
    - НЕ ПРЕДЛАГАЙ НИКАКОЕ ВРЕМЯ НА {target_date}!
    - НЕ ГОВОРИ "ЕСТЬ ОКОШКО", ЕСЛИ ЕГО НЕТ!
    - Скажи: "К сожалению, на {target_date} всё занято. Могу предложить завтра?"
    """

            # Проверка конкретного времени если клиент спрашивает
            time_match = re.search(r'(\d{1,2}):(\d{2})', user_message)
            if time_match and target_date:
                requested_time = f"{time_match.group(1).zfill(2)}:{time_match.group(2)}"
                print(f"⏰ Checking specific time: {requested_time}")

                check_result = check_time_slot_available(
                    date=target_date,
                    time=requested_time,
                    master_name=booking_progress.get('master') if booking_progress else None
                )

                if not check_result['available']:
                    print(f"❌ Time {requested_time} is NOT available")

                    alternatives = check_result['alternatives']
                    if alternatives:
                        alt_text = "\n".join([
                            f"  • {slot['time']} у {slot['master']}"
                            for slot in alternatives[:3]
                        ])

                        additional_context += f"""

    🚫 ВРЕМЯ {requested_time} ЗАНЯТО (проверено в БД)!

    Доступные альтернативы:
    {alt_text}

    ⚠️ СКАЖИ КЛИЕНТУ:
    "К сожалению, {requested_time} уже занято. Могу предложить: {alternatives[0]['time']} у {alternatives[0]['master']}. Подходит?"

    НЕ ГОВОРИ ЧТО {requested_time} СВОБОДНО - ЭТО НЕПРАВДА!"""
                    else:
                        additional_context += f"""

    🚫 ВРЕМЯ {requested_time} ЗАНЯТО И НЕТ АЛЬТЕРНАТИВ НА {target_date}!
    Предложи другую дату!"""
                else:
                    print(f"✅ Time {requested_time} is available")

            # ========================================
            # Строим промпт
            # ========================================

            full_prompt = self.prompt_builder.build_full_prompt(
                instagram_id=instagram_id,
                history=history,
                booking_progress=booking_progress,
                client_language=client_language,
                additional_context=additional_context  # ✅ ПЕРЕДАЁМ КОНТЕКСТ С РЕАЛЬНЫМИ СЛОТАМИ
            )

            # ========================================
            # Генерируем ответ через прокси
            # ========================================

            ai_response = await self._generate_via_proxy(full_prompt)

            print(f"✅ AI response generated: {ai_response[:100]}")
            print("=" * 50)

            return ai_response

        except Exception as e:
            print(f"❌ Error in generate_response: {e}")
            import traceback
            traceback.print_exc()

            # Fallback ответ
            fallback_messages = {
                'ru': "Извините, я сейчас перегружен запросами 🤖 Наш менеджер скоро вам ответит! 💎",
                'en': "Sorry, I'm overloaded with requests 🤖 Our manager will respond soon! 💎",
                'ar': "عذرًا، أنا محمل بالطلبات 🤖 سيرد عليك مديرنا قريبًا! 💎"
            }
            return fallback_messages.get(client_language, fallback_messages['ru'])

    async def _generate_via_proxy(self, prompt: str, max_retries: int = 4) -> str:
        """Генерация через Gemini REST API с прокси и retry механизмом"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

        max_chars = self.bot_settings.get('max_message_chars', 300)
    
        # ✅ Увеличиваем лимит токенов для генерации, чтобы бот мог закончить мысль
        # Даже если мы просим 300 символов, даем запас до 600, чтобы не обрывать на полуслове
        safe_max_chars = max(max_chars * 2, 600)
        max_tokens = int(safe_max_chars / 2.5)

        prompt_with_limit = f"""{prompt}

⚠️ КРИТИЧЕСКИ ВАЖНО: Твой ответ должен быть КРАТКИМ и ЛАКОНИЧНЫМ (до {max_chars} символов).
Пиши ёмко, без воды.
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
                            wait_time = (2 ** attempt) * 8  # 8s, 16s, 32s, 64s (увеличено!)
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

                            # ❌ УБРАНО ЖЕСТКОЕ ОБРЕЗАНИЕ
                        # if len(response_text) > max_chars:
                        #     response_text = response_text[:max_chars-3] + "..."

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