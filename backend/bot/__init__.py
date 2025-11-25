
"""
Bot модуль - AI-бот для Instagram

Экспортирует:
- SalonBot: главный класс бота
- get_bot: функция для получения синглтона бота
"""

# ВАЖНО: НЕ импортируйте ничего из api/ здесь!
# Это вызывает циклический импорт: bot -> api -> bot

from .core import SalonBot, get_bot

__all__ = ["SalonBot", "get_bot"]