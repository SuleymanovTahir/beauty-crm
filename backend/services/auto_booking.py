"""
Автозаполнение свободных окон в расписании

Умное заполнение расписания на основе:
- Клиентов, давно не посещавших
- Предпочтений клиентов
- Загрузки мастеров
"""
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from services.master_schedule import MasterScheduleService
from services.smart_assistant import SmartAssistant

class AutoBookingService:
    """Сервис автоматического заполнения окон"""

    def __init__(self):
        self.schedule_service = MasterScheduleService()

    def find_clients_for_slots(
        self,
        date: str,
        master_name: Optional[str] = None,
        min_days_since_visit: int = 21
    ) -> List[Dict]:
        """
        Найти клиентов для заполнения свободных слотов

        Args:
            date: Дата (YYYY-MM-DD)
            master_name: Конкретный мастер (если None - все мастера)
            min_days_since_visit: Минимум дней с последнего визита

        Returns:
            List[Dict]: Список рекомендаций {client_id, master, time, confidence}
        """
        conn = get_db_connection()
        c = conn.cursor()

        try:
            recommendations = []

            # Получаем доступные слоты
            if master_name:
                availability = {master_name: self.schedule_service.get_available_slots(master_name, date)}
            else:
                availability = self.schedule_service.get_all_masters_availability(date)

            # Для каждого мастера
            for master, slots in availability.items():
                if not slots:
                    continue

                # Получаем клиентов, которые давно не были
                c.execute("""
                    SELECT DISTINCT c.instagram_id, c.name, c.phone, MAX(b.datetime) as last_visit
                    FROM clients c
                    LEFT JOIN bookings b ON c.instagram_id = b.instagram_id
                    WHERE b.master = %s OR b.master IS NULL
                    GROUP BY c.instagram_id, c.name, c.phone
                    HAVING MAX(b.datetime) IS NULL OR
                           EXTRACT(EPOCH FROM (NOW() - MAX(b.datetime)))/86400 >= %s
                    ORDER BY MAX(b.datetime) ASC NULLS LAST
                    LIMIT 20
                """, (master, min_days_since_visit))

                potential_clients = c.fetchall()

                # Для каждого клиента вычисляем уверенность
                for client_row in potential_clients:
                    client_id = client_row[0]
                    client_name = client_row[1]
                    last_visit = client_row[3]

                    # Используем SmartAssistant для рекомендаций
                    assistant = SmartAssistant(client_id)
                    suggestion = assistant.suggest_next_booking()

                    if not suggestion:
                        continue

                    # Проверяем, подходит ли мастер
                    if suggestion['master'] and suggestion['master'] != master:
                        continue

                    # Проверяем, подходит ли дата
                    recommended_date = suggestion['recommended_date']
                    date_diff = abs((datetime.strptime(date, '%Y-%m-%d') - datetime.strptime(recommended_date, '%Y-%m-%d')).days)

                    if date_diff > 7:  # Если больше недели разницы - уверенность снижается
                        suggestion['confidence'] *= 0.7

                    # Подбираем оптимальное время из доступных слотов
                    preferred_time = suggestion.get('time_of_day', 'afternoon')
                    best_slot = self._find_best_slot(slots, preferred_time)

                    if best_slot:
                        recommendations.append({
                            "client_id": client_id,
                            "client_name": client_name,
                            "master": master,
                            "date": date,
                            "time": best_slot,
                            "service": suggestion['service'],
                            "confidence": suggestion['confidence'],
                            "reason": self._get_recommendation_reason(last_visit, suggestion)
                        })

            # Сортируем по уверенности
            recommendations.sort(key=lambda x: x['confidence'], reverse=True)

            return recommendations

        except Exception as e:
            log_error(f"Error finding clients for slots: {e}", "auto_booking")
            return []
        finally:
            conn.close()

    def _find_best_slot(self, available_slots: List[str], preferred_time: str) -> Optional[str]:
        """Найти лучший слот из доступных"""
        if not available_slots:
            return None

        # Разделяем слоты по времени дня
        morning = []  # 00:00-12:00
        afternoon = []  # 12:00-17:00
        evening = []  # 17:00-23:59

        for slot in available_slots:
            hour = int(slot.split(':')[0])
            if hour < 12:
                morning.append(slot)
            elif hour < 17:
                afternoon.append(slot)
            else:
                evening.append(slot)

        # Выбираем слот в соответствии с предпочтением
        if preferred_time == 'morning' and morning:
            return morning[0]
        elif preferred_time == 'afternoon' and afternoon:
            return afternoon[0]
        elif preferred_time == 'evening' and evening:
            return evening[0]

        # Если нет в предпочитаемое время, берем первый доступный
        return available_slots[0]

    def _get_recommendation_reason(self, last_visit: Optional[str], suggestion: Dict) -> str:
        """Сформировать текст причины рекомендации"""
        if not last_visit:
            return "Новый клиент - ни разу не был"

        last_date = datetime.fromisoformat(last_visit.replace(' ', 'T'))
        days_ago = (datetime.now() - last_date).days

        reasons = []

        if days_ago > 60:
            reasons.append(f"Не был {days_ago} дней")
        elif days_ago > 30:
            reasons.append(f"Последний визит {days_ago} дней назад")

        if suggestion['confidence'] > 0.8:
            reasons.append(f"Высокая вероятность записи на {suggestion['service']}")

        return " • ".join(reasons) if reasons else "Подходящий клиент"

    def get_underutilized_slots(
        self,
        date_start: str,
        date_end: str
    ) -> Dict[str, Any]:
        """
        Найти недогруженные слоты в диапазоне дат

        Args:
            date_start: Начальная дата (YYYY-MM-DD)
            date_end: Конечная дата (YYYY-MM-DD)

        Returns:
            Dict со статистикой по загрузке
        """
        conn = get_db_connection()
        c = conn.cursor()

        try:
            result = {}

            # Для каждого дня в диапазоне
            current_date = datetime.strptime(date_start, '%Y-%m-%d')
            end_date = datetime.strptime(date_end, '%Y-%m-%d')

            while current_date <= end_date:
                date_str = current_date.strftime('%Y-%m-%d')

                # Получаем всех мастеров с доступными слотами
                availability = self.schedule_service.get_all_masters_availability(date_str)

                # Для каждого мастера
                for master, slots in availability.items():
                    if master not in result:
                        result[master] = {
                            "total_available_slots": 0,
                            "dates_with_availability": []
                        }

                    if slots:
                        result[master]["total_available_slots"] += len(slots)
                        result[master]["dates_with_availability"].append({
                            "date": date_str,
                            "available_slots": len(slots),
                            "slots": slots
                        })

                current_date += timedelta(days=1)

            return result

        except Exception as e:
            log_error(f"Error getting underutilized slots: {e}", "auto_booking")
            return {}
        finally:
            conn.close()

    def auto_suggest_bookings(
        self,
        date: str,
        max_suggestions: int = 10
    ) -> List[Dict]:
        """
        Автоматически предложить записи на день

        Args:
            date: Дата (YYYY-MM-DD)
            max_suggestions: Максимум предложений

        Returns:
            List[Dict]: Список предложений для записи
        """
        try:
            # Находим клиентов для слотов
            recommendations = self.find_clients_for_slots(date)

            # Ограничиваем количество
            return recommendations[:max_suggestions]

        except Exception as e:
            log_error(f"Error auto-suggesting bookings: {e}", "auto_booking")
            return []
