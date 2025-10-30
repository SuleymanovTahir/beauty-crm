# backend/bot/core.py
"""
Основной класс бота - объединяет функциональность из ai_bot.py и bot.py
"""
import google.generativeai as genai
import httpx
import os
from typing import Dict, Optional, List, Tuple
from datetime import datetime, timedelta

from config import GEMINI_API_KEY
from db import (
    get_salon_settings, 
    get_bot_settings,
    get_all_services,
    find_special_package_by_keywords,
    get_all_special_packages
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
        self.proxy_url = os.getenv("PROXY_URL")
        
        if self.proxy_url:
            print(f"🌐 Используется прокси: {self.proxy_url.split('@')[1] if '@' in self.proxy_url else self.proxy_url[:30]}...")
        else:
            print("⚠️ Прокси не настроен - возможны проблемы в Казахстане!")
        
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
        booking_progress: Dict = None, 
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
            booking_progress=booking_progress,
            client_language=client_language
        )
    
    async def generate_response(
        self, 
        user_message: str, 
        instagram_id: str,
        history: List[Tuple] = None,
        booking_progress: Dict = None,
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
            booking_progress=booking_progress,
            client_language=client_language
        )
        
        # Полный промпт
        full_prompt = f"{system_prompt}\n\nUser: {user_message}\nAssistant:"
        
        try:
            print("=" * 50)
            print("🤖 Generating AI response (Gemini via proxy)...")
            print(f"📝 User message: {user_message[:100]}")
            print(f"👤 Instagram ID: {instagram_id}")
            print(f"🌐 Language: {client_language}")
            print(f"📊 History length: {len(history) if history else 0}")
            
            # ✅ Используем прокси если настроен
            if self.proxy_url:
                ai_response = await self._generate_via_proxy(full_prompt)
            else:
                # Fallback без прокси (будет ошибка в Казахстане)
                response = self.model.generate_content(full_prompt)
                ai_response = response.text.strip()
            
            print(f"✅ AI response generated: {ai_response[:100]}")
            print("=" * 50)
            
            return ai_response
            
        except Exception as e:
            print("=" * 50)
            print(f"❌ Gemini API Error: {e}")
            print(f"📋 Тип ошибки: {type(e).__name__}")
            
            import traceback
            print(f"📋 Полный traceback:\n{traceback.format_exc()}")
            
            # Проверка конкретных ошибок
            if "API_KEY" in str(e).upper():
                print("⚠️ ПРОБЛЕМА: Неверный или отсутствующий GEMINI_API_KEY")
            elif "QUOTA" in str(e).upper() or "LIMIT" in str(e).upper():
                print("⚠️ ПРОБЛЕМА: Превышен лимит Gemini API")
            elif "SAFETY" in str(e).upper():
                print("⚠️ ПРОБЛЕМА: Сообщение заблокировано фильтром безопасности")
            elif "location" in str(e).lower():
                print("⚠️ ПРОБЛЕМА: Геоблокировка - проверьте прокси!")
            
            print("=" * 50)
            
            return self._get_fallback_response(client_language)
    
    async def _generate_via_proxy(self, prompt: str) -> str:
        """
        Генерация через Gemini REST API с прокси
        
        Args:
            prompt: Полный промпт
            
        Returns:
            str: Ответ от Gemini
        """
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 500,
            }
        }
        
        # ✅ HTTP клиент с прокси
        async with httpx.AsyncClient(
            proxies=self.proxy_url,
            timeout=60.0,  # Увеличен timeout для прокси
            follow_redirects=True
        ) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            # Извлекаем текст ответа
            if "candidates" in data and len(data["candidates"]) > 0:
                candidate = data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    parts = candidate["content"]["parts"]
                    if len(parts) > 0 and "text" in parts[0]:
                        return parts[0]["text"].strip()
            
            # Если структура ответа неожиданная
            raise Exception(f"Unexpected Gemini response structure: {data}")
    
    def _get_fallback_response(self, language: str = 'ru') -> str:
        """Резервный ответ при ошибке"""
        responses = {
            'ru': "Извините, что-то пошло не так. Давайте попробуем ещё раз! 😊",
            'en': "Sorry, something went wrong. Let's try again! 😊",
            'ar': "عذراً، حدث خطأ ما. دعونا نحاول مرة أخرى! 😊"
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