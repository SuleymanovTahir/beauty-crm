"""
API endpoints для публичного контента
"""
from fastapi import APIRouter, Query
from typing import Optional, List, Dict
from db.public_content import (
    get_active_reviews,
    get_active_faq,
    get_active_gallery
)
from utils.logger import log_info

router = APIRouter()

@router.get("/public/reviews")
async def get_reviews(
    language: str = Query('ru', description="Language code (ru, en, ar, es, de, fr, hi, kk, pt)"),
    limit: Optional[int] = Query(None, description="Maximum number of reviews")
) -> Dict:
    """
    Получить активные отзывы на указанном языке
    
    - **language**: Код языка (по умолчанию 'ru')
    - **limit**: Максимальное количество отзывов
    """
    log_info(f"API: Запрос отзывов на языке {language}", "api")
    reviews = get_active_reviews(language=language, limit=limit)
    return {"reviews": reviews}

@router.get("/public/testimonials")
async def get_testimonials(
    language: str = Query('ru', description="Language code"),
    limit: Optional[int] = Query(6, description="Maximum number of testimonials")
) -> Dict:
    """
    Алиас для /public/reviews (для совместимости)
    """
    reviews = get_active_reviews(language=language, limit=limit)
    return {"reviews": reviews}

@router.get("/public/faq")
async def get_faq(
    language: str = Query('ru', description="Language code"),
    category: Optional[str] = Query(None, description="FAQ category"),
    client_id: Optional[str] = Query(None, description="Optional client ID to show personal discounts")
) -> Dict:
    """
    Получить FAQ на указанном языке
    
    - **language**: Код языка
    - **category**: Категория (опционально)
    - **client_id**: ID клиента для персональной информации
    """
    log_info(f"API: Запрос FAQ на языке {language}", "api")
    faqs = get_active_faq(language=language, category=category)
    
    try:
        from services.loyalty import LoyaltyService
        from database import get_salon_settings
        
        loyalty_service = LoyaltyService()
        salon_settings = get_salon_settings()
        
        # Get loyalty levels
        levels = loyalty_service.get_all_levels()
        
        # Keywords for various categories
        keywords_map = {
            'loyalty': {
                'ru': ['программа лояльности', 'скидк', 'бонус'],
                'en': ['loyalty program', 'discount', 'bonus'],
                'es': ['programa de lealtad', 'descuento', 'bono'],
                'de': ['treueprogramm', 'rabatt', 'bonus'],
                'fr': ['programme de fidélité', 'remise', 'bonus'],
                'pt': ['programa de fidelidade', 'desconto', 'bônus'],
                'ar': ['برنامج الولاء', 'خصм', 'مكافأة'],
                'hi': ['लोयल्टी प्रोग्राम', 'छूट', 'बोनस'],
                'kk': ['лоялдылық бағдарламасы', 'жеңілдік', 'бонус']
            },
            'payment': {
                'ru': ['оплат'],
                'en': ['payment'],
                'es': ['pago'],
                'de': ['zahlung'],
                'fr': ['paiement'],
                'pt': ['pagamento'],
                'ar': ['دفع'],
                'hi': ['भुगतान'],
                'kk': ['төлем']
            },
            'hours': {
                'ru': ['часы работы', 'выходные', 'график'],
                'en': ['hours', 'working', 'weekend', 'schedule'],
                'es': ['horario', 'fin de semana'],
                'de': ['öffnungszeiten', 'wochenende'],
                'fr': ['horaires', 'weekend'],
                'pt': ['horário', 'fim de semana'],
                'ar': ['ساعات العمل', 'عطلة'],
                'hi': ['काम के घंटे', 'सप्ताहांत'],
                'kk': ['жұмыс уақыты', 'демалыс']
            },
            'location': {
                'ru': ['адрес', 'где находит', 'добраться', 'карта', 'местоположение'],
                'en': ['address', 'where', 'location', 'get to', 'map'],
                'es': ['dirección', 'dónde', 'ubicación', 'mapa'],
                'de': ['adresse', 'wo', 'standort', 'karte'],
                'fr': ['adresse', 'où', 'emplacement', 'carte'],
                'pt': ['endereço', 'onde', 'localização', 'mapa'],
                'ar': ['عنوان', 'أين', 'خريطة'],
                'hi': ['पता', 'कहाँ', 'मानचित्र'],
                'kk': ['мекен-жай', 'қайда', 'карта']
            },
            'parking': {
                'ru': ['парковк', 'машин'],
                'en': ['parking', 'car'],
                'es': ['estacionamiento', 'aparcamiento', 'coche'],
                'de': ['parken', 'parkplatz', 'auto'],
                'fr': ['parking', 'voiture'],
                'pt': ['estacionamento', 'carro'],
                'ar': ['موقف', 'سيارة'],
                'hi': ['पार्किंग', 'गाड़ी'],
                'kk': ['тұрақ', 'көлік']
            },
            'wifi': {
                'ru': ['wifi', 'вайфай', 'интернет'],
                'en': ['wifi', 'internet'],
                'es': ['wifi', 'internet'],
                'de': ['wlan', 'internet'],
                'fr': ['wifi', 'internet'],
                'pt': ['wifi', 'internet'],
                'ar': ['واي فاي', 'إنترنت'],
                'hi': ['वाईफाई', 'इंटरनेट'],
                'kk': ['интернет']
            }
        }
        
        lang_key = language[:2]
        
        # Translation dictionary for enrichment
        enrich_t = {
            'status': {
                'ru': 'Ваш статус: **{level}**. Баллов: **{points}**. Скидка: **{discount}%**.',
                'en': 'Your status: **{level}**. Points: **{points}**. Discount: **{discount}%**.',
                'ar': 'حالتك: **{level}**. النقاط: **{points}**. الخصم: **{discount}%**.',
                'es': 'Tu estado: **{level}**. Puntos: **{points}**. Descuento: **{discount}%**.',
                'de': 'Ihr Status: **{level}**. Punkte: **{points}**. Rabatt: **{discount}%**.',
                'fr': 'Votre statut : **{level}**. Points : **{points}**. Remise : **{discount}%**.',
                'pt': 'Seu status: **{level}**. Pontos: **{points}**. Desconto: **{discount}%**.',
                'hi': 'आपकी स्थिति: **{level}**। अंक: **{points}**। छूट: **{discount}%**।',
                'kk': 'Сіздің мәртебеңіз: **{level}**. Ұпайлар: **{points}**. Жеңілдік: **{discount}%**.'
            },
            'loyalty_intro': {
                'ru': 'У нас действует многоуровневая программа лояльности:\n',
                'en': 'We have a tiered loyalty program:\n',
                'ar': 'لدينا برنامج ولاء متعدد المستويات:\n',
                'es': 'Tenemos un programa de lealtad por niveles:\n',
                'de': 'Wir haben ein gestaffeltes Treueprogramm:\n',
                'fr': 'Nous avons un programme de fidélité à plusieurs niveaux :\n',
                'pt': 'Temos um programa de fidelidade em níveis:\n',
                'hi': 'हमारे पास एक स्तरीय वफादारी कार्यक्रम है:\n',
                'kk': 'Бізде деңгейлі адалдық бағдарламасы бар:\n'
            },
            'loyalty_level': {
                'ru': '- {icon} **{name}**: от {points} баллов — скидка {discount}%\n',
                'en': '- {icon} **{name}**: from {points} points — {discount}% discount\n',
                'ar': '- {icon} **{name}**: من {points} نقطة — خصم {discount}%\n',
                'es': '- {icon} **{name}**: desde {points} puntos — {discount}% de descuento\n',
                'de': '- {icon} **{name}**: ab {points} Punkten — {discount}% Rabatt\n',
                'fr': '- {icon} **{name}** : à partir de {points} points — {discount}% de remise\n',
                'pt': '- {icon} **{name}**: a partir de {points} pontos — {discount}% de desconto\n',
                'hi': '- {icon} **{name}**: {points} अंकों से — {discount}% छूट\n',
                'kk': '- {icon} **{name}**: {points} ұпайдан — {discount}% жеңілдік\n'
            },
            'birthday': {
                'ru': '\nТакже мы дарим скидку **{discount}** на день рождения!',
                'en': '\nWe also offer a **{discount}** discount for your birthday!',
                'ar': '\nكما نقدم خصمًا بنسبة **{discount}** في عيد ميلادك!',
                'es': '\n¡También ofrecemos un descuento de **{discount}** por tu cumpleaños!',
                'de': '\nWir bieten auch einen Rabatt von **{discount}** zum Geburtstag an!',
                'fr': '\nNous offrons également une remise de **{discount}** pour votre anniversaire !',
                'pt': '\nTambém oferecemos um desconto de **{discount}** no seu aniversário!',
                'hi': '\nहम आपके जन्मदिन के लिए **{discount}** छूट भी देते हैं!',
                'kk': '\nСондай-ақ біз туған күнге **{discount}** жеңілдік береміз!'
            },
            'no_loyalty': {
                'ru': 'На данный момент у нас нет активной бонусной программы, но мы часто проводим сезонные акции. Следите за нашими новостями в Instagram!',
                'en': 'Currently, there is no active loyalty program, but we often have seasonal promotions. Follow us on Instagram for updates!',
                'ar': 'حاليًا، لا يوجد برنامج ولاء نشط، لكننا غالبًا ما نقدم عروضًا موسمية. تابعونا على Instagram للحصول على التحديثات!',
                'es': 'Actualmente no hay un programa de fidelización activo, но a menudo realizamos promociones estacionales. ¡Síguenos en Instagram para estar al tanto!',
                'de': 'Derzeit gibt es kein aktives Treueprogramm, aber wir haben oft saisonale Sonderangebote. Folgen Sie uns auf Instagram für Updates!',
                'fr': "Actuellement, il n'y a pas de programme de fidélité actif, mais nous proposons souvent des promotions saisonnières. Suivez-nous sur Instagram pour les mises à jour !",
                'pt': 'Atualmente não há um programa de fidelidade ativo, mas costumamos ter promoções sazonais. Siga-nos no Instagram para atualizações!',
                'hi': 'वर्तमान में, कोई सक्रिय वफादारी कार्यक्रम नहीं है, लेकिन हम अक्सर मौसми प्रचार करते हैं। अपडेट के लिए हमें Instagram पर फ़ॉलो करें!',
                'kk': 'Қазіргі уақытта белсенді бонустық бағдарлама жоқ, бірақ біз жиі маусымдық акциялар өткіземіз. Жаңалықтарымызды Instagram-да бақылаңыз!'
            },
            'payment': {
                'ru': 'Мы принимаем следующие способы оплаты: {methods}.',
                'en': 'We accept the following payment methods: {methods}.',
                'ar': 'نقبل طرق الدفع التالية: {methods}.',
                'es': 'Aceptamos los siguientes métodos de pago: {methods}.',
                'de': 'Wir akzeptieren die folgenden Zahlungsmethoden: {methods}.',
                'fr': 'Nous acceptons les modes de paiement suivants : {methods}.',
                'pt': 'Aceitamos os seguintes métodos de pagamento: {methods}.',
                'hi': 'हम निम्नलिखित भुगतान विधियों को स्वीकार करते हैं: {methods}।',
                'kk': 'Біз келесі төлем әдістерін қабылдаймыз: {methods}.'
            },
            'payment_fallback': {
                'ru': 'Вы можете оплатить услуги наличными или банковской картой непосредственно в салоне.',
                'en': 'You can pay for services by cash or credit card directly at the salon.',
                'ar': 'يمكنك دفع ثمن الخدمات نقدًا أو ببطاقة الائتمان مباشرة في الصالون.',
                'es': 'Puedes pagar los servicios en efectivo o con tarjeta de crédito directamente en el salón.',
                'de': 'Sie können Dienstleistungen bar oder mit Kreditkarte direkt im Salon bezahlen.',
                'fr': 'Vous pouvez payer les prestations en espèces ou par carte bancaire directement au salon.',
                'pt': 'Você pode pagar pelos serviços em dinheiro ou cartão de crédito diretamente no salão.',
                'hi': 'आप सैलून में सीधे नकद या क्रेडिट कार्ड द्वारा सेवाओं के लिए भुगतान कर सकते हैं।',
                'kk': 'Қызметтер үшін төлемді тікелей салонда қолма-қол ақшамен немесе банк картасымен жасауға болады.'
            },
            'hours': {
                'ru': 'Наш салон работает по следующему графику: {hours}. Мы работаем без выходных.',
                'en': 'Our salon is open during the following hours: {hours}. We are open 7 days a week.',
                'ar': 'صالوننا مفتوح خلال الساعات التالية: {hours}. نحن نفتح 7 أيام في الأسبوع.',
                'es': 'Nuestro salón está abierto en el siguiente horario: {hours}. Abrimos los 7 días de la semana.',
                'de': 'Unser Salon ist zu den folgenden Zeiten geöffnet: {hours}. Wir haben 7 Tage die Woche geöffnet.',
                'fr': 'Notre salon est ouvert aux horaires suivants : {hours}. Мы sommes ouverts 7 jours sur 7.',
                'pt': 'Nosso salão está aberto nos seguintes horários: {hours}. Estamos abertos 7 dias por semana.',
                'hi': 'हमारा सैलून निम्नलिखित घंटों के दौरान खुला है: {hours}। हम सप्ताह में 7 दिन खुले रहते हैं।',
                'kk': 'Біздің салон келесі жұмыс кестесі бойынша жұмыс істейді: {hours}. Біз демалыссыз жұмыс істейміз.'
            },
            'hours_fallback': {
                'ru': 'Мы работаем ежедневно с 10:30 до 21:00.',
                'en': 'We are open daily from 10:30 AM to 9:00 PM.',
                'ar': 'نحن نفتح يوميًا من الساعة 10:30 صباحًا حتى الساعة 9:00 مساءً.',
                'es': 'Abrimos todos los días de 10:30 a 21:00.',
                'de': 'Wir haben täglich von 10:30 bis 21:00 Uhr geöffnet.',
                'fr': 'Nous sommes ouverts tous les jours de 10h30 à 21h00.',
                'pt': 'Estamos abertos diariamente das 10:30 às 21:00.',
                'hi': 'हम रोजाना सुबह 10:30 बजे से रात 9:00 बजे तक खुले रहते हैं।',
                'kk': 'Біз күн сайын 10:30-дан 21:00-ге дейін жұмыс істейміз.'
            },
            'location': {
                'ru': 'Мы находимся по адресу: {addr}. Подробную карту вы можете найти в разделе Контакты.',
                'en': 'We are located at: {addr}. You can find a detailed map in the Contacts section.',
                'ar': 'نحن موجودون في: {addr}. يمكنك العثور على خريطة مفصلة في قسم الاتصال.',
                'es': 'Estamos ubicados в: {addr}. Puedes encontrar un mapa detallado en la sección de Contactos.',
                'de': 'Wir befinden uns hier: {addr}. Eine detaillierte Karte finden Sie im Bereich Контakte.',
                'fr': 'Nous sommes situés à : {addr}. Vous trouverez une carte détaillée dans la section Contacts.',
                'pt': 'Estamos localizados em: {addr}. Você pode encontrar um mapa detalhado na seção Contatos.',
                'hi': 'हम यहाँ स्थित हैं: {addr}। आप संपर्क अनुभाग में एक विस्तृत मानचित्र पा सकते हैं।',
                'kk': 'Біз келесі мекен-жай бойынша орналасқанбыз: {addr}. Толық картаны Байланыс бөлімінен таба аласыз.'
            },
            'parking_fallback': {
                'ru': 'Рядом с нашим салоном есть парковка. Пожалуйста, обратитесь к администратору для получения подробной информации.',
                'en': 'There is parking available near our salon. Please contact our receptionist for more details.',
                'ar': 'توجد مواقف للسيارات بالقرب من صالوننا. يرجى الاتصال بموظف الاستقبال للحصول على مزيد من التفاصيل.',
                'es': 'Hay aparcamiento disponible cerca de nuestro salón. Por favor, contacte con nuestro recepcionista para más detalles.',
                'de': 'In der Nähe unseres Salons stehen Parkplätze zur Verfügung. Für weitere Details wenden Sie sich bitte an unseren Rezeptionisten.',
                'fr': "Un parking est disponible à proximité de notre salon. Veuillez contacter notre réceptionniste pour plus de détails.",
                'pt': 'Há estacionamento disponível perto do nosso salão. Entre em contato com nossa recepcionista para mais detalhes.',
                'hi': 'हमारे सैलून के पास पार्किंग उपलब्ध है। अधिक जानकारी के लिए कृपया हमारे रिसेप्शनिस्ट से संपर्क करें।',
                'kk': 'Салонымыздың жанында тұрақ бар. Толық ақпарат алу үшін әкімшіге хабарласыңыз.'
            },
            'wifi_fallback': {
                'ru': 'Да, в нашем салоне для клиентов доступен бесплатный Wi-Fi. Пароль вы можете узнать у администратора.',
                'en': 'Yes, free Wi-Fi is available for our clients. You can get the password from the receptionist.',
                'ar': 'نعم، تتوفر خدمة الواي فاي المجانية لعملائنا. يمكنك الحصول на كلمة المرور من موظف الاستقبال.',
                'es': 'Sí, hay Wi-Fi gratuito disponible para nuestros clientes. Puedes pedir la contraseña al recepcionista.',
                'de': 'Ja, für unsere Kunden steht kostenloses WLAN zur Verfügung. Das Passwort erhalten Sie an der Rezeption.',
                'fr': "Oui, une connexion Wi-Fi gratuite est à la disposition de nos clients. Vous pouvez obtenir le mot de passe auprès de la réception.",
                'pt': 'Sim, Wi-Fi gratuito está disponível para nossos clientes. Você pode obter a senha com a recepcionista.',
                'hi': 'हाँ, हमारे ग्राहकों के लिए मुफ्त वाई-फाई उपलब्ध है। आप रिसेप्शनिस्ट से पासवर्ड प्राप्त कर सकते हैं।',
                'kk': 'Иә, біздің салонда клиенттер үшін тегін Wi-Fi бар. Құпиясөзді әкімшіден білуге болады.'
            }
        }
        
        personal_info = ""
        if client_id:
            loyalty_data = loyalty_service.get_client_loyalty(client_id)
            if loyalty_data:
                level_name = loyalty_data.get('loyalty_level', 'bronze').capitalize()
                points = loyalty_data.get('available_points', 0)
                current_level = next((l for l in levels if l['level_name'].lower() == level_name.lower()), None)
                discount = current_level.get('discount_percent', 0) if current_level else 0
                
                personal_info = "\n\n" + enrich_t['status'].get(lang_key, enrich_t['status']['en']).format(
                    level=level_name, points=points, discount=discount
                )

        # Process each FAQ item
        for item in faqs:
            q = item.get('question', '').lower()
            
            # Loyalty & Discounts
            if any(k in q for k in keywords_map['loyalty'].get(lang_key, keywords_map['loyalty']['en'])):
                real_loyalty = [lvl for lvl in levels if lvl.get('discount_percent', 0) > 0]
                
                if real_loyalty:
                    loyalty_desc = enrich_t['loyalty_intro'].get(lang_key, enrich_t['loyalty_intro']['en'])
                    for lvl in levels:
                        loyalty_desc += enrich_t['loyalty_level'].get(lang_key, enrich_t['loyalty_level']['en']).format(
                            icon=lvl.get('icon', '✨'),
                            name=lvl.get('level_name', '').capitalize(),
                            points=lvl.get('min_points', 0),
                            discount=lvl.get('discount_percent', 0)
                        )
                    
                    bday_disc = salon_settings.get('birthday_discount')
                    if bday_disc:
                        loyalty_desc += enrich_t['birthday'].get(lang_key, enrich_t['birthday']['en']).format(discount=bday_disc)
                    
                    item['answer'] = loyalty_desc + personal_info
                else:
                    item['answer'] = enrich_t['no_loyalty'].get(lang_key, enrich_t['no_loyalty']['en'])
                
            # Payment Methods
            elif any(k in q for k in keywords_map['payment'].get(lang_key, keywords_map['payment']['en'])):
                methods = salon_settings.get(f'payment_methods_{lang_key}') or salon_settings.get('payment_methods')
                if methods:
                    item['answer'] = enrich_t['payment'].get(lang_key, enrich_t['payment']['en']).format(methods=methods)
                else:
                    item['answer'] = enrich_t['payment_fallback'].get(lang_key, enrich_t['payment_fallback']['en'])
            
            # Hours
            elif any(k in q for k in keywords_map['hours'].get(lang_key, keywords_map['hours']['en'])):
                hours = salon_settings.get(f'hours_{lang_key}') or salon_settings.get('hours')
                if hours:
                    item['answer'] = enrich_t['hours'].get(lang_key, enrich_t['hours']['en']).format(hours=hours)
                else:
                    item['answer'] = enrich_t['hours_fallback'].get(lang_key, enrich_t['hours_fallback']['en'])
            
            # Parking
            elif any(k in q for k in keywords_map['parking'].get(lang_key, keywords_map['parking']['en'])):
                parking = salon_settings.get(f'parking_info_{lang_key}') or salon_settings.get('parking_info')
                if parking:
                    item['answer'] = parking
                else:
                    item['answer'] = enrich_t['parking_fallback'].get(lang_key, enrich_t['parking_fallback']['en'])

            # Wifi
            elif any(k in q for k in keywords_map['wifi'].get(lang_key, keywords_map['wifi']['en'])):
                if salon_settings.get('wifi_available'):
                    item['answer'] = enrich_t['wifi_fallback'].get(lang_key, enrich_t['wifi_fallback']['en'])

            # Location
            elif any(k in q for k in keywords_map['location'].get(lang_key, keywords_map['location']['en'])):
                addr = salon_settings.get(f'address_{lang_key}') or salon_settings.get('address')
                if addr:
                    item['answer'] = enrich_t['location'].get(lang_key, enrich_t['location']['en']).format(addr=addr)
                
    except Exception as e:
        log_info(f"API: Error enriching FAQ: {e}", "api")

    return {"faq": faqs}

@router.get("/public/gallery")
async def get_gallery(
    category: Optional[str] = Query(None, description="Gallery category"),
    limit: Optional[int] = Query(None, description="Maximum number of items")
) -> Dict:
    """
    Получить элементы галереи
    
    - **category**: Категория (опционально)
    - **limit**: Максимальное количество элементов
    """
    log_info(f"API: Запрос галереи (category: {category})", "api")
    try:
        gallery = get_active_gallery(category=category, limit=limit)
        log_info(f"API: Получено {len(gallery)} изображений", "api")
        
        from fastapi.responses import JSONResponse
        response = JSONResponse({"success": True, "images": gallery})
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        return response
    except Exception as e:
        log_info(f"API: Ошибка получения галереи: {e}", "api")
        import traceback
        log_info(f"API: Traceback: {traceback.format_exc()}", "api")
        return JSONResponse({"success": False, "images": [], "error": str(e)}, status_code=500)
