import google.generativeai as genai
import re
from typing import Dict, Optional
from datetime import datetime, timedelta
# ✅ ДОБАВЬТЕ:
from config import GEMINI_API_KEY, SERVICES
from database import get_salon_settings, get_bot_settings

genai.configure(api_key=GEMINI_API_KEY)

def get_service_info(query: str) -> Optional[Dict]:
    """Найти услугу по запросу клиента"""
    query_lower = query.lower()
    
    # Словарь ключевых слов для поиска услуг
    service_keywords = {
        "permanent_lips": ["губ", "lips", "permanent lips", "перманент губ"],
        "permanent_brows": ["бров", "brows", "permanent brows", "перманент бровей", "брови"],
        "eyeliner": ["стрелк", "eyeliner", "подводк"],
        "lashliner": ["межресничн", "lashliner", "между ресниц"],
        "deep_facial": ["чистк лица", "facial cleaning", "глубок чистк"],
        "manicure_gelish": ["маникюр", "manicure", "гель лак", "gelish"],
        "pedicure_gelish": ["педикюр", "pedicure"],
        "balayage": ["балаяж", "balayage"],
        "ombre": ["омбре", "ombre", "шатуш", "shatush", "air touch", "аир тач"],
        "bleach_hair": ["осветлен", "bleach", "блонд", "blonde"],
        "hair_cut": ["стрижк", "haircut", "cut"],
        "full_color": ["окраш", "color", "краск"],
        "classic_lashes": ["классическ ресниц", "classic lash", "наращивание ресниц"],
        "2d_lashes": ["2d", "2д объем"],
        "3d_lashes": ["3d", "3д объем"],
        "mega_lashes": ["4d", "5d", "мега объем", "mega volume"],
        "brow_lamination": ["ламин бров", "brow lamination", "ламинирование бровей"],
        "lash_lamination": ["ламин ресниц", "lash lamination", "ламинирование ресниц"],
        "body_massage": ["массаж тела", "body massage"],
        "back_massage": ["массаж спин", "back massage"],
        "anticellulite_massage": ["антицеллюлит", "anticellulite"],
        "moroccan_bath": ["марокканск бан", "moroccan bath", "хамам", "hammam", "марокканская баня"],  # ✅ ДОБАВЛЕНО
        "full_bikini": ["бикини", "bikini"],
        "full_legs": ["эпиляция ног", "leg wax", "ноги"],
    }
    
    for service_key, keywords in service_keywords.items():
        for keyword in keywords:
            if keyword in query_lower:
                return SERVICES.get(service_key)
    
    return None

async def ask_gemini(prompt: str, context: str = "") -> str:
    """Запрос к Gemini AI"""
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    full_prompt = f"{context}\n\n{prompt}"
    
    try:
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        print(f"❌ Ошибка Gemini: {e}")
        return "Извините, что-то пошло не так. Давайте попробуем ещё раз! 😊"


