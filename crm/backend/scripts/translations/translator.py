"""
Universal translator using Google Translate HTTP API (free, no library needed)
Falls back to simple copy if translation fails
Uses LibreTranslate for short phrases (≤10 chars) to avoid context issues
"""

import json
import urllib.request
import urllib.parse
import time
from typing import List, Dict, Optional
from pathlib import Path
import sys
import os
import ssl
import re
import threading
import random

# Bypass SSL verification for local requests if needed
if not os.environ.get('PYTHONHTTPSVERIFY', '') and getattr(ssl, '_create_unverified_context', None):
    ssl._create_default_https_context = ssl._create_unverified_context

# Add scripts/translations to path for local config
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from config import CACHE_DIR, LANGUAGES

# Import LibreTranslate for short phrases
try:
    from beauty_translator import get_translator as get_libre_translator
    LIBRE_AVAILABLE = True
except ImportError:
    LIBRE_AVAILABLE = False
    print("⚠️  LibreTranslate not available, using Google Translate for all text")

# Salon-specific terminology dictionary for better context
# This helps correct common mistranslations
SALON_TERMINOLOGY = {
    # Corrections for Russian (when RU is the target language)
    'ru': {
        'tursunai': 'Турсунай',
        'tursunay': 'Турсунай',
        'пост': 'запись',        # 'post' -> 'запись' (booking)
        'записи': 'записи',      # Plural consistency
        'вход': 'запись',        # 'entry' -> 'запись'
        'рекорд': 'запись',      # 'record' -> 'запись'
        'букинг': 'запись',
        'booking': 'запись',
        'изготовление': 'создание',
        'персонажа': 'символа',
        'персонажей': 'символов',
        'требуется запись': 'логин обязателен',
        'неправильный': 'ошибка',
        'создать пользователя и назначить услуги': 'создать пользователя и назначить услуги',
        'поиск позиции': 'поиск должности',
        'позиция не найдена': 'должность не найдена',
        'выберите одну или несколько позиций': 'выберите одну или несколько должностей',
        'доступ запрещен': 'доступ запрещен',
        'назад к пользователям': 'вернуться к списку пользователей',
        'толкать': 'Push-уведомление',
        'push': 'Push-уведомление',
        'email': 'Электронная почта',
        'sms': 'SMS',
        'вощение': 'ваксинг',    # 'waxing' -> 'ваксинг'
        'массажи': 'массаж',     # 'massages' -> 'массаж'
        'бровист': 'мастер по бровям',
        'ноготь': 'ногти',       # 'nail' -> 'ногти'
        'ногтя': 'ногтей',
        'починка': 'ремонт',     # 'fix' -> 'ремонт'
        'услуга': 'услуга',
        'заголовок': 'Заголовок',
        'подзаголовок': 'Описание',
        'титул': 'Заголовок',
        'главный титул': 'Выберите мастера',
        'оценка красоты': 'Индекс красоты',
        'полоса сообщений': 'Серия посещений',
        'количество ошибок импорта': 'Ошибок импорта',
        'тело категории': 'Тело',
        'лицо категории': 'Лицо',
        'категория волосы': 'Волосы',
        'категория ногти': 'Ногти',
        'тело': 'Тело',
        'лицо': 'Лицо',
        'волосы': 'Волосы',
        'ногти': 'Ногти',
        'мастер': 'Мастер',
        'любой мастер': 'Любой мастер',
        'часы пик': 'Пиковые часы',
        'за каждый запись': 'За каждую запись',
        'удалить пакет, подтвердить несколько': 'Подтвердите удаление нескольких элементов',
        'удалить пакет, подтвердить много': 'Подтвердите удаление многих элементов',
        'удалить пакет, подтвердить один': 'Подтвердите удаление элемента',
        'удалить пакет, подтвердить другое': 'Подтвердите удаление',
        'задержка (дни)': 'Задержка (дн.)',
        'задержка (часы)': 'Задержка (ч.)',
        'задержка (минуты)': 'Задержка (мин.)',
        'nfc apple/google wallet': 'NFC Apple/Google Wallet',
        'ламинирование ресниц': 'ламинирование ресниц',
        'ламинирование бровей': 'ламинирование бровей',
        'ламинирование бровей и ресниц': 'ламинирование бровей и ресниц',
        'окрашивание бровей': 'окрашивание бровей',
        'оформление бровей': 'оформление бровей',
        'глубокая чистка лица': 'глубокая чистка лица',
        'подтягивающий массаж лица с маской': 'подтягивающий массаж лица с маской',
        'медицинская чистка для проблемной кожи': 'медицинская чистка для проблемной кожи',
        'пилинг': 'Пилинг',
        'peeling': 'Пилинг',
        'балаяж': 'балаяж',
        'выход из черного': 'выход из черного',
        'наращивание ногтей': 'наращивание ногтей',
        'коррекция ногтей': 'коррекция ногтей',
        'укрепление ногтей': 'укрепление ногтей',
        'гель-лак': 'гель-лак',
        'гель-лаками': 'гель-лак',
        'гель-лаком': 'гель-лак',
        'парикмахер': 'стилист по волосам',
        'hair stylist': 'стилист по волосам',
        'барбер': 'стилист по волосам',
        'barber': 'стилист по волосам',
        'стилист по волосам': 'стилист по волосам',
        'senior stylist': 'Топ-стилист',
        'постоянно верно': 'перманентный макияж',
        'permanent makeup': 'перманентный макияж',
        # Service naming normalization
        'польское изменение (pedi)': 'Смена лака (Pedi)',
        'смена лака (pedi)': 'Смена лака (Pedi)',
        'change polish (pedi)': 'Смена лака (Pedi)',
        'polish change (pedi)': 'Смена лака (Pedi)',
        'change gel polish (pedi)': 'Смена гель-лака (Pedi)',
        'repair 1 extension': 'Коррекция 1 наращенного ногтя',
        'ремонт 1 наращивания': 'Коррекция 1 наращенного ногтя',
        'repair 1 gel nail': 'Коррекция 1 гелевого ногтя',
        'ремонт 1 гелевого ногтей': 'Коррекция 1 гелевого ногтя',
        'ремонт 1 гелевого ногтя': 'Коррекция 1 гелевого ногтя',
        'brow coloring': 'Окрашивание бровей',
        'брови окрашивание': 'Окрашивание бровей',
        'haircut + wash': 'Стрижка + мытье',
        'hair cut + wash': 'Стрижка + мытье',
        'cut + wash': 'Стрижка + мытье',
        'стрижка + смывка': 'Стрижка + мытье',
        'lashliner': 'Подводка межресничного контура',
        'smart pedicure basic': 'Смарт-педикюр базовый',
        'permanent brows': 'Перманент бровей',
        'подводка межресничного контура': 'Подводка межресничного контура',
        'наложение биогеля': 'Наложение биогеля',
        'смарт-педикюр базовый': 'Смарт-педикюр базовый',
        'наращивание ногтей (гель)': 'Наращивание ногтей (гель)',
        # Category normalization
        'brows': 'Брови',
        'combo': 'Комбо',
        'cosmetology': 'Косметология',
        'hair care': 'Уход за волосами',
        'hair color': 'Окрашивание волос',
        'hair cut': 'Стрижка',
        'haircut': 'Стрижка',
        'hair styling': 'Укладка',
        'lashes': 'Ресницы',
        'manicure': 'Маникюр',
        'massage': 'Массаж',
        'nails': 'Ногти',
        'pedicure': 'Педикюр',
        'spa': 'Спа',
        'waxing': 'Ваксинг',
        'депиляция воском': 'Ваксинг',
        'цвет волос': 'Окрашивание волос',
        'стрижка волос': 'Стрижка',
        'укладка волос': 'Укладка',
        'permanent makeup': 'Перманентный макияж',
    },
    # Corrections for English (when EN is the target language)
    'en': {
        'post': 'booking',
        'posts': 'bookings',
        'record': 'booking',
        'records': 'bookings',
        'recording': 'booking',
        'entry': 'booking',
        'entries': 'bookings',
        'create user & assign services': 'create user & assign services',
        'no position found': 'no position found',
        'search position': 'search position',
        'vaksing': 'waxing',
        'voring': 'waxing',
        'voxing': 'waxing',
        'master of eyebrows': 'brow master',
        'repair of nails': 'nail repair',
        'nail fixing': 'nail repair',
        'lash lift': 'lash lift',
        'lash lamination': 'lash lift',
        'brow lift': 'brow lamination',
        'brow and lash lamination': 'brow and lash lamination',
        'eyebrow tinting': 'eyebrow tinting',
        'eyebrow shaping': 'eyebrow shaping',
        'deep facial cleansing': 'deep facial cleansing',
        'lifting facial massage with mask': 'lifting facial massage with mask',
        'medical cleansing for problem skin': 'medical cleansing for problem skin',
        'peeling': 'Peeling',
        'balayage': 'balayage',
        'black color removal': 'hair color correction',
        'nail infill': 'nail refill',
        'nail overlay': 'nail overlay',
        'vaxing': 'waxing',
        'gel-lakami': 'gel polish',
        'gel-lacs': 'gel polish',
        'gel-lak': 'gel polish',
        'fix': 'repair',
        # Service naming normalization
        'брови окрашивание': 'Brow Coloring',
        'окрашивание бровей': 'Brow Coloring',
        'ремонт 1 наращивания': 'Extension Correction (1 Nail)',
        'коррекция 1 наращенного ногтя': 'Extension Correction (1 Nail)',
        'repair 1 extension': 'Extension Correction (1 Nail)',
        'ремонт 1 гелевого ногтей': 'Gel Nail Correction (1 Nail)',
        'ремонт 1 гелевого ногтя': 'Gel Nail Correction (1 Nail)',
        'коррекция 1 гелевого ногтя': 'Gel Nail Correction (1 Nail)',
        'repair 1 gel nail': 'Gel Nail Correction (1 Nail)',
        'стрижка + смывка': 'Haircut + Wash',
        'стрижка + мытье': 'Cut + Wash',
        'польское изменение (pedi)': 'Polish Change (Pedi)',
        'смена лака (pedi)': 'Polish Change (Pedi)',
        'подводка для ресниц': 'Lash Line Enhancement',
        'перманент бровей': 'Permanent Brows',
        'подводка межресничного контура': 'Lash Line Enhancement',
        'lashliner': 'Lash Line Enhancement',
        'liner liner': 'Lash Line Enhancement',
        'overlay biogel': 'Biogel Overlay',
        # Category normalization
        'брови': 'Brows',
        'комбо': 'Combo',
        'косметология': 'Cosmetology',
        'уход за волосами': 'Hair Care',
        'окрашивание волос': 'Hair Color',
        'стрижка': 'Hair Cut',
        'ресницы': 'Lashes',
        'маникюр': 'Manicure',
        'массаж': 'Massage',
        'ногти': 'Nails',
        'педикюр': 'Pedicure',
        'перманентный макияж': 'Permanent Makeup',
        'спа': 'Spa',
        'ваксинг': 'Waxing',
        'депиляция воском': 'Waxing',
        'hair cutting': 'Hair Cut',
        'hair styling': 'Hair Styling',
        'укладка': 'Hair Styling',
        'иванов иван иванович': 'John Doe',
        'ivanov ivan ivanovich': 'John Doe',
        'иван_иванов': 'john_doe',
        'ivan_ivanov': 'john_doe',
    },
    # Corrections for Spanish
    # IMPORTANT: do not add generic prepositions/pronouns here (por/par/von/etc),
    # they break normal sentences during global replacement.
    'es': {
        'publicaciones': 'reservas',
        'publicación': 'reserva',
        'entrada': 'reserva',
        'entradas': 'reservas',
        'registro': 'reserva',
        'registros': 'reservas',
        'asistentes': 'especialistas',
        'asistente': 'especialista',
        'cerca': 'cerrar',
        'sobresalir': 'Excel',
        'charlar': 'chat',
        'comportamiento': 'acciones',
        'cualquier máster': 'cualquier especialista',
        'rechazado': 'cancelado',
        'él se lo perdió': 'omitido',
        'pendiente': 'en espera',
        'push': 'notificación push',
        'puntos': 'puntos',
        'lealtad': 'fidelidad',
        'wallet': 'Wallet',
        'nfc apple/google wallet': 'NFC Apple/Google Wallet',
        'agujas': 'puntos',
        # Service naming normalization
        'брови окрашивание': 'Tintado de cejas',
        'окрашивание бровей': 'Coloración de cejas',
        'brow coloring': 'Coloración de cejas',
        'ремонт 1 наращивания': 'Corrección de 1 uña extendida',
        'коррекция 1 наращенного ногтя': 'Corrección de 1 uña extendida',
        'repair 1 extension': 'Corrección de 1 uña extendida',
        'ремонт 1 гелевого ногтей': 'Corrección de 1 uña de gel',
        'ремонт 1 гелевого ногтя': 'Corrección de 1 uña de gel',
        'коррекция 1 гелевого ногтя': 'Corrección de 1 uña de gel',
        'repair 1 gel nail': 'Corrección de 1 uña de gel',
        'стрижка + смывка': 'Corte + Lavado',
        'стрижка + мытье': 'Corte + Lavado',
        'польское изменение (pedi)': 'Cambio de esmalte (Pedi)',
        'смена лака (pedi)': 'Cambio de esmalte (Pedi)',
        'подводка для ресниц': 'Delineado de línea de pestañas',
        'перманент бровей': 'Maquillaje permanente de cejas',
        'подводка межресничного контура': 'Delineado de línea de pestañas',
        'lashliner': 'Delineado de línea de pestañas',
        'smart pedicure basic': 'Pedicura Smart básica',
        'overlay biogel': 'Recubrimiento de biogel',
        'пилинг': 'Peeling',
        'peeling': 'Peeling',
        # Category normalization
        'брови': 'Cejas',
        'комбо': 'Combo',
        'косметология': 'Cosmetología',
        'уход за волосами': 'Cuidado del cabello',
        'окрашивание волос': 'Color de cabello',
        'стрижка': 'Corte de cabello',
        'ресницы': 'Pestañas',
        'маникюр': 'Manicura',
        'массаж': 'Masaje',
        'ногти': 'Uñas',
        'педикюр': 'Pedicura',
        'перманентный макияж': 'Maquillaje permanente',
        'спа': 'Spa',
        'ваксинг': 'Depilación con cera',
        'waxing': 'Depilación con cera',
        'депиляция воском': 'Depilación con cera',
        'depilación': 'Depilación con cera',
        'permanente maquillaje': 'Maquillaje permanente',
        'brows': 'Cejas',
        'combo': 'Combo',
        'cosmetology': 'Cosmetología',
        'hair care': 'Cuidado del cabello',
        'hair color': 'Color de cabello',
        'hair cut': 'Corte de cabello',
        'hair styling': 'Peinado',
        'lashes': 'Pestañas',
        'manicure': 'Manicura',
        'massage': 'Masaje',
        'nails': 'Uñas',
        'pedicure': 'Pedicura',
        'permanent makeup': 'Maquillaje permanente',
        'spa': 'Spa',
        'укладка': 'Peinado',
        'иванов иван иванович': 'Juan García',
        'ivanov ivan ivanovich': 'Juan García',
        'иван_иванов': 'juan_garcia',
        'ivan_ivanov': 'juan_garcia',
    },
    # Corrections for Portuguese
    'pt': {
        'иванов иван иванович': 'João Silva',
        'ivanov ivan ivanovich': 'João Silva',
        'иван_иванов': 'joao_silva',
        'ivan_ivanov': 'joao_silva',
        'postagens': 'reservas',
        'postagem': 'reserva',
        'entrada': 'reserva',
        'entradas': 'reservas',
        'registro': 'reserva',
        'registros': 'reservas',
        'assistentes': 'especialistas',
        'assistente': 'especialista',
        'bater papo': 'chat',
        'renda': 'receita',
        'qualquer mestre': 'qualquer profissional',
        'recusado': 'cancelado',
        'ele perdeu': 'pulado',
        'push': 'notificação push',
        'pontos': 'pontos',
        'lealdade': 'fidelidade',
        'wallet': 'Wallet',
        'nfc apple/google wallet': 'NFC Apple/Google Wallet',
        # Service naming normalization
        'брови окрашивание': 'Coloração de sobrancelhas',
        'окрашивание бровей': 'Coloração de sobrancelhas',
        'brow coloring': 'Coloração de sobrancelhas',
        'ремонт 1 наращивания': 'Correção de 1 unha alongada',
        'коррекция 1 наращенного ногтя': 'Correção de 1 unha alongada',
        'repair 1 extension': 'Correção de 1 unha alongada',
        'ремонт 1 гелевого ногтей': 'Correção de 1 unha em gel',
        'ремонт 1 гелевого ногтя': 'Correção de 1 unha em gel',
        'коррекция 1 гелевого ногтя': 'Correção de 1 unha em gel',
        'repair 1 gel nail': 'Correção de 1 unha em gel',
        'стрижка + смывка': 'Corte + Lavagem',
        'стрижка + мытье': 'Corte + Lavagem',
        'польское изменение (pedi)': 'Troca de esmalte (Pedi)',
        'смена лака (pedi)': 'Troca de esmalte (Pedi)',
        'подводка для ресниц': 'Delineado da linha dos cílios',
        'перманент бровей': 'Maquiagem permanente de sobrancelhas',
        'подводка межресничного контура': 'Delineado da linha dos cílios',
        'lashliner': 'Delineado da linha dos cílios',
        'smart pedicure basic': 'Pedicure Smart básica',
        'overlay biogel': 'Aplicação de biogel',
        'пилинг': 'Peeling',
        'peeling': 'Peeling',
        # Category normalization
        'брови': 'Sobrancelhas',
        'комбо': 'Combo',
        'косметология': 'Cosmetologia',
        'уход за волосами': 'Cuidados com os cabelos',
        'окрашивание волос': 'Cor do cabelo',
        'стрижка': 'Corte de cabelo',
        'ресницы': 'Cílios',
        'маникюр': 'Manicure',
        'массаж': 'Massagem',
        'ногти': 'Unhas',
        'педикюр': 'Pedicure',
        'перманентный макияж': 'Maquiagem permanente',
        'спа': 'Spa',
        'ваксинг': 'Depilação com cera',
        'waxing': 'Depilação com cera',
        'депиляция воском': 'Depilação com cera',
        'depilação': 'Depilação com cera',
        'maquiagem permanente maquiagem': 'Maquiagem permanente',
        'brows': 'Sobrancelhas',
        'combo': 'Combo',
        'cosmetology': 'Cosmetologia',
        'hair care': 'Cuidados com os cabelos',
        'hair color': 'Cor do cabelo',
        'hair cut': 'Corte de cabelo',
        'hair styling': 'Estilo',
        'lashes': 'Cílios',
        'manicure': 'Manicure',
        'massage': 'Massagem',
        'nails': 'Unhas',
        'pedicure': 'Pedicure',
        'permanent makeup': 'Maquiagem permanente',
        'spa': 'Spa',
        'укладка': 'Estilo',
    },
    # Corrections for French
    'fr': {
        'иванов иван иванович': 'Jean Dupont',
        'ivanov ivan ivanovich': 'Jean Dupont',
        'иван_иванов': 'jean_dupont',
        'ivan_ivanov': 'jean_dupont',
        'publications': 'réservations',
        'enregistrement': 'réservation',
        'entrée': 'réservation',
        'entrées': 'réservations',
        'enregistrements': 'réservations',
        'assistants': 'spécialistes',
        'assistant': 'spécialiste',
        'exceller': 'Excel',
        'n\'importe quel maître': 'n\'importe quel professionnel',
        'refusé': 'annulé',
        'il a raté': 'ignoré',
        'push': 'notification push',
        'points': 'points',
        'loyauté': 'fidélité',
        'wallet': 'Wallet',
        'nfc apple/google wallet': 'NFC Apple/Google Wallet',
        # Service naming normalization
        'брови окрашивание': 'Coloration des sourcils',
        'окрашивание бровей': 'Coloration des sourcils',
        'brow coloring': 'Coloration des sourcils',
        'ремонт 1 наращивания': "Correction d'un ongle rallongé",
        'коррекция 1 наращенного ногтя': "Correction d'un ongle rallongé",
        'repair 1 extension': "Correction d'un ongle rallongé",
        'ремонт 1 гелевого ногтей': "Correction d'un ongle en gel",
        'ремонт 1 гелевого ногтя': "Correction d'un ongle en gel",
        'коррекция 1 гелевого ногтя': "Correction d'un ongle en gel",
        'repair 1 gel nail': "Correction d'un ongle en gel",
        'стрижка + смывка': 'Coupe + Lavage',
        'стрижка + мытье': 'Coupe + Lavage',
        'польское изменение (pedi)': 'Changement de vernis (Pedi)',
        'смена лака (pedi)': 'Changement de vernis (Pedi)',
        'подводка для ресниц': 'Ras de cils',
        'перманент бровей': 'Maquillage permanent des sourcils',
        'подводка межресничного контура': 'Ras de cils',
        'lashliner': 'Ras de cils',
        'lineer liner': 'Ras de cils',
        'smart pedicure basic': 'Pédicure Smart basique',
        'overlay biogel': 'Pose de biogel',
        'пилинг': 'Peeling',
        'peeling': 'Peeling',
        # Category normalization
        'брови': 'Sourcils',
        'комбо': 'Combo',
        'косметология': 'Cosmétologie',
        'уход за волосами': 'Soins capillaires',
        'окрашивание волос': 'Couleur des cheveux',
        'стрижка': 'Coupe de cheveux',
        'ресницы': 'Cils',
        'маникюр': 'Manucure',
        'массаж': 'Massage',
        'ногти': 'Ongles',
        'педикюр': 'Pédicure',
        'перманентный макияж': 'Maquillage permanent',
        'спа': 'Spa',
        'ваксинг': 'Épilation à la cire',
        'waxing': 'Épilation à la cire',
        'депиляция воском': 'Épilation à la cire',
        'fartage': 'Épilation à la cire',
        'maquillage permanent maquillage': 'Maquillage permanent',
        'brows': 'Sourcils',
        'combo': 'Combo',
        'cosmetology': 'Cosmétologie',
        'hair care': 'Soins capillaires',
        'hair color': 'Couleur des cheveux',
        'hair cut': 'Coupe de cheveux',
        'hair styling': 'Stylisme',
        'lashes': 'Cils',
        'manicure': 'Manucure',
        'massage': 'Massage',
        'nails': 'Ongles',
        'pedicure': 'Pédicure',
        'permanent makeup': 'Maquillage permanent',
        'spa': 'Spa',
        'укладка': 'Stylisme',
    },
    # Corrections for German
    'de': {
        'beiträge': 'buchungen',
        'beitrag': 'buchung',
        'eintrag': 'buchung',
        'einträge': 'buchungen',
        'datensätze': 'buchungen',
        'datensatz': 'buchung',
        'assistenten': 'spezialisten',
        'assistent': 'spezialist',
        'push': 'Push-Benachrichtigung',
        'chatten': 'chat',
        'einkommen': 'umsatz',
        'beliebiger meister': 'beliebiger mitarbeiter',
        'abгелехнт': 'storniert',
        'er hat es verpasst': 'übersprungen',
        # Service naming normalization
        'брови окрашивание': 'Augenbrauenfärbung',
        'окрашивание бровей': 'Augenbrauenfärbung',
        'brow coloring': 'Augenbrauenfärbung',
        'ремонт 1 наращивания': 'Korrektur von 1 verlängerten Nagel',
        'коррекция 1 наращенного ногтя': 'Korrektur von 1 verlängerten Nagel',
        'repair 1 extension': 'Korrektur von 1 verlängerten Nagel',
        'ремонт 1 гелевого ногтей': 'Korrektur von 1 Gel-Nagel',
        'ремонт 1 гелевого ногтя': 'Korrektur von 1 Gel-Nagel',
        'коррекция 1 гелевого ногтя': 'Korrektur von 1 Gel-Nagel',
        'repair 1 gel nail': 'Korrektur von 1 Gel-Nagel',
        'стрижка + смывка': 'Haarschnitt + Waschen',
        'стрижка + мытье': 'Haarschnitt + Waschen',
        'польское изменение (pedi)': 'Lackwechsel (Pedi)',
        'смена лака (pedi)': 'Lackwechsel (Pedi)',
        'подводка для ресниц': 'Wimpernkranzverdichtung',
        'перманент бровей': 'Permanent Make-up Augenbrauen',
        'подводка межресничного контура': 'Wimpernkranzverdichtung',
        'lashliner': 'Wimpernkranzverdichtung',
        'liner-liner': 'Wimpernkranzverdichtung',
        'smart pedicure basic': 'Smart-Pediküre Basis',
        'overlay biogel': 'Biogel-Overlay',
        'пилинг': 'Peeling',
        'peeling': 'Peeling',
        # Category normalization
        'брови': 'Augenbrauen',
        'комбо': 'Combo',
        'косметология': 'Kosmetologie',
        'уход за волосами': 'Haarpflege',
        'окрашивание волос': 'Haarfarbe',
        'стрижка': 'Haarschnitt',
        'ресницы': 'Wimpern',
        'маникюр': 'Maniküre',
        'массаж': 'Massage',
        'ногти': 'Nägel',
        'педикюр': 'Pediküre',
        'перманентный макияж': 'Permanent Make-up',
        'спа': 'Spa',
        'ваксинг': 'Waxing',
        'waxing': 'Waxing',
        'депиляция воском': 'Waxing',
        'wachsen': 'Waxing',
        'brows': 'Augenbrauen',
        'combo': 'Combo',
        'cosmetology': 'Kosmetologie',
        'hair care': 'Haarpflege',
        'hair color': 'Haarfarbe',
        'hair cut': 'Haarschnitt',
        'hair styling': 'Styling',
        'lashes': 'Wimpern',
        'manicure': 'Maniküre',
        'massage': 'Massage',
        'nails': 'Nägel',
        'pedicure': 'Pediküre',
        'permanent makeup': 'Permanent Make-up',
        'spa': 'Spa',
        'укладка': 'Styling',
        'иванов иван иванович': 'Hans Müller',
        'ivanov ivan ivanovich': 'Hans Müller',
        'иван_иванов': 'hans_mueller',
        'ivan_ivanov': 'hans_mueller',
    },
    # Corrections for Arabic
    'ar': {
        'منشورات': 'حجوزات',
        'سجل': 'حجز',
        'أي سيد': 'أي خبير',
        'رفض': 'تم الإلغاء',
        'غاب عنه': 'تم التجاوز',
        'دعامات': 'إدارة السجلات',
        'المعالج': 'الخبير',
        'booking': 'حجز',
        'bookings': 'حجوزات',
        'record': 'حجز',
        'recording': 'تسجيل',
        'push': 'إشعار دفع',
        'push notifications': 'إشعارات دفع',
        'lash lift': 'رفع الرموش',
        'lash lamination': 'رفع الرموش',
        'manicure': 'مانيكير',
        'pedicure': 'باديكير',
        'waxing': 'واكس',
        # Service naming normalization
        'брови окрашивание': 'صبغ الحواجب',
        'окрашивание бровей': 'صبغ الحواجب',
        'brow coloring': 'صبغ الحواجب',
        'ремонт 1 наращивания': 'تصحيح ظفر ممدد واحد',
        'коррекция 1 наращенного ногтя': 'تصحيح ظفر ممدد واحد',
        'repair 1 extension': 'تصحيح ظفر ممدد واحد',
        'ремонт 1 гелевого ногтей': 'تصحيح ظفر جل واحد',
        'ремонт 1 гелевого ногтя': 'تصحيح ظفر جل واحد',
        'коррекция 1 гелевого ногтя': 'تصحيح ظفر جل واحد',
        'repair 1 gel nail': 'تصحيح ظفر جل واحد',
        'стрижка + смывка': 'قص + غسل',
        'стрижка + мытье': 'قص + غسل',
        'польское изменение (pedi)': 'تغيير الطلاء (باديكير)',
        'смена лака (pedi)': 'تغيير الطلاء (باديكير)',
        'подводка для ресниц': 'تحديد خط الرموش',
        'перманент бровей': 'مكياج دائم للحواجب',
        'подводка межресничного контура': 'تحديد خط الرموش',
        'lashliner': 'تحديد خط الرموش',
        'smart pedicure basic': 'باديكير ذكي أساسي',
        'overlay biogel': 'تراكب بيوجل',
        'пилинг': 'تقشير البشرة',
        'peeling': 'تقشير البشرة',
        # Category normalization
        'брови': 'الحواجب',
        'комбо': 'كومبو',
        'косметология': 'التجميل',
        'уход за волосами': 'العناية بالشعر',
        'окрашивание волос': 'لون الشعر',
        'стрижка': 'قص الشعر',
        'ресницы': 'الرموش',
        'маникюр': 'مانيكير',
        'массаж': 'التدليك',
        'ногти': 'الأظافر',
        'педикюр': 'باديكير',
        'перманентный макияж': 'مكياج دائم',
        'ваксинг': 'إزالة الشعر بالشمع',
        'waxing': 'إزالة الشعر بالشمع',
        'депиляция воском': 'إزالة الشعر بالشمع',
        'укладка': 'تصفيف الشعر',
        'спа': 'سبا',
        'brows': 'الحواجب',
        'combo': 'كومبو',
        'cosmetology': 'التجميل',
        'hair care': 'العناية بالشعر',
        'hair color': 'لون الشعر',
        'hair cut': 'قص الشعر',
        'hair styling': 'تصفيف الشعر',
        'lashes': 'الرموش',
        'nails': 'الأظافر',
        'permanent makeup': 'مكياج دائم',
        'spa': 'سبا',
        'иванов иван иванович': 'محمد أحمد',
        'ivanov ivan ivanovich': 'محمد أحمد',
        'иван_иванов': 'mohamed_ahmed',
        'ivan_ivanov': 'mohamed_ahmed',
    },
    # Corrections for Hindi
    'hi': {
        'कोई भी गुरु': 'कोई भी मास्टर',
        'मना कर दिया': 'रद्द किया गया',
        'वह चूक गया': 'छোड़ा गया',
        'booking': 'बुकिंग',
        'bookings': 'बुकिंग',
        'record': 'रिकॉर्ड',
        'recording': 'रिकॉर्डिंग',
        'push': 'पुश नोटिफिकेशन',
        # Service naming normalization
        'брови окрашивание': 'भौंहों की रंगाई',
        'окрашивание бровей': 'भौंहों की रंगाई',
        'brow coloring': 'भौंहों की रंगाई',
        'ремонт 1 наращивания': '1 एक्सटेंशन नाखून का करेक्शन',
        'коррекция 1 наращенного ногтя': '1 एक्सटेंशन नाखून का करेक्शन',
        'repair 1 extension': '1 एक्सटेंशन नाखून का करेक्शन',
        'ремонт 1 гелевого ногтей': '1 जेल नाखून का करेक्शन',
        'ремонт 1 гелевого ногтя': '1 जेल नाखून का करेक्शन',
        'коррекция 1 гелевого ногтя': '1 जेल नाखून का करेक्शन',
        'repair 1 gel nail': '1 जेल नाखून का करेक्शन',
        'стрижка + смывка': 'कट + वॉश',
        'стрижка + мытье': 'कट + वॉश',
        'польское изменение (pedi)': 'पॉलिश बदलना (पेडी)',
        'смена лака (pedi)': 'पॉलिश बदलना (पेडी)',
        'подводка для ресниц': 'लैश लाइन एन्हांसमेंट',
        'перманент бровей': 'स्थायी भौंह मेकअप',
        'подводка межресничного контура': 'लैश लाइन एन्हांसमेंट',
        'lashliner': 'लैश लाइन एन्हांसमेंट',
        'smart pedicure basic': 'स्मार्ट पेडीक्योर बेसिक',
        'overlay biogel': 'बायोजेल ओवरले',
        'пилинг': 'पीलिंग',
        'peeling': 'पीलिंग',
        # Category normalization
        'брови': 'भौहें',
        'комбо': 'कॉम्बो',
        'косметология': 'कॉस्मेटोलॉजी',
        'уход за волосами': 'बालों की देखभाल',
        'окрашивание волос': 'बालों का रंग',
        'стрижка': 'बाल कटवाना',
        'ресницы': 'पलकें',
        'маникюр': 'मैनीक्योर',
        'массаж': 'मालिश',
        'ногти': 'नाखून',
        'педикюр': 'पेडीक्योर',
        'перманентный макияж': 'स्थायी मेकअप',
        'ваксинг': 'वैक्सिंग',
        'waxing': 'वैक्सिंग',
        'депиляция воском': 'वैक्सिंग',
        'डिपिलेशन वैक्स': 'वैक्सिंग',
        'укладка': 'हेयर स्टाइलिंग',
        'спа': 'स्पा',
        'brows': 'भौहें',
        'combo': 'कॉम्बो',
        'cosmetology': 'कॉस्मेटोलॉजी',
        'hair care': 'बालों की देखभाल',
        'hair color': 'बालों का रंग',
        'hair cut': 'बाल कटवाना',
        'hair styling': 'हेयर स्टाइलिंग',
        'lashes': 'पलकें',
        'manicure': 'मैनीक्योर',
        'massage': 'मालिश',
        'nails': 'नाखून',
        'pedicure': 'पेडीक्योर',
        'permanent makeup': 'स्थायी मेकअप',
        'spa': 'स्पा',
        'иванов иван иванович': 'राहुल कुमार',
        'ivanov ivan ivanovich': 'राहुल कुमार',
        'иван_иванов': 'rahul_kumar',
        'ivan_ivanov': 'rahul_kumar',
    },
    # Corrections for Kazakh
    'kk': {
        'бас тартты': 'жойылды',
        'ол оны сағынды': 'өткізілді',
        'кез келген шебер': 'кез келген маман',
        'пост': 'жазба',
        'сәт': 'уақыт',
        'booking': 'жазба',
        'record': 'жазба',
        'push': 'Push хабарлама',
        # Service naming normalization
        'брови окрашивание': 'Қас бояу',
        'окрашивание бровей': 'Қас бояу',
        'brow coloring': 'Қас бояу',
        'ремонт 1 наращивания': '1 ұзартылған тырнақты түзету',
        'коррекция 1 наращенного ногтя': '1 ұзартылған тырнақты түзету',
        'repair 1 extension': '1 ұзартылған тырнақты түзету',
        'ремонт 1 гелевого ногтей': '1 гель тырнағын түзету',
        'ремонт 1 гелевого ногтя': '1 гель тырнағын түзету',
        'коррекция 1 гелевого ногтя': '1 гель тырнағын түзету',
        'repair 1 gel nail': '1 гель тырнағын түзету',
        'стрижка + смывка': 'Шаш қию + жуу',
        'стрижка + мытье': 'Шаш қию + жуу',
        'польское изменение (pedi)': 'Лакты ауыстыру (Pedi)',
        'смена лака (pedi)': 'Лакты ауыстыру (Pedi)',
        'подводка для ресниц': 'Кірпік сызығын айқындау',
        'перманент бровей': 'Қас перманенті',
        'подводка межресничного контура': 'Кірпік сызығын айқындау',
        'lashliner': 'Кірпік сызығын айқындау',
        'линер лайнер': 'Кірпік сызығын айқындау',
        'smart pedicure basic': 'Смарт-педикюр базалық',
        'смарт-педикюр базовый': 'Смарт-педикюр базалық',
        'негізгі смарт педикюр': 'Смарт-педикюр базалық',
        'overlay biogel': 'Биогель жағу',
        'наложение биогеля': 'Биогель жағу',
        'пилинг': 'Пилинг',
        'peeling': 'Пилинг',
        # Category normalization
        'брови': 'Қастар',
        'комбо': 'Комбо',
        'косметология': 'Косметология',
        'уход за волосами': 'Шаш күтімі',
        'окрашивание волос': 'Шаш бояуы',
        'стрижка': 'Шаш қию',
        'маникюр': 'Маникюр',
        'массаж': 'Массаж',
        'ногти': 'Тырнақтар',
        'педикюр': 'Педикюр',
        'перманентный макияж': 'Перманентті макияж',
        'ваксинг': 'Ваксинг',
        'waxing': 'Ваксинг',
        'депиляция воском': 'Ваксинг',
        'балауызбен бояу': 'Ваксинг',
        'бақтар': 'Қастар',
        'укладка': 'Сәндеу',
        'ресницы': 'Кірпіктер',
        'lashes': 'Кірпіктер',
        'спа': 'СПА',
        'spa': 'СПА',
        'brows': 'Қастар',
        'combo': 'Комбо',
        'cosmetology': 'Косметология',
        'hair care': 'Шаш күтімі',
        'hair color': 'Шаш бояуы',
        'hair cut': 'Шаш қию',
        'hair styling': 'Сәндеу',
        'manicure': 'Маникюр',
        'massage': 'Массаж',
        'nails': 'Тырнақтар',
        'pedicure': 'Педикюр',
        'permanent makeup': 'Перманентті макияж',
        'иванов иван иванович': 'Ахметов Алихан',
        'ivanov ivan ivanovich': 'Ахметов Алихан',
        'иван_иванов': 'alikhan_akhmetov',
        'ivan_ivanov': 'alikhan_akhmetov',
    }
}

