#!/usr/bin/env python3
"""
Скрипт для добавления тестовых данных в БД
Включает полный список услуг и детальную привязку к мастерам
"""
from db.connection import get_db_connection
import sys
import os
from datetime import datetime

# Добавляем backend в путь
backend_dir = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from core.config import DATABASE_NAME

# ===== ПОЛНЫЙ ПРАЙС-ЛИСТ =====
SERVICES_DATA = [
    # Permanent Makeup
    {
        'key': 'permanent_lips',
        'name': 'Permanent Lips',
        'name_ru': 'Перманентный макияж губ',
        'name_ar': 'مكياج دائم للشفاه',
        'price': 1200,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Permanent Makeup',
        'description': 'Long-lasting lip color',
        'description_ru': 'Стойкий цвет губ',
        'benefits': ['Lasts up to 2 years', 'Natural look', 'Waterproof']
    },
    {
        'key': 'permanent_brows',
        'name': 'Permanent Brows',
        'name_ru': 'Перманентный макияж бровей',
        'name_ar': 'مكياج دائم للحواجب',
        'price': 1100,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Permanent Makeup',
        'description': 'Microblading or powder brows',
        'description_ru': 'Микроблейдинг или пудровые брови',
        'benefits': ['Perfect shape', 'Natural effect', 'Time-saving']
    },
    {
        'key': 'lashliner',
        'name': 'Lashliner',
        'name_ru': 'Межресничная стрелка',
        'name_ar': 'لاشلاينر',
        'price': 500,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Permanent Makeup',
        'description': 'Lash line enhancement',
        'description_ru': 'Подчеркивание линии роста ресниц',
        'benefits': ['Defines eyes', 'Natural look', 'No daily makeup needed']
    },
    {
        'key': 'eyeliner',
        'name': 'Eyeliner',
        'name_ru': 'Подводка для глаз',
        'name_ar': 'كحل',
        'price': 1000,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Permanent Makeup',
        'description': 'Permanent eyeliner',
        'description_ru': 'Перманентная подводка глаз',
        'benefits': ['Perfect wings', 'Smudge-proof', 'Long-lasting']
    },
    {
        'key': 'permanent_correction',
        'name': 'Permanent Makeup Correction',
        'name_ru': 'Коррекция перманентного макияжа',
        'name_ar': 'تصحيح المكياج الدائم',
        'price': 500,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Permanent Makeup',
        'description': 'Touch-up for existing permanent makeup',
        'description_ru': 'Коррекция существующего перманента',
        'benefits': ['Refreshes color', 'Adjusts shape', 'Extends longevity']
    },
    
    # Waxing & Sugaring
    {
        'key': 'full_bikini',
        'name': 'Full Bikini',
        'name_ru': 'Глубокое бикини',
        'name_ar': 'البكيني الكامل',
        'price': 150,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Complete bikini area hair removal',
        'description_ru': 'Полная эпиляция зоны бикини',
        'benefits': ['Smooth skin', 'Long-lasting', 'Professional care']
    },
    {
        'key': 'bikini_line',
        'name': 'Bikini Line',
        'name_ru': 'Линия бикини',
        'name_ar': 'خط البكيني',
        'price': 100,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Bikini line waxing',
        'description_ru': 'Эпиляция по линии бикини',
        'benefits': ['Clean look', 'Quick service', 'Professional']
    },
    {
        'key': 'brazilian',
        'name': 'Brazilian Bikini',
        'name_ru': 'Бразильское бикини',
        'name_ar': 'البرازيلي',
        'price': 120,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Brazilian bikini waxing',
        'description_ru': 'Бразильская эпиляция бикини',
        'benefits': ['Complete', 'Professional', 'Clean look']
    },
    {
        'key': 'full_legs',
        'name': 'Full Legs',
        'name_ru': 'Ноги полностью',
        'name_ar': 'الساقين كاملة',
        'price': 150,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Complete leg waxing',
        'description_ru': 'Полная эпиляция ног',
        'benefits': ['Smooth legs', '3-4 weeks result', 'Professional']
    },
    {
        'key': 'half_legs',
        'name': 'Half Legs',
        'name_ru': 'Ноги до колен',
        'name_ar': 'نصف الساقين',
        'price': 80,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Lower leg waxing',
        'description_ru': 'Эпиляция ног до колен',
        'benefits': ['Quick service', 'Smooth result', 'Affordable']
    },
    {
        'key': 'full_arms',
        'name': 'Full Arms',
        'name_ru': 'Руки полностью',
        'name_ar': 'الذراعين كاملة',
        'price': 80,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Complete arm waxing',
        'description_ru': 'Полная эпиляция рук',
        'benefits': ['Smooth arms', 'Long-lasting', 'Professional care']
    },
    {
        'key': 'half_arms',
        'name': 'Half Arms',
        'name_ru': 'Руки до локтя',
        'name_ar': 'نصف الذراعين',
        'price': 50,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Lower arm waxing',
        'description_ru': 'Эпиляция рук до локтя',
        'benefits': ['Quick', 'Clean look', 'Affordable']
    },
    {
        'key': 'full_body',
        'name': 'Full Body Waxing',
        'name_ru': 'Эпиляция всего тела',
        'name_ar': 'إزالة الشعر من الجسم كاملاً',
        'price': 400,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Complete body hair removal',
        'description_ru': 'Полная эпиляция тела',
        'benefits': ['Complete solution', 'Smooth body', 'Best value']
    },
    {
        'key': 'underarms',
        'name': 'Underarms',
        'name_ru': 'Подмышки',
        'name_ar': 'الإبطين',
        'price': 50,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Underarm waxing',
        'description_ru': 'Эпиляция подмышек',
        'benefits': ['Quick', 'Clean', 'Long-lasting']
    },
    {
        'key': 'full_face',
        'name': 'Full Face',
        'name_ru': 'Лицо полностью',
        'name_ar': 'الوجه كاملاً',
        'price': 90,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Complete facial hair removal',
        'description_ru': 'Полная эпиляция лица',
        'benefits': ['Smooth skin', 'Professional', 'Gentle']
    },
    {
        'key': 'upper_lips',
        'name': 'Upper Lips',
        'name_ru': 'Верхняя губа',
        'name_ar': 'الشفة العليا',
        'price': 30,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Upper lip waxing',
        'description_ru': 'Эпиляция верхней губы',
        'benefits': ['Quick', 'Clean', 'Professional']
    },
    {
        'key': 'chin',
        'name': 'Chin',
        'name_ru': 'Подбородок',
        'name_ar': 'الذقن',
        'price': 30,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Chin waxing',
        'description_ru': 'Эпиляция подбородка',
        'benefits': ['Quick', 'Smooth', 'Affordable']
    },
    
    # Hair Services
    {
        'key': 'hair_trim',
        'name': 'Hair Trim (by machine)',
        'name_ru': 'Ровный срез кончиков',
        'name_ar': 'قص الشعر بالماكينة',
        'price': 90,
        'min_price': 80,
        'max_price': 100,
        'duration': None,
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Simple trim without wash',
        'description_ru': 'Простой срез без мытья',
        'benefits': ['Quick', 'Neat look', 'Affordable']
    },
    {
        'key': 'hair_cut_blowdry',
        'name': 'Hair Cut and Blow Dry',
        'name_ru': 'Стрижка + Укладка',
        'name_ar': 'قص وتسريح الشعر',
        'price': 275,
        'min_price': 250,
        'max_price': 300,
        'duration': None,
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Professional haircut with styling',
        'description_ru': 'Профессиональная стрижка с укладкой',
        'benefits': ['Any complexity', 'Professional styling', 'Perfect look']
    },
    {
        'key': 'blowdry',
        'name': 'Blow Dry',
        'name_ru': 'Укладка',
        'name_ar': 'تسريح الشعر',
        'price': 125,
        'min_price': 100,
        'max_price': 150,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Professional hair styling',
        'description_ru': 'Профессиональная укладка волос',
        'benefits': ['Perfect volume', 'Smooth finish', 'Long-lasting']
    },
    {
        'key': 'baby_cut',
        'name': 'Hair Cut Kids',
        'name_ru': 'Детская стрижка',
        'name_ar': 'قص شعر الأطفال',
        'price': 70,
        'min_price': 60,
        'max_price': 80,
        'duration': None,
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Kids haircut',
        'description_ru': 'Стрижка для детей',
        'benefits': ['Gentle', 'Quick', 'Kid-friendly']
    },
    {
        'key': 'roots_color',
        'name': 'Roots Color and Blow Dry',
        'name_ru': 'Окрашивание корней + Укладка',
        'name_ar': 'صبغ الجذور وتسريح',
        'price': 200,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Root coloring with styling',
        'description_ru': 'Окрашивание корней с укладкой',
        'benefits': ['Professional color', 'Covers gray', 'Perfect finish']
    },
    {
        'key': 'roots_bleach',
        'name': 'Roots Bleach and Blow Dry',
        'name_ru': 'Осветление корней + Укладка',
        'name_ar': 'تفتيح الجذور وتسريح',
        'price': 350,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Root bleaching with styling',
        'description_ru': 'Осветление корней с укладкой',
        'benefits': ['Professional bleach', 'Even color', 'Gentle formula']
    },
    {
        'key': 'toner_blowdry',
        'name': 'Toner and Blow Dry',
        'name_ru': 'Тонирование + Укладка',
        'name_ar': 'تونر وتسريح',
        'price': 375,
        'min_price': 300,
        'max_price': 450,
        'duration': None,
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Hair toning with styling',
        'description_ru': 'Тонирование волос с укладкой',
        'benefits': ['Perfect shade', 'Shiny hair', 'Professional result']
    },
    {
        'key': 'full_color',
        'name': 'Full Head Color',
        'name_ru': 'Окрашивание в один тон + Укладка',
        'name_ar': 'صبغ كامل وتسريح',
        'price': 425,
        'min_price': 350,
        'max_price': 500,
        'duration': '2h',
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Full hair coloring with styling',
        'description_ru': 'Полное окрашивание с укладкой',
        'benefits': ['Even color', 'Professional', 'Long-lasting']
    },
    {
        'key': 'balayage',
        'name': 'Balayage',
        'name_ru': 'Балаяж',
        'name_ar': 'باليياج',
        'price': 950,
        'min_price': 700,
        'max_price': 1200,
        'duration': '2h',
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Hand-painted highlights',
        'description_ru': 'Техника балаяж',
        'benefits': ['Natural look', 'Low maintenance', 'Trendy']
    },
    {
        'key': 'ombre',
        'name': 'Ombre/Shatush/Air-Touch',
        'name_ru': 'Омбре/Шатуш/Аиртач',
        'name_ar': 'أومبري/شاتوش/إير تاتش',
        'price': 1250,
        'min_price': 1000,
        'max_price': 1500,
        'duration': '2h',
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Gradient coloring techniques',
        'description_ru': 'Техники градиентного окрашивания',
        'benefits': ['Modern look', 'Natural gradient', 'Professional']
    },
    {
        'key': 'bleach_hair',
        'name': 'Bleach Hair',
        'name_ru': 'Выход из черного',
        'name_ar': 'تفتيح الشعر',
        'price': 1800,
        'min_price': 1300,
        'max_price': 2300,
        'duration': None,
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Color correction from dark',
        'description_ru': 'Коррекция цвета из темного',
        'benefits': ['Professional process', 'Safe bleaching', 'Expert care']
    },

    {
        'key': 'natural_treatment',
        'name': 'Natural Treatment',
        'name_ru': 'Натуральный уход',
        'name_ar': 'علاج طبيعي',
        'price': 200,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Natural hair treatment',
        'description_ru': 'Натуральный уход за волосами',
        'benefits': ['Organic', 'Nourishing', 'Gentle']
    },
    {
        'key': 'hair_extension_capsule',
        'name': 'Hair Keratin Capsule Extension',
        'name_ru': 'Наращивание волос за капсулу',
        'name_ar': 'تمديد الشعر بالكيراتين',
        'price': 11,
        'min_price': 10,
        'max_price': 12,
        'duration': None,
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Per capsule hair extension',
        'description_ru': 'Наращивание за капсулу',
        'benefits': ['Natural look', 'Long-lasting', 'Quality hair']
    },
    
    # Lashes & Brows
    {
        'key': 'classic_volume',
        'name': 'Classic Volume Lashes',
        'name_ru': 'Классический объем ресниц',
        'name_ar': 'رموش كلاسيكية',
        'price': 180,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Lashes',
        'description': 'Natural lash extensions',
        'description_ru': 'Натуральное наращивание ресниц',
        'benefits': ['Natural look', 'Lightweight', 'Long-lasting']
    },
    {
        'key': '2d_volume',
        'name': '2D Volume Lashes',
        'name_ru': '2D объем ресниц',
        'name_ar': 'رموش 2D',
        'price': 230,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Lashes',
        'description': '2D lash extensions',
        'description_ru': 'Наращивание 2D',
        'benefits': ['Fuller look', 'Dramatic', 'Professional']
    },
    {
        'key': '3d_volume',
        'name': '3D Volume Lashes',
        'name_ru': '3D объем ресниц',
        'name_ar': 'رموش 3D',
        'price': 260,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Lashes',
        'description': '3D lash extensions',
        'description_ru': 'Наращивание 3D',
        'benefits': ['Very full', 'Glamorous', 'Long-lasting']
    },
    {
        'key': 'mega_volume',
        'name': '4-5D Volume (Mega Volume)',
        'name_ru': '4-5D объем (Мега)',
        'name_ar': 'رموش ميجا 4-5D',
        'price': 290,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Lashes',
        'description': 'Mega volume lashes',
        'description_ru': 'Мега объем ресниц',
        'benefits': ['Maximum volume', 'Dramatic look', 'Show-stopping']
    },
    {
        'key': 'ml_curl',
        'name': 'ML Curl / Kim Style',
        'name_ru': 'ML завиток / Стиль Ким',
        'name_ar': 'تجعيد ML / نمط كيم',
        'price': 30,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Lashes',
        'description': 'Special curl style',
        'description_ru': 'Специальный изгиб',
        'benefits': ['Trendy', 'Eye-opening', 'Popular']
    },
    {
        'key': 'remove_lashes',
        'name': 'Remove Lashes',
        'name_ru': 'Снятие ресниц',
        'name_ar': 'إزالة الرموش',
        'price': 50,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Lashes',
        'description': 'Safe lash removal',
        'description_ru': 'Безопасное снятие',
        'benefits': ['Gentle', 'Safe', 'Professional']
    },
    {
        'key': 'brow_lamination',
        'name': 'Eyebrows Lamination',
        'name_ru': 'Ламинирование бровей',
        'name_ar': 'تلميع الحواجب',
        'price': 200,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Brows',
        'description': 'Brow lamination treatment',
        'description_ru': 'Ламинирование бровей',
        'benefits': ['Perfect shape', 'Fuller look', '6-8 weeks result']
    },
    {
        'key': 'lash_lamination',
        'name': 'Eyelashes Lamination',
        'name_ru': 'Ламинирование ресниц',
        'name_ar': 'تلميع الرموش',
        'price': 200,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Lashes',
        'description': 'Lash lift treatment',
        'description_ru': 'Ламинирование ресниц',
        'benefits': ['Natural curl', 'No mascara needed', 'Long-lasting']
    },
    {
        'key': 'combo_lamination',
        'name': 'Eyebrow and Eyelash Lamination',
        'name_ru': 'Ламинирование бровей и ресниц',
        'name_ar': 'تلميع الحواجب والرموش',
        'price': 300,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Brows',
        'description': 'Combo lamination package',
        'description_ru': 'Комбо ламинирование',
        'benefits': ['Best value', 'Complete look', 'Time-saving']
    },
    {
        'key': 'brow_coloring',
        'name': 'Eyebrow Coloring',
        'name_ru': 'Окрашивание бровей',
        'name_ar': 'صبغ الحواجب',
        'price': 40,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Brows',
        'description': 'Professional brow tinting',
        'description_ru': 'Профессиональное окрашивание',
        'benefits': ['Defined brows', 'Natural color', 'Long-lasting']
    },
    {
        'key': 'brow_shaping',
        'name': 'Eyebrow Shaping',
        'name_ru': 'Оформление бровей',
        'name_ar': 'تشكيل الحواجب',
        'price': 40,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Brows',
        'description': 'Professional brow shaping',
        'description_ru': 'Профессиональное оформление',
        'benefits': ['Perfect shape', 'Clean look', 'Expert service']
    },
    
    # Facial
    {
        'key': 'deep_facial_cleaning',
        'name': 'Deep Facial Cleaning 60 min',
        'name_ru': 'Глубокая чистка лица',
        'name_ar': 'تنظيف عميق للوجه',
        'price': 400,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Facial',
        'description': 'Professional deep cleansing',
        'description_ru': 'Профессиональная глубокая чистка',
        'benefits': ['Deep clean', 'Clear skin', 'Professional care']
    },
    {
        'key': 'medical_facial',
        'name': 'Medical Facial Cleaning',
        'name_ru': 'Медицинская чистка для проблемной кожи',
        'name_ar': 'تنظيف طبي للبشرة',
        'price': 450,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Facial',
        'description': 'Medical-grade facial treatment',
        'description_ru': 'Медицинская чистка',
        'benefits': ['Problem skin', 'Therapeutic', 'Professional']
    },
    {
        'key': 'face_lift_massage',
        'name': 'Facial Massage',
        'name_ru': 'Подтягивающий массаж лица с маской',
        'name_ar': 'مساج شد الوجه مع قناع',
        'price': 250,
        'min_price': None,
        'max_price': None,
        'duration': '30min',
        'currency': 'AED',
        'category': 'Facial',
        'description': 'Lifting facial massage',
        'description_ru': 'Подтягивающий массаж',
        'benefits': ['Anti-aging', 'Lifts skin', 'Relaxing']
    },
    {
        'key': 'peeling',
        'name': 'Peeling',
        'name_ru': 'Пилинг',
        'name_ar': 'تقشير',
        'price': 350,
        'min_price': 300,
        'max_price': 400,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Facial',
        'description': 'Chemical peeling',
        'description_ru': 'Химический пилинг',
        'benefits': ['Smooth skin', 'Bright complexion', 'Rejuvenating']
    },
    
    # Nails
    {
        'key': 'manicure_no_polish',
        'name': 'Manicure Basic',
        'name_ru': 'Маникюр без покрытия',
        'name_ar': 'مانيكير بدون طلاء',
        'price': 80,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Basic manicure',
        'description_ru': 'Базовый маникюр',
        'benefits': ['Clean nails', 'Neat look', 'Quick service']
    },
    {
        'key': 'spa_manicure',
        'name': 'Spa Manicure',
        'name_ru': 'Спа маникюр',
        'name_ar': 'سبا مانيكير',
        'price': 50,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Spa manicure treatment',
        'description_ru': 'Спа маникюр',
        'benefits': ['Relaxing', 'Moisturizing', 'Luxurious']
    },
    {
        'key': 'manicure_normal',
        'name': 'Manicure Classic',
        'name_ru': 'Маникюр с обычным покрытием',
        'name_ar': 'مانيكير بطلاء عادي',
        'price': 100,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Manicure with regular polish',
        'description_ru': 'Маникюр с обычным лаком',
        'benefits': ['Color options', 'Classic look', 'Affordable']
    },
    {
        'key': 'gelish_manicure',
        'name': 'Manicure Gel',
        'name_ru': 'Маникюр гель-лак',
        'name_ar': 'مانيكير جل',
        'price': 130,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Gel polish manicure',
        'description_ru': 'Маникюр с гель-лаком',
        'benefits': ['Long-lasting', 'Shiny finish', '3 weeks wear']
    },
    {
        'key': 'japanese_manicure',
        'name': 'Japanese Manicure',
        'name_ru': 'Японский маникюр',
        'name_ar': 'مانيكير ياباني',
        'price': 100,
        'min_price': None,
        'max_price': None,
        'duration': '1h 30min',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Japanese nail treatment',
        'description_ru': 'Японский маникюр',
        'benefits': ['Strengthening', 'Natural shine', 'Healthy nails']
    },
    {
        'key': 'baby_manicure',
        'name': 'Baby Manicure',
        'name_ru': 'Детский маникюр',
        'name_ar': 'مانيكير الأطفال',
        'price': 50,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Kids manicure',
        'description_ru': 'Маникюр для детей',
        'benefits': ['Gentle', 'Safe', 'Fun']
    },
    {
        'key': 'change_classic_polish',
        'name': 'Change Classic Polish',
        'name_ru': 'Смена обычного лака',
        'name_ar': 'تغيير الطلاء العادي',
        'price': 65,
        'min_price': 40,
        'max_price': 90,
        'duration': '30min',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Change of regular polish',
        'description_ru': 'Смена обычного лака',
        'benefits': ['Quick refresh', 'New color', 'Affordable']
    }
]

