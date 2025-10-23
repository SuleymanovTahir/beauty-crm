# backend/ai_bot.py (ПРИМЕР)
from database import get_bot_settings, get_salon_settings
import google.generativeai as genai
from config import GEMINI_API_KEY

class SalonBot:
    def __init__(self):
        """Инициализация бота - загружаем настройки из БД"""
        
        # ✅ ЗАГРУЗИТЬ НАСТРОЙКИ САЛОНА
        self.salon = get_salon_settings()
        
        # ✅ ЗАГРУЗИТЬ НАСТРОЙКИ БОТА
        self.bot_settings = get_bot_settings()
        
        # ✅ Сконфигурировать Gemini
        genai.configure(api_key=GEMINI_API_KEY)
        
        # ✅ Создать модель
        self.model = genai.GenerativeModel('gemini-pro')
        
        print("✅ Бот инициализирован с настройками из БД")
        print(f"   Салон: {self.salon['name']}")
        print(f"   Бот: {self.bot_settings['bot_name']}")
        print(f"   Языки: {self.bot_settings['languages_supported']}")
    
    def build_system_prompt(self) -> str:
        """Построить system prompt из настроек БД"""
        
        # ✅ ВСЁ ИЗ БД!
        prompt = f"""
=== IDENTITY ===
You are {self.bot_settings['bot_name']}, an AI assistant for {self.salon['name']}.

=== PERSONALITY ===
{self.bot_settings['personality_traits']}

=== COMMUNICATION STYLE ===
{self.bot_settings['communication_style']}

- Maximum message length: {self.bot_settings['max_message_length']} sentences
- Emoji usage: {self.bot_settings['emoji_usage']}
- Languages: {self.bot_settings['languages_supported']}

=== GREETING ===
{self.bot_settings['greeting_message']}

=== PRICING STRATEGY ===
{self.bot_settings['price_explanation']}

Price Response Template:
{self.bot_settings['price_response_template']}

Premium Justification:
{self.bot_settings['premium_justification']}

=== BOOKING ===
CRITICAL: You CANNOT book appointments directly!

{self.bot_settings['booking_redirect_message']}

Booking URL: {self.salon['booking_url']}

=== FOMO TECHNIQUES ===
{self.bot_settings['fomo_messages']}

=== UPSELL TECHNIQUES ===
{self.bot_settings['upsell_techniques']}

=== OBJECTION HANDLING ===
{self.bot_settings['objection_handling']}

=== NEGATIVE HANDLING ===
{self.bot_settings['negative_handling']}

=== SAFETY GUIDELINES ===
{self.bot_settings['safety_guidelines']}

=== EXAMPLES OF GOOD RESPONSES ===
{self.bot_settings['example_good_responses']}

=== ALGORITHM ===
{self.bot_settings['algorithm_actions']}

=== LOCATION FEATURES ===
{self.bot_settings['location_features']}

=== SEASONALITY ===
{self.bot_settings['seasonality']}

=== EMERGENCY SITUATIONS ===
{self.bot_settings['emergency_situations']}

=== SUCCESS METRICS ===
{self.bot_settings['success_metrics']}

=== SALON INFO ===
Name: {self.salon['name']}
Address: {self.salon['address']}
Phone: {self.salon['phone']}
Hours: {self.salon['hours']}
Google Maps: {self.salon['google_maps']}
Instagram: {self.salon['instagram']}

Now respond to the client's message following ALL these guidelines.
"""
        return prompt
    
    def generate_response(self, user_message: str, chat_history: list = None) -> str:
        """Генерировать ответ используя настройки из БД"""
        
        # Построить system prompt из БД
        system_prompt = self.build_system_prompt()
        
        # Подготовить полный prompt
        full_prompt = f"{system_prompt}\n\nUser: {user_message}\nAssistant:"
        
        # Генерировать ответ
        response = self.model.generate_content(full_prompt)
        
        return response.text
    
    def reload_settings(self):
        """Перезагрузить настройки из БД (если админ изменил)"""
        self.salon = get_salon_settings()
        self.bot_settings = get_bot_settings()
        print("✅ Настройки перезагружены из БД")


# ===== ИСПОЛЬЗОВАНИЕ =====
bot = SalonBot()  # Загружает настройки при старте

def handle_message(instagram_id: str, message: str) -> str:
    """Обработать сообщение от клиента"""
    
    # Получить историю чата
    from database import get_chat_history
    history = get_chat_history(instagram_id)
    
    # Генерировать ответ (используя настройки из БД!)
    response = bot.generate_response(message, history)
    
    # Сохранить в историю
    from database import save_message
    save_message(instagram_id, message, 'client')
    save_message(instagram_id, response, 'bot')
    
    return response