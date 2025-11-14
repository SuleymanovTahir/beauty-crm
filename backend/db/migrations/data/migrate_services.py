#!/usr/bin/env python3
# backend/migrate_services.py
"""
Миграция услуг из прайс-листа в базу данных
Запускается вручную: python backend/migrate_services.py
"""

import sqlite3
import os
from datetime import datetime

DATABASE_NAME = os.getenv("DATABASE_NAME", "salon_bot.db")

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
        'key': 'cheeks',
        'name': 'Cheeks',
        'name_ru': 'Щеки',
        'name_ar': 'الخدين',
        'price': 40,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Waxing',
        'description': 'Cheek waxing',
        'description_ru': 'Эпиляция щек',
        'benefits': ['Clean look', 'Gentle', 'Quick']
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
        'key': 'hair_treatment',
        'name': 'Hair Treatment',
        'name_ru': 'Уход за волосами',
        'name_ar': 'علاج الشعر',
        'price': 1050,
        'min_price': 600,
        'max_price': 1500,
        'duration': '3h',
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Professional hair care',
        'description_ru': 'Профессиональный уход',
        'benefits': ['Repairs damage', 'Adds shine', 'Strengthens']
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
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Change regular nail polish',
        'description_ru': 'Смена обычного лака',
        'benefits': ['Quick', 'Fresh color', 'Affordable']
    },
    {
        'key': 'change_gel',
        'name': 'Change Gel',
        'name_ru': 'Смена гель-лака',
        'name_ar': 'تغيير الجل',
        'price': 110,
        'min_price': 100,
        'max_price': 120,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Change gel polish',
        'description_ru': 'Смена гель-лака',
        'benefits': ['Fresh look', 'Long-lasting', 'Professional']
    },
    {
        'key': 'nail_extension',
        'name': 'Nail Extension Full Set',
        'name_ru': 'Наращивание ногтей',
        'name_ar': 'تمديد الأظافر',
        'price': 350,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Full set nail extensions',
        'description_ru': 'Полное наращивание',
        'benefits': ['Long nails', 'Strong', 'Beautiful']
    },
    {
        'key': 'remove_extension',
        'name': 'Remove Nail Extensions',
        'name_ru': 'Снятие наращенного гель-лака',
        'name_ar': 'إزالة الجل القديم',
        'price': 50,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Safe removal',
        'description_ru': 'Безопасное снятие',
        'benefits': ['Gentle', 'Safe', 'Professional']
    },
    {
        'key': 'hard_gel',
        'name': 'Hard Gel',
        'name_ru': 'Укрепление',
        'name_ar': 'جل صلب',
        'price': 30,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Nail strengthening',
        'description_ru': 'Укрепление ногтей',
        'benefits': ['Strong nails', 'Protective', 'Long-lasting']
    },
    {
        'key': 'french',
        'name': 'French',
        'name_ru': 'Френч',
        'name_ar': 'فرنش',
        'price': 30,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Nails',
        'description': 'French manicure style',
        'description_ru': 'Френч маникюр',
        'benefits': ['Classic look', 'Elegant', 'Timeless']
    },
    {
        'key': 'pedicure_no_polish',
        'name': 'Pedicure Basic',
        'name_ru': 'Педикюр без покрытия',
        'name_ar': 'بديكير بدون طلاء',
        'price': 100,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Basic pedicure',
        'description_ru': 'Базовый педикюр',
        'benefits': ['Clean feet', 'Neat look', 'Comfortable']
    },
    {
        'key': 'spa_pedicure',
        'name': 'Spa Pedicure',
        'name_ru': 'Спа педикюр',
        'name_ar': 'سبا بديكير',
        'price': 60,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Spa pedicure treatment',
        'description_ru': 'Спа педикюр',
        'benefits': ['Relaxing', 'Moisturizing', 'Luxurious']
    },
    {
        'key': 'pedicure_normal',
        'name': 'Pedicure Classic',
        'name_ru': 'Педикюр обычный лак',
        'name_ar': 'بديكير بطلاء عادي',
        'price': 120,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Pedicure with regular polish',
        'description_ru': 'Педикюр с обычным лаком',
        'benefits': ['Color options', 'Fresh look', 'Classic']
    },
    {
        'key': 'pedicure_gelish',
        'name': 'Pedicure Gel',
        'name_ru': 'Педикюр гель-лак',
        'name_ar': 'بديكير جل',
        'price': 160,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Gel polish pedicure',
        'description_ru': 'Педикюр с гель-лаком',
        'benefits': ['Long-lasting', 'Shiny', '3-4 weeks']
    },
    {
        'key': 'remove_gel',
        'name': 'Remove Old Gel',
        'name_ru': 'Снятие гель-лака',
        'name_ar': 'إزالة الجل القديم',
        'price': 37.5,
        'min_price': 25,
        'max_price': 50,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Gel polish removal',
        'description_ru': 'Снятие старого гель-лака',
        'benefits': ['Safe', 'Gentle', 'Quick']
    },
    {
        'key': 'remove_classic',
        'name': 'Remove Classic Polish',
        'name_ru': 'Снятие обычного лака',
        'name_ar': 'إزالة الطلاء العادي',
        'price': 30,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Nails',
        'description': 'Regular polish removal',
        'description_ru': 'Снятие обычного лака',
        'benefits': ['Quick', 'Safe', 'Gentle']
    },
    
    # Massage
    {
        'key': 'time_of_relax_spa',
        'name': 'Time Of Relax SPA',
        'name_ru': 'Спа программа',
        'name_ar': 'برنامج سبا للاسترخاء',
        'price': 250,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Massage',
        'description': 'Complete spa experience',
        'description_ru': 'Полная спа-программа',
        'benefits': ['Total relaxation', 'Stress relief', 'Rejuvenating']
    },
    {
        'key': 'head_massage',
        'name': 'Head Massage 40min',
        'name_ru': 'Массаж головы 40 мин',
        'name_ar': 'مساج الرأس 40 دقيقة',
        'price': 100,
        'min_price': None,
        'max_price': None,
        'duration': '40min',
        'currency': 'AED',
        'category': 'Massage',
        'description': 'Relaxing head massage',
        'description_ru': 'Расслабляющий массаж головы',
        'benefits': ['Relieves tension', 'Improves circulation', 'Relaxing']
    },
    {
        'key': 'legs_hands_massage',
        'name': 'Massage (legs/feet/hands) 40min',
        'name_ru': 'Массаж (ног/стоп/рук) 40 мин',
        'name_ar': 'مساج (الساقين/القدمين/اليدين) 40 دقيقة',
        'price': 150,
        'min_price': None,
        'max_price': None,
        'duration': '40min',
        'currency': 'AED',
        'category': 'Massage',
        'description': 'Legs and hands massage',
        'description_ru': 'Массаж конечностей',
        'benefits': ['Relieves fatigue', 'Improves circulation', 'Relaxing']
    },
    {
        'key': 'back_massage',
        'name': 'Back Massage 30min',
        'name_ru': 'Массаж спины 30 мин',
        'name_ar': 'مساج الظهر 30 دقيقة',
        'price': 180,
        'min_price': None,
        'max_price': None,
        'duration': '30min',
        'currency': 'AED',
        'category': 'Massage',
        'description': 'Therapeutic back massage',
        'description_ru': 'Терапевтический массаж спины',
        'benefits': ['Relieves pain', 'Relaxes muscles', 'Therapeutic']
    },
    {
        'key': 'body_massage',
        'name': 'Body Massage 40min',
        'name_ru': 'Массаж тела 40 мин',
        'name_ar': 'مساج الجسم 40 دقيقة',
        'price': 260,
        'min_price': None,
        'max_price': None,
        'duration': '40min',
        'currency': 'AED',
        'category': 'Massage',
        'description': 'Full body massage',
        'description_ru': 'Массаж всего тела',
        'benefits': ['Complete relaxation', 'Stress relief', 'Rejuvenating']
    },
    {
        'key': 'sculpture_massage',
        'name': 'Sculpture Body Massage',
        'name_ru': 'Скульптурный массаж',
        'name_ar': 'مساج نحت الجسم',
        'price': 370,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Massage',
        'description': 'Body contouring massage',
        'description_ru': 'Моделирующий массаж тела',
        'benefits': ['Shapes body', 'Tones muscles', 'Slimming effect']
    },
    {
        'key': 'anticellulite_massage',
        'name': 'Anti-Cellulite Massage 60min',
        'name_ru': 'Антицеллюлитный массаж 60 мин',
        'name_ar': 'مساج مضاد للسيلوليت 60 دقيقة',
        'price': 300,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Massage',
        'description': 'Cellulite reduction massage',
        'description_ru': 'Массаж против целлюлита',
        'benefits': ['Reduces cellulite', 'Firms skin', 'Improves texture']
    },
    {
        'key': 'moroccan_bath',
        'name': 'Moroccan Bathhouse 60min',
        'name_ru': 'Марокканская баня 60 мин',
        'name_ar': 'الحمام المغربي 60 دقيقة',
        'price': 250,
        'min_price': None,
        'max_price': None,
        'duration': '30min',
        'currency': 'AED',
        'category': 'Massage',
        'description': 'Traditional Moroccan bath',
        'description_ru': 'Традиционная марокканская баня',
        'benefits': ['Deep cleansing', 'Exfoliation', 'Relaxing']
    },
    {
        'key': 'moroccan_loofa',
        'name': 'Moroccan Bath Loofa',
        'name_ru': 'Марокканская баня с мочалкой',
        'name_ar': 'ليف مغربي',
        'price': 50,
        'min_price': None,
        'max_price': None,
        'duration': '30min',
        'currency': 'AED',
        'category': 'Massage',
        'description': 'Moroccan scrub with loofa',
        'description_ru': 'Марокканский скраб с мочалкой',
        'benefits': ['Exfoliating', 'Smooth skin', 'Refreshing']
    },
    {
        'key': 'hotstone_massage',
        'name': 'Hotstone Massage',
        'name_ru': 'Массаж горячими камнями',
        'name_ar': 'مساج بالأحجار الساخنة',
        'price': 310,
        'min_price': None,
        'max_price': None,
        'duration': None,
        'currency': 'AED',
        'category': 'Massage',
        'description': 'Hot stone therapy',
        'description_ru': 'Массаж с горячими камнями',
        'benefits': ['Deep relaxation', 'Muscle relief', 'Therapeutic']
    },
    {
        'key': 'massage_package_5',
        'name': 'Package of 5 Massages',
        'name_ru': 'Пакет из 5 массажей',
        'name_ar': 'باقة 5 مساجات',
        'price': 1999,
        'min_price': None,
        'max_price': None,
        'duration': '2h',
        'currency': 'AED',
        'category': 'Massage',
        'description': 'Package of 5 massage sessions',
        'description_ru': 'Пакет из 5 сеансов массажа',
        'benefits': ['Best value', 'Flexible schedule', 'Long-term benefits']
    },
    
    # Promo Packages
    {
        'key': 'blowdry_package_5',
        'name': 'Blow Dry Package 5 Sessions',
        'name_ru': 'Пакет из 5 укладок',
        'name_ar': 'باقة 5 تسريحات',
        'price': 500,
        'min_price': None,
        'max_price': None,
        'duration': '1h',
        'currency': 'AED',
        'category': 'Hair',
        'description': 'Package of 5 blow dry sessions',
        'description_ru': 'Пакет из 5 укладок',
        'benefits': ['Best value', 'Convenient', 'Save money']
    },
]

