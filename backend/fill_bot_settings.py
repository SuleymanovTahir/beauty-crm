"""
Заполнение пустых полей bot_settings из файла инструкций
Работает без environment variables
"""
import sqlite3
import os
import re
from datetime import datetime

DATABASE_NAME = "salon_bot.db"
INSTRUCTIONS_FILE = "bot/bot_instructions_file.txt"


def extract_objection_v2(content: str, keyword: str) -> str:
    """Извлечение возражений из файла"""
    try:
        pattern = rf'ВОЗРАЖЕНИЕ.*?{re.escape(keyword)}.*?✅ ГЕНИАЛЬНО:(.*?)(?=\*\*ВОЗРАЖЕНИЕ|---|\[|$)'
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)

        if match:
            response = match.group(1).strip()
            # Убираем лишние пустые строки
            response = '\n'.join(line for line in response.split('\n') if line.strip())
            # Ограничиваем длину
            if len(response) > 2000:
                response = response[:1997] + '...'
            return response
    except Exception as e:
        print(f"⚠️  Ошибка парсинга возражения '{keyword}': {e}")

    return ""


def parse_section(content: str, section_name: str, next_section: str = None) -> str:
    """Извлечь текст между секциями"""
    try:
        start = content.find(f'[{section_name}]')
        if start == -1:
            start = content.find(section_name)
        if start == -1:
            return ""

        if next_section:
            end = content.find(f'[{next_section}]', start)
            if end == -1:
                end = content.find(next_section, start)
        else:
            end = len(content)

        if end == -1:
            end = len(content)

        text = content[start:end].strip()

        # Убираем заголовок секции
        lines = text.split('\n')
        if lines and lines[0].startswith('['):
            lines = lines[1:]

        return '\n'.join(lines).strip()
    except:
        return ""


