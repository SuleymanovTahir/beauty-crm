# backend/integrations/__init__.py
"""
Модуль интеграций с внешними сервисами

Предоставляет:
- Instagram API (send_message, send_typing_indicator, mark_as_seen)
- Gemini AI (ask_gemini)
"""
from .instagram import send_message, send_typing_indicator, mark_as_seen
from .gemini import ask_gemini

__all__ = [
    'send_message',
    'send_typing_indicator', 
    'mark_as_seen',
    'ask_gemini'
]