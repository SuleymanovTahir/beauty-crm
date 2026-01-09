"""
Сервис аналитики и KPI

Вычисляет метрики для Dashboard
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.logger import log_info, log_error

class AnalyticsService:
    """Сервис для вычисления метрик и аналитики"""

    def __init__(self):
        self.conn = get_db_connection()
        self.c = self.conn.cursor()

    def __del__(self):
        """Закрыть соединение при уничтожении объекта"""
        if hasattr(self, 'conn'):
            self.conn.close()

    def get_dashboard_kpi(
        self,
        period: str = "month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        master_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Получить все KPI для Dashboard
        
        Args:
            period: 'today', 'week', 'month', 'year', 'custom'
            start_date: Начальная дата (для custom)
            end_date: Конечная дата (для custom)
            master_filter: Фильтр по имени мастера (для личного дашборда)
        """
        # Вычисляем период
        if period == "custom" and start_date and end_date:
            date_start = start_date
            date_end = end_date
        else:
            now = datetime.now()
            if period == "today":
                date_start = now.strftime('%Y-%m-%d 00:00:00')
                date_end = now.strftime('%Y-%m-%d 23:59:59')
            elif period == "week":
                date_start = (now - timedelta(days=7)).strftime('%Y-%m-%d 00:00:00')
                date_end = now.strftime('%Y-%m-%d 23:59:59')
            elif period == "month":
                date_start = (now - timedelta(days=30)).strftime('%Y-%m-%d 00:00:00')
                date_end = now.strftime('%Y-%m-%d 23:59:59')
            elif period == "year":
                date_start = (now - timedelta(days=365)).strftime('%Y-%m-%d 00:00:00')
                date_end = now.strftime('%Y-%m-%d 23:59:59')
            else:
                date_start = (now - timedelta(days=30)).strftime('%Y-%m-%d 00:00:00')
                date_end = now.strftime('%Y-%m-%d 23:59:59')

        try:
            return {
                "period": {
                    "type": period,
                    "start": date_start,
                    "end": date_end
                },
                "revenue": self._get_revenue_metrics(date_start, date_end, master_filter),
                "bookings": self._get_booking_metrics(date_start, date_end, master_filter),
                "clients": self._get_client_metrics(date_start, date_end, master_filter),
                "masters": self._get_master_metrics(date_start, date_end, master_filter),
                "services": self._get_service_metrics(date_start, date_end, master_filter),
                "peak_hours": self._get_peak_hours(date_start, date_end, master_filter),
                "trends": self._get_trends(date_start, date_end, master_filter)
            }
        except Exception as e:
            log_error(f"Error getting dashboard KPI: {e}", "analytics")
            return {}

    def _get_revenue_metrics(self, start_date: str, end_date: str, master: Optional[str] = None) -> Dict:
        """Метрики по выручке"""
        params = [start_date, end_date]
        master_clause = ""
        if master:
            master_clause = " AND master = %s"
            params.append(master)

        # Общая выручка за период
        self.c.execute(f"""
            SELECT COALESCE(SUM(revenue), 0)
            FROM bookings
            WHERE datetime BETWEEN %s AND %s
            AND status != 'cancelled'
            {master_clause}
        """, tuple(params))
        total_revenue = self.c.fetchone()[0]

        # Выручка по дням
        self.c.execute(f"""
            SELECT DATE(datetime) as date, COALESCE(SUM(revenue), 0) as daily_revenue
            FROM bookings
            WHERE datetime BETWEEN %s AND %s
            AND status != 'cancelled'
            {master_clause}
            GROUP BY DATE(datetime)
            ORDER BY date
        """, tuple(params))
        daily_revenue = [{"date": row[0], "revenue": row[1]} for row in self.c.fetchall()]

        # Средний чек
        self.c.execute(f"""
            SELECT COALESCE(AVG(revenue), 0)
            FROM bookings
            WHERE datetime BETWEEN %s AND %s
            AND status != 'cancelled'
            AND revenue > 0
            {master_clause}
        """, tuple(params))
        avg_check = round(self.c.fetchone()[0] or 0, 2)

        return {
            "total": round(total_revenue, 2),
            "daily": daily_revenue,
            "average_check": avg_check
        }

    def _get_booking_metrics(self, start_date: str, end_date: str, master: Optional[str] = None) -> Dict:
        """Метрики по записям"""
        params = [start_date, end_date]
        master_clause = ""
        if master:
            master_clause = " AND master = %s"
            params.append(master)

        # Общее количество записей
        self.c.execute(f"""
            SELECT COUNT(*) FROM bookings
            WHERE datetime BETWEEN %s AND %s
            {master_clause}
        """, tuple(params))
        total_bookings = self.c.fetchone()[0]

        # Статусы
        self.c.execute(f"""
            SELECT status, COUNT(*) 
            FROM bookings
            WHERE datetime BETWEEN %s AND %s
            {master_clause}
            GROUP BY status
        """, tuple(params))
        status_counts = dict(self.c.fetchall())
        
        completed = status_counts.get('completed', 0)
        cancelled = status_counts.get('cancelled', 0)
        no_show = status_counts.get('no_show', 0)

        return {
            "total": total_bookings,
            "completed": completed,
            "cancelled": cancelled,
            "no_show": no_show,
            "cancellation_rate": round((cancelled / total_bookings * 100) if total_bookings > 0 else 0, 2),
            "completion_rate": round((completed / total_bookings * 100) if total_bookings > 0 else 0, 2)
        }

    def _get_client_metrics(self, start_date: str, end_date: str, master: Optional[str] = None) -> Dict:
        """Метрики по клиентам"""
        params = [start_date, end_date]
        master_clause = ""
        if master:
            master_clause = " AND master = %s"
            params.append(master)

        # Новые клиенты за период
        self.c.execute(f"""
            SELECT COUNT(DISTINCT instagram_id)
            FROM bookings
            WHERE datetime BETWEEN %s AND %s
            AND instagram_id IN (
                SELECT instagram_id
                FROM clients
                WHERE first_contact BETWEEN %s AND %s
            )
            {master_clause}
        """, tuple(params + [start_date, end_date]))
        new_clients = self.c.fetchone()[0]

        # Возвращающиеся клиенты
        self.c.execute(f"""
            SELECT COUNT(DISTINCT instagram_id)
            FROM bookings
            WHERE datetime BETWEEN %s AND %s
            AND instagram_id IN (
                SELECT instagram_id
                FROM bookings
                GROUP BY instagram_id
                HAVING COUNT(*) >= 2
            )
            {master_clause}
        """, tuple(params))
        returning_clients = self.c.fetchone()[0]

        # Всего активных
        self.c.execute(f"""
            SELECT COUNT(DISTINCT instagram_id)
            FROM bookings
            WHERE datetime BETWEEN %s AND %s
            {master_clause}
        """, tuple(params))
        total_active = self.c.fetchone()[0] or 0

        retention_rate = round((returning_clients / total_active * 100) if total_active > 0 else 0, 2)

        return {
            "new": new_clients,
            "returning": returning_clients,
            "total_active": total_active,
            "retention": retention_rate
        }

    def _get_master_metrics(self, start_date: str, end_date: str, master: Optional[str] = None) -> Dict:
        """Метрики по мастерам"""
        if master:
            # Для конкретного мастера аналитика по другим мастерам не нужна
            return {"top_masters": [], "active_masters": 1, "avg_bookings_per_master": 0}

        # Топ-5 мастеров по выручке
        self.c.execute("""
            SELECT master, COUNT(*) as bookings_count, COALESCE(SUM(revenue), 0) as revenue
            FROM bookings
            WHERE datetime BETWEEN %s AND %s
            AND status != 'cancelled'
            AND master IS NOT NULL
            AND master != ''
            GROUP BY master
            ORDER BY revenue DESC
            LIMIT 5
        """, (start_date, end_date))

        top_masters = [
            {
                "name": row[0],
                "bookings": row[1],
                "revenue": round(row[2], 2)
            }
            for row in self.c.fetchall()
        ]

        # Средняя загрузка
        self.c.execute("""
            SELECT COUNT(DISTINCT master)
            FROM bookings
            WHERE datetime BETWEEN %s AND %s
            AND master IS NOT NULL
            AND master != ''
        """, (start_date, end_date))
        active_masters = self.c.fetchone()[0] or 0

        self.c.execute("""
            SELECT COUNT(*)
            FROM bookings
            WHERE datetime BETWEEN %s AND %s
            AND master IS NOT NULL
            AND master != ''
        """, (start_date, end_date))
        total_bookings = self.c.fetchone()[0] or 0

        avg_bookings_per_master = round(total_bookings / active_masters if active_masters > 0 else 0, 2)

        return {
            "top_masters": top_masters,
            "active_masters": active_masters,
            "avg_bookings_per_master": avg_bookings_per_master
        }

    def _get_service_metrics(self, start_date: str, end_date: str, master: Optional[str] = None) -> Dict:
        """Метрики по услугам"""
        params = [start_date, end_date]
        master_clause = ""
        if master:
            master_clause = " AND master = %s"
            params.append(master)

        self.c.execute(f"""
            SELECT service_name, COUNT(*) as bookings_count, COALESCE(SUM(revenue), 0) as revenue
            FROM bookings
            WHERE datetime BETWEEN %s AND %s
            AND status != 'cancelled'
            {master_clause}
            GROUP BY service_name
            ORDER BY bookings_count DESC
            LIMIT 5
        """, tuple(params))

        top_services = [
            {
                "name": row[0],
                "bookings": row[1],
                "revenue": round(row[2], 2)
            }
            for row in self.c.fetchall()
        ]

        return {
            "top_services": top_services
        }

    def _get_peak_hours(self, start_date: str, end_date: str, master: Optional[str] = None) -> List[Dict]:
        """Пиковые часы посещаемости"""
        params = [start_date, end_date]
        master_clause = ""
        if master:
            master_clause = " AND master = %s"
            params.append(master)

        self.c.execute(f"""
            SELECT EXTRACT(HOUR FROM datetime::timestamp) as hour, COUNT(*) as count 
            FROM bookings 
            WHERE datetime BETWEEN %s AND %s
            AND status != 'cancelled'
            {master_clause}
            GROUP BY hour 
            ORDER BY count DESC 
            LIMIT 5
        """, tuple(params))
        
        return [
            {"hour": f"{int(row[0])}:00", "count": row[1]} 
            for row in self.c.fetchall()
        ]

    def _get_trends(self, start_date: str, end_date: str, master: Optional[str] = None) -> Dict:
        """Тренды и сравнение с предыдущим периодом"""
        start = datetime.fromisoformat(start_date.replace(' ', 'T'))
        end = datetime.fromisoformat(end_date.replace(' ', 'T'))
        period_length = (end - start).days

        prev_end = start - timedelta(seconds=1)
        prev_start = prev_end - timedelta(days=period_length)

        master_clause = " AND master = %s" if master else ""
        
        # Current revenue
        params_curr = [start_date, end_date]
        if master: params_curr.append(master)
        self.c.execute(f"SELECT COALESCE(SUM(revenue), 0) FROM bookings WHERE datetime BETWEEN %s AND %s AND status != 'cancelled' {master_clause}", tuple(params_curr))
        current_revenue = self.c.fetchone()[0] or 0

        # Previous revenue
        params_prev = [prev_start.isoformat(), prev_end.isoformat()]
        if master: params_prev.append(master)
        self.c.execute(f"SELECT COALESCE(SUM(revenue), 0) FROM bookings WHERE datetime BETWEEN %s AND %s AND status != 'cancelled' {master_clause}", tuple(params_prev))
        prev_revenue = self.c.fetchone()[0] or 0

        # Bookings
        self.c.execute(f"SELECT COUNT(*) FROM bookings WHERE datetime BETWEEN %s AND %s {master_clause}", tuple(params_curr))
        current_bookings = self.c.fetchone()[0] or 0

        self.c.execute(f"SELECT COUNT(*) FROM bookings WHERE datetime BETWEEN %s AND %s {master_clause}", tuple(params_prev))
        prev_bookings = self.c.fetchone()[0] or 0

        revenue_change = round(((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0, 2)
        bookings_change = round(((current_bookings - prev_bookings) / prev_bookings * 100) if prev_bookings > 0 else 0, 2)

        return {
            "revenue_change_percent": revenue_change,
            "bookings_change_percent": bookings_change,
            "current_period": {"revenue": round(current_revenue, 2), "bookings": current_bookings},
            "previous_period": {"revenue": round(prev_revenue, 2), "bookings": prev_bookings}
        }

    def get_master_schedule_stats(self, master_name: str, date: str) -> Dict:
        """Статистика расписания мастера на день"""
        start_datetime = f"{date} 00:00:00"
        end_datetime = f"{date} 23:59:59"

        # Количество записей
        self.c.execute("""
            SELECT COUNT(*)
            FROM bookings
            WHERE master = %s
            AND datetime BETWEEN %s AND %s
        """, (master_name, start_datetime, end_datetime))
        bookings_count = self.c.fetchone()[0]

        # Выручка за день
        self.c.execute("""
            SELECT COALESCE(SUM(revenue), 0)
            FROM bookings
            WHERE master = %s
            AND datetime BETWEEN %s AND %s
            AND status != 'cancelled'
        """, (master_name, start_datetime, end_datetime))
        daily_revenue = self.c.fetchone()[0]

        return {
            "date": date,
            "master": master_name,
            "bookings_count": bookings_count,
            "revenue": round(daily_revenue, 2)
        }

    def get_employee_dashboard_stats(self, user_id: int) -> Dict[str, Any]:
        """
        Получить статистику для дашборда сотрудника:
        - Рейтинг
        - Расчетный доход за текущий месяц (оклад + %)
        """
        try:
            # 1. Рейтинг из public_reviews
            # Check if table exists first? Assuming schema is migrated.
            # Use avg(rating)
            try:
                self.c.execute("""
                    SELECT COALESCE(AVG(rating), 0)
                    FROM public_reviews
                    WHERE employee_id = %s
                """, (user_id,))
                row = self.c.fetchone()
                rating = round(row[0] or 0, 1) if row else 0
            except:
                # Fallback if table doesn't exist or error
                rating = 0

            # Если рейтинга нет (0), вернем 5.0 как дефолт для новичков
            if rating == 0:
                rating = 5.0

            # 2. Настройки зарплаты (оклад, процент)
            self.c.execute("""
                SELECT base_salary, commission_rate, full_name
                FROM users 
                WHERE id = %s
            """, (user_id,))
            user_row = self.c.fetchone()
            
            if not user_row:
                return {}

            base_salary = float(user_row[0]) if user_row[0] else 0.0
            commission_rate = float(user_row[1]) if user_row[1] else 0.0
            full_name = user_row[2]

            # 3. Выручка за текущий месяц (completed bookings)
            now = datetime.now()
            start_month = now.strftime('%Y-%m-01 00:00:00')
            
            self.c.execute("""
                SELECT COALESCE(SUM(revenue), 0)
                FROM bookings
                WHERE master = %s
                AND status = 'completed'
                AND datetime >= %s
            """, (full_name, start_month))
            
            month_revenue = float(self.c.fetchone()[0] or 0.0)
            
            # 4. Расчет дохода
            commission_income = (month_revenue * commission_rate) / 100
            total_income = base_salary + commission_income
            
            return {
                "rating": rating,
                "income_month": round(total_income, 2),
                "month_revenue": round(month_revenue, 2),
                "base_salary": base_salary,
                "commission_rate": commission_rate
            }
            
        except Exception as e:
            log_error(f"Error calculating employee stats: {e}", "analytics")
            return {
                "rating": 5.0,
                "income_month": 0.0,
                "month_revenue": 0.0,
                "base_salary": 0.0,
                "commission_rate": 0.0
            }