# ===== СПЕЦИАЛЬНЫЕ ПАКЕТЫ (ПРИМЕРЫ) =====
SPECIAL_PACKAGES_DATA = [
    {
        'name': 'Summer Manicure & Pedicure',
        'name_ru': 'Летний пакет: Маникюр + Педикюр',
        'description': 'Complete hand and foot care with gel polish',
        'description_ru': 'Полный уход за руками и ногами с гель-лаком',
        'original_price': 360,
        'special_price': 290,
        'currency': 'AED',
        'keywords': 'летний пакет, summer, маникюр педикюр вместе, manicure pedicure, маникюр+педикюр',
        'promo_code': 'SUMMER2025',
        'valid_from': '2025-06-01',
        'valid_until': '2025-08-31',
        'services_included': 'manicure_gelish, pedicure_gelish',
        'max_usage': 100
    },
    {
        'name': 'Balayage + Keratin Complex',
        'name_ru': 'Комплекс: Balayage + Кератин',
        'description': 'Hair coloring with keratin treatment',
        'description_ru': 'Окрашивание балаяж + кератиновое выпрямление',
        'original_price': 1500,
        'special_price': 1200,
        'currency': 'AED',
        'keywords': 'балаяж, balayage, кератин комплекс, balayage keratin, окрашивание+кератин',
        'promo_code': 'HAIR2025',
        'valid_from': '2025-01-01',
        'valid_until': '2025-12-31',
        'services_included': 'balayage, hair_treatment',
        'max_usage': 50
    },
    {
        'name': 'Permanent Brows + Lips Package',
        'name_ru': 'Пакет: Перманент Брови + Губы',
        'description': 'Complete permanent makeup for brows and lips',
        'description_ru': 'Полный перманентный макияж бровей и губ',
        'original_price': 2300,
        'special_price': 2000,
        'currency': 'AED',
        'keywords': 'перманент, permanent makeup, брови+губы, brows+lips, перманент комплекс',
        'promo_code': 'PERMANENT2025',
        'valid_from': '2025-01-01',
        'valid_until': '2025-12-31',
        'services_included': 'permanent_brows, permanent_lips',
        'max_usage': None
    }
]

