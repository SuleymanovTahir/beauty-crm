#!/usr/bin/env python3
"""
Скрипт для замены хардкодов на переменные в bot_settings
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection

def update_bot_settings_with_variables():
    """Заменить хардкоды на переменные в bot_settings"""
    
    conn = get_db_connection()
    c = conn.cursor()
    
    print("🔄 Обновление bot_settings: замена хардкодов на переменные...")
    
    # Получаем текущие значения
    c.execute("""
        SELECT 
            contextual_rules,
            booking_time_logic,
            bot_name,
            safety_guidelines
        FROM bot_settings WHERE id = 1
    """)
    
    result = c.fetchone()
    if not result:
        print("❌ bot_settings не найдены!")
        conn.close()
        return
    
    contextual_rules, booking_time_logic, bot_name, safety_guidelines = result
    
    # Замены
    changes = []
    
    # 1. Заменяем хардкод времени на переменную
    if contextual_rules and "10:30 до 21:30" in contextual_rules:
        contextual_rules = contextual_rules.replace(
            "Мы работаем с 10:30 до 21:30",
            "Мы работаем {hours_weekdays}"
        )
        changes.append("contextual_rules: время работы → {hours_weekdays}")
    
    # 2. Заменяем хардкод времени в booking_time_logic
    if booking_time_logic and "10:30 - 21:30" in booking_time_logic:
        booking_time_logic = booking_time_logic.replace(
            "10:30 - 21:30",
            "{hours_weekdays}"
        )
        changes.append("booking_time_logic: время работы → {hours_weekdays}")
    
    # 3. Заменяем название салона
    if bot_name and "M Le Diamant" in bot_name:
        bot_name = bot_name.replace("M Le Diamant", "{salon_name}")
        changes.append("bot_name: M Le Diamant → {salon_name}")
    
    # 4. Заменяем Dubai на переменную
    if safety_guidelines and "Dubai" in safety_guidelines:
        safety_guidelines = safety_guidelines.replace(
            "в Dubai",
            "в {main_location}"
        )
        changes.append("safety_guidelines: Dubai → {main_location}")
    
    if not changes:
        print("✅ Все хардкоды уже заменены на переменные!")
        conn.close()
        return
    
    # Обновляем
    print(f"\n📝 Применяю {len(changes)} изменений:")
    for change in changes:
        print(f"   • {change}")
    
    c.execute("""
        UPDATE bot_settings SET
            contextual_rules = %s,
            booking_time_logic = %s,
            bot_name = %s,
            safety_guidelines = %s
        WHERE id = 1
    """, (contextual_rules, booking_time_logic, bot_name, safety_guidelines))
    
    conn.commit()
    conn.close()
    
    print("\n✅ Все хардкоды успешно заменены на переменные!")
    print("\n💡 Теперь эти значения будут подставляться из salon_settings:")
    print("   - {salon_name} - название салона")
    print("   - {hours_weekdays} - время работы в будни")
    print("   - {main_location} - основная локация")

if __name__ == '__main__':
    update_bot_settings_with_variables()
