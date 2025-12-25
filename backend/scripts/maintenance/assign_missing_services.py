"""
Скрипт для интеллектуального автоматического назначения услуг без мастеров.
"""
import sys
import os
import re

# Добавляем путь к backend для импортов
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.connection import get_db_connection
from utils.logger import log_info, log_error

# Расширенный маппинг категорий на ключевые слова
CATEGORY_KEYWORD_MAP = {
    'Hair': ['hair', 'stylist', 'blow dry'],
    'Nails': ['nail'],
    'Massage': ['massage', 'masseur', 'body'],
    'Waxing': ['waxing', 'sugaring', 'esthetician', 'bikini'],
    'Facial': ['facial', 'skin', 'esthetician', 'massage'], # Jennifer does massage & facials
    'Brows': ['brow', 'esthetician', 'permanent', 'pmu', 'hair'], # Mestan does brows
    'Lashes': ['lash', 'esthetician', 'massage'], # Jennifer does lashes
    'Permanent Makeup': ['permanent', 'pmu', 'hair', 'stylist'], # Mestan does PMU
    'Promo': [], # Special handling
}

def assign_missing_services():
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        print("🔍 Поиск услуг без мастеров (умное распределение)...")
        
        c.execute("""
            SELECT s.id, s.name, s.category 
            FROM services s
            WHERE s.is_active = TRUE
            AND s.id NOT IN (
                SELECT DISTINCT us.service_id
                FROM user_services us
                JOIN users u ON u.id = us.user_id
                WHERE u.is_active = TRUE 
                AND u.is_service_provider = TRUE
                AND u.role NOT IN ('director', 'admin', 'manager')
            )
        """)
        
        missing_services = c.fetchall()
        
        if not missing_services:
            print("✅ Все услуги имеют назначенных мастеров.")
            return

        print(f"⚠️ Найдено {len(missing_services)} услуг без мастеров.")

        c.execute("""
            SELECT id, full_name, position, role 
            FROM users 
            WHERE is_service_provider = TRUE AND is_active = TRUE
            AND role NOT IN ('director', 'admin', 'manager')
        """)
        masters = c.fetchall()
        
        added_count = 0
        for s_id, s_name, s_cat in missing_services:
            print(f"   🛠 Категория: {s_cat} | Услуга: {s_name}")
            
            keywords = CATEGORY_KEYWORD_MAP.get(s_cat, [])
            target_masters = []
            
            for m_id, m_name, m_pos, m_role in masters:
                pos_str = (m_pos or "").lower()
                
                # 1. Прямое совпадение по расширенным ключевым словам
                is_match = any(kw.lower() in pos_str for kw in keywords)
                
                # 2. Специальная логика для Promo
                if s_cat == 'Promo':
                    # Назначаем Promo тем, кто в целом является мастером 
                    # (исключаем тех, кто только директор/админ, но они уже отфильтрованы)
                    is_match = True
                
                # 3. Дополнительная логика для смежных категорий (Nails -> GULYA/JENNIFER)
                if s_cat == 'Nails' and 'nail' in pos_str:
                    is_match = True

                if is_match:
                    target_masters.append((m_id, m_name))

            if not target_masters:
                # Если всё еще нет мастеров, попробуем назначить "универсалов" (Estheticians) 
                # или тех, кто делает массаж (часто совмещают с Facial/Lashes)
                if s_cat in ['Facial', 'Lashes', 'Brows', 'Permanent Makeup']:
                    # JENNIFER и GULYA - основные кандидаты на эти услуги (по CSV)
                    for m_id, m_name, m_pos, m_role in masters:
                        if m_name.upper() in ['JENNIFER', 'GULYA', 'MESTAN']:
                            target_masters.append((m_id, m_name))

            if not target_masters:
                print(f"      ⚠️  Не удалось подобрать мастера (не 'на угад')")
                continue

            for m_id, m_name in target_masters:
                try:
                    c.execute("""
                        INSERT INTO user_services (user_id, service_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                    """, (m_id, s_id))
                    if c.rowcount > 0:
                        added_count += 1
                        print(f"      ✅ Назначено: {m_name}")
                except Exception as e:
                    print(f"      ❌ Ошибка: {e}")

        conn.commit()
        print(f"🎉 Завершено! Успешно создано {added_count} новых назначений.")

    except Exception as e:
        print(f"❌ Ошибка: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    assign_missing_services()