def migrate_special_packages():
    """Добавить специальные пакеты в БД"""
    if not os.path.exists(DATABASE_NAME):
        print(f"❌ БД {DATABASE_NAME} не найдена!")
        return 1
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    print(f"\n📦 Добавление специальных пакетов...")
    
    for pkg in SPECIAL_PACKAGES_DATA:
        try:
            discount = int(((pkg['original_price'] - pkg['special_price']) / pkg['original_price']) * 100)
            
            c.execute("""INSERT INTO special_packages 
                         (name, name_ru, description, description_ru, original_price, 
                          special_price, currency, discount_percent, services_included, 
                          promo_code, keywords, valid_from, valid_until, is_active, 
                          created_at, updated_at, max_usage, usage_count)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0)""",
                      (pkg['name'], pkg['name_ru'], pkg['description'], 
                       pkg['description_ru'], pkg['original_price'], 
                       pkg['special_price'], pkg['currency'], discount, 
                       pkg['services_included'], pkg['promo_code'], 
                       pkg['keywords'], pkg['valid_from'], pkg['valid_until'],
                       datetime.now().isoformat(), datetime.now().isoformat(),
                       pkg['max_usage']))
            
            print(f"✅ {pkg['name_ru']} - {pkg['special_price']} AED (скидка {discount}%)")
            
        except sqlite3.IntegrityError:
            print(f"⚠️  Пакет {pkg['name_ru']} уже существует")
        except Exception as e:
            print(f"❌ Ошибка: {pkg['name_ru']} - {e}")
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Специальные пакеты добавлены!")
    return 0

