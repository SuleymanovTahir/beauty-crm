"""
AI Response Generator
Instead of hardcoded templates, AI generates natural responses
based on instructions and client's language
"""
import os
from typing import Optional
from integrations.gemini import ask_gemini
from utils.logger import log_info, log_error

# Инструкции для AI (не готовые тексты, а направления)
RESPONSE_INSTRUCTIONS = {
    'photo_response': """
        Клиент прислал фото. Вежливо объясни, что пока не можешь анализировать изображения.
        Попроси описать словами, какую услугу или результат хочет получить.
        Будь дружелюбным, используй эмодзи.
    """,
    
    'voice_response': """
        Клиент прислал голосовое сообщение. Вежливо объясни, что пока не можешь слушать аудио.
        Попроси написать текстом для быстрой помощи.
        Будь дружелюбным, используй эмодзи.
    """,
    
    'bot_error': """
        Произошла техническая ошибка. Извинись и скажи, что менеджер скоро ответит.
        Не вдавайся в детали ошибки. Будь кратким и вежливым.
    """,
    
    'feedback_request': """
        Клиент только что посетил салон. Попроси оценить визит от 1 до 5 звёзд.
        Будь вежливым и благодарным. Короткое сообщение.
    """,
    
    'feedback_thanks': """
        Клиент оставил оценку. Поблагодари за отзыв.
        Скажи что ценишь мнение клиента. Короткое сообщение с эмодзи.
    """,
    
    'abandoned_booking': """
        Клиент начал записываться, но не завершил. Мягко напомни и предложи помощь.
        Спроси, нужны ли свободные окошки. Не будь назойливым.
    """,
    
    'retention_reminder': """
        Клиент давно не был в салоне (имя: {name}). 
        Тепло поприветствуй и ненавязчиво предложи записаться.
        Используй эмодзи, будь дружелюбным.
    """,
    
    'booking_reminder_1d': """
        Напомни о записи на завтра.
        Услуга: {service}, время: {time}, мастер: {master}.
        Краткое дружелюбное напоминание.
    """,
    
    'booking_reminder_2h': """
        Напомни что через 2 часа запись.
        Услуга: {service}, адрес: {address}.
        Очень краткое сообщение.
    """,
}

async def generate_ai_response(
    instruction_key: str,
    language: str = 'ru',
    **kwargs
) -> str:
    """
    Generate a natural response using AI based on instruction.
    
    Args:
        instruction_key: Key from RESPONSE_INSTRUCTIONS
        language: Client's language code
        **kwargs: Variables to substitute (name, service, time, etc.)
    
    Returns:
        AI-generated response text in client's language
    """
    
    instruction = RESPONSE_INSTRUCTIONS.get(instruction_key)
    
    if not instruction:
        log_error(f"Unknown instruction key: {instruction_key}", "ai_response")
        return ""
    
    # Подставляем переменные
    try:
        instruction = instruction.format(**kwargs)
    except KeyError:
        pass  # Некоторые переменные могут отсутствовать
    
    # Маппинг языков
    language_names = {
        'ru': 'русском',
        'en': 'English',
        'ar': 'العربية (Arabic)',
        'he': 'עברית (Hebrew)',
        'fr': 'français',
        'de': 'Deutsch',
        'es': 'español',
        'it': 'italiano',
        'pt': 'português',
        'zh': '中文',
        'ja': '日本語',
        'ko': '한국어',
    }
    
    lang_name = language_names.get(language, language)
    
    prompt = f"""
Ты помощник салона красоты. Сгенерируй ОДНО короткое сообщение клиенту.

ИНСТРУКЦИЯ: {instruction}

ЯЗЫК ОТВЕТА: {lang_name}

ПРАВИЛА:
- Ответь ТОЛЬКО текстом сообщения, без пояснений
- Максимум 2-3 предложения
- Используй эмодзи уместно
- Будь вежливым и профессиональным
"""

    try:
        response = await ask_gemini(prompt, max_tokens=150)
        
        # Очистка от лишних кавычек/markdown
        response = response.strip().strip('"').strip("'").strip('`')
        
        log_info(f"🤖 AI generated response for '{instruction_key}' in {language}", "ai_response")
        return response
        
    except Exception as e:
        log_error(f"AI response generation failed: {e}", "ai_response")
        
        # Fallback - простое сообщение
        fallbacks = {
            'ru': "Наш менеджер скоро ответит вам! 💎",
            'en': "Our manager will respond soon! 💎",
            'ar': "سيرد عليك مديرنا قريبًا! 💎",
        }
        return fallbacks.get(language, fallbacks['en'])

def get_instruction(key: str) -> Optional[str]:
    """Get instruction text for a key (for debugging/admin)"""
    return RESPONSE_INSTRUCTIONS.get(key)
