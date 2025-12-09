# backend/integrations/gemini.py
"""
Интеграция с Google Gemini AI
"""
import google.generativeai as genai
from core.config import GEMINI_API_KEY, GEMINI_MODEL

# Конфигурируем Gemini
genai.configure(api_key=GEMINI_API_KEY)

async def ask_gemini(prompt: str, context: str = "", **kwargs) -> str:
    """
    Отправить запрос к Gemini AI
    
    Args:
        prompt: Основной промпт
        context: Дополнительный контекст (опционально)
        **kwargs: Дополнительные параметры генерации (max_tokens, temperature, etc.)
    
    Returns:
        str: Ответ от AI или fallback сообщение при ошибке
    """
    model = genai.GenerativeModel(GEMINI_MODEL)
    full_prompt = f"{context}\n\n{prompt}" if context else prompt
    
    # Map max_tokens to max_output_tokens for Gemini
    generation_config = {}
    if 'max_tokens' in kwargs:
        generation_config['max_output_tokens'] = kwargs.pop('max_tokens')
    
    # Add any other kwargs to generation_config
    generation_config.update(kwargs)
    
    try:
        response = model.generate_content(full_prompt, generation_config=generation_config if generation_config else None)
        return response.text.strip()
    except Exception as e:
        print(f"❌ Ошибка Gemini: {e}")
        return "Извините, что-то пошло не так. Давайте попробуем ещё раз! 😊"