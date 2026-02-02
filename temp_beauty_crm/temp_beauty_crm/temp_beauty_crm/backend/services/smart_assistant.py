"""
Умный AI-ассистент с памятью о клиенте

Персонализирует общение на основе истории и предпочтений
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
import json
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from bot.ai_responses import generate_ai_response
from db import get_client_language

class SmartAssistant:
    """Умный помощник для персонализированного общения с клиентами"""

    def __init__(self, client_id: str):
        self.client_id = client_id
        self.preferences = self._load_preferences()
        self.history = self._load_booking_history()

    def _load_preferences(self) -> Optional[Dict]:
        """Загрузить предпочтения клиента"""
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT preferred_master, preferred_service, preferred_day_of_week,
                   preferred_time_of_day, allergies, special_notes,
                   auto_book_enabled, auto_book_interval_weeks
            FROM client_preferences
            WHERE client_id = %s
        """, (self.client_id,))

        result = c.fetchone()
        conn.close()

        if result:
            return {
                "preferred_master": result[0],
                "preferred_service": result[1],
                "preferred_day_of_week": result[2],
                "preferred_time_of_day": result[3],
                "allergies": result[4],
                "special_notes": result[5],
                "auto_book_enabled": bool(result[6]),
                "auto_book_interval_weeks": result[7]
            }
        return None

    def _load_booking_history(self) -> List[Dict]:
        """Загрузить историю записей клиента"""
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT service_name, datetime, master, status, revenue
            FROM bookings
            WHERE instagram_id = %s
            ORDER BY datetime DESC
            LIMIT 10
        """, (self.client_id,))

        bookings = []
        for row in c.fetchall():
            bookings.append({
                "service": row[0],
                "datetime": row[1],
                "master": row[2],
                "status": row[3],
                "revenue": row[4]
            })

        conn.close()
        return bookings

    async def get_personalized_greeting(self, client_name: str) -> str:
        """Персонализированное приветствие через AI"""
        language = get_client_language(self.client_id)
        
        if not self.history:
            # Новый клиент
            return await generate_ai_response('greeting_new', language, name=client_name)

        # Постоянный клиент
        last_booking = self.history[0]
        try:
            last_date = datetime.fromisoformat(last_booking['datetime'].replace(' ', 'T'))
            days_since = (datetime.now() - last_date).days
        except:
            days_since = 30 # Default

        if days_since < 7:
            return await generate_ai_response('greeting_recent', language, name=client_name)
        else:
            return await generate_ai_response('retention_reminder', language, name=client_name)

    def suggest_next_booking(self) -> Optional[Dict[str, Any]]:
        """Умное предложение следующей записи"""
        if not self.history:
            return None

        # Анализируем паттерны
        last_booking = self.history[0]
        last_service = last_booking['service']
        last_master = last_booking['master']

        # Если есть предпочтения, используем их
        if self.preferences:
            suggested_service = self.preferences['preferred_service'] or last_service
            suggested_master = self.preferences['preferred_master'] or last_master
            suggested_time = self.preferences['preferred_time_of_day']
        else:
            suggested_service = last_service
            suggested_master = last_master
            suggested_time = self._detect_preferred_time()

        # Вычисляем интервал между визитами
        interval = self._calculate_avg_interval()

        return {
            "service": suggested_service,
            "master": suggested_master,
            "time_of_day": suggested_time,
            "recommended_date": self._suggest_date(interval),
            "confidence": self._calculate_confidence()
        }

    def _detect_preferred_time(self) -> str:
        """Определить предпочтительное время на основе истории"""
        if not self.history:
            return "afternoon"

        morning_count = 0
        afternoon_count = 0
        evening_count = 0

        for booking in self.history:
            try:
                dt = datetime.fromisoformat(booking['datetime'].replace(' ', 'T'))
                hour = dt.hour

                if hour < 12:
                    morning_count += 1
                elif hour < 17:
                    afternoon_count += 1
                else:
                    evening_count += 1
            except:
                continue

        if morning_count >= afternoon_count and morning_count >= evening_count:
            return "morning"
        elif evening_count >= afternoon_count:
            return "evening"
        else:
            return "afternoon"

    def _calculate_avg_interval(self) -> int:
        """Вычислить средний интервал между посещениями (в днях)"""
        if len(self.history) < 2:
            return 30  # По умолчанию месяц

        intervals = []
        for i in range(len(self.history) - 1):
            try:
                date1 = datetime.fromisoformat(self.history[i]['datetime'].replace(' ', 'T'))
                date2 = datetime.fromisoformat(self.history[i + 1]['datetime'].replace(' ', 'T'))
                intervals.append(abs((date1 - date2).days))
            except:
                continue

        if intervals:
            return int(sum(intervals) / len(intervals))
        return 30

    def _suggest_date(self, interval_days: int) -> str:
        """Предложить дату следующего визита"""
        if not self.history:
            return (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d')

        last_date = datetime.fromisoformat(self.history[0]['datetime'].replace(' ', 'T'))
        suggested_date = last_date + timedelta(days=interval_days)

        # Если дата в прошлом, предлагаем ближайший день
        if suggested_date < datetime.now():
            suggested_date = datetime.now() + timedelta(days=1)

        return suggested_date.strftime('%Y-%m-%d')

    def _calculate_confidence(self) -> float:
        """Уровень уверенности в рекомендации (0.0 to 1.0)"""
        confidence = 0.5  # Базовый уровень

        if self.preferences:
            confidence += 0.3

        if len(self.history) >= 3:
            confidence += 0.2

        return min(confidence, 1.0)

    def get_next_visit_recommendation(self) -> Optional[Dict[str, Any]]:
        """Alias for suggest_next_booking() for backward compatibility"""
        return self.suggest_next_booking()

    async def generate_booking_suggestion_message(self, client_name: str) -> str:
        """Сгенерировать сообщение с предложением записи через AI"""
        suggestion = self.suggest_next_booking()
        language = get_client_language(self.client_id)

        if not suggestion:
            return await generate_ai_response('booking_suggestion_general', language, name=client_name)

        service = suggestion['service']
        master = suggestion['master']
        date = suggestion['recommended_date']
        confidence = suggestion['confidence']

        if confidence > 0.5:
            return await generate_ai_response(
                'abandoned_booking', 
                language, 
                name=client_name, 
                service=service, 
                master=master, 
                date=date
            )
        else:
            return await generate_ai_response('booking_suggestion_general', language, name=client_name)

    def save_preferences(self, preferences: Dict) -> bool:
        """Сохранить предпочтения клиента"""
        conn = get_db_connection()
        c = conn.cursor()

        try:
            now = datetime.now().isoformat()

            # Проверяем, есть ли уже запись
            c.execute("SELECT id FROM client_preferences WHERE client_id = %s", (self.client_id,))
            existing = c.fetchone()

            if existing:
                # Обновляем
                c.execute("""
                    UPDATE client_preferences
                    SET preferred_master = %s,
                        preferred_service = %s,
                        preferred_day_of_week = %s,
                        preferred_time_of_day = %s,
                        allergies = %s,
                        special_notes = %s,
                        updated_at = %s
                    WHERE client_id = %s
                """, (
                    preferences.get('preferred_master'),
                    preferences.get('preferred_service'),
                    preferences.get('preferred_day_of_week'),
                    preferences.get('preferred_time_of_day'),
                    preferences.get('allergies'),
                    preferences.get('special_notes'),
                    now,
                    self.client_id
                ))
            else:
                # Создаем новую запись
                c.execute("""
                    INSERT INTO client_preferences
                    (client_id, preferred_master, preferred_service, preferred_day_of_week,
                     preferred_time_of_day, allergies, special_notes, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    self.client_id,
                    preferences.get('preferred_master'),
                    preferences.get('preferred_service'),
                    preferences.get('preferred_day_of_week'),
                    preferences.get('preferred_time_of_day'),
                    preferences.get('allergies'),
                    preferences.get('special_notes'),
                    now,
                    now
                ))

            conn.commit()
            log_info(f"Preferences saved for client {self.client_id}", "smart_assistant")
            return True

        except Exception as e:
            log_error(f"Error saving preferences: {e}", "smart_assistant")
            conn.rollback()
            return False
        finally:
            conn.close()

    def learn_from_booking(self, booking_data: Dict):
        """Обучиться на основе новой записи"""
        # Анализируем паттерны и обновляем предпочтения
        conn = get_db_connection()
        c = conn.cursor()

        try:
            # Если клиент часто выбирает одного мастера - сохраняем как предпочтение
            c.execute("""
                SELECT master, COUNT(*) as count
                FROM bookings
                WHERE instagram_id = %s
                GROUP BY master
                ORDER BY count DESC
                LIMIT 1
            """, (self.client_id,))

            top_master = c.fetchone()

            if top_master and top_master[1] >= 3:  # Если 3+ раза у одного мастера
                c.execute("""
                    INSERT INTO client_interaction_patterns
                    (client_id, interaction_type, pattern_data, confidence_score, last_updated)
                    VALUES (%s, 'preferred_master', %s, %s, %s)
                    ON CONFLICT (client_id, interaction_type) DO UPDATE SET
                    pattern_data = EXCLUDED.pattern_data,
                    confidence_score = EXCLUDED.confidence_score,
                    last_updated = EXCLUDED.last_updated
                """, (
                    self.client_id,
                    json.dumps({"master": top_master[0]}),
                    min(top_master[1] / 10.0, 1.0),  # Confidence растет с количеством
                    datetime.now().isoformat()
                ))

            conn.commit()
            log_info(f"Learned from booking for client {self.client_id}", "smart_assistant")

        except Exception as e:
            log_error(f"Error learning from booking: {e}", "smart_assistant")
            conn.rollback()
        finally:
            conn.close()

async def get_smart_greeting(client_id: str, client_name: str) -> str:
    """Получить умное приветствие для клиента"""
    assistant = SmartAssistant(client_id)
    return await assistant.get_personalized_greeting(client_name)

async def get_smart_suggestion(client_id: str, client_name: str) -> str:
    """Получить умное предложение для клиента"""
    assistant = SmartAssistant(client_id)
    return await assistant.generate_booking_suggestion_message(client_name)
