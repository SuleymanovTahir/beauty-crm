# backend/bot/__init__.py
"""
Модуль AI-бота для салона красоты

Предоставляет:
- SalonBot: главный класс бота
- get_bot(): получить singleton экземпляр
- PromptBuilder: построитель промптов
"""
from .core import SalonBot, get_bot
from .prompts import PromptBuilder

__all__ = ['SalonBot', 'get_bot', 'PromptBuilder']