MONTHS_FULL = {
    'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
    'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
    'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December',
    'янв': 'Январь', 'фев': 'Февраль', 'мар': 'Март', 'апр': 'Апрель',
    'май': 'Май', 'июн': 'Июнь', 'июл': 'Июль', 'авг': 'Август',
    'сен': 'Сентябрь', 'окт': 'Октябрь', 'ноя': 'Ноябрь', 'дек': 'Декабрь'
}

ABBREVIATIONS_MAP = {
    'дн': 'days',
    'ч': 'hours',
    'мин': 'minutes',
    'сек': 'seconds',
    'мес': 'months',
    'лет': 'years',
    'г': 'years'
}

TARGET_ABBREVIATIONS = {
    'en': {'days': 'd.', 'hours': 'h.', 'minutes': 'min.', 'seconds': 'sec.', 'months': 'mo.', 'years': 'y.'},
    'ru': {'days': 'дн.', 'hours': 'ч.', 'minutes': 'мин.', 'seconds': 'сек.', 'months': 'мес.', 'years': 'г.'},
    'es': {'days': 'días', 'hours': 'h', 'minutes': 'min', 'seconds': 'seg', 'months': 'meses', 'years': 'años'},
    'fr': {'days': 'j.', 'hours': 'h', 'minutes': 'min', 'seconds': 'sec', 'months': 'mois', 'years': 'ans'},
    'ar': {'days': 'يوم', 'hours': 'ساعة', 'minutes': 'دقيقة', 'seconds': 'ثانية', 'months': 'شهر', 'years': 'سنة'},
    'kk': {'days': 'күн', 'hours': 'сағ', 'minutes': 'мин', 'seconds': 'сек', 'months': 'ай', 'years': 'ж.'}
}

