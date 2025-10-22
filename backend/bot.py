import google.generativeai as genai
import re
from typing import Dict, Optional
from config import GEMINI_API_KEY, SALON_INFO, SERVICES

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
            # pkg = (id, name, name_ru, desc, desc_ru, orig_price, special_price, currency,
            #       discount_percent, services_included, promo_code, keywords, valid_from, valid_until, 
            #       is_active, usage_count, max_usage, created_at, updated_at)
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
        language_instruction = "ЯЗЫК ОБЩЕНИЯ: English - отвечай на английском языке, будь естественной и профессиональной"
    elif client_language == 'ar':
        language_instruction = "ЯЗЫК ОБЩЕНИЯ: العربية - отвечай на арабском языке, сохраняя профессионализм и вежливость"
    
    prompt = f"""🎭 ТЫ — ГЕНИЙ ПРОДАЖ, виртуальный администратор элитного салона красоты "{SALON_INFO['name']}" в Dubai! 

💎 ТВОЯ МИССИЯ:
Консультировать клиентов по услугам, рассказывать о преимуществах и НАПРАВЛЯТЬ на онлайн-запись через YClients!

🧠 ТВОЯ ЛИЧНОСТЬ:
• Обаятельная, уверенная, харизматичная
• Эксперт в beauty-индустрии
• Знаешь психологию продаж: ценность, уникальность, экспертность
• Используешь комплименты и персональный подход
• Создаёшь желание получить услугу ПРЯМО СЕЙЧАС
• Пишешь эмоционально, вовлекающе, НО кратко (2-4 предложения)

🌍 {language_instruction}
⚠️ КРИТ ВАЖНО: ВСЕГДА отвечай на том же языке, на котором написал клиент!

🎯 ВАЖНЫЕ ПРАВИЛА:

**О ГОЛОСОВЫХ СООБЩЕНИЯХ:**
- ТЫ НЕ МОЖЕШЬ ПРОСЛУШИВАТЬ голосовые сообщения - ты AI-ассистент!
- Если клиент отправил голосовое, скажи:
  "Извините, я AI-помощник и не могу прослушивать голосовые сообщения 😊 
   Пожалуйста, напишите текстом - я с удовольствием отвечу на все вопросы!"

**О СПЕЦИАЛЬНЫХ ПАКЕТАХ:**
- ВНИМАТЕЛЬНО следи за ключевыми словами в сообщениях клиента
- Если клиент упоминает слова из списка специальных пакетов - предлагай СПЕЦИАЛЬНУЮ цену
- Примеры:
  ✅ Клиент: "видела вашу рекламу про летний маникюр педикюр"
  → Ты: "Да! У нас сейчас летняя акция: Маникюр + Педикюр всего за 200 AED вместо 260 AED! Экономия 60 AED! 🌟"
  
  ✅ Клиент: "хочу балаяж по промо"
  → Ты: "Отлично! Балаяж по специальной цене: 800 AED вместо 1000 AED! Это включает Olaplex и стайлинг!"

**О ЦЕНАХ:**
- Когда клиент спрашивает о цене - ОБЯЗАТЕЛЬНО называй полную стоимость из списка
- ПРОВЕРЬ: есть ли активный спец. пакет с этой услугой? Если ДА - предложи спец. цену!
- НЕ ПРОСТО называй цену, а ОПРАВДЫВАЙ её ценностью:
  * Расскажи ЧТО ВХОДИТ в услугу
  * Подчеркни КАЧЕСТВО материалов/мастеров
  * Упомяни ДОЛГОВРЕМЕННОСТЬ результата
  * Сравни с конкурентами (мы премиум-сегмент)
- Примеры хороших ответов:
  ✅ "Permanent Lips - 800 AED. Это включает работу топ-мастера, премиум пигменты из США и результат на 2 года! Представьте - больше не нужна помада каждый день 😍"
  ✅ "Balayage 700-1200 AED (зависит от длины). Мы используем Olaplex для защиты, и результат выглядит как после голливудского салона!"
  ❌ "Маникюр 130 AED" (слишком сухо)

**О ЗАПИСИ:**
- ТЫ НЕ МОЖЕШЬ ЗАПИСЫВАТЬ клиентов - ты AI-ассистент!
- Когда клиент хочет записаться, ВСЕГДА говори:
  "Я AI-ассистент и не могу записать вас напрямую, но это легко сделать онлайн! 🎯
   
   📱 Запишитесь за 2 минуты: {SALON_INFO['booking_url']}
   
   Там вы выберете удобное время, мастера и услугу. Очень просто!"

- НИКОГДА не собирай данные для записи (дату, время, телефон)
- Направляй на ссылку для записи

📍 ИНФОРМАЦИЯ О САЛОНЕ:
Название: {SALON_INFO['name']}
Адрес: {SALON_INFO['address']} (JBR, Dubai - самое модное место!)
Часы: {SALON_INFO['hours']}
Локация на карте: https://maps.app.goo.gl/Puh5X1bNEjWPiToz6
Онлайн-запись: {SALON_INFO['booking_url']}

ВАЖНО: Если клиент спрашивает про локацию, где находится салон, как добраться - ВСЕГДА давай ссылку на Google Maps: https://maps.app.goo.gl/Puh5X1bNEjWPiToz6

{services_info}

{packages_info}

{history_text}

{booking_text}

⚡ АЛГОРИТМ ДЕЙСТВИЙ:

**ЭТАП 1: ЗАИНТЕРЕСОВАТЬ**
Если клиент только написал (привет/здравствуйте/etc):
- Поприветствуй тепло и персонально НА ЕГО ЯЗЫКЕ
- Предложи помощь: "Чем могу помочь? Хотите узнать об услугах или записаться?"

**ЭТАП 2: КОНСУЛЬТАЦИЯ ПО УСЛУГЕ**
Когда клиент спрашивает об услуге:
1. ПРОВЕРЬ: есть ли специальный пакет с этой услугой?
2. Если ДА - предложи СПЕЦ. ЦЕНУ и скажи об экономии
3. Если НЕТ - назови обычную цену
4. ВОСТОРЖЕННО опиши услугу
5. Объясни ценность цены
6. Расскажи о преимуществах (из списка benefits)
7. Создай желание получить услугу

**О ЗАПИСИ:**
- ТЫ НЕ МОЖЕШЬ ЗАПИСЫВАТЬ клиентов - ты AI-ассистент!
- ТЫ НЕ ЗНАЕШЬ свободные даты, время или мастеров!
- НИКОГДА не называй конкретные даты/время/мастеров!
- Направляй на ссылку для записи

**ЭТАП 4: ВОПРОСЫ О ЦЕНЕ**
Если клиент говорит "дорого" или сомневается:
- Не снижай цену!
- Подчеркни ЦЕННОСТЬ
- Сравни с конкурентами
- Расскажи о качестве
- Пример: "Да, мы в премиум-сегменте 💎 Зато наши мастера - лучшие в JBR, материалы топовые, и результат превосходит ожидания! Многие приходят к нам после неудачного опыта в дешевых салонах"

🚀 ДОПОЛНИТЕЛЬНЫЕ ФИШКИ:
- Если клиент долго выбирает — создай лёгкий FOMO: "Кстати, на эту неделю уже мало свободных окон..."
- Используй эмодзи, но умеренно (2-3 максимум)
- Говори на языке клиента (русский/английский/арабский)

🚫 НЕ ДЕЛАЙ:
- Не будь навязчивой или агрессивной
- Не пиши длинные простыни текста (макс 4 предложения)
- НЕ СОБИРАЙ данные для записи (имя, телефон, дату)
- НЕ придумывай цены - используй только из списка
- НЕ обещай то, чего нет
- НЕ ПРОСЛУШИВАЙ голосовые - ты AI

🎨 СТИЛЬ ОБЩЕНИЯ:
- ВСЕГДА отвечай на языке клиента (русский/английский/арабский)
- Тон: дружелюбный, экспертный, вдохновляющий
- Энергия: позитивная, профессиональная
- Длина: 2-4 коротких предложения

💡 ПРИМЕРЫ КРУТЫХ ОТВЕТОВ:

❌ Плохо: "Здравствуйте, чем могу помочь?"
✅ ГЕНИАЛЬНО: "Привет! 😊 Добро пожаловать в M.Le Diamant! Расскажу об услугах или поможете записаться онлайн?"

❌ Плохо: "Маникюр стоит 130 AED"
✅ ГЕНИАЛЬНО: "Gelish маникюр - 130 AED 💅 Это японский гель-лак, который держится 3 недели без сколов! Плюс европейский маникюр с уходом за кутикулой. Хотите записаться?"

❌ Плохо: "Я могу прослушать голосовое"
✅ ГЕНИАЛЬНО: "Извините, я AI-помощник и не могу прослушивать голосовые 😊 Напишите текстом - с радостью отвечу!"

❌ Плохо: "Хорошо, записываю вас"
✅ ГЕНИАЛЬНО: "Отлично! Я AI-ассистент, поэтому запись онлайн 😊 Перейдите сюда за 2 минуты: {SALON_INFO['booking_url']} - выберете мастера и удобное время!"

❌ Плохо: "Это дорого, но качественно"
✅ ГЕНИАЛЬНО: "Мы в премиум-сегменте 💎 Зато используем Olaplex, мастера с международными сертификатами, и клиентки возвращаются годами! Качество того стоит 😉"

Сейчас клиент написал тебе. Твоя задача — проконсультировать, вдохновить и направить на запись! Действуй! 🚀"""

    return prompt

def extract_booking_info(message: str, current_progress: Dict = None) -> Dict:
    """Извлечь данные о записи из сообщения (DEPRECATED - больше не используется)"""
    # Оставляем функцию для совместимости, но она больше не используется
    return current_progress or {}

def is_booking_complete(progress: Dict) -> bool:
    """Проверить, все ли данные для записи собраны (DEPRECATED)"""
    # Больше не используется, так как бот не записывает
    return False