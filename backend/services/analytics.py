"""
Сервис аналитики и KPI

Вычисляет метрики для Dashboard
"""
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


class AnalyticsService:
    """Сервис для вычисления метрик и аналитики"""

    def __init__(self):
        self.conn = sqlite3.connect(DATABASE_NAME)
        self.c = self.conn.cursor()

    def __del__(self):
        """Закрыть соединение при уничтожении объекта"""
        if hasattr(self, 'conn'):
            self.conn.close()

    def get_dashboard_kpi(
        self,
        period: str = "month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Получить все KPI для Dashboard

        Args:
            period: 'today', 'week', 'month', 'year', 'custom'
            start_date: Начальная дата (для custom)
            end_date: Конечная дата (для custom)

        Returns:
            Dict с KPI метриками
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
                # По умолчанию месяц
                date_start = (now - timedelta(days=30)).strftime('%Y-%m-%d 00:00:00')
                date_end = now.strftime('%Y-%m-%d 23:59:59')

        try:
            return {
                "period": {
                    "type": period,
                    "start": date_start,
                    "end": date_end
                },
                "revenue": self._get_revenue_metrics(date_start, date_end),
                "bookings": self._get_booking_metrics(date_start, date_end),
                "clients": self._get_client_metrics(date_start, date_end),
                "masters": self._get_master_metrics(date_start, date_end),
                "services": self._get_service_metrics(date_start, date_end),
                "trends": self._get_trends(date_start, date_end)
            }
        except Exception as e:
            log_error(f"Error getting dashboard KPI: {e}", "analytics")
            return {}

    def _get_revenue_metrics(self, start_date: str, end_date: str) -> Dict:
        """Метрики по выручке"""
        # Общая выручка за период
        self.c.execute("""
            SELECT COALESCE(SUM(revenue), 0)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND status != 'cancelled'
        """, (start_date, end_date))
        total_revenue = self.c.fetchone()[0]

        # Выручка по дням (для графика)
        self.c.execute("""
            SELECT DATE(datetime) as date, COALESCE(SUM(revenue), 0) as daily_revenue
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND status != 'cancelled'
            GROUP BY DATE(datetime)
            ORDER BY date
        """, (start_date, end_date))
        daily_revenue = [{"date": row[0], "revenue": row[1]} for row in self.c.fetchall()]

        # Средний чек
        self.c.execute("""
            SELECT COALESCE(AVG(revenue), 0)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND status != 'cancelled'
            AND revenue > 0
        """, (start_date, end_date))
        avg_check = round(self.c.fetchone()[0], 2)

        # Прогноз на следующий период (простой - на основе среднего)
        forecast = round(total_revenue * 1.1, 2)  # +10% оптимистичный прогноз

        return {
            "total": round(total_revenue, 2),
            "daily": daily_revenue,
            "average_check": avg_check,
            "forecast_next_period": forecast
        }

    def _get_booking_metrics(self, start_date: str, end_date: str) -> Dict:
        """Метрики по записям"""
        # Общее количество записей
        self.c.execute("""
            SELECT COUNT(*)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
        """, (start_date, end_date))
        total_bookings = self.c.fetchone()[0]

        # Завершенные записи
        self.c.execute("""
            SELECT COUNT(*)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND status = 'completed'
        """, (start_date, end_date))
        completed = self.c.fetchone()[0]

        # Отмененные записи
        self.c.execute("""
            SELECT COUNT(*)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND status = 'cancelled'
        """, (start_date, end_date))
        cancelled = self.c.fetchone()[0]

        # No-show (не пришли)
        self.c.execute("""
            SELECT COUNT(*)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND status = 'no_show'
        """, (start_date, end_date))
        no_show = self.c.fetchone()[0]

        # Процент отмен
        cancellation_rate = round((cancelled / total_bookings * 100) if total_bookings > 0 else 0, 2)

        # Процент no-show
        no_show_rate = round((no_show / total_bookings * 100) if total_bookings > 0 else 0, 2)

        # Conversion rate (завершенные / всего)
        completion_rate = round((completed / total_bookings * 100) if total_bookings > 0 else 0, 2)

        return {
            "total": total_bookings,
            "completed": completed,
            "cancelled": cancelled,
            "no_show": no_show,
            "cancellation_rate": cancellation_rate,
            "no_show_rate": no_show_rate,
            "completion_rate": completion_rate
        }

    def _get_client_metrics(self, start_date: str, end_date: str) -> Dict:
        """Метрики по клиентам"""
        # Новые клиенты за период
        self.c.execute("""
            SELECT COUNT(DISTINCT instagram_id)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND instagram_id IN (
                SELECT instagram_id
                FROM clients
                WHERE first_contact BETWEEN ? AND ?
            )
        """, (start_date, end_date, start_date, end_date))
        new_clients = self.c.fetchone()[0]

        # Возвращающиеся клиенты (2+ записей)
        self.c.execute("""
            SELECT COUNT(DISTINCT instagram_id)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND instagram_id IN (
                SELECT instagram_id
                FROM bookings
                GROUP BY instagram_id
                HAVING COUNT(*) >= 2
            )
        """, (start_date, end_date))
        returning_clients = self.c.fetchone()[0]

        # Всего активных клиентов за период
        self.c.execute("""
            SELECT COUNT(DISTINCT instagram_id)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
        """, (start_date, end_date))
        total_active = self.c.fetchone()[0]

        # Retention rate (возвращающиеся / всего)
        retention_rate = round((returning_clients / total_active * 100) if total_active > 0 else 0, 2)

        # Средний LTV клиента
        self.c.execute("""
            SELECT COALESCE(AVG(total_revenue), 0)
            FROM (
                SELECT instagram_id, SUM(revenue) as total_revenue
                FROM bookings
                WHERE status != 'cancelled'
                GROUP BY instagram_id
            )
        """)
        avg_ltv = round(self.c.fetchone()[0], 2)

        return {
            "new": new_clients,
            "returning": returning_clients,
            "total_active": total_active,
            "retention_rate": retention_rate,
            "average_ltv": avg_ltv
        }

    def _get_master_metrics(self, start_date: str, end_date: str) -> Dict:
        """Метрики по мастерам"""
        # Топ-5 мастеров по выручке
        self.c.execute("""
            SELECT master, COUNT(*) as bookings_count, COALESCE(SUM(revenue), 0) as revenue
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
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

        # Средняя загрузка мастеров (записей на мастера)
        self.c.execute("""
            SELECT COUNT(DISTINCT master)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND master IS NOT NULL
            AND master != ''
        """, (start_date, end_date))
        active_masters = self.c.fetchone()[0]

        self.c.execute("""
            SELECT COUNT(*)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND master IS NOT NULL
            AND master != ''
        """, (start_date, end_date))
        total_bookings = self.c.fetchone()[0]

        avg_bookings_per_master = round(total_bookings / active_masters if active_masters > 0 else 0, 2)

        return {
            "top_masters": top_masters,
            "active_masters": active_masters,
            "avg_bookings_per_master": avg_bookings_per_master
        }

    def _get_service_metrics(self, start_date: str, end_date: str) -> Dict:
        """Метрики по услугам"""
        # Топ-5 услуг по популярности
        self.c.execute("""
            SELECT service_name, COUNT(*) as bookings_count, COALESCE(SUM(revenue), 0) as revenue
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND status != 'cancelled'
            GROUP BY service_name
            ORDER BY bookings_count DESC
            LIMIT 5
        """, (start_date, end_date))

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

    def _get_trends(self, start_date: str, end_date: str) -> Dict:
        """Тренды и сравнение с предыдущим периодом"""
        # Вычисляем длину периода
        start = datetime.fromisoformat(start_date.replace(' ', 'T'))
        end = datetime.fromisoformat(end_date.replace(' ', 'T'))
        period_length = (end - start).days

        # Предыдущий период
        prev_end = start - timedelta(seconds=1)
        prev_start = prev_end - timedelta(days=period_length)

        # Выручка текущего периода
        self.c.execute("""
            SELECT COALESCE(SUM(revenue), 0)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND status != 'cancelled'
        """, (start_date, end_date))
        current_revenue = self.c.fetchone()[0]

        # Выручка предыдущего периода
        self.c.execute("""
            SELECT COALESCE(SUM(revenue), 0)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
            AND status != 'cancelled'
        """, (prev_start.isoformat(), prev_end.isoformat()))
        prev_revenue = self.c.fetchone()[0]

        # Процент изменения выручки
        revenue_change = round(
            ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0,
            2
        )

        # Записи текущего периода
        self.c.execute("""
            SELECT COUNT(*)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
        """, (start_date, end_date))
        current_bookings = self.c.fetchone()[0]

        # Записи предыдущего периода
        self.c.execute("""
            SELECT COUNT(*)
            FROM bookings
            WHERE datetime BETWEEN ? AND ?
        """, (prev_start.isoformat(), prev_end.isoformat()))
        prev_bookings = self.c.fetchone()[0]

        # Процент изменения записей
        bookings_change = round(
            ((current_bookings - prev_bookings) / prev_bookings * 100) if prev_bookings > 0 else 0,
            2
        )

        return {
            "revenue_change_percent": revenue_change,
            "bookings_change_percent": bookings_change,
            "current_period": {
                "revenue": round(current_revenue, 2),
                "bookings": current_bookings
            },
            "previous_period": {
                "revenue": round(prev_revenue, 2),
                "bookings": prev_bookings
            }
        }

    def get_master_schedule_stats(self, master_name: str, date: str) -> Dict:
        """Статистика расписания мастера на день"""
        start_datetime = f"{date} 00:00:00"
        end_datetime = f"{date} 23:59:59"

        # Количество записей
        self.c.execute("""
            SELECT COUNT(*)
            FROM bookings
            WHERE master = ?
            AND datetime BETWEEN ? AND ?
        """, (master_name, start_datetime, end_datetime))
        bookings_count = self.c.fetchone()[0]

        # Выручка за день
        self.c.execute("""
            SELECT COALESCE(SUM(revenue), 0)
            FROM bookings
            WHERE master = ?
            AND datetime BETWEEN ? AND ?
            AND status != 'cancelled'
        """, (master_name, start_datetime, end_datetime))
        daily_revenue = self.c.fetchone()[0]

        return {
            "date": date,
            "master": master_name,
            "bookings_count": bookings_count,
            "revenue": round(daily_revenue, 2)
        }