def seed_data():
    conn = get_db_connection()
    # conn.row_factory removed for PostgreSQL
    c = conn.cursor()
    now = datetime.now().isoformat()

    print("=" * 70)
    print("ДОБАВЛЕНИЕ ТЕСТОВЫХ ДАННЫХ")
    print("=" * 70)

    # 1. Мастера создаются через update_employee_details.py
    print("\n1. МАСТЕРА:")
    print("-" * 70)
    print("⏭️  Пропущено - мастера создаются через update_employee_details.py")
    
    # Load actual master IDs from database
    master_ids = {}
    c.execute("SELECT id, full_name, position FROM users WHERE is_service_provider = TRUE")
    employees = c.fetchall()
    for row in employees:
        actual_name = row['full_name']
        master_ids[actual_name] = row['id']
    
    if master_ids:
        print(f"✅ Найдено мастеров: {', '.join(master_ids.keys())}")
    else:
        print("⚠️  Мастера не найдены в БД. Пропускаю привязку к услугам.")

    # 2. Добавляем услуги
    print("\n2. ДОБАВЛЕНИЕ УСЛУГ:")
    print("-" * 70)

    # Проверяем есть ли уже услуги
    c.execute("SELECT COUNT(*) FROM services WHERE is_active = TRUE")
    if c.fetchone()[0] > 0:
        print("⚠️  Услуги уже существуют, очищаю...")
        c.execute("DELETE FROM services")

    service_ids = {}
    for service in SERVICES_DATA:
        # Convert benefits list to string
        benefits_str = ", ".join(service['benefits']) if service.get('benefits') else ""
        
        c.execute("""
            INSERT INTO services (service_key, name, name_ru, name_en, name_ar, category, price, min_price, max_price,
                                  currency, description, description_ru, description_en, benefits, duration, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s, %s)
        """, (service['key'], service['name'], service['name_ru'], service['name'], service['name_ar'],
              service['category'], service['price'], service['min_price'], service['max_price'],
              service['currency'], service['description'], service['description_ru'], service['description'], benefits_str, service['duration'], now, now))
        service_ids[service['key']] = c.lastrowid
        print(f"✅ Добавлена услуга: {service['name_ru']} ({service['category']})")

    # 3. Привязываем мастеров к услугам
    print("\n3. ПРИВЯЗКА МАСТЕРОВ К УСЛУГАМ:")
    print("-" * 70)

    if not master_ids:
        print("⚠️  Ошибка в seed_test_data: Мастера не найдены в БД")
    else:
        # ДЖЕННИФЕР (Jennifer)
        jennifer_keys = [
            'full_legs', 'half_legs', 'full_arms', 'half_arms', 'full_body', 'underarms',
            'manicure_no_polish', 'manicure_normal', 'gelish_manicure', 'spa_manicure', 
            'change_classic_polish', 'baby_manicure', 'japanese_manicure',
            'face_lift_massage', 'medical_facial', 'peeling', 'deep_facial_cleaning',
            'remove_lashes'
        ]

        # СИМО (Simo)
        simo_keys = [
            'ombre', 'balayage', 'roots_bleach', 'toner_blowdry', 'bleach_hair', 'roots_color',
            'full_color', 'hair_trim', 'hair_cut_blowdry', 'blowdry', 'baby_cut',
            'natural_treatment', 'hair_extension_capsule'
        ]

        # МЕСТАН (Mestan) - Same as Simo + Brows
        mestan_keys = simo_keys + ['brow_coloring']

        # ЛЯЗЗАТ (Lyazzat)
        lyazzat_keys = [
            'manicure_no_polish', 'manicure_normal', 'gelish_manicure', 'spa_manicure', 
            'change_classic_polish', 'baby_manicure', 'japanese_manicure'
        ]

        # ГУЛЯ (Gulya)
        gulya_keys = [
            'full_legs', 'full_arms', 'half_arms', 'full_body', 'bikini_line',
            'underarms', 'full_bikini', 'brazilian', 'full_face', 'chin', 'upper_lips',
            'manicure_no_polish', 'manicure_normal', 'gelish_manicure', 'spa_manicure', 
            'change_classic_polish', 'baby_manicure', 'japanese_manicure'
        ]

        # Use actual Cyrillic names from database
        employee_specific_services = {
            'Дженнифер': jennifer_keys,
            'Симо': simo_keys,
            'Местан': mestan_keys,
            'Ляззат': lyazzat_keys,
            'Гуля': gulya_keys
        }

        # Clear existing assignments
        c.execute("DELETE FROM user_services")

        for emp_name, keys in employee_specific_services.items():
            if emp_name in master_ids:
                user_id = master_ids[emp_name]
                assigned_count = 0
                for key in keys:
                    if key in service_ids:
                        try:
                            c.execute("""
                                INSERT INTO user_services (user_id, service_id, is_online_booking_enabled)
                                VALUES (%s, %s, TRUE)
                            """, (user_id, service_ids[key]))
                            assigned_count += 1
                        except Exception:
                            pass
                print(f"✅ {emp_name}: assigned {assigned_count} services")
            else:
                print(f"⚠️  {emp_name} not found in DB")

    # 4. Добавляем расписание мастеров
    print("\n4. ДОБАВЛЕНИЕ РАСПИСАНИЯ МАСТЕРОВ:")
    print("-" * 70)

    # Расписание: Пн-Сб 10:00-21:00, Вс выходной
    c.execute("DELETE FROM user_schedule")
    for master_name, master_id in master_ids.items():
        for day in range(6):  # 0=Пн, 5=Сб
            c.execute("""
                INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active)
                VALUES (%s, %s, '10:00', '21:00', TRUE)
            """, (master_id, day))
        print(f"✅ {master_name}: Пн-Сб 10:00-21:00")

    conn.commit()
    conn.close()

    print("\n" + "=" * 70)
    print("✅ ТЕСТОВЫЕ ДАННЫЕ УСПЕШНО ДОБАВЛЕНЫ!")
    print("=" * 70)

if __name__ == "__main__":
    try:
        seed_data()
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)