def migrate_services():
    """Главная функция миграции"""
    
    print("=" * 70)
    print("🚀 МИГРАЦИЯ УСЛУГ ИЗ ПРАЙС-ЛИСТА")
    print("=" * 70)
    print()
    
    if not os.path.exists(DATABASE_NAME):
        print(f"❌ БД {DATABASE_NAME} не найдена!")
        return 1
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Проверить таблицу services
    try:
        c.execute("SELECT COUNT(*) FROM services")
        existing_count = c.fetchone()[0]
        
        if existing_count > 0:
            print(f"⚠️  В БД уже есть {existing_count} услуг!")
            print("   Будут ОБНОВЛЕНЫ существующие записи и добавлены новые")
            response = input("   Продолжить? (yes/no): ")
            if response.lower() not in ['yes', 'y']:
                conn.close()
                return 0
    
    except sqlite3.OperationalError as e:
        print(f"❌ Таблица services не существует: {e}")
        print("   Запустите сначала: python backend/main.py")
        conn.close()
        return 1
    
    # Загрузить услуги
    now = datetime.now().isoformat()
    success_count = 0
    updated_count = 0
    new_count = 0
    error_count = 0
    
    print(f"\n📥 Обработка {len(SERVICES_DATA)} услуг...")
    print()
    
    for service in SERVICES_DATA:
        try:
            benefits_str = '|'.join(service.get('benefits', []))
            
            # Проверяем, существует ли услуга
            c.execute("SELECT id FROM services WHERE service_key = ?", (service['key'],))
            existing = c.fetchone()
            
            if existing:
                # ОБНОВЛЯЕМ существующую услугу
                c.execute("""UPDATE services SET
                            name = ?,
                            name_ru = ?,
                            name_ar = ?,
                            price = ?,
                            min_price = ?,
                            max_price = ?,
                            duration = ?,
                            currency = ?,
                            category = ?,
                            description = ?,
                            description_ru = ?,
                            benefits = ?,
                            updated_at = ?
                            WHERE service_key = ?""",
                         (service['name'],
                          service['name_ru'],
                          service.get('name_ar'),
                          service['price'],
                          service.get('min_price'),
                          service.get('max_price'),
                          service.get('duration'),
                          service['currency'],
                          service['category'],
                          service.get('description'),
                          service.get('description_ru'),
                          benefits_str,
                          now,
                          service['key']))
                
                updated_count += 1
                duration_info = f"[{service.get('duration', '-')}]" if service.get('duration') else ""
                price_range = f"{service.get('min_price', service['price'])}-{service.get('max_price', service['price'])}" if service.get('min_price') and service.get('max_price') else str(service['price'])
                print(f"🔄 {service['name_ru']} - {price_range} {service['currency']} {duration_info}")
            else:
                # СОЗДАЕМ новую услугу
                c.execute("""INSERT INTO services 
                            (service_key, name, name_ru, name_ar, price, min_price, max_price, 
                             duration, currency, category, description, description_ru, benefits, 
                             is_active, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)""",
                         (service['key'],
                          service['name'],
                          service['name_ru'],
                          service.get('name_ar'),
                          service['price'],
                          service.get('min_price'),
                          service.get('max_price'),
                          service.get('duration'),
                          service['currency'],
                          service['category'],
                          service.get('description'),
                          service.get('description_ru'),
                          benefits_str,
                          now,
                          now))
                
                new_count += 1
                duration_info = f"[{service.get('duration', '-')}]" if service.get('duration') else ""
                print(f"✅ {service['name_ru']} - {service['price']} {service['currency']} {duration_info} - НОВАЯ")
            
            success_count += 1
            
        except Exception as e:
            error_count += 1
            print(f"❌ Ошибка: {service['key']} - {e}")
    
    conn.commit()
    conn.close()
    
    print()
    print("=" * 70)
    print(f"✅ МИГРАЦИЯ ЗАВЕРШЕНА!")
    print(f"   Всего обработано: {success_count}")
    print(f"   Обновлено: {updated_count}")
    print(f"   Создано новых: {new_count}")
    print(f"   Ошибок: {error_count}")
    print("=" * 70)
    print()
    
    return 0