class Translator:
    # Expose terminology within class too
    SALON_TERMINOLOGY = SALON_TERMINOLOGY
    
    def __init__(self, use_cache=True):
        self.use_cache = use_cache
        self.cache_dir = Path(CACHE_DIR)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_file = self.cache_dir / "translations_cache.json"
        self.cache_data = {}
        self.lock = threading.Lock()
        self.glossary_file = self.cache_dir.parent / "key_glossary.json"
        self.key_glossary = {}
        if self.glossary_file.exists():
            try:
                with open(self.glossary_file, 'r', encoding='utf-8') as f:
                    self.key_glossary = json.load(f)
            except Exception as e:
                print(f"⚠️  Could not load key glossary: {e}")
        self.proxies = []
        try:
            from config import PROXIES
            self.proxies = PROXIES
        except ImportError:
            pass
        if self.use_cache and self.cache_file.exists():
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    self.cache_data = json.load(f)
                print(f"✅ Google Translate HTTP API ready (loaded {len(self.cache_data)} cached translations)")
            except Exception as e:
                print(f"⚠️  Could not load cache: {e}")
                self.cache_data = {}
        else:
            print("✅ Google Translate HTTP API ready")

    def _get_cache_key(self, text: str, source: str, target: str) -> str:
        import hashlib
        content = f"{text}|{source}|{target}"
        return hashlib.md5(content.encode()).hexdigest()

    def _get_cached_translation(self, text: str, source: str, target: str) -> Optional[str]:
        if not self.use_cache: return None
        cache_key = self._get_cache_key(text, source, target)
        with self.lock: return self.cache_data.get(cache_key)

    def _save_to_cache(self, text: str, source: str, target: str, translation: str):
        if not self.use_cache: return
        cache_key = self._get_cache_key(text, source, target)
        with self.lock: self.cache_data[cache_key] = translation

    def save_cache_to_disk(self):
        if not self.use_cache: return
        try:
            with self.lock: data_to_save = self.cache_data.copy()
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(data_to_save, f, ensure_ascii=False, indent=2)
            print(f"💾 Saved {len(data_to_save)} translations to cache")
        except Exception as e:
            print(f"⚠️  Could not save cache: {e}")

    def detect_language(self, text: str) -> str:
        if not text or not text.strip(): return 'ru'
        
        # Try cache first
        cache_key = self._get_cache_key(text[:200], "auto", "detect")
        with self.lock:
            if cache_key in self.cache_data:
                return self.cache_data[cache_key]
                
        try:
            encoded_text = urllib.parse.quote(text[:200])
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q={encoded_text}"
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            
            context = ssl._create_unverified_context() if hasattr(ssl, '_create_unverified_context') else None
            
            with urllib.request.urlopen(req, timeout=5, context=context) as response:
                parsed = json.loads(response.read().decode('utf-8'))
                if parsed and len(parsed) > 2 and parsed[2]:
                    detected = parsed[2]
                    # Save to cache
                    with self.lock:
                        self.cache_data[cache_key] = detected
                    return detected
                return 'ru'
        except Exception as e:
            # print(f"⚠️  Detection error: {e}")
            return 'ru'

    def transliterate(self, text: str, source: str, target: str) -> str:
        if not text: return text
        if source == 'ru' and target in ['en', 'es', 'fr', 'pt', 'de']:
            mapping = {'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'}
            return "".join(mapping.get(c, c) for c in text)
        return self.translate(text, source, target)

    def _translate_via_http(self, text: str, source: str, target: str, use_context: bool = False) -> str:
        try:
            context_prefix = ""
            if use_context:
                words = text.split()
                capital_words_count = sum(1 for word in words if len(word) > 0 and word[0].isupper())
                is_proper_noun = capital_words_count > 1
                is_service_term = len(words) <= 3 and not text.endswith('.') and not is_proper_noun
                if is_service_term:
                    if source == 'en': context_prefix = "[Service] "
                    elif source == 'ru': context_prefix = "[Услуга] "
            text_with_context = context_prefix + text
            encoded_text = urllib.parse.quote(text_with_context)
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source}&tl={target}&dt=t&q={encoded_text}"
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            if self.proxies:
                proxy = random.choice(self.proxies)
                req.set_proxy(proxy, 'http')
                req.set_proxy(proxy, 'https')
            context = ssl._create_unverified_context() if hasattr(ssl, '_create_unverified_context') else None
            with urllib.request.urlopen(req, timeout=10, context=context) as response:
                data = response.read().decode('utf-8')
                parsed = json.loads(data)
                if parsed and parsed[0]:
                    translated = "".join([segment[0] for segment in parsed[0] if segment and segment[0]])
                    if context_prefix:
                        prefixes = ["[Service]", "[Услуга]", "[خدمة]", "[Servicio]", "[Service]", "[Service]", "[सेवा]", "[Қызмет]", "[Serviço]"]
                        for prefix in prefixes: translated = translated.replace(prefix, "").strip()
                        translated = translated.replace("[", "").replace("]", "").strip()
                    return translated
                return text
        except Exception as e:
            return text

    def translate(self, text: str, source: str, target: str, use_context: bool = False, key_path: str = None) -> str:
        if source == target or not text or not text.strip(): return text
        
        # Special logic for payment providers: transliterate name, translate description
        if key_path and 'payment.providers' in key_path and key_path.endswith('.name'):
            return self.transliterate(text, source, target)
            
        if key_path and target in self.key_glossary:
            if key_path in self.key_glossary[target]: return self.key_glossary[target][key_path]
        month_res = self._handle_months(text, source, target)
        if month_res: return month_res
        abbr_res = self._handle_abbreviations(text, source, target)
        if abbr_res: return abbr_res
        variable_pattern = r'\{\{([^}]+)\}\}'
        variables = re.findall(variable_pattern, text)
        text_to_translate = text
        variable_placeholders = {}
        for i, var in enumerate(variables):
            placeholder = f"[[[VAR{i}]]]"
            variable_placeholders[placeholder] = f"{{{{{var}}}}}"
            text_to_translate = text_to_translate.replace(f"{{{{{var}}}}}", placeholder)
        text = text_to_translate
        EXCLUSIONS = {'AED', 'USD', 'EUR', 'GBP', 'RUB', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR', 'min', 'h', 'kg', 'cm', 'ml', 'ID', 'VIP', 'SPA', 'SMS', 'API', 'UV', 'LED', '2D', '3D', '4D', '5D', 'ML', 'M LE DIAMANT', 'M.LE DIAMANT'}
        if text.strip().upper() in EXCLUSIONS: return text
        if target in SALON_TERMINOLOGY:
            lower_text = text.strip().lower()
            if lower_text in SALON_TERMINOLOGY[target]: return SALON_TERMINOLOGY[target][lower_text]
        cache_key_suffix = "|ctx" if use_context else ""
        cached = self._get_cached_translation(text + cache_key_suffix, source, target)
        if cached: return self._apply_terminology_corrections(cached, target)
        translated = self._translate_via_http(text, source, target, use_context=use_context)
        translated = self._strip_batch_artifacts(translated)
        translated = self._apply_terminology_corrections(translated, target)
        for placeholder, original_var in variable_placeholders.items():
            translated = translated.replace(placeholder, original_var)
        self._save_to_cache(text + cache_key_suffix, source, target, translated)
        return translated

    def _strip_batch_artifacts(self, text: str) -> str:
        if not text:
            return text
        # Remove batch markers that may leak from <zN> wrapping in Google batch mode.
        cleaned = re.sub(r'</?\s*z\d+\s*>', ' ', text, flags=re.IGNORECASE)
        cleaned = re.sub(r'\bz\d+>\s*', ' ', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'<\s*z\d+\b', ' ', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\s{2,}', ' ', cleaned)
        return cleaned.strip()

    def _apply_terminology_corrections(self, text: str, target_lang: str) -> str:
        text = self._strip_batch_artifacts(text)
        if target_lang not in SALON_TERMINOLOGY: return text
        corrections = SALON_TERMINOLOGY[target_lang]
        text_lower = text.lower().strip()
        for wrong_term, correct_term in corrections.items():
            if text_lower == wrong_term.lower():
                if text and text[0].isupper(): 
                    # If the source was capitalized, ensure the translation is at least capitalized
                    # but don't force lowercase on the rest (to preserve names like John Doe)
                    if correct_term and not correct_term[0].isupper():
                        return correct_term[0].upper() + correct_term[1:]
                return correct_term
        for wrong_term, correct_term in corrections.items():
            pattern = r'\b' + re.escape(wrong_term) + r'\b'
            text = re.sub(pattern, correct_term, text, flags=re.IGNORECASE)
        return text

    def _is_valid_translation(self, text: str, target_lang: str) -> bool:
        if not text: return False
        if target_lang in ['ru', 'kk', 'mk', 'bg', 'sr', 'mn', 'be', 'uk']: return True # Cyrillic allowed
        # Check for Cyrillic chars
        cyr_chars = [c for c in text if '\u0400' <= c <= '\u04FF']
        if not cyr_chars: return True
        
        # If text is mostly Cyrillic, it's invalid
        alpha_count = sum(1 for c in text if c.isalpha())
        if alpha_count > 0:
            ratio = len(cyr_chars) / alpha_count
            if ratio > 0.4: return False # More than 40% Cyrillic -> Fail
        return True

    def translate_batch(self, texts: List[str], source: str, target: str, use_context: bool = False, key_paths: List[Optional[str]] = None) -> List[str]:
        if not texts: return []
        if source == target: return texts
        results = [None] * len(texts)
        to_translate_indices = []
        to_translate_texts = []
        for i, text in enumerate(texts):
            if not text or not text.strip(): results[i] = text; continue
            kp = key_paths[i] if key_paths else None
            if kp and target in self.key_glossary and kp in self.key_glossary[target]: results[i] = self.key_glossary[target][kp]; continue
            
            # Terminology Check
            if target in SALON_TERMINOLOGY:
                lower_text = text.strip().lower()
                if lower_text in SALON_TERMINOLOGY[target]:
                    results[i] = SALON_TERMINOLOGY[target][lower_text]
                    continue
                    
            cached = self._get_cached_translation(text + ("|ctx" if use_context else ""), source, target)
            if cached and self._is_valid_translation(cached, target): 
                results[i] = self._apply_terminology_corrections(cached, target); continue
            to_translate_indices.append(i); to_translate_texts.append(text)
        if not to_translate_texts: return results
        
        # Adaptive batch size based on text length
        avg_length = sum(len(t) for t in to_translate_texts) / len(to_translate_texts)
        if avg_length > 100:  # Long texts (reviews, bios)
            batch_size = 20
        elif avg_length > 50:  # Medium texts
            batch_size = 40
        else:  # Short texts (labels, buttons)
            batch_size = 80
            
        variable_pattern = r'\{\{([^}]+)\}\}'
        for i in range(0, len(to_translate_texts), batch_size):
            if len(to_translate_texts) > batch_size:
                print(f"      Progress ({target}): {i}/{len(to_translate_texts)}...")
            batch = to_translate_texts[i:i+batch_size]; batch_indices = to_translate_indices[i:i+batch_size]
            protected_batch = []; batch_variable_maps = []
            for text in batch:
                variables = re.findall(variable_pattern, text); var_map = {}; t2t = text
                for idx, var in enumerate(variables): placeholder = f"[[[V{idx}]]]"; var_map[placeholder] = f"{{{{{var}}}}}" ; t2t = t2t.replace(f"{{{{{var}}}}}", placeholder)
                protected_batch.append(t2t); batch_variable_maps.append(var_map)
            batch_with_tags = "".join([f"<z{j}>{t}</z{j}> " for j, t in enumerate(protected_batch)])
            
            try:
                raw = self._translate_via_http(batch_with_tags, source, target, use_context=use_context)
                time.sleep(0.2) # Anti-rate-limit
                
                for j in range(len(batch)):
                    tag_start, tag_end = f"<z{j}>", f"</z{j}>"
                    s_idx = raw.find(tag_start)
                    if s_idx == -1: s_idx = raw.lower().find(tag_start.lower())
                    if s_idx != -1:
                        e_idx = raw.find(tag_end, s_idx)
                        if e_idx == -1: e_idx = raw.lower().find(tag_end.lower(), s_idx)
                        if e_idx != -1:
                            txt = raw[s_idx + len(tag_start):e_idx].strip()
                            txt = self._strip_batch_artifacts(txt)
                            for ph, orig in batch_variable_maps[j].items():
                                txt = txt.replace(ph, orig).replace(ph.replace("[", "[ ").replace("]", " ]"), orig)
                            txt = self._apply_terminology_corrections(txt, target)
                            
                            if self._is_valid_translation(txt, target):
                                results[batch_indices[j]] = txt
                                self._save_to_cache(batch[j] + ("|ctx" if use_context else ""), source, target, txt)
                            else:
                                # Fallback to single translation if invalid
                                print(f"        ⚠️  Invalid batch result for item {j}, retrying individually...")
                                single = self.translate(batch[j], source, target, use_context, key_paths[batch_indices[j]] if key_paths else None)
                                results[batch_indices[j]] = single
                        else: 
                            # Tag end not found - fallback
                            results[batch_indices[j]] = self.translate(batch[j], source, target, use_context, key_paths[batch_indices[j]] if key_paths else None)
                    else: 
                        # Tag start not found - fallback
                        results[batch_indices[j]] = self.translate(batch[j], source, target, use_context, key_paths[batch_indices[j]] if key_paths else None)
            except Exception as e:
                print(f"        ❌ Batch translation failed: {e}, falling back to individual...")
                for j in range(len(batch)): 
                    results[batch_indices[j]] = self.translate(batch[j], source, target, use_context, key_paths[batch_indices[j]] if key_paths else None)
        return results

    def _handle_months(self, text: str, source: str, target: str) -> Optional[str]:
        low = text.lower().strip().replace('.', '')
        if low in MONTHS_FULL:
            full = MONTHS_FULL[low]
            trans = self._translate_via_http(full, 'en' if low in MONTHS_FULL and (ord(low[0]) < 128) else 'ru', target)
            if len(text) <= 4: return trans[:3].capitalize() if target != 'ar' else trans
            return trans
        return None

    def _handle_abbreviations(self, text: str, source: str, target: str) -> Optional[str]:
        clean = text.lower().strip().replace('.', '')
        if clean in ABBREVIATIONS_MAP:
            full_en = ABBREVIATIONS_MAP[clean]
            if target in TARGET_ABBREVIATIONS and full_en in TARGET_ABBREVIATIONS[target]: return TARGET_ABBREVIATIONS[target][full_en]
            return self._translate_via_http(full_en, 'en', target)
        return None

if __name__ == "__main__":
    t = Translator(); test = "Мастер маникюра"; print(f"\nТест: '{test}'")
    for l in ["en", "ar", "es"]: print(f"  {l}: {t.translate(test, 'ru', l)}")
