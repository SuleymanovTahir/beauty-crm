# backend/bot/tools.py
"""
Инструменты для AI-бота - проверка доступности времени
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from core.config import DATABASE_NAME, DEFAULT_HOURS_WEEKDAYS, DEFAULT_LUNCH_START, DEFAULT_LUNCH_END
from db.connection import get_db_connection
from services.master_schedule import MasterScheduleService

def get_available_time_slots(
    date: str,
    service_name: Optional[str] = None,
    master_name: Optional[str] = None,
    duration_minutes: Optional[int] = None
) -> List[Dict[str, str]]:
    """
    Получить реально свободные слоты из БД с учетом графика и услуг
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Определяем ID услуги и длительность если передано название
        service_id = None
        if service_name:
            c.execute("SELECT id, duration FROM services WHERE name ILIKE %s",
                     (f"%{service_name}%",))
            service_row = c.fetchone()
            if service_row:
                service_id = service_row[0]
                # ✅ Парсим длительность из БД используя утилиту
                from utils.duration_utils import parse_duration_to_minutes
                
                dur_str = service_row[1]
                if dur_str:
                    parsed_minutes = parse_duration_to_minutes(dur_str)
                    if parsed_minutes:
                        duration_minutes = parsed_minutes
                        print(f"📏 Parsed duration for '{service_name}': {duration_minutes} minutes (from '{dur_str}')")
        
        # ✅ Если длительность не определена, используем дефолт 30 минут (согласно новым требованиям)
        if duration_minutes is None:
            duration_minutes = 30
            print(f"📏 Using default duration: {duration_minutes} minutes")

        # 2. Получаем мастеров
        # Если услуга известна - берем тех кто её делает И у кого включен онлайн-букинг
        # Если нет - берем всех активных

        # Check if secondary_role column exists
        c.execute("""
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'secondary_role'
        """)
        has_secondary_role = c.fetchone()[0] > 0

        if service_id:
            # Get only masters who provide this service AND have online booking enabled
            # Только те у кого role='employee' или secondary_role='employee'
            if has_secondary_role:
                c.execute("""
                    SELECT DISTINCT u.id, u.full_name
                    FROM users u
                    JOIN user_services us ON u.id = us.user_id
                    WHERE u.is_active = TRUE
                      AND u.is_service_provider = TRUE
                      AND (u.role = 'employee' OR u.secondary_role = 'employee')
                      AND us.service_id = %s
                      AND us.is_online_booking_enabled = TRUE
                """, (service_id,))
            else:
                c.execute("""
                    SELECT DISTINCT u.id, u.full_name
                    FROM users u
                    JOIN user_services us ON u.id = us.user_id
                    WHERE u.is_active = TRUE
                      AND u.is_service_provider = TRUE
                      AND u.role = 'employee'
                      AND us.service_id = %s
                      AND us.is_online_booking_enabled = TRUE
                """, (service_id,))
            potential_masters = c.fetchall()
        else:
            # Fallback: мастера с role='employee' или secondary_role='employee'
            if has_secondary_role:
                c.execute("""
                    SELECT id, full_name
                    FROM users
                    WHERE is_active = TRUE
                      AND is_service_provider = TRUE
                      AND (role = 'employee' OR secondary_role = 'employee')
                """)
            else:
                c.execute("""
                    SELECT id, full_name
                    FROM users
                    WHERE is_active = TRUE
                      AND is_service_provider = TRUE
                      AND role = 'employee'
                """)
            potential_masters = c.fetchall()

        # Фильтр по имени если указано
        if master_name:
            potential_masters = [m for m in potential_masters if master_name.lower() in m[1].lower()]

        if not potential_masters:
            print(f"❌ No masters found for service_id={service_id}")
            return []

        # print(f"👤 Potential masters found: {[m[1] for m in potential_masters]}")

        # 3. Генерируем слоты через MasterScheduleService
        schedule_service = MasterScheduleService()
        all_slots = []
        
        for master in potential_masters:
            master_name_real = master[1]
            
            # ✅ ВАЛИДАЦИЯ: Проверяем, что мастер существует в БД
            c.execute("SELECT id, is_active, is_service_provider FROM users WHERE full_name = %s", (master_name_real,))
            master_check = c.fetchone()
            
            if not master_check:
                print(f"❌ ERROR: Master '{master_name_real}' NOT FOUND in users table! Skipping.")
                continue
            
            if not master_check[1]:  # is_active
                print(f"⚠️ WARNING: Master '{master_name_real}' (id={master_check[0]}) is NOT ACTIVE! Skipping.")
                continue
            
            if not master_check[2]:  # is_service_provider
                print(f"⚠️ WARNING: Master '{master_name_real}' (id={master_check[0]}) is NOT a service provider! Skipping.")
                continue
            
            # Получаем слоты для конкретного мастера
            slots = schedule_service.get_available_slots(
                master_name=master_name_real, 
                date=date, 
                duration_minutes=duration_minutes
            )
            
            # ✅ ВАЛИДАЦИЯ: Проверяем формат слотов
            if not isinstance(slots, list):
                print(f"❌ ERROR: get_available_slots returned invalid type: {type(slots)} for master '{master_name_real}'")
                continue
            
            print(f"   📅 Slots for {master_name_real}: {len(slots)} slots")
            
            # ✅ ВАЛИДАЦИЯ: Проверяем каждый слот на формат и конфликты
            for time_str in slots:
                if not isinstance(time_str, str):
                    print(f"⚠️ WARNING: Invalid slot type: {type(time_str)}, value: {time_str}")
                    continue
                
                # Проверяем формат времени
                try:
                    hour, minute = map(int, time_str.split(':'))
                    if not (0 <= hour < 24 and 0 <= minute < 60):
                        print(f"⚠️ WARNING: Invalid time format: {time_str}")
                        continue
                except (ValueError, AttributeError):
                    print(f"⚠️ WARNING: Invalid time format: {time_str}")
                    continue
                
                # ✅ ВАЛИДАЦИЯ: Проверяем, что слот не занят в БД
                c.execute("""
                    SELECT id FROM bookings 
                    WHERE master = %s 
                    AND datetime::date = %s::date 
                    AND datetime::time = %s::time
                    AND status NOT IN ('cancelled', 'no_show')
                """, (master_name_real, date, time_str))
                existing_booking = c.fetchone()
                
                if existing_booking:
                    print(f"❌ ERROR: Slot {time_str} for {master_name_real} on {date} is ALREADY BOOKED! (booking_id={existing_booking[0]})")
                    continue
                
                all_slots.append({
                    "time": time_str,
                    "master": master_name_real,
                    "date": date
                })
            
        # Сортируем по времени
        all_slots.sort(key=lambda x: x['time'])
        
        # ✅ УЛУЧШЕНИЕ: Возвращаем сбалансированный набор слотов
        # Если слотов много, берем равномерно из всего дня, а не только первые 20
        if len(all_slots) > 20:
            # Берем слоты равномерно: утро, день, вечер
            morning_slots = [s for s in all_slots if int(s['time'].split(':')[0]) < 12]
            afternoon_slots = [s for s in all_slots if 12 <= int(s['time'].split(':')[0]) < 17]
            evening_slots = [s for s in all_slots if int(s['time'].split(':')[0]) >= 17]
            
            # Берем по 6-7 слотов из каждого периода
            balanced_slots = []
            if morning_slots:
                balanced_slots.extend(morning_slots[:7])
            if afternoon_slots:
                balanced_slots.extend(afternoon_slots[:7])
            if evening_slots:
                balanced_slots.extend(evening_slots[:6])
            
            # Если не набрали 20, дополняем из всех
            if len(balanced_slots) < 20:
                remaining = [s for s in all_slots if s not in balanced_slots]
                balanced_slots.extend(remaining[:20 - len(balanced_slots)])
            
            print(f"✅ Total available slots found: {len(all_slots)}, returning balanced set: {len(balanced_slots)} (morning: {len([s for s in balanced_slots if int(s['time'].split(':')[0]) < 12])}, afternoon: {len([s for s in balanced_slots if 12 <= int(s['time'].split(':')[0]) < 17])}, evening: {len([s for s in balanced_slots if int(s['time'].split(':')[0]) >= 17])})")
            return balanced_slots
        else:
            print(f"✅ Total available slots found: {len(all_slots)}")
            return all_slots

    except Exception as e:
        print(f"❌ Error in get_available_time_slots: {e}")
        return []
        
    finally:
        conn.close()