def fill_bot_settings():
    """Заполнить пустые поля в bot_settings"""

    print("=" * 70)
    print("🔧 ЗАПОЛНЕНИЕ ПУСТЫХ ПОЛЕЙ BOT_SETTINGS")
    print("=" * 70)
    print()

    # Проверяем существование файлов
    if not os.path.exists(DATABASE_NAME):
        print(f"❌ БД {DATABASE_NAME} не найдена!")
        return 1

    if not os.path.exists(INSTRUCTIONS_FILE):
        print(f"❌ Файл {INSTRUCTIONS_FILE} не найден!")
        return 1

    # Читаем файл инструкций
    print(f"📖 Читаю {INSTRUCTIONS_FILE}...")
    with open(INSTRUCTIONS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Подключаемся к БД
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Получаем текущие настройки
    c.execute("SELECT * FROM bot_settings WHERE id = 1")
    current = c.fetchone()

    if not current:
        print("❌ Настройки bot_settings не найдены!")
        conn.close()
        return 1

    current = dict(current)
    print(f"✅ Найдены текущие настройки")

    # Подготавливаем обновления
    updates = {}

    # 1. price_response_template
    if not current.get('price_response_template'):
        price_section = parse_section(content, '[СТРУКТУРА ОТВЕТА О ЦЕНЕ]', '[ЗАПИСЬ')
        if price_section and '📊 КОРОТКИЙ ФОРМАТ' in price_section:
            parts = price_section.split('📊 КОРОТКИЙ ФОРМАТ')
            if len(parts) > 1:
                template_text = parts[1].split('📊 ПРАВИЛА ЦЕН')[0] if '📊 ПРАВИЛА ЦЕН' in parts[1] else parts[1]
                updates['price_response_template'] = template_text.strip()[:1000]
                print("   ✅ price_response_template")

    # 2. premium_justification
    if not current.get('premium_justification'):
        premium_match = re.search(r'Это сработает потому что[^:]*:(.*?)(?=\[|$)', content, re.DOTALL)
        if premium_match:
            lines = [l.strip() for l in premium_match.group(1).strip().split('\n')
                    if l.strip() and not l.startswith('[')]
            updates['premium_justification'] = '\n'.join(lines[:5])
            print("   ✅ premium_justification")

    # 3. fomo_messages
    if not current.get('fomo_messages'):
        updates['fomo_messages'] = "Сегодня только 2 окна|Завтра уже заполнено|Этот мастер расписан на месяц|Акция до конца недели"
        print("   ✅ fomo_messages")

    # 4. upsell_techniques
    if not current.get('upsell_techniques'):
        updates['upsell_techniques'] = "С педикюром будет комплект|Многие берут сразу курс из 3х|Можно добавить уход|Советую взять с массажем"
        print("   ✅ upsell_techniques")

    # 5-14. Все возражения
    objections = {
        'objection_expensive': 'дорого',
        'objection_think_about_it': 'подумаю',
        'objection_no_time': 'нет времени',
        'objection_pain': 'боль',
        'objection_result_doubt': 'результат',
        'objection_cheaper_elsewhere': 'дешевле',
        'objection_too_far': 'далеко',
        'objection_consult_husband': 'муж',
        'objection_first_time': 'первый раз',
        'objection_not_happy': 'не понрав'
    }

    for field, keyword in objections.items():
        if not current.get(field):
            extracted = extract_objection_v2(content, keyword)
            if extracted and len(extracted) > 50:
                updates[field] = extracted
                print(f"   ✅ {field}")

    # 15. emotional_triggers
    if not current.get('emotional_triggers'):
        updates['emotional_triggers'] = "Красота | Уверенность | Роскошь | Стиль | Престиж"
        print("   ✅ emotional_triggers")

    # 16. social_proof_phrases
    if not current.get('social_proof_phrases'):
        updates['social_proof_phrases'] = "500+ довольных клиентов | Топ-1 в JBR | 5⭐ отзывы | Материалы из США/Европы"
        print("   ✅ social_proof_phrases")

    # 17. personalization_rules
    if not current.get('personalization_rules'):
        updates['personalization_rules'] = "Обращаться по имени\nУчитывать историю записей\nПодстраиваться под стиль общения клиента"
        print("   ✅ personalization_rules")

    # 18. example_dialogues
    if not current.get('example_dialogues'):
        dialogue_section = parse_section(content, '🎯 ПРИМЕРЫ ПРАВИЛЬНЫХ ДИАЛОГОВ', '[АКЦИИ')
        if dialogue_section:
            updates['example_dialogues'] = dialogue_section[:2000]
            print("   ✅ example_dialogues")

    # 19. emotional_responses
    if not current.get('emotional_responses'):
        updates['emotional_responses'] = "😊 Радость и дружелюбие\n💖 Забота о клиенте\n✨ Вдохновение и мотивация\n💎 Престиж и эксклюзивность"
        print("   ✅ emotional_responses")

    # 20. anti_patterns
    if not current.get('anti_patterns'):
        anti_section = parse_section(content, '[ЗАПРЕЩЕНО]', '[ЛОКАЦИЯ')
        if anti_section:
            updates['anti_patterns'] = anti_section[:1000]
            print("   ✅ anti_patterns")

    # 21. safety_guidelines
    if not current.get('safety_guidelines'):
        critical_section = parse_section(content, '[КРИТИЧЕСКИЕ ПРАВИЛА]', '[ПРИВЕТСТВИЕ]')
        if critical_section:
            updates['safety_guidelines'] = critical_section[:2000]
            print("   ✅ safety_guidelines")

    # 22. example_good_responses
    if not current.get('example_good_responses'):
        updates['example_good_responses'] = "Manicure Gel 130 AED 💅\nДержится 3 недели\nЗаписаться?"
        print("   ✅ example_good_responses")

    # 23. algorithm_actions
    if not current.get('algorithm_actions'):
        updates['algorithm_actions'] = "1. Узнать услугу\n2. Назвать цену + результат\n3. Предложить конкретное время\n4. Собрать данные\n5. Подтвердить бронь"
        print("   ✅ algorithm_actions")

    # 24. location_features
    if not current.get('location_features'):
        location_section = parse_section(content, '[ЛОКАЦИЯ — JBR]', '[ГОЛОСОВЫЕ')
        if location_section:
            updates['location_features'] = location_section[:500]
            print("   ✅ location_features")

    # 25. seasonality
    if not current.get('seasonality'):
        updates['seasonality'] = "Лето: акцент на педикюр и эпиляцию\nЗима: уход за кожей и волосами\nПраздники: перманентный макияж"
        print("   ✅ seasonality")

    # 26. emergency_situations
    if not current.get('emergency_situations'):
        negativ_section = parse_section(content, '[НЕГАТИВ]', '[ЗАПРЕЩЕНО')
        if negativ_section:
            updates['emergency_situations'] = negativ_section[:1000]
            print("   ✅ emergency_situations")

    # 27. success_metrics
    if not current.get('success_metrics'):
        updates['success_metrics'] = "Конверсия в запись >30%\nВремя ответа <2 мин\nКлиенты становятся постоянными в 95% случаев"
        print("   ✅ success_metrics")

    # 28. context_memory
    if not current.get('context_memory'):
        context_match = re.search(r'🧠 ЗАПОМИНАЙ КОНТЕКСТ(.*?)(?=🚫|❌|🎯|\[)', content, re.DOTALL)
        if context_match:
            updates['context_memory'] = context_match.group(1).strip()[:1500]
            print("   ✅ context_memory")

    # 29. avoid_repetition
    if not current.get('avoid_repetition'):
        repetition_match = re.search(r'🚫 НЕ ПОВТОРЯЙСЯ(.*?)(?=🎯|❌|\[)', content, re.DOTALL)
        if repetition_match:
            updates['avoid_repetition'] = repetition_match.group(1).strip()[:1500]
            print("   ✅ avoid_repetition")

    # 30. conversation_flow_rules
    if not current.get('conversation_flow_rules'):
        flow_match = re.search(r'🎯 КАК ВЕСТИ ДИАЛОГ:(.*?)(?=🎭|❌|\[)', content, re.DOTALL)
        if flow_match:
            updates['conversation_flow_rules'] = flow_match.group(1).strip()[:1500]
            print("   ✅ conversation_flow_rules")

    # 31. personality_adaptations
    if not current.get('personality_adaptations'):
        adapt_match = re.search(r'🎭 ПОДСТРАИВАЙСЯ ПОД КЛИЕНТА:(.*?)(?=#|❌|\[)', content, re.DOTALL)
        if adapt_match:
            updates['personality_adaptations'] = adapt_match.group(1).strip()[:1500]
            print("   ✅ personality_adaptations")

    # 32. smart_objection_detection
    if not current.get('smart_objection_detection'):
        detection_match = re.search(r'🎯 РАСПОЗНАВАЙ СКРЫТЫЕ ВОЗРАЖЕНИЯ:(.*?)(?=\*\*ВОЗРАЖЕНИЕ)', content, re.DOTALL)
        if detection_match:
            updates['smart_objection_detection'] = detection_match.group(1).strip()[:2000]
            print("   ✅ smart_objection_detection")

    # Если есть обновления - применяем
    if not updates:
        print("\n✅ Все поля уже заполнены!")
        conn.close()
        return 0

    print(f"\n💾 Применяю {len(updates)} обновлений...")

    # Формируем SQL UPDATE
    set_clauses = []
    params = []
    for field, value in updates.items():
        set_clauses.append(f"{field} = ?")
        params.append(value)

    params.append(datetime.now().isoformat())
    set_clauses.append("updated_at = ?")

    sql = f"UPDATE bot_settings SET {', '.join(set_clauses)} WHERE id = 1"

    try:
        c.execute(sql, params)
        conn.commit()
        print("✅ Обновления применены!")
    except Exception as e:
        print(f"❌ Ошибка при обновлении: {e}")
        conn.rollback()
        return 1
    finally:
        conn.close()

    print()
    print("=" * 70)
    print("✅ ЗАПОЛНЕНИЕ ЗАВЕРШЕНО!")
    print(f"   Обновлено полей: {len(updates)}")
    print("=" * 70)
    print()

    return 0


if __name__ == "__main__":
    exit(fill_bot_settings())