def build_genius_prompt(instagram_id: str, history: list, booking_progress: Dict = None, client_language: str = 'ru') -> str:
    """Создать промпт для гения продаж с учетом языка клиента"""
    from database import get_all_services, find_special_package_by_keywords, get_all_special_packages
    salon = get_salon_settings()
    bot_settings = get_bot_settings()
    # История диалога
    history_text = ""
    if history:
        history_text = "\n💬 ИСТОРИЯ РАЗГОВОРА (последние сообщения):\n"
        for msg, sender, timestamp, msg_type in history[-5:]:
            role = "Клиент" if sender == "client" else "Ты"
            if msg_type == 'voice':
                history_text += f"{role}: [Голосовое сообщение]\n"
            else:
                history_text += f"{role}: {msg}\n"
    
    # ✅ УЛУЧШЕННАЯ ЛОГИКА: Определяем нужно ли здороваться
    should_greet = False
    
    if len(history) <= 1:
        # Первое сообщение вообще
        should_greet = True
    elif len(history) > 0:
        # Проверяем время последнего сообщения
        try:
            last_msg = history[-1]
            last_timestamp = datetime.fromisoformat(last_msg[2])
            now = datetime.now()
            time_diff = now - last_timestamp
            
            # Если прошло больше 6 часов И это другой "деловой день"
            if time_diff > timedelta(hours=6):
                # Проверяем смену "делового дня" (08:00 - следующий день)
                # Если сейчас до 8 утра - считаем что это еще вчерашний день
                last_business_day = last_timestamp.date() if last_timestamp.hour >= 8 else (last_timestamp - timedelta(days=1)).date()
                current_business_day = now.date() if now.hour >= 8 else (now - timedelta(days=1)).date()
                
                if current_business_day > last_business_day:
                    should_greet = True
        except:
            # Если не можем определить - не здороваемся
            should_greet = False
    
    is_first_message = should_greet
    
    # Прогресс записи
    booking_text = ""
    if booking_progress:
        booking_text = f"""
📝 ТЕКУЩАЯ ЗАПИСЬ (что уже знаем):
✅ Услуга: {booking_progress.get('service_name', '❌')}
✅ Дата: {booking_progress.get('date', '❌')}
✅ Время: {booking_progress.get('time', '❌')}
✅ Телефон: {booking_progress.get('phone', '❌')}
✅ Имя: {booking_progress.get('name', '❌')}
"""
    
    # Получаем услуги из базы данных
    services = get_all_services(active_only=True)
    
    services_by_category = {}
    for service in services:
        category = service[7]
        if category not in services_by_category:
            services_by_category[category] = []
        
        benefits_list = service[11].split('|') if service[11] else []
        
        services_by_category[category].append({
            'name': service[2],
            'name_ru': service[3] or service[2],
            'price': f"{service[5]} {service[6]}",
            'description_ru': service[9] or '',
            'benefits': benefits_list
        })
    
    services_info = "\n🌟 УСЛУГИ САЛОНА (с ценами и описанием):\n"
    for category, services_list in services_by_category.items():
        services_info += f"\n📂 {category}:\n"
        for service in services_list:
            benefits_text = " | ".join(service['benefits'][:2]) if service['benefits'] else ""
            services_info += f"• {service['name_ru']} - {service['price']}\n"
            if service['description_ru']:
                services_info += f"  └ {service['description_ru']}\n"
            if benefits_text:
                services_info += f"  └ Преимущества: {benefits_text}\n"
    
    # Получаем специальные пакеты
    special_packages = get_all_special_packages(active_only=True)
    packages_info = ""
    
    if special_packages:
        packages_info = "\n🎁 СПЕЦИАЛЬНЫЕ ПАКЕТЫ И АКЦИИ:\n"
        for pkg in special_packages:
            pkg_name = pkg[2]  # name_ru
            orig_price = pkg[5]
            special_price = pkg[6]
            currency = pkg[7]
            discount = pkg[8]
            desc = pkg[4] or ""  # description_ru
            promo_code = pkg[10]
            keywords = pkg[11]
            
            packages_info += f"\n🔥 {pkg_name}\n"
            packages_info += f"  Обычная цена: {orig_price} {currency}\n"
            packages_info += f"  Специальная цена: {special_price} {currency} (скидка {discount}%!)\n"
            if desc:
                packages_info += f"  Описание: {desc}\n"
            if promo_code:
                packages_info += f"  Промокод: {promo_code}\n"
            packages_info += f"  Ключевые слова: {keywords}\n"
            packages_info += f"  ⚠️ ВАЖНО: Если клиент упоминает эти ключевые слова, предложи ЭТОТ пакет вместо обычной услуги!\n"
    
    # Языковые настройки
    language_instruction = ""
    if client_language == 'ru':
        language_instruction = "ЯЗЫК ОБЩЕНИЯ: Русский (основной)"
    elif client_language == 'en':
        language_instruction = "ЯЗЫК ОБЩЕНИЯ: English - отвечай на английском языке"
    elif client_language == 'ar':
        language_instruction = "ЯЗЫК ОБЩЕНИЯ: العربية - отвечай на арабском языке"
    
    # ✅ ИЗМЕНЕНО: Приветствие с учетом "делового дня"
    greeting_instruction = ""
    if is_first_message:
        greeting_instruction = """
**ЭТАП 1: ЗАИНТЕРЕСОВАТЬ (ПЕРВОЕ СООБЩЕНИЕ ИЛИ НОВЫЙ ДЕНЬ)**
Клиент написал впервые или прошло много времени (>6 часов + новый деловой день):
- Поприветствуй тепло и персонально НА ЕГО ЯЗЫКЕ
- Предложи помощь: "Чем могу помочь? Интересуют услуги или запись?"
- Если это утро/день - "Доброе утро/день!", если вечер - "Добрый вечер!"
"""
    else:
        greeting_instruction = """
**ПРОДОЛЖАЕМ ДИАЛОГ:**
- НЕ здоровайся снова - вы уже общаетесь!
- Отвечай на конкретный вопрос клиента
- Будь краткой и по делу (2-3 предложения)
- Если клиент долго не писал (несколько часов) но это еще тот же "деловой день" - можно сказать "С возвращением!" но НЕ "Здравствуйте" снова
"""

    prompt = f"""🎭 ТЫ — ГЕНИЙ ПРОДАЖ, виртуальный администратор элитного салона красоты "{salon['name']}" в Dubai! 

💎 ТВОЯ МИССИЯ:
Консультировать клиентов по услугам, рассказывать о преимуществах и НАПРАВЛЯТЬ на онлайн-запись через YClients!

🧠 ТВОЯ ЛИЧНОСТЬ:
- Обаятельная, уверенная, харизматичная
- Эксперт в beauty-индустрии
- Пишешь кратко (2-3 предложения)
- НЕ повторяешься - каждое сообщение новое и по делу

🌍 {language_instruction}
⚠️ КРИТ ВАЖНО: ВСЕГДА отвечай на том же языке, на котором написал клиент!

🎯 ВАЖНЫЕ ПРАВИЛА:

**О СТИЛЕ ОБЩЕНИЯ:**
- НЕ НАЧИНАЙ каждое сообщение с приветствия!
- НЕ повторяй "Здравствуйте" в каждом ответе!
- Если это НЕ первое сообщение - сразу отвечай на вопрос
- Будь краткой: 2-3 предложения максимум

**О ГОЛОСОВЫХ СООБЩЕНИЯХ:**
- ТЫ НЕ МОЖЕШЬ ПРОСЛУШИВАТЬ голосовые - ты AI-ассистент!
- Если клиент отправил голосовое, скажи:
  "Извините, я AI-помощник и не могу прослушивать голосовые 😊 
   Пожалуйста, напишите текстом!"

**О СПЕЦИАЛЬНЫХ ПАКЕТАХ:**
- Следи за ключевыми словами в сообщениях
- Если клиент упоминает слова из списка пакетов - предлагай СПЕЦ. ЦЕНУ

**О ЦЕНАХ:**
- Называй полную стоимость из списка
- ПРОВЕРЬ: есть ли активный спец. пакет? Если ДА - предложи спец. цену!
- Оправдывай цену ценностью (что входит, качество, долговременность)

**О ЗАПИСИ:**
- ТЫ НЕ МОЖЕШЬ ЗАПИСЫВАТЬ клиентов - ты AI-ассистент!
- Когда клиент хочет записаться, ВСЕГДА говори:
  "Я AI-ассистент и не могу записать напрямую 😊
   
   📱 Запишитесь онлайн: {salon['booking_url']}
   
   Там выберете время и мастера!"

- НИКОГДА не собирай данные для записи
- НЕ называй конкретные даты/время/мастеров - ты их НЕ ЗНАЕШЬ!

📍 ИНФОРМАЦИЯ О САЛОНЕ:
Название: {salon['name']}
Адрес: {salon['address']} (JBR, Dubai)
Часы: {salon['hours']}
Google Maps: https://maps.app.goo.gl/Puh5X1bNEjWPiToz6
Онлайн-запись: {salon['booking_url']}

{services_info}

{packages_info}

{history_text}

{booking_text}

⚡ АЛГОРИТМ ДЕЙСТВИЙ:

{greeting_instruction}

**ЭТАП 2: КОНСУЛЬТАЦИЯ ПО УСЛУГЕ**
Когда клиент спрашивает об услуге:
1. ПРОВЕРЬ: есть ли спец. пакет с этой услугой?
2. Если ДА - предложи СПЕЦ. ЦЕНУ
3. Если НЕТ - назови обычную цену
4. Кратко опиши преимущества (1-2)
5. Предложи записаться онлайн

**ЭТАП 3: ВОПРОСЫ О ЦЕНЕ**
Если "дорого":
- Подчеркни ЦЕННОСТЬ
- Сравни с конкурентами
- Расскажи о качестве

🚫 НЕ ДЕЛАЙ:
- НЕ повторяй приветствия
- НЕ пиши длинные простыни (макс 3 предложения)
- НЕ СОБИРАЙ данные для записи
- НЕ придумывай цены
- НЕ ПРОСЛУШИВАЙ голосовые

💡 ПРИМЕРЫ:

❌ Плохо: "Здравствуйте! Добро пожаловать в M.Le Diamant! У нас есть..."
✅ ОТЛИЧНО: "У нас восхитительная СПА-релакс программа 250 AED 💆‍♀️ Глубокое расслабление и увлажнение кожи. Записаться?"

❌ Плохо: "Здравствуйте! Конечно, с удовольствием помогу..."
✅ ОТЛИЧНО: "Да, у нас есть марокканская баня 262 AED 🛁 Процедура занимает около часа - скрабирование всего тела под воздействием тепла. Как в настоящем хамаме!"

❌ Плохо: "Здравствуйте! Я AI-ассистент..."
✅ ОТЛИЧНО: "Я AI-ассистент, поэтому запись онлайн 😊 Ссылка: {salon['booking_url']}"

Сейчас клиент написал. Твоя задача — проконсультировать, вдохновить и направить на запись! 
ПОМНИ: Если это НЕ первое сообщение - НЕ здоровайся! Действуй! 🚀"""

    return prompt

def extract_booking_info(message: str, current_progress: Dict = None) -> Dict:
    """Извлечь данные о записи из сообщения (DEPRECATED - больше не используется)"""
    # Оставляем функцию для совместимости, но она больше не используется
    return current_progress or {}

def is_booking_complete(progress: Dict) -> bool:
    """Проверить, все ли данные для записи собраны (DEPRECATED)"""
    # Больше не используется, так как бот не записывает
    return False