def check_time_slot_available(
    date: str,
    time: str,
    master_name: Optional[str] = None
) -> Dict[str, any]:
    """
    Проверить доступен ли конкретный слот
    
    Returns:
        {"available": True/False, "reason": "...", "alternatives": [...]}
    """
    print(f"🔍 Check slot request: {date} {time} (Master: {master_name or 'any'})")
    schedule_service = MasterScheduleService()
    
    # Если мастер не указан, проверяем есть ли ХОТЯ БЫ ОДИН свободный мастер
    if not master_name:
        # Получаем доступность всех мастеров - ВСЕГДА проверяем с гранулярностью 30 мин
        availability = schedule_service.get_all_masters_availability(date, duration_minutes=30)
        print(f"   📊 All masters availability for {date}: {len(availability)} masters checked")
        
        # ✅ ДОПОЛНИТЕЛЬНОЕ ЛОГИРОВАНИЕ
        if not availability:
            print(f"   ⚠️ WARNING: No masters found in availability! This might be a bug.")
            print(f"   🔍 Checking if get_available_time_slots finds any slots...")
            test_slots = get_available_time_slots(date)
            print(f"   📋 get_available_time_slots found {len(test_slots)} slots")
            if test_slots:
                print(f"   ⚠️ INCONSISTENCY: get_available_time_slots finds slots but get_all_masters_availability doesn't!")
                # ✅ FALLBACK: Используем get_available_time_slots для проверки
                for slot in test_slots:
                    if slot['time'] == time:
                        print(f"   ✅ Found slot in fallback: {slot['time']} at {slot['master']}")
                        return {
                            "available": True,
                            "reason": f"Слот свободен у {slot['master']}",
                            "alternatives": [],
                            "available_masters": [slot['master']]
                        }
        
        is_any_available = False
        available_masters = []
        for master, slots in availability.items():
            if time in slots:
                is_any_available = True
                available_masters.append(master)
                print(f"   ✅ Found available master: {master} at {time}")
        
        if is_any_available:
            print(f"   ✅ Slot is AVAILABLE: {len(available_masters)} master(s) available")
            return {
                "available": True,
                "reason": f"Слот свободен у {len(available_masters)} мастер(ов)",
                "alternatives": [],
                "available_masters": available_masters  # ✅ Добавляем список доступных мастеров
            }
        else:
            print(f"   ❌ Slot is NOT available: no masters have {time} free")
            # Проверяем, это вне рабочего времени или просто занято
            # Получаем рабочие часы салона
            from db import get_salon_settings
            salon = get_salon_settings()
            # Use specific weekday hours if available, else fallback
            hours_str = salon.get('hours_weekdays', DEFAULT_HOURS_WEEKDAYS)
            lunch_start = salon.get('lunch_start', DEFAULT_LUNCH_START)  # ✅ Используем константу
            lunch_end = salon.get('lunch_end', DEFAULT_LUNCH_END)  # ✅ Используем константу
            
            # Парсим время работы
            try:
                parts = hours_str.split('-')
                start_time_str = parts[0].strip() # Expected "10:30"
                end_time_str = parts[1].strip()   # Expected "21:30"
                
                # Проверяем, попадает ли запрошенное время в рабочие часы
                from datetime import datetime
                requested_time = datetime.strptime(time, '%H:%M').time()
                salon_start = datetime.strptime(start_time_str, '%H:%M').time()
                salon_end = datetime.strptime(end_time_str, '%H:%M').time()
                
                print(f"   ⏱️ Working hours check: {requested_time} vs {salon_start}-{salon_end}")

                if requested_time < salon_start:
                    reason = f"Салон ещё не работает (открываемся в {start_time_str})"
                elif requested_time >= salon_end:
                    reason = f"Салон уже закрыт (работаем до {end_time_str})"
                elif (lunch_start and lunch_end and lunch_start not in ['-', ''] and lunch_end not in ['-', ''] and 
                      ':' in lunch_start and ':' in lunch_end):
                    l_start = datetime.strptime(lunch_start[:5], '%H:%M').time()
                    l_end = datetime.strptime(lunch_end[:5], '%H:%M').time()
                    if l_start <= requested_time < l_end:
                        reason = f"В это время у мастеров обед ({lunch_start}-{lunch_end})"
                    else:
                        reason = f"Время {time} занято у всех мастеров"
                else:
                    reason = f"Время {time} занято у всех мастеров"
            except Exception as e:
                print(f"   ⚠️ Error parsing times: {e}")
                reason = f"Время {time} занято у всех мастеров"
            
            print(f"   ❌ Slot unavailable reason: {reason}")
            
            # Слот занят или вне рабочего времени - ищем альтернативы
            alternatives = get_available_time_slots(date)
            
            # ✅ УЛУЧШЕНИЕ: Фильтруем альтернативы по времени запроса
            # Если клиент спрашивает про утро, предлагаем утренние слоты
            requested_hour = int(time.split(':')[0])
            is_morning_request = requested_hour < 12
            
            if is_morning_request and alternatives:
                # Фильтруем - оставляем утренние слоты (до 14:00)
                morning_alternatives = [alt for alt in alternatives if int(alt['time'].split(':')[0]) < 14]
                if morning_alternatives:
                    # Сортируем по близости к запрошенному времени
                    try:
                        from datetime import datetime as dt_class
                        req_dt = dt_class.strptime(time, '%H:%M')
                        morning_alternatives.sort(key=lambda x: abs(
                            (dt_class.strptime(x['time'], '%H:%M') - req_dt).total_seconds()
                        ))
                        alternatives = morning_alternatives[:3]
                        print(f"🌅 Filtered to {len(alternatives)} morning alternatives for morning request")
                    except:
                        alternatives = morning_alternatives[:3]
                else:
                    # Если утренних нет, берем ближайшие после обеда
                    afternoon_alternatives = [alt for alt in alternatives if int(alt['time'].split(':')[0]) >= 14]
                    if afternoon_alternatives:
                        # Сортируем по времени (ближайшие к запрошенному)
                        try:
                            from datetime import datetime as dt_class
                            req_dt = dt_class.strptime(time, '%H:%M')
                            afternoon_alternatives.sort(key=lambda x: abs(
                                (dt_class.strptime(x['time'], '%H:%M') - req_dt).total_seconds()
                            ))
                            alternatives = afternoon_alternatives[:3]
                            print(f"🌆 No morning slots, using {len(alternatives)} afternoon alternatives")
                        except:
                            alternatives = afternoon_alternatives[:3]
            elif alternatives:
                # Для вечерних запросов сортируем по близости к запрошенному времени
                try:
                    from datetime import datetime as dt_class
                    req_dt = dt_class.strptime(time, '%H:%M')
                    alternatives.sort(key=lambda x: abs(
                        (dt_class.strptime(x['time'], '%H:%M') - req_dt).total_seconds()
                    ))
                    alternatives = alternatives[:3]
                    print(f"📋 Sorted {len(alternatives)} alternatives by proximity to {time}")
                except:
                    alternatives = alternatives[:3]
            
            return {
                "available": False,
                "reason": reason,
                "alternatives": alternatives
            }

    # Если мастер указан
    is_available = schedule_service.is_master_available(
        master_name=master_name,
        date=date,
        time_str=time
    )
    print(f"   👤 Master {master_name} available at {time}?: {is_available}")
    
    if is_available:
        return {
            "available": True,
            "reason": "Слот свободен",
            "alternatives": []
        }
    else:
        # Слот занят - ищем причину (отпуск, выходной, обед)
        print(f"   ❌ Slot blocked for {master_name}")
        
        # Check specifically for vacation
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("SELECT id FROM users WHERE full_name = %s", (master_name,))
            m_row = c.fetchone()
            if m_row:
                m_id = m_row[0]
                day_start = f"{date} 00:00:00"
                day_end = f"{date} 23:59:59"
                c.execute("SELECT reason FROM user_time_off WHERE user_id = %s AND (start_date <= %s AND end_date >= %s)", (m_id, day_start, day_end))
                time_off = c.fetchone()
                if time_off:
                    reason = f"Мастер {master_name} в отпуске или выходной ({time_off[0] or 'по личным причинам'})"
                else:
                    reason = f"Время {time} у мастера {master_name} уже занято или это его выходной"
            else:
                reason = f"Мастер {master_name} не найден"
        finally:
            conn.close()

        alternatives = get_available_time_slots(date, master_name=master_name)
        
        return {
            "available": False,
            "reason": reason,
            "alternatives": alternatives[:3]  # Первые 3 альтернативы
        }

def get_date_label(date_obj) -> str:
    """Получить читаемую метку для даты"""
    today = datetime.now().date()
    if date_obj == today:
        return "сегодня"
    elif date_obj == today + timedelta(days=1):
        return "завтра"
    else:
        days_diff = (date_obj - today).days
        if days_diff == 2:
            return "послезавтра"
        elif 2 < days_diff <= 7:
            return f"через {days_diff} дня"
        else:
            return date_obj.strftime("%d.%m.%Y")