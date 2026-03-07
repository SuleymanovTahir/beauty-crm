"""
Функции для аналитики
"""

from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, Optional, Set, List, Tuple, Any
import math
import random

from db.connection import get_db_connection
from utils.datetime_utils import get_current_time
import psycopg2

def get_stats(comparison_period: str = "7days"):
    """
    Получить общую статистику с индикаторами роста
    
    Args:
        comparison_period: Период сравнения ('7days', '30days', 'month', 'week')
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    # Определяем период сравнения
    if comparison_period == "today":
        days = 1
        context = "за сегодня"
    elif comparison_period == "yesterday":
        days = 1
        context = "за вчера"
    elif comparison_period == "7days":
        days = 7
        context = "за последние 7 дней"
    elif comparison_period == "30days":
        days = 30
        context = "за последние 30 дней"
    elif comparison_period == "month" or comparison_period == "thisMonth":
        days = 30
        context = "за этот месяц"
    elif comparison_period == "lastMonth":
        days = 30
        context = "за прошлый месяц"
    elif comparison_period == "week":
        days = 7
        context = "за неделю"
    else:
        days = 7
        context = "за последние 7 дней"
    
    # Текущая дата и дата начала периода
    current_date = get_current_time()
    period_start = (current_date - timedelta(days=days)).isoformat()
    previous_period_start = (current_date - timedelta(days=days * 2)).isoformat()
    previous_period_end = period_start
    
    # === ТЕКУЩИЙ ПЕРИОД ===
    # Count unique clients who made bookings (not all clients in database)
    c.execute("SELECT COUNT(DISTINCT instagram_id) FROM bookings WHERE instagram_id IS NOT NULL")
    total_clients = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings")
    total_bookings = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings WHERE status='completed'")
    completed_bookings = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings WHERE status='pending'")
    pending_bookings = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM chat_history WHERE sender='client'")
    total_client_messages = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM chat_history WHERE sender='bot'")
    total_bot_messages = c.fetchone()[0]
    
    try:
        c.execute("SELECT SUM(revenue) FROM bookings WHERE status='completed'")
        total_revenue = c.fetchone()[0] or 0
    except psycopg2.OperationalError:
        total_revenue = 0
    
    try:
        # New clients: unique clients who made their first booking in the current period
        c.execute("""
            SELECT COUNT(DISTINCT instagram_id)
            FROM bookings
            WHERE created_at >= %s
            AND instagram_id NOT IN (
                SELECT DISTINCT instagram_id
                FROM bookings
                WHERE created_at < %s AND instagram_id IS NOT NULL
            )
        """, (period_start, period_start))
        new_clients = c.fetchone()[0]

        # Leads, customers, VIP from clients table (for those who made bookings)
        c.execute("""
            SELECT COUNT(DISTINCT c.instagram_id)
            FROM clients c
            INNER JOIN bookings b ON c.instagram_id = b.instagram_id
            WHERE c.status='lead'
        """)
        leads = c.fetchone()[0]

        c.execute("""
            SELECT COUNT(DISTINCT c.instagram_id)
            FROM clients c
            INNER JOIN bookings b ON c.instagram_id = b.instagram_id
            WHERE c.status='customer'
        """)
        customers = c.fetchone()[0]

        c.execute("""
            SELECT COUNT(DISTINCT c.instagram_id)
            FROM clients c
            INNER JOIN bookings b ON c.instagram_id = b.instagram_id
            WHERE c.status='vip'
        """)
        vip_clients = c.fetchone()[0]

        # Active clients: made a booking in the last 30 days
        active_threshold = (get_current_time() - timedelta(days=30)).isoformat()
        c.execute("SELECT COUNT(DISTINCT instagram_id) FROM bookings WHERE created_at >= %s", (active_threshold,))
        active_clients = c.fetchone()[0]

    except psycopg2.OperationalError:
        new_clients = total_clients
        leads = 0
        customers = 0
        vip_clients = 0
        active_clients = 0
    
    # === ПРЕДЫДУЩИЙ ПЕРИОД (для сравнения) ===
    # Prev new clients: unique clients who made their first booking in previous period
    c.execute("""
        SELECT COUNT(DISTINCT instagram_id)
        FROM bookings
        WHERE created_at >= %s AND created_at < %s
        AND instagram_id NOT IN (
            SELECT DISTINCT instagram_id
            FROM bookings
            WHERE created_at < %s AND instagram_id IS NOT NULL
        )
    """, (previous_period_start, previous_period_end, previous_period_start))
    prev_new_clients = c.fetchone()[0]

    # Prev VIP clients who made bookings
    c.execute("""
        SELECT COUNT(DISTINCT c.instagram_id)
        FROM clients c
        INNER JOIN bookings b ON c.instagram_id = b.instagram_id
        WHERE c.status='vip' AND b.created_at >= %s AND b.created_at < %s
    """, (previous_period_start, previous_period_end))
    prev_vip_clients = c.fetchone()[0]

    # Previous total clients (unique clients who made bookings before current period)
    c.execute("SELECT COUNT(DISTINCT instagram_id) FROM bookings WHERE created_at < %s AND instagram_id IS NOT NULL", (period_start,))
    prev_total_clients = c.fetchone()[0]

    # Prev active clients (bookings in previous window)
    prev_active_threshold_start = (get_current_time() - timedelta(days=60)).isoformat()
    prev_active_threshold_end = (get_current_time() - timedelta(days=30)).isoformat()
    c.execute("SELECT COUNT(DISTINCT instagram_id) FROM bookings WHERE created_at >= %s AND created_at < %s",
              (prev_active_threshold_start, prev_active_threshold_end))
    prev_active_clients = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM bookings 
        WHERE created_at >= %s AND created_at < %s
    """, (previous_period_start, previous_period_end))
    prev_bookings = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM bookings 
        WHERE status='completed' AND created_at >= %s AND created_at < %s
    """, (previous_period_start, previous_period_end))
    prev_completed = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM bookings
        WHERE status='pending'
        AND created_at >= %s AND created_at < %s
    """, (previous_period_start, previous_period_end))
    prev_pending = c.fetchone()[0]
    
    try:
        c.execute("""
            SELECT SUM(revenue) FROM bookings
            WHERE status='completed' AND created_at >= %s AND created_at < %s
        """, (previous_period_start, previous_period_end))
        prev_revenue = c.fetchone()[0] or 0

        # Average booking value for previous period
        c.execute("""
            SELECT COALESCE(AVG(revenue), 0)
            FROM bookings
            WHERE status='completed' AND created_at >= %s AND created_at < %s AND revenue > 0
        """, (previous_period_start, previous_period_end))
        prev_avg_booking_value = c.fetchone()[0]
    except psycopg2.OperationalError:
        prev_revenue = 0
        prev_avg_booking_value = 0
    
    # === ТЕКУЩИЙ ПЕРИОД (новые данные) ===
    # Current new clients: unique clients who made their first booking in current period
    c.execute("""
        SELECT COUNT(DISTINCT instagram_id)
        FROM bookings
        WHERE created_at >= %s
        AND instagram_id NOT IN (
            SELECT DISTINCT instagram_id
            FROM bookings
            WHERE created_at < %s AND instagram_id IS NOT NULL
        )
    """, (period_start, period_start))
    current_new_clients = c.fetchone()[0]

    # Current VIP clients who made bookings in current period
    c.execute("""
        SELECT COUNT(DISTINCT c.instagram_id)
        FROM clients c
        INNER JOIN bookings b ON c.instagram_id = b.instagram_id
        WHERE c.status='vip' AND b.created_at >= %s
    """, (period_start,))
    current_vip_clients = c.fetchone()[0]

    # Current active clients growth (bookings in current window)
    # Note: This is slightly different from "Total Active Clients" which is a snapshot.
    # For growth, we compare "clients active in this period" vs "clients active in prev period".
    c.execute("SELECT COUNT(DISTINCT instagram_id) FROM bookings WHERE created_at >= %s", (period_start,))
    current_active_clients_growth = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM bookings 
        WHERE created_at >= %s
    """, (period_start,))
    current_bookings = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM bookings 
        WHERE status='completed' AND created_at >= %s
    """, (period_start,))
    current_completed = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM bookings
        WHERE status='pending' AND created_at >= %s
    """, (period_start,))
    current_pending = c.fetchone()[0]
    
    try:
        c.execute("""
            SELECT SUM(revenue) FROM bookings
            WHERE status='completed' AND created_at >= %s
        """, (period_start,))
        current_revenue = c.fetchone()[0] or 0

        # Average booking value for current period
        c.execute("""
            SELECT COALESCE(AVG(revenue), 0)
            FROM bookings
            WHERE status='completed' AND created_at >= %s AND revenue > 0
        """, (period_start,))
        avg_booking_value = c.fetchone()[0]
    except psycopg2.OperationalError:
        current_revenue = 0
        avg_booking_value = 0
    
    conn.close()
    
    # Функция для расчета роста
    def calculate_growth(current, previous):
        if previous == 0:
            if current > 0:
                return 100.0, "up"
            return 0.0, "stable"
        
        growth = ((current - previous) / previous) * 100
        if abs(growth) < 1:
            direction = "stable"
        elif growth > 0:
            direction = "up"
        else:
            direction = "down"
        
        return round(growth, 1), direction
    
    # Расчет показателей роста
    total_clients_growth, total_clients_trend = calculate_growth(total_clients, prev_total_clients)
    new_clients_growth, new_clients_trend = calculate_growth(current_new_clients, prev_new_clients)
    vip_clients_growth, vip_clients_trend = calculate_growth(current_vip_clients, prev_vip_clients)
    active_clients_growth, active_clients_trend = calculate_growth(current_active_clients_growth, prev_active_clients)
    bookings_growth, bookings_trend = calculate_growth(current_bookings, prev_bookings)
    completed_growth, completed_trend = calculate_growth(current_completed, prev_completed)
    pending_growth, pending_trend = calculate_growth(current_pending, prev_pending)
    revenue_growth, revenue_trend = calculate_growth(current_revenue, prev_revenue)
    avg_booking_growth, avg_booking_trend = calculate_growth(avg_booking_value, prev_avg_booking_value)
    
    conversion_rate = (completed_bookings / total_clients * 100) if total_clients > 0 else 0
    
    return {
        "total_clients": total_clients,
        "vip_clients": vip_clients,
        "active_clients": active_clients,
        "total_bookings": total_bookings,
        "completed_bookings": completed_bookings,
        "pending_bookings": pending_bookings,
        "total_client_messages": total_client_messages,
        "total_bot_messages": total_bot_messages,
        "total_revenue": round(total_revenue, 2),
        "avg_booking_value": round(avg_booking_value, 2),
        "new_clients": new_clients,
        "leads": leads,
        "customers": customers,
        "conversion_rate": round(conversion_rate, 2),
        
        # Индикаторы роста
        "growth": {
            "total_clients": {
                "current": total_clients,
                "previous": prev_total_clients,
                "percentage": total_clients_growth,
                "trend": total_clients_trend
            },
            "new_clients": {
                "current": current_new_clients,
                "previous": prev_new_clients,
                "percentage": new_clients_growth,
                "trend": new_clients_trend
            },
            "vip_clients": {
                "current": current_vip_clients,
                "previous": prev_vip_clients,
                "percentage": vip_clients_growth,
                "trend": vip_clients_trend
            },
            "active_clients": {
                "current": current_active_clients_growth,
                "previous": prev_active_clients,
                "percentage": active_clients_growth,
                "trend": active_clients_trend
            },
            "bookings": {
                "current": current_bookings,
                "previous": prev_bookings,
                "percentage": bookings_growth,
                "trend": bookings_trend
            },
            "completed_bookings": {
                "current": current_completed,
                "previous": prev_completed,
                "percentage": completed_growth,
                "trend": completed_trend
            },
            "pending_bookings": {
                "current": current_pending,
                "previous": prev_pending,
                "percentage": pending_growth,
                "trend": pending_trend
            },
            "revenue": {
                "current": round(current_revenue, 2),
                "previous": round(prev_revenue, 2),
                "percentage": revenue_growth,
                "trend": revenue_trend
            },
            "avg_booking_value": {
                "current": round(avg_booking_value, 2),
                "previous": round(prev_avg_booking_value, 2),
                "percentage": avg_booking_growth,
                "trend": avg_booking_trend
            }
        },
        "comparison_context": context
    }

def get_analytics_data(days=30, date_from=None, date_to=None, service_name=None, product_name=None, forecast_horizon_days=14):
    """Получить данные для аналитики с периодом"""
    conn = get_db_connection()
    c = conn.cursor()
    table_columns_cache: Dict[str, Set[str]] = {}

    def _extract_section_name(url_value: str) -> str:
        normalized_url = str(url_value or "").strip().lower()
        if not normalized_url:
            return "hero"
        if "#" in normalized_url:
            extracted_section = normalized_url.split("#", 1)[1].split("?", 1)[0].strip()
            return extracted_section if extracted_section else "hero"
        if "/account" in normalized_url or "client_cabinet" in normalized_url or "cabinet" in normalized_url:
            return "account"
        if "new-booking" in normalized_url:
            return "booking"
        if "booking" in normalized_url:
            return "booking"
        if "testimonials" in normalized_url:
            return "testimonials"
        if "team" in normalized_url:
            return "team"
        if "faq" in normalized_url:
            return "faq"
        if "gallery" in normalized_url:
            return "gallery"
        if "map" in normalized_url:
            return "map-section"
        if "service" in normalized_url:
            return "services"
        if "portfolio" in normalized_url:
            return "portfolio"
        if "contact" in normalized_url:
            return "contacts"
        return "hero"

    def _is_booking_url(url_value: str) -> bool:
        normalized_url = str(url_value or "").strip().lower()
        if normalized_url == "":
            return False
        return "booking" in normalized_url

    def _get_table_columns(table_name: str) -> Set[str]:
        if table_name in table_columns_cache:
            return table_columns_cache[table_name]
        c.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s
        """, (table_name,))
        columns = {row[0] for row in c.fetchall()}
        table_columns_cache[table_name] = columns
        return columns

    def _cramers_v_from_contingency(rows: list) -> Dict[str, float]:
        if not rows:
            return {"chi_square": 0.0, "cramers_v": 0.0}

        row_keys = sorted({row[0] for row in rows})
        col_keys = sorted({row[1] for row in rows})
        if len(row_keys) < 2 or len(col_keys) < 2:
            return {"chi_square": 0.0, "cramers_v": 0.0}

        row_index = {value: idx for idx, value in enumerate(row_keys)}
        col_index = {value: idx for idx, value in enumerate(col_keys)}
        matrix = [[0.0 for _ in col_keys] for _ in row_keys]

        total_count = 0.0
        for row_key, col_key, count_value in rows:
            value = float(count_value or 0)
            matrix[row_index[row_key]][col_index[col_key]] += value
            total_count += value

        if total_count <= 0:
            return {"chi_square": 0.0, "cramers_v": 0.0}

        row_totals = [sum(row_values) for row_values in matrix]
        col_totals = [0.0 for _ in col_keys]
        for col_idx in range(len(col_keys)):
            col_totals[col_idx] = sum(matrix[row_idx][col_idx] for row_idx in range(len(row_keys)))

        chi_square_value = 0.0
        for row_idx in range(len(row_keys)):
            for col_idx in range(len(col_keys)):
                observed_value = matrix[row_idx][col_idx]
                expected_value = (row_totals[row_idx] * col_totals[col_idx]) / total_count
                if expected_value <= 0:
                    continue
                chi_square_value += ((observed_value - expected_value) ** 2) / expected_value

        denominator = total_count * max(min(len(row_keys) - 1, len(col_keys) - 1), 1)
        cramers_v = math.sqrt(chi_square_value / denominator) if denominator > 0 else 0.0
        return {
            "chi_square": round(chi_square_value, 4),
            "cramers_v": round(cramers_v, 4),
        }

    def _mean(values: List[float]) -> float:
        if not values:
            return 0.0
        return float(sum(values)) / float(len(values))

    def _sample_std(values: List[float]) -> float:
        values_count = len(values)
        if values_count < 2:
            return 0.0
        mean_value = _mean(values)
        variance = sum((value - mean_value) ** 2 for value in values) / float(values_count - 1)
        return math.sqrt(max(variance, 0.0))

    clients_columns = _get_table_columns("clients")
    has_client_country = "country" in clients_columns
    has_client_city = "city" in clients_columns
    if has_client_country and has_client_city:
        client_region_sql = "COALESCE(NULLIF(TRIM(cl.country), ''), NULLIF(TRIM(cl.city), ''), 'Unknown')"
    elif has_client_country:
        client_region_sql = "COALESCE(NULLIF(TRIM(cl.country), ''), 'Unknown')"
    elif has_client_city:
        client_region_sql = "COALESCE(NULLIF(TRIM(cl.city), ''), 'Unknown')"
    else:
        client_region_sql = "'Unknown'"

    def _coefficient_of_variation(values: List[float]) -> float:
        if not values:
            return 0.0
        mean_value = _mean(values)
        if math.isclose(mean_value, 0.0):
            return 0.0
        return _sample_std(values) / abs(mean_value)

    def _percentile(sorted_values: List[float], percentile_value: float) -> float:
        if not sorted_values:
            return 0.0
        if len(sorted_values) == 1:
            return sorted_values[0]
        bounded_percentile = max(0.0, min(1.0, percentile_value))
        position = (len(sorted_values) - 1) * bounded_percentile
        lower_index = int(math.floor(position))
        upper_index = int(math.ceil(position))
        if lower_index == upper_index:
            return sorted_values[lower_index]
        lower_value = sorted_values[lower_index]
        upper_value = sorted_values[upper_index]
        fraction = position - lower_index
        return lower_value + (upper_value - lower_value) * fraction

    def _iqr_outlier_stats(values: List[float]) -> Dict[str, float]:
        if len(values) < 4:
            return {
                "share": 0.0,
                "count": 0.0,
                "lower_bound": 0.0,
                "upper_bound": 0.0,
            }
        sorted_values = sorted(values)
        q1 = _percentile(sorted_values, 0.25)
        q3 = _percentile(sorted_values, 0.75)
        iqr = q3 - q1
        if math.isclose(iqr, 0.0):
            return {
                "share": 0.0,
                "count": 0.0,
                "lower_bound": q1,
                "upper_bound": q3,
            }
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outliers_count = sum(1 for value in sorted_values if value < lower_bound or value > upper_bound)
        return {
            "share": outliers_count / float(len(sorted_values)),
            "count": float(outliers_count),
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
        }

    def _iqr_outlier_share(values: List[float]) -> float:
        return float(_iqr_outlier_stats(values)["share"])

    def _rank_values(values: List[float]) -> List[float]:
        values_count = len(values)
        if values_count == 0:
            return []

        ranked_values = [0.0] * values_count
        sorted_indexes = sorted(range(values_count), key=lambda idx: values[idx])
        left_index = 0
        while left_index < values_count:
            right_index = left_index
            base_value = values[sorted_indexes[left_index]]
            while right_index + 1 < values_count and math.isclose(values[sorted_indexes[right_index + 1]], base_value):
                right_index += 1
            avg_rank = (left_index + right_index + 2) / 2.0  # ранги 1..N
            for current_index in range(left_index, right_index + 1):
                ranked_values[sorted_indexes[current_index]] = avg_rank
            left_index = right_index + 1
        return ranked_values

    def _pearson_correlation(x_values: List[float], y_values: List[float]) -> float:
        values_count = len(x_values)
        if values_count < 2 or values_count != len(y_values):
            return 0.0

        x_mean = _mean(x_values)
        y_mean = _mean(y_values)
        numerator = 0.0
        denominator_x = 0.0
        denominator_y = 0.0
        for x_value, y_value in zip(x_values, y_values):
            centered_x = x_value - x_mean
            centered_y = y_value - y_mean
            numerator += centered_x * centered_y
            denominator_x += centered_x ** 2
            denominator_y += centered_y ** 2

        denominator = math.sqrt(denominator_x * denominator_y)
        if denominator <= 0:
            return 0.0
        return numerator / denominator

    def _spearman_correlation(x_values: List[float], y_values: List[float]) -> float:
        return _pearson_correlation(_rank_values(x_values), _rank_values(y_values))

    def _kendall_tau_b(x_values: List[float], y_values: List[float]) -> float:
        values_count = len(x_values)
        if values_count < 2 or values_count != len(y_values):
            return 0.0

        concordant_pairs = 0
        discordant_pairs = 0
        ties_x = 0
        ties_y = 0

        for left_index in range(values_count - 1):
            for right_index in range(left_index + 1, values_count):
                x_diff = x_values[left_index] - x_values[right_index]
                y_diff = y_values[left_index] - y_values[right_index]
                x_tie = math.isclose(x_diff, 0.0)
                y_tie = math.isclose(y_diff, 0.0)

                if x_tie and y_tie:
                    continue
                if x_tie:
                    ties_x += 1
                    continue
                if y_tie:
                    ties_y += 1
                    continue

                if x_diff * y_diff > 0:
                    concordant_pairs += 1
                else:
                    discordant_pairs += 1

        denominator = math.sqrt(
            float(concordant_pairs + discordant_pairs + ties_x)
            * float(concordant_pairs + discordant_pairs + ties_y)
        )
        if denominator <= 0:
            return 0.0
        return (concordant_pairs - discordant_pairs) / denominator

    def _effect_strength(value: float) -> str:
        absolute_value = abs(value)
        if absolute_value >= 0.5:
            return "strong"
        if absolute_value >= 0.3:
            return "moderate"
        if absolute_value >= 0.1:
            return "weak"
        return "none"

    def _anova_effect_strength(eta_squared_value: float) -> str:
        bounded_value = max(0.0, eta_squared_value)
        if bounded_value >= 0.14:
            return "strong"
        if bounded_value >= 0.06:
            return "moderate"
        if bounded_value >= 0.01:
            return "weak"
        return "none"

    def _normal_cdf(value: float) -> float:
        return 0.5 * (1.0 + math.erf(value / math.sqrt(2.0)))

    def _chi_square_p_value(chi_square_value: float, degrees_of_freedom: int) -> float:
        if chi_square_value <= 0 or degrees_of_freedom <= 0:
            return 1.0
        # Wilson-Hilferty approximation for chi-square survival probability.
        normalized_value = chi_square_value / float(degrees_of_freedom)
        transform = (
            normalized_value ** (1.0 / 3.0) - (1.0 - (2.0 / (9.0 * degrees_of_freedom)))
        ) / math.sqrt(2.0 / (9.0 * degrees_of_freedom))
        return max(0.0, min(1.0, 1.0 - _normal_cdf(transform)))

    def _permutation_p_value(
        x_values: List[float],
        y_values: List[float],
        observed_stat: float,
        stat_calculator: Any,
        iterations: int = 1200,
    ) -> float:
        values_count = len(x_values)
        if values_count < 4 or values_count != len(y_values):
            return 1.0

        random_generator = random.Random(1701 + values_count + int(abs(observed_stat) * 1000))
        shuffled_y = list(y_values)
        observed_abs = abs(observed_stat)
        extreme_count = 0

        for _ in range(iterations):
            random_generator.shuffle(shuffled_y)
            permuted_stat = stat_calculator(x_values, shuffled_y)
            if abs(permuted_stat) >= observed_abs:
                extreme_count += 1

        return (extreme_count + 1) / float(iterations + 1)

    def _build_correlation_result(
        x_values: List[float],
        y_values: List[float],
        stat_calculator: Any,
    ) -> Dict[str, Any]:
        values_count = len(x_values)
        if values_count < 4 or values_count != len(y_values):
            return {
                "enabled": False,
                "sample_size": values_count,
                "coefficient": 0.0,
                "p_value": 1.0,
                "significant": False,
                "strength": "none",
                "direction": "none",
            }

        coefficient_value = stat_calculator(x_values, y_values)
        p_value = _permutation_p_value(x_values, y_values, coefficient_value, stat_calculator)
        direction_value = "none"
        if coefficient_value > 0:
            direction_value = "positive"
        elif coefficient_value < 0:
            direction_value = "negative"

        return {
            "enabled": True,
            "sample_size": values_count,
            "coefficient": round(coefficient_value, 4),
            "p_value": round(p_value, 4),
            "significant": p_value < 0.05,
            "strength": _effect_strength(coefficient_value),
            "direction": direction_value,
        }

    def _compute_anova_result(groups_by_key: Dict[str, List[float]]) -> Dict[str, Any]:
        filtered_groups: List[List[float]] = []
        for _, group_values in groups_by_key.items():
            numeric_values = [float(value) for value in group_values if math.isfinite(float(value))]
            if len(numeric_values) >= 4:
                filtered_groups.append(numeric_values)

        if len(filtered_groups) < 2:
            return {
                "enabled": False,
                "groups_count": len(filtered_groups),
                "sample_size": int(sum(len(values) for values in filtered_groups)),
                "f_stat": 0.0,
                "p_value": 1.0,
                "eta_squared": 0.0,
                "significant": False,
                "strength": "none",
            }

        all_values = [value for group_values in filtered_groups for value in group_values]
        sample_size = len(all_values)
        groups_count = len(filtered_groups)
        overall_mean = _mean(all_values)

        between_groups_ss = 0.0
        within_groups_ss = 0.0
        for group_values in filtered_groups:
            group_mean = _mean(group_values)
            between_groups_ss += len(group_values) * ((group_mean - overall_mean) ** 2)
            within_groups_ss += sum((value - group_mean) ** 2 for value in group_values)

        df_between = groups_count - 1
        df_within = sample_size - groups_count
        if df_between <= 0 or df_within <= 0 or math.isclose(within_groups_ss, 0.0):
            return {
                "enabled": False,
                "groups_count": groups_count,
                "sample_size": sample_size,
                "f_stat": 0.0,
                "p_value": 1.0,
                "eta_squared": 0.0,
                "significant": False,
                "strength": "none",
            }

        f_stat = (between_groups_ss / float(df_between)) / (within_groups_ss / float(df_within))
        total_ss = between_groups_ss + within_groups_ss
        eta_squared = (between_groups_ss / total_ss) if total_ss > 0 else 0.0

        group_sizes = [len(group_values) for group_values in filtered_groups]
        randomized_values = list(all_values)
        random_generator = random.Random(2909 + sample_size + groups_count)
        extreme_count = 0
        permutation_count = 1000

        for _ in range(permutation_count):
            random_generator.shuffle(randomized_values)
            start_index = 0
            permuted_groups: List[List[float]] = []
            for group_size in group_sizes:
                end_index = start_index + group_size
                permuted_groups.append(randomized_values[start_index:end_index])
                start_index = end_index

            permuted_overall_mean = _mean(randomized_values)
            permuted_between_ss = 0.0
            permuted_within_ss = 0.0
            for group_values in permuted_groups:
                group_mean = _mean(group_values)
                permuted_between_ss += len(group_values) * ((group_mean - permuted_overall_mean) ** 2)
                permuted_within_ss += sum((value - group_mean) ** 2 for value in group_values)

            if math.isclose(permuted_within_ss, 0.0):
                continue
            permuted_f_stat = (permuted_between_ss / float(df_between)) / (permuted_within_ss / float(df_within))
            if permuted_f_stat >= f_stat:
                extreme_count += 1

        p_value = (extreme_count + 1) / float(permutation_count + 1)
        return {
            "enabled": True,
            "groups_count": groups_count,
            "sample_size": sample_size,
            "f_stat": round(f_stat, 4),
            "p_value": round(p_value, 4),
            "eta_squared": round(eta_squared, 4),
            "significant": p_value < 0.05,
            "strength": _anova_effect_strength(eta_squared),
        }

    def _median(values: List[float]) -> float:
        if not values:
            return 0.0
        sorted_values = sorted(values)
        values_count = len(sorted_values)
        middle_index = values_count // 2
        if values_count % 2 == 1:
            return sorted_values[middle_index]
        return (sorted_values[middle_index - 1] + sorted_values[middle_index]) / 2.0

    def _month_key(date_value: datetime) -> str:
        return date_value.strftime("%Y-%m")

    def _month_diff(left_value: datetime, right_value: datetime) -> int:
        return (right_value.year - left_value.year) * 12 + (right_value.month - left_value.month)

    def _normalize_channel(channel_value: Optional[str]) -> str:
        normalized_value = str(channel_value or "").strip().lower()
        if normalized_value == "":
            return "unknown"
        return normalized_value

    normalized_service_name = str(service_name or "").strip()
    normalized_product_name = str(product_name or "").strip()
    try:
        resolved_forecast_horizon_days = int(forecast_horizon_days)
    except (TypeError, ValueError):
        resolved_forecast_horizon_days = 14
    resolved_forecast_horizon_days = max(1, min(resolved_forecast_horizon_days, 90))

    try:
        if date_from and date_to:
            start_date = date_from
            end_date = date_to
        else:
            start_date = (get_current_time() - timedelta(days=days)).isoformat()
            end_date = get_current_time().isoformat()

        def _build_booking_filters(booking_alias: str = "b", date_column: str = "created_at") -> Tuple[str, List[Any]]:
            conditions = [
                f"{booking_alias}.{date_column} >= %s",
                f"{booking_alias}.{date_column} <= %s",
            ]
            parameters: List[Any] = [start_date, end_date]
            if normalized_service_name != "":
                conditions.append(f"COALESCE(NULLIF(TRIM({booking_alias}.service_name), ''), 'Unknown') = %s")
                parameters.append(normalized_service_name)
            if normalized_product_name != "":
                conditions.append(f"""{booking_alias}.id IN (
                    SELECT DISTINCT pm.booking_id
                    FROM product_movements pm
                    JOIN products p ON p.id = pm.product_id
                    WHERE pm.booking_id IS NOT NULL
                      AND LOWER(TRIM(p.name)) = LOWER(%s)
                )""")
                parameters.append(normalized_product_name)
            return " AND ".join(conditions), parameters

        booking_filters_sql, booking_filters_params = _build_booking_filters("b")

        # Записи по дням
        c.execute(f"""SELECT DATE(b.created_at) as date, COUNT(*) as count
                     FROM bookings b
                     WHERE {booking_filters_sql}
                     GROUP BY DATE(b.created_at)
                     ORDER BY date""", booking_filters_params)
        bookings_by_day = c.fetchall()
        if not bookings_by_day:
            bookings_by_day = [(get_current_time().strftime('%Y-%m-%d'), 0)]

        # Статистика по услугам
        c.execute(f"""SELECT b.service_name, COUNT(*) as count, SUM(b.revenue) as revenue
                     FROM bookings b
                     WHERE {booking_filters_sql}
                     GROUP BY b.service_name
                     ORDER BY count DESC""", booking_filters_params)
        services_stats = c.fetchall()
        if not services_stats:
            services_stats = [("Нет данных", 0, 0)]

        # Статистика по статусам
        c.execute(f"""SELECT b.status, COUNT(*) as count
                     FROM bookings b
                     WHERE {booking_filters_sql}
                     GROUP BY b.status""", booking_filters_params)
        status_stats = c.fetchall()
        if not status_stats:
            status_stats = [("pending", 0)]

        # Среднее время ответа бота
        c.execute("""
            WITH client_messages AS (
                SELECT
                    id,
                    instagram_id,
                    timestamp,
                    LEAD(timestamp) OVER (PARTITION BY instagram_id ORDER BY timestamp) as next_timestamp,
                    LEAD(sender) OVER (PARTITION BY instagram_id ORDER BY timestamp) as next_sender
                FROM chat_history
                WHERE sender = 'client'
                AND timestamp >= %s
                AND timestamp <= %s
            )
            SELECT
                AVG(
                    EXTRACT(EPOCH FROM (next_timestamp::TIMESTAMP - timestamp::TIMESTAMP)) / 60
                ) as avg_minutes
            FROM client_messages
            WHERE next_sender = 'bot'
            AND next_timestamp IS NOT NULL
        """, (start_date, end_date))
        avg_response_result = c.fetchone()
        avg_response = avg_response_result[0] if avg_response_result and avg_response_result[0] else 0

        # Записи по часу суток (когда чаще всего записываются)
        c.execute(f"""
            SELECT EXTRACT(HOUR FROM b.datetime::TIMESTAMP) as hour_value, COUNT(*) as count_value
            FROM bookings b
            WHERE b.datetime IS NOT NULL
              AND {booking_filters_sql}
            GROUP BY EXTRACT(HOUR FROM b.datetime::TIMESTAMP)
            ORDER BY hour_value
        """, booking_filters_params)
        bookings_hour_rows = c.fetchall()
        bookings_by_hour_map = {int(row[0]): int(row[1]) for row in bookings_hour_rows}
        bookings_by_hour = [
            {"hour": f"{hour_value:02d}:00", "count": bookings_by_hour_map.get(hour_value, 0)}
            for hour_value in range(24)
        ]

        # Записи по дням недели
        c.execute(f"""
            SELECT EXTRACT(ISODOW FROM b.datetime::TIMESTAMP) as weekday_value, COUNT(*) as count_value
            FROM bookings b
            WHERE b.datetime IS NOT NULL
              AND {booking_filters_sql}
            GROUP BY EXTRACT(ISODOW FROM b.datetime::TIMESTAMP)
            ORDER BY weekday_value
        """, booking_filters_params)
        weekday_rows = c.fetchall()
        weekday_labels = {
            1: "monday",
            2: "tuesday",
            3: "wednesday",
            4: "thursday",
            5: "friday",
            6: "saturday",
            7: "sunday",
        }
        bookings_by_weekday = [
            {
                "weekday": weekday_labels.get(int(row[0]), "unknown"),
                "iso_weekday": int(row[0]),
                "count": int(row[1]),
            }
            for row in weekday_rows
        ]

        # Регионы с максимальным числом записей
        c.execute(f"""
            SELECT
                {client_region_sql} as region_name,
                COUNT(*) as bookings_count,
                COALESCE(SUM(b.revenue), 0) as total_revenue
            FROM bookings b
            LEFT JOIN clients cl ON cl.instagram_id = b.instagram_id
            WHERE {booking_filters_sql}
            GROUP BY region_name
            ORDER BY bookings_count DESC
            LIMIT 20
        """, booking_filters_params)
        bookings_by_region = [
            {
                "region": row[0],
                "bookings": int(row[1]),
                "revenue": float(row[2] or 0),
            }
            for row in c.fetchall()
        ]

        top_products = []

        # Секции сайта перед записью: где пользователи проводят время до booking
        c.execute("""
            SELECT ip_hash, visited_at, page_url
            FROM visitor_tracking
            WHERE ip_hash IS NOT NULL
              AND visited_at >= %s
              AND visited_at <= %s
            ORDER BY ip_hash, visited_at
            LIMIT 50000
        """, (start_date, end_date))
        visitor_rows = c.fetchall()

        session_events_map: Dict[tuple, list] = defaultdict(list)
        for ip_hash_value, visited_at_value, page_url_value in visitor_rows:
            if not visited_at_value:
                continue
            session_key = (str(ip_hash_value), visited_at_value.date().isoformat())
            session_events_map[session_key].append({
                "visited_at": visited_at_value,
                "page_url": str(page_url_value or ""),
            })

        section_total_seconds: Dict[str, float] = defaultdict(float)
        section_steps_count: Dict[str, int] = defaultdict(int)
        section_sessions_total: Dict[str, int] = defaultdict(int)
        section_sessions_to_booking: Dict[str, int] = defaultdict(int)
        booking_sessions_count = 0

        for session_events in session_events_map.values():
            session_events.sort(key=lambda item: item["visited_at"])
            if not session_events:
                continue

            sections_in_session: Set[str] = set()
            booking_event_index: Optional[int] = None

            for event_index, session_event in enumerate(session_events):
                section_name = _extract_section_name(session_event["page_url"])
                sections_in_session.add(section_name)
                if booking_event_index is None and _is_booking_url(session_event["page_url"]):
                    booking_event_index = event_index

            for section_name in sections_in_session:
                section_sessions_total[section_name] += 1

            if booking_event_index is None:
                continue

            booking_sessions_count += 1

            booking_time = session_events[booking_event_index]["visited_at"]
            sections_before_booking: Set[str] = set()

            for event_index in range(booking_event_index):
                current_event = session_events[event_index]
                current_section = _extract_section_name(current_event["page_url"])
                sections_before_booking.add(current_section)

                next_time = booking_time
                if event_index + 1 < len(session_events):
                    candidate_next_time = session_events[event_index + 1]["visited_at"]
                    if candidate_next_time < booking_time:
                        next_time = candidate_next_time

                duration_seconds = max((next_time - current_event["visited_at"]).total_seconds(), 0.0)
                section_total_seconds[current_section] += duration_seconds
                section_steps_count[current_section] += 1

            for section_name in sections_before_booking:
                section_sessions_to_booking[section_name] += 1

        section_rows = []
        for section_name, total_seconds in section_total_seconds.items():
            section_sessions = section_sessions_total.get(section_name, 0)
            section_booking_sessions = section_sessions_to_booking.get(section_name, 0)
            steps_count = max(section_steps_count.get(section_name, 0), 1)
            to_booking_rate = (section_booking_sessions / section_sessions * 100.0) if section_sessions > 0 else 0.0
            section_rows.append({
                "section": section_name,
                "total_seconds": round(total_seconds, 2),
                "avg_seconds": round(total_seconds / steps_count, 2),
                "session_count": section_sessions,
                "sessions_before_booking": section_booking_sessions,
                "to_booking_rate": round(to_booking_rate, 2),
                "reliable_sample": bool(section_sessions >= 10 and section_booking_sessions >= 3),
            })
        section_rows.sort(key=lambda item: item["total_seconds"], reverse=True)
        website_sections_summary = {
            "tracked_sessions": len(session_events_map),
            "booking_sessions": booking_sessions_count,
            "low_sample": bool(booking_sessions_count < 10),
            "includes_account_pages": any(row["section"] == "account" for row in section_rows),
        }

        # Тест силы связи: регион x источник записи
        association_filters_sql, association_filters_params = _build_booking_filters("b")
        c.execute(f"""
            SELECT
                {client_region_sql} as region_name,
                COALESCE(NULLIF(TRIM(b.source), ''), 'unknown') as source_name,
                COUNT(*) as pair_count
            FROM bookings b
            LEFT JOIN clients cl ON cl.instagram_id = b.instagram_id
            WHERE {association_filters_sql}
            GROUP BY region_name, source_name
        """, association_filters_params)
        association_rows = c.fetchall()
        association_stats = _cramers_v_from_contingency(association_rows)
        cramers_v = association_stats["cramers_v"]
        chi_square_sample_size = int(sum(row[2] for row in association_rows))
        row_categories_count = len({row[0] for row in association_rows})
        col_categories_count = len({row[1] for row in association_rows})
        chi_square_df = max((row_categories_count - 1) * (col_categories_count - 1), 0)
        chi_square_p_value = _chi_square_p_value(association_stats["chi_square"], chi_square_df)
        chi_square_significant = chi_square_p_value < 0.05

        association_strength = "none"
        if cramers_v >= 0.5:
            association_strength = "strong"
        elif cramers_v >= 0.3:
            association_strength = "moderate"
        elif cramers_v >= 0.1:
            association_strength = "weak"

        c.execute(f"""
            SELECT
                {client_region_sql} as region_name,
                COALESCE(NULLIF(TRIM(b.source), ''), 'unknown') as source_name,
                COALESCE(b.revenue, 0) as revenue_value
            FROM bookings b
            LEFT JOIN clients cl ON cl.instagram_id = b.instagram_id
            WHERE {association_filters_sql}
        """, association_filters_params)
        booking_detail_rows = c.fetchall()

        region_revenue_groups: Dict[str, List[float]] = defaultdict(list)
        all_revenue_values: List[float] = []
        unknown_region_count = 0
        unknown_source_count = 0

        for region_name_value, source_name_value, revenue_value in booking_detail_rows:
            normalized_region = str(region_name_value or "Unknown").strip()
            if normalized_region == "":
                normalized_region = "Unknown"
            normalized_source = str(source_name_value or "unknown").strip().lower()
            if normalized_source == "":
                normalized_source = "unknown"

            revenue_numeric = float(revenue_value or 0.0)
            if math.isfinite(revenue_numeric):
                all_revenue_values.append(revenue_numeric)
                if normalized_region.lower() != "unknown":
                    region_revenue_groups[normalized_region].append(revenue_numeric)

            if normalized_region.lower() == "unknown":
                unknown_region_count += 1
            if normalized_source == "unknown":
                unknown_source_count += 1

        # ANOVA по выручке между регионами (проверка различий между группами)
        sorted_region_groups = sorted(
            region_revenue_groups.items(),
            key=lambda item: len(item[1]),
            reverse=True
        )
        limited_region_groups = dict(sorted_region_groups[:8])
        anova_revenue_by_region = _compute_anova_result(limited_region_groups)

        # Корреляционные тесты: время на секции сайта vs конверсия в запись
        section_rows_for_tests = [row for row in section_rows if int(row.get("session_count", 0)) >= 5]
        section_time_values = [float(row.get("avg_seconds", 0.0)) for row in section_rows_for_tests]
        section_conversion_values = [float(row.get("to_booking_rate", 0.0)) for row in section_rows_for_tests]

        spearman_test = _build_correlation_result(section_time_values, section_conversion_values, _spearman_correlation)
        kendall_test = _build_correlation_result(section_time_values, section_conversion_values, _kendall_tau_b)
        pearson_test = _build_correlation_result(section_time_values, section_conversion_values, _pearson_correlation)

        chi_square_test = {
            "enabled": chi_square_sample_size > 0 and chi_square_df > 0,
            "sample_size": chi_square_sample_size,
            "chi_square": association_stats["chi_square"],
            "df": chi_square_df,
            "p_value": round(chi_square_p_value, 4),
            "significant": chi_square_significant,
            "cramers_v": association_stats["cramers_v"],
            "strength": association_strength,
        }

        tests_for_comparison = [
            ("chi_square_region_vs_booking_source", abs(float(chi_square_test["cramers_v"])), bool(chi_square_test["enabled"]), bool(chi_square_test["significant"])),
            ("anova_revenue_by_region", abs(float(anova_revenue_by_region["eta_squared"])), bool(anova_revenue_by_region["enabled"]), bool(anova_revenue_by_region["significant"])),
            ("spearman_section_time_vs_booking_rate", abs(float(spearman_test["coefficient"])), bool(spearman_test["enabled"]), bool(spearman_test["significant"])),
            ("kendall_section_time_vs_booking_rate", abs(float(kendall_test["coefficient"])), bool(kendall_test["enabled"]), bool(kendall_test["significant"])),
            ("pearson_section_time_vs_booking_rate", abs(float(pearson_test["coefficient"])), bool(pearson_test["enabled"]), bool(pearson_test["significant"])),
        ]

        enabled_tests = [row for row in tests_for_comparison if row[2]]
        significant_tests = [row for row in enabled_tests if row[3]]
        strongest_effect_test = "none"
        strongest_effect_value = 0.0
        if enabled_tests:
            strongest_item = max(enabled_tests, key=lambda row: row[1])
            strongest_effect_test = strongest_item[0]
            strongest_effect_value = strongest_item[1]

        bookings_sample_size = len(booking_detail_rows)
        unknown_region_share = (unknown_region_count / float(bookings_sample_size)) if bookings_sample_size > 0 else 0.0
        unknown_source_share = (unknown_source_count / float(bookings_sample_size)) if bookings_sample_size > 0 else 0.0
        revenue_outlier_stats = _iqr_outlier_stats(all_revenue_values)
        revenue_outlier_share = float(revenue_outlier_stats["share"])
        revenue_outlier_count = int(revenue_outlier_stats["count"])
        hourly_counts = [float(hour_row.get("count", 0)) for hour_row in bookings_by_hour]
        hourly_cv = _coefficient_of_variation(hourly_counts)

        hourly_noise_component = min(max(hourly_cv, 0.0), 2.0) / 2.0 * 35.0
        outlier_noise_component = min(max(revenue_outlier_share, 0.0), 1.0) * 35.0
        metadata_noise_component = min(max((unknown_region_share + unknown_source_share) / 2.0, 0.0), 1.0) * 30.0
        noise_score = hourly_noise_component + outlier_noise_component + metadata_noise_component
        sample_confidence = min(1.0, bookings_sample_size / 300.0)
        trust_score = ((100.0 - noise_score) * 0.7) + (sample_confidence * 30.0)
        if len(significant_tests) > 0:
            trust_score += 5.0
        trust_score = max(0.0, min(100.0, trust_score))

        noise_level = "high"
        if noise_score <= 33.0:
            noise_level = "low"
        elif noise_score <= 66.0:
            noise_level = "medium"

        confidence_level = "low_confidence"
        if trust_score >= 75.0:
            confidence_level = "high_confidence"
        elif trust_score >= 55.0:
            confidence_level = "moderate_confidence"

        can_trust = bool(trust_score >= 60.0 and bookings_sample_size >= 40)

        # ============================================================
        # Extended analytics blocks (10 requested directions)
        # ============================================================
        bookings_columns = _get_table_columns("bookings")
        users_columns = _get_table_columns("users")

        has_booking_master_user_id = "master_user_id" in bookings_columns
        has_booking_source = "source" in bookings_columns
        has_booking_promo_code = "promo_code" in bookings_columns
        has_client_source = "source" in clients_columns

        booking_master_user_id_sql = "b.master_user_id" if has_booking_master_user_id else "NULL::INTEGER"
        booking_source_sql = "COALESCE(NULLIF(TRIM(b.source), ''), 'unknown')" if has_booking_source else "'unknown'"
        booking_promo_code_sql = "COALESCE(NULLIF(TRIM(b.promo_code), ''), '')" if has_booking_promo_code else "''"

        c.execute(f"""
            SELECT
                b.id,
                COALESCE(b.instagram_id, '') as client_id,
                COALESCE(NULLIF(TRIM(b.service_name), ''), 'Unknown') as service_name,
                COALESCE(NULLIF(TRIM(b.master), ''), 'Unassigned') as master_name,
                {booking_master_user_id_sql} as master_user_id,
                b.datetime,
                COALESCE(b.status, 'pending') as booking_status,
                COALESCE(b.revenue, 0) as booking_revenue,
                {booking_source_sql} as booking_source,
                {booking_promo_code_sql} as booking_promo
            FROM bookings b
            WHERE {booking_filters_sql}
        """, booking_filters_params)
        booking_fact_rows = c.fetchall()

        booking_facts: List[Dict[str, Any]] = []
        for row in booking_fact_rows:
            booking_facts.append({
                "id": int(row[0]),
                "client_id": str(row[1] or "").strip(),
                "service_name": str(row[2] or "Unknown").strip() or "Unknown",
                "master_name": str(row[3] or "Unassigned").strip() or "Unassigned",
                "master_user_id": int(row[4]) if row[4] is not None else None,
                "datetime": row[5],
                "status": str(row[6] or "pending").strip().lower(),
                "revenue": float(row[7] or 0.0),
                "source": _normalize_channel(str(row[8] or "unknown")),
                "promo_code": str(row[9] or "").strip(),
            })
        filtered_booking_ids = [int(booking_item["id"]) for booking_item in booking_facts]

        if filtered_booking_ids:
            top_products_sql = """
                SELECT
                    p.name,
                    SUM(ABS(pm.quantity)) as quantity_sold,
                    COALESCE(SUM(COALESCE(pm.price, p.price, 0) * ABS(pm.quantity)), 0) as total_amount
                FROM product_movements pm
                JOIN products p ON p.id = pm.product_id
                WHERE pm.created_at >= %s
                  AND pm.created_at <= %s
                  AND pm.booking_id = ANY(%s)
                  AND (
                      LOWER(COALESCE(pm.movement_type, '')) IN ('sale', 'sold', 'out', 'booking_sale')
                      OR pm.quantity < 0
                  )
            """
            top_products_params: List[Any] = [start_date, end_date, filtered_booking_ids]
            if normalized_product_name != "":
                top_products_sql += " AND LOWER(TRIM(p.name)) = LOWER(%s)"
                top_products_params.append(normalized_product_name)
            top_products_sql += """
                GROUP BY p.name
                ORDER BY quantity_sold DESC
                LIMIT 15
            """
            c.execute(top_products_sql, top_products_params)
            top_products = [
                {
                    "product_name": row[0],
                    "orders": int(row[1] or 0),
                    "amount": float(row[2] or 0),
                }
                for row in c.fetchall()
            ]

        users_by_id: Dict[int, Dict[str, Any]] = {}
        users_by_name: Dict[str, Dict[str, Any]] = {}
        if "id" in users_columns:
            commission_sql = "COALESCE(commission_rate, 0)" if "commission_rate" in users_columns else "0"
            salary_sql = "COALESCE(base_salary, 0)" if "base_salary" in users_columns else "0"
            c.execute(f"""
                SELECT
                    id,
                    COALESCE(NULLIF(TRIM(full_name), ''), NULLIF(TRIM(username), ''), '') as display_name,
                    {commission_sql} as commission_rate,
                    {salary_sql} as base_salary
                FROM users
            """)
            for user_id, display_name, commission_rate, base_salary in c.fetchall():
                user_payload = {
                    "id": int(user_id),
                    "display_name": str(display_name or "").strip(),
                    "commission_rate": float(commission_rate or 0.0),
                    "base_salary": float(base_salary or 0.0),
                }
                users_by_id[int(user_id)] = user_payload
                normalized_name = str(display_name or "").strip().lower()
                if normalized_name != "":
                    users_by_name[normalized_name] = user_payload

        # 1) Cohort retention + LTV
        c.execute("""
            SELECT instagram_id, datetime, COALESCE(revenue, 0)
            FROM bookings
            WHERE instagram_id IS NOT NULL
              AND datetime IS NOT NULL
              AND status = 'completed'
            ORDER BY instagram_id, datetime
        """)
        completed_rows_all_time = c.fetchall()

        completed_by_client: Dict[str, List[Tuple[datetime, float]]] = defaultdict(list)
        for client_id_value, booking_dt, revenue_value in completed_rows_all_time:
            normalized_client_id = str(client_id_value or "").strip()
            if normalized_client_id == "" or booking_dt is None:
                continue
            completed_by_client[normalized_client_id].append((booking_dt, float(revenue_value or 0.0)))

        cohort_metrics_map: Dict[str, Dict[str, Any]] = {}
        cohort_horizon_months = 12
        for client_events in completed_by_client.values():
            sorted_events = sorted(client_events, key=lambda item: item[0])
            first_booking_dt = sorted_events[0][0]
            cohort_key = _month_key(first_booking_dt)
            if cohort_key not in cohort_metrics_map:
                cohort_metrics_map[cohort_key] = {
                    "cohort_month": cohort_key,
                    "cohort_size": 0,
                    "active_counts": [0 for _ in range(cohort_horizon_months)],
                    "cum_ltv_sums": [0.0 for _ in range(cohort_horizon_months)],
                }
            cohort_metrics = cohort_metrics_map[cohort_key]
            cohort_metrics["cohort_size"] += 1

            revenue_by_offset: Dict[int, float] = defaultdict(float)
            for event_dt, event_revenue in sorted_events:
                month_offset = _month_diff(first_booking_dt, event_dt)
                if month_offset < 0 or month_offset >= cohort_horizon_months:
                    continue
                revenue_by_offset[month_offset] += float(event_revenue or 0.0)

            cumulative_revenue = 0.0
            for month_offset in range(cohort_horizon_months):
                current_revenue = revenue_by_offset.get(month_offset, 0.0)
                cumulative_revenue += current_revenue
                if current_revenue > 0:
                    cohort_metrics["active_counts"][month_offset] += 1
                cohort_metrics["cum_ltv_sums"][month_offset] += cumulative_revenue

        cohort_heatmap_rows: List[Dict[str, Any]] = []
        cohort_summary_rows: List[Dict[str, Any]] = []
        sorted_cohorts_desc = sorted(cohort_metrics_map.keys(), reverse=True)
        for cohort_key in sorted_cohorts_desc[:6]:
            metrics = cohort_metrics_map[cohort_key]
            cohort_size = int(metrics["cohort_size"])
            if cohort_size <= 0:
                continue

            month_zero_retention = 0.0
            month_one_retention = 0.0
            month_three_ltv = 0.0
            for month_offset in range(cohort_horizon_months):
                active_clients = int(metrics["active_counts"][month_offset])
                retention_rate = (active_clients / float(cohort_size)) * 100.0
                avg_ltv = metrics["cum_ltv_sums"][month_offset] / float(cohort_size)
                cohort_heatmap_rows.append({
                    "cohort_month": cohort_key,
                    "month_offset": month_offset,
                    "retention_rate": round(retention_rate, 2),
                    "avg_ltv": round(avg_ltv, 2),
                    "active_clients": active_clients,
                    "cohort_size": cohort_size,
                })
                if month_offset == 0:
                    month_zero_retention = retention_rate
                if month_offset == 1:
                    month_one_retention = retention_rate
                if month_offset == 3:
                    month_three_ltv = avg_ltv

            cohort_summary_rows.append({
                "cohort_month": cohort_key,
                "cohort_size": cohort_size,
                "m0_retention": round(month_zero_retention, 2),
                "m1_retention": round(month_one_retention, 2),
                "m3_avg_ltv": round(month_three_ltv, 2),
            })

        cohort_retention_ltv = {
            "horizon_months": cohort_horizon_months,
            "cohorts_analyzed": len(cohort_summary_rows),
            "summary": cohort_summary_rows,
            "heatmap": cohort_heatmap_rows,
        }

        # 2) Multi-touch attribution
        client_first_touch_map: Dict[str, str] = {}
        if has_client_source:
            c.execute("""
                SELECT instagram_id, COALESCE(NULLIF(TRIM(source), ''), 'unknown')
                FROM clients
                WHERE instagram_id IS NOT NULL
            """)
            for client_id_value, source_value in c.fetchall():
                normalized_client_id = str(client_id_value or "").strip()
                if normalized_client_id == "":
                    continue
                client_first_touch_map[normalized_client_id] = _normalize_channel(str(source_value or "unknown"))

        first_touch_counts: Dict[str, int] = defaultdict(int)
        last_touch_counts: Dict[str, int] = defaultdict(int)
        linear_touch_credits: Dict[str, float] = defaultdict(float)
        chain_counts: Dict[str, int] = defaultdict(int)
        attribution_sample_size = 0

        for booking_item in booking_facts:
            client_id_value = str(booking_item["client_id"] or "").strip()
            if client_id_value == "":
                continue
            first_touch = client_first_touch_map.get(client_id_value, "unknown")
            last_touch = _normalize_channel(booking_item.get("source"))
            first_touch_counts[first_touch] += 1
            last_touch_counts[last_touch] += 1
            if first_touch == last_touch:
                linear_touch_credits[first_touch] += 1.0
            else:
                linear_touch_credits[first_touch] += 0.5
                linear_touch_credits[last_touch] += 0.5
            chain_key = f"{first_touch} -> {last_touch}"
            chain_counts[chain_key] += 1
            attribution_sample_size += 1

        channels_union = set(first_touch_counts.keys()) | set(last_touch_counts.keys()) | set(linear_touch_credits.keys())
        attribution_channels = []
        for channel_name in channels_union:
            first_count = int(first_touch_counts.get(channel_name, 0))
            last_count = int(last_touch_counts.get(channel_name, 0))
            linear_credit = float(linear_touch_credits.get(channel_name, 0.0))
            attribution_channels.append({
                "channel": channel_name,
                "first_touch": first_count,
                "last_touch": last_count,
                "linear_credit": round(linear_credit, 2),
                "linear_share": round((linear_credit / attribution_sample_size * 100.0), 2) if attribution_sample_size > 0 else 0.0,
            })
        attribution_channels.sort(key=lambda item: item["linear_credit"], reverse=True)

        attribution_chains = [
            {"path": chain_key, "count": int(count_value)}
            for chain_key, count_value in sorted(chain_counts.items(), key=lambda item: item[1], reverse=True)[:15]
        ]

        attribution_multi_touch = {
            "sample_size": attribution_sample_size,
            "channels": attribution_channels[:20],
            "top_paths": attribution_chains,
        }

        # 3) Slot load forecast
        non_cancelled_bookings = [
            row for row in booking_facts
            if row.get("datetime") is not None and str(row.get("status")) != "cancelled"
        ]

        slot_counts_by_date: Dict[Tuple[int, int, str], int] = defaultdict(int)
        slot_total_counts: Dict[Tuple[int, int], int] = defaultdict(int)
        active_hours_by_dow: Dict[int, Set[int]] = defaultdict(set)

        for booking_item in non_cancelled_bookings:
            booking_dt = booking_item["datetime"]
            day_key = booking_dt.date().isoformat()
            weekday_value = booking_dt.isoweekday()
            hour_value = booking_dt.hour
            slot_counts_by_date[(weekday_value, hour_value, day_key)] += 1
            slot_total_counts[(weekday_value, hour_value)] += 1
            active_hours_by_dow[weekday_value].add(hour_value)

        period_start_dt = datetime.fromisoformat(str(start_date))
        period_end_dt = datetime.fromisoformat(str(end_date))
        day_occurrences_by_weekday: Dict[int, int] = defaultdict(int)
        current_date_cursor = period_start_dt.date()
        end_date_cursor = period_end_dt.date()
        while current_date_cursor <= end_date_cursor:
            day_occurrences_by_weekday[current_date_cursor.isoweekday()] += 1
            current_date_cursor += timedelta(days=1)

        slot_mean_values: Dict[Tuple[int, int], float] = {}
        slot_std_values: Dict[Tuple[int, int], float] = {}
        all_slot_means: List[float] = []
        for (weekday_value, hour_value), total_count in slot_total_counts.items():
            weekday_occurrences = max(day_occurrences_by_weekday.get(weekday_value, 1), 1)
            mean_count = total_count / float(weekday_occurrences)

            per_day_values: List[float] = []
            observed_dates = {
                day_key
                for (dow_value, hour_key, day_key), _ in slot_counts_by_date.items()
                if dow_value == weekday_value and hour_key == hour_value
            }
            for day_key in observed_dates:
                per_day_values.append(float(slot_counts_by_date.get((weekday_value, hour_value, day_key), 0)))
            zero_days = weekday_occurrences - len(per_day_values)
            if zero_days > 0:
                per_day_values.extend([0.0 for _ in range(zero_days)])

            slot_mean_values[(weekday_value, hour_value)] = mean_count
            slot_std_values[(weekday_value, hour_value)] = _sample_std(per_day_values)
            all_slot_means.append(mean_count)

        sorted_slot_means = sorted(all_slot_means)
        medium_forecast_threshold = _percentile(sorted_slot_means, 0.5) if sorted_slot_means else 0.0
        high_forecast_threshold = _percentile(sorted_slot_means, 0.8) if sorted_slot_means else 0.0

        forecast_start_date = max(get_current_time().date(), period_end_dt.date()) + timedelta(days=1)
        forecast_upcoming_days: List[Dict[str, Any]] = []
        forecast_high_load_slots: List[Dict[str, Any]] = []

        for day_offset in range(resolved_forecast_horizon_days):
            target_date = forecast_start_date + timedelta(days=day_offset)
            target_weekday = target_date.isoweekday()
            candidate_hours = sorted(active_hours_by_dow.get(target_weekday, set()))
            day_total_prediction = 0.0
            for hour_value in candidate_hours:
                mean_prediction = slot_mean_values.get((target_weekday, hour_value), 0.0)
                std_prediction = slot_std_values.get((target_weekday, hour_value), 0.0)
                day_total_prediction += mean_prediction
                slot_payload = {
                    "date": target_date.isoformat(),
                    "hour": f"{hour_value:02d}:00",
                    "predicted_bookings": round(mean_prediction, 2),
                    "std": round(std_prediction, 2),
                }
                if mean_prediction >= high_forecast_threshold and mean_prediction > 0:
                    forecast_high_load_slots.append(slot_payload)

            day_load_level = "low"
            if day_total_prediction >= high_forecast_threshold * 4.0:
                day_load_level = "high"
            elif day_total_prediction >= medium_forecast_threshold * 4.0:
                day_load_level = "medium"

            forecast_upcoming_days.append({
                "date": target_date.isoformat(),
                "predicted_total_bookings": round(day_total_prediction, 2),
                "load_level": day_load_level,
            })

        load_forecast = {
            "horizon_days": resolved_forecast_horizon_days,
            "generated_from_period": {
                "start_date": str(start_date),
                "end_date": str(end_date),
            },
            "historical_sample_size": len(non_cancelled_bookings),
            "active_slot_count": len(slot_mean_values),
            "scope": {
                "service_name": normalized_service_name if normalized_service_name != "" else None,
                "product_name": normalized_product_name if normalized_product_name != "" else None,
            },
            "upcoming_days": forecast_upcoming_days,
            "high_load_slots": forecast_high_load_slots[:30],
            "method": "seasonal_weekday_hour_average",
        }

        # 4) No-show / cancellation analytics
        service_risk_map: Dict[str, Dict[str, int]] = defaultdict(lambda: {"total": 0, "no_show": 0, "cancelled": 0})
        hour_risk_map: Dict[int, Dict[str, int]] = defaultdict(lambda: {"total": 0, "no_show": 0, "cancelled": 0})
        weekday_risk_map: Dict[int, Dict[str, int]] = defaultdict(lambda: {"total": 0, "no_show": 0, "cancelled": 0})

        for booking_item in booking_facts:
            booking_status = str(booking_item.get("status", "")).lower()
            service_name = str(booking_item.get("service_name") or "Unknown")
            service_risk_map[service_name]["total"] += 1
            if booking_status == "no_show":
                service_risk_map[service_name]["no_show"] += 1
            if booking_status == "cancelled":
                service_risk_map[service_name]["cancelled"] += 1

            booking_dt = booking_item.get("datetime")
            if booking_dt is None:
                continue
            hour_value = int(booking_dt.hour)
            weekday_value = int(booking_dt.isoweekday())
            hour_risk_map[hour_value]["total"] += 1
            weekday_risk_map[weekday_value]["total"] += 1
            if booking_status == "no_show":
                hour_risk_map[hour_value]["no_show"] += 1
                weekday_risk_map[weekday_value]["no_show"] += 1
            if booking_status == "cancelled":
                hour_risk_map[hour_value]["cancelled"] += 1
                weekday_risk_map[weekday_value]["cancelled"] += 1

        service_risk_rows = []
        for service_name, risk_data in service_risk_map.items():
            total_count = risk_data["total"]
            if total_count < 5:
                continue
            no_show_rate = risk_data["no_show"] / float(total_count) * 100.0
            cancel_rate = risk_data["cancelled"] / float(total_count) * 100.0
            combined_risk = no_show_rate * 0.7 + cancel_rate * 0.3
            service_risk_rows.append({
                "service_name": service_name,
                "bookings": int(total_count),
                "no_show_rate": round(no_show_rate, 2),
                "cancel_rate": round(cancel_rate, 2),
                "risk_score": round(combined_risk, 2),
            })
        service_risk_rows.sort(key=lambda item: item["risk_score"], reverse=True)

        hourly_risk_rows = []
        for hour_value, risk_data in hour_risk_map.items():
            total_count = risk_data["total"]
            if total_count <= 0:
                continue
            no_show_rate = risk_data["no_show"] / float(total_count) * 100.0
            cancel_rate = risk_data["cancelled"] / float(total_count) * 100.0
            hourly_risk_rows.append({
                "hour": f"{hour_value:02d}:00",
                "bookings": int(total_count),
                "no_show_rate": round(no_show_rate, 2),
                "cancel_rate": round(cancel_rate, 2),
            })
        hourly_risk_rows.sort(key=lambda item: item["hour"])

        weekday_risk_rows = []
        for weekday_value, risk_data in weekday_risk_map.items():
            total_count = risk_data["total"]
            if total_count <= 0:
                continue
            no_show_rate = risk_data["no_show"] / float(total_count) * 100.0
            cancel_rate = risk_data["cancelled"] / float(total_count) * 100.0
            weekday_risk_rows.append({
                "iso_weekday": int(weekday_value),
                "bookings": int(total_count),
                "no_show_rate": round(no_show_rate, 2),
                "cancel_rate": round(cancel_rate, 2),
            })
        weekday_risk_rows.sort(key=lambda item: item["iso_weekday"])

        c.execute("""
            SELECT
                instagram_id,
                COUNT(*) as total_count,
                SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_count,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancel_count
            FROM bookings
            WHERE instagram_id IS NOT NULL
            GROUP BY instagram_id
            HAVING COUNT(*) >= 3
            ORDER BY (
                SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END)::float
                + SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)::float * 0.7
            ) / COUNT(*)::float DESC
            LIMIT 20
        """)
        high_risk_clients_rows = []
        for client_id_value, total_count, no_show_count, cancel_count in c.fetchall():
            no_show_rate = (float(no_show_count or 0) / float(total_count)) * 100.0
            cancel_rate = (float(cancel_count or 0) / float(total_count)) * 100.0
            risk_score = no_show_rate * 0.7 + cancel_rate * 0.3
            risk_level = "low"
            if risk_score >= 35:
                risk_level = "high"
            elif risk_score >= 20:
                risk_level = "medium"
            high_risk_clients_rows.append({
                "client_id": str(client_id_value or ""),
                "bookings": int(total_count),
                "no_show_rate": round(no_show_rate, 2),
                "cancel_rate": round(cancel_rate, 2),
                "risk_score": round(risk_score, 2),
                "risk_level": risk_level,
            })

        no_show_cancellation_analytics = {
            "services": service_risk_rows[:15],
            "hours": hourly_risk_rows,
            "weekdays": weekday_risk_rows,
            "high_risk_clients": high_risk_clients_rows,
        }

        # 5) Unit economics by service / master
        product_cost_by_booking: Dict[int, float] = {}
        if ("product_movements" in table_columns_cache or True) and filtered_booking_ids:
            booking_cost_sql = """
                SELECT
                    pm.booking_id,
                    COALESCE(SUM(ABS(pm.quantity) * COALESCE(p.cost_price, 0)), 0) as booking_cost
                FROM product_movements pm
                JOIN products p ON p.id = pm.product_id
                WHERE pm.booking_id IS NOT NULL
                  AND pm.created_at >= %s
                  AND pm.created_at <= %s
                  AND pm.booking_id = ANY(%s)
                  AND (
                    LOWER(COALESCE(pm.movement_type, '')) IN ('out', 'sale', 'sold', 'booking_sale')
                    OR pm.quantity < 0
                  )
            """
            booking_cost_params: List[Any] = [start_date, end_date, filtered_booking_ids]
            if normalized_product_name != "":
                booking_cost_sql += " AND LOWER(TRIM(p.name)) = LOWER(%s)"
                booking_cost_params.append(normalized_product_name)
            booking_cost_sql += " GROUP BY pm.booking_id"
            c.execute(booking_cost_sql, booking_cost_params)
            for booking_id_value, booking_cost_value in c.fetchall():
                product_cost_by_booking[int(booking_id_value)] = float(booking_cost_value or 0.0)

        service_unit_map: Dict[str, Dict[str, float]] = defaultdict(lambda: {
            "bookings": 0.0,
            "revenue": 0.0,
            "commission_cost": 0.0,
            "product_cost": 0.0,
        })
        master_unit_map: Dict[str, Dict[str, float]] = defaultdict(lambda: {
            "bookings": 0.0,
            "revenue": 0.0,
            "commission_cost": 0.0,
            "product_cost": 0.0,
            "base_salary_period": 0.0,
        })

        period_days = max((period_end_dt.date() - period_start_dt.date()).days + 1, 1)
        masters_salary_added: Set[str] = set()

        for booking_item in booking_facts:
            booking_id_value = int(booking_item["id"])
            revenue_value = max(float(booking_item.get("revenue", 0.0)), 0.0)
            service_name = str(booking_item.get("service_name") or "Unknown")
            master_name = str(booking_item.get("master_name") or "Unassigned")

            commission_rate = 0.0
            master_user_id = booking_item.get("master_user_id")
            if master_user_id is not None and int(master_user_id) in users_by_id:
                commission_rate = float(users_by_id[int(master_user_id)]["commission_rate"])
            else:
                normalized_master_name = master_name.strip().lower()
                if normalized_master_name in users_by_name:
                    commission_rate = float(users_by_name[normalized_master_name]["commission_rate"])

            commission_cost = revenue_value * (max(commission_rate, 0.0) / 100.0)
            product_cost = float(product_cost_by_booking.get(booking_id_value, 0.0))

            service_unit_map[service_name]["bookings"] += 1
            service_unit_map[service_name]["revenue"] += revenue_value
            service_unit_map[service_name]["commission_cost"] += commission_cost
            service_unit_map[service_name]["product_cost"] += product_cost

            master_unit_map[master_name]["bookings"] += 1
            master_unit_map[master_name]["revenue"] += revenue_value
            master_unit_map[master_name]["commission_cost"] += commission_cost
            master_unit_map[master_name]["product_cost"] += product_cost

            if master_name not in masters_salary_added:
                salary_value = 0.0
                if master_user_id is not None and int(master_user_id) in users_by_id:
                    salary_value = float(users_by_id[int(master_user_id)]["base_salary"])
                else:
                    normalized_master_name = master_name.strip().lower()
                    if normalized_master_name in users_by_name:
                        salary_value = float(users_by_name[normalized_master_name]["base_salary"])
                if salary_value > 0:
                    master_unit_map[master_name]["base_salary_period"] += salary_value * (period_days / 30.0)
                masters_salary_added.add(master_name)

        unit_services_rows = []
        for service_name, data_row in service_unit_map.items():
            revenue_value = data_row["revenue"]
            variable_cost = data_row["commission_cost"] + data_row["product_cost"]
            margin_value = revenue_value - variable_cost
            margin_rate = (margin_value / revenue_value * 100.0) if revenue_value > 0 else 0.0
            unit_services_rows.append({
                "service_name": service_name,
                "bookings": int(data_row["bookings"]),
                "revenue": round(revenue_value, 2),
                "commission_cost": round(data_row["commission_cost"], 2),
                "product_cost": round(data_row["product_cost"], 2),
                "variable_cost": round(variable_cost, 2),
                "margin": round(margin_value, 2),
                "margin_rate": round(margin_rate, 2),
            })
        unit_services_rows.sort(key=lambda item: item["revenue"], reverse=True)

        unit_masters_rows = []
        for master_name, data_row in master_unit_map.items():
            revenue_value = data_row["revenue"]
            variable_cost = data_row["commission_cost"] + data_row["product_cost"]
            margin_before_salary = revenue_value - variable_cost
            margin_after_salary = margin_before_salary - data_row["base_salary_period"]
            unit_masters_rows.append({
                "master_name": master_name,
                "bookings": int(data_row["bookings"]),
                "revenue": round(revenue_value, 2),
                "commission_cost": round(data_row["commission_cost"], 2),
                "product_cost": round(data_row["product_cost"], 2),
                "base_salary_period": round(data_row["base_salary_period"], 2),
                "margin_before_salary": round(margin_before_salary, 2),
                "margin_after_salary": round(margin_after_salary, 2),
            })
        unit_masters_rows.sort(key=lambda item: item["revenue"], reverse=True)

        unit_economics = {
            "model": "variable_costs_plus_salary_estimate",
            "services": unit_services_rows[:20],
            "masters": unit_masters_rows[:20],
            "summary": {
                "revenue_total": round(sum(row["revenue"] for row in unit_services_rows), 2),
                "variable_cost_total": round(sum(row["variable_cost"] for row in unit_services_rows), 2),
                "margin_total": round(sum(row["margin"] for row in unit_services_rows), 2),
            },
        }

        # 6) Time-to-book analytics
        period_client_ids = sorted({
            str(booking_item["client_id"]).strip()
            for booking_item in booking_facts
            if str(booking_item["client_id"]).strip() != ""
        })

        first_interaction_by_client: Dict[str, datetime] = {}
        if period_client_ids:
            c.execute("""
                SELECT instagram_id, MIN(timestamp)
                FROM chat_history
                WHERE sender = 'client'
                  AND instagram_id = ANY(%s)
                GROUP BY instagram_id
            """, (period_client_ids,))
            for client_id_value, ts_value in c.fetchall():
                if ts_value is None:
                    continue
                normalized_client_id = str(client_id_value or "").strip()
                if normalized_client_id == "":
                    continue
                first_interaction_by_client[normalized_client_id] = ts_value

            c.execute("""
                SELECT client_id, MIN(created_at)
                FROM messenger_messages
                WHERE sender_type = 'client'
                  AND client_id = ANY(%s)
                GROUP BY client_id
            """, (period_client_ids,))
            for client_id_value, ts_value in c.fetchall():
                if ts_value is None:
                    continue
                normalized_client_id = str(client_id_value or "").strip()
                if normalized_client_id == "":
                    continue
                existing_value = first_interaction_by_client.get(normalized_client_id)
                if existing_value is None or ts_value < existing_value:
                    first_interaction_by_client[normalized_client_id] = ts_value

            c.execute("""
                SELECT client_id, MIN(created_at)
                FROM call_logs
                WHERE client_id = ANY(%s)
                  AND direction = 'inbound'
                GROUP BY client_id
            """, (period_client_ids,))
            for client_id_value, ts_value in c.fetchall():
                if ts_value is None:
                    continue
                normalized_client_id = str(client_id_value or "").strip()
                if normalized_client_id == "":
                    continue
                existing_value = first_interaction_by_client.get(normalized_client_id)
                if existing_value is None or ts_value < existing_value:
                    first_interaction_by_client[normalized_client_id] = ts_value

        first_booking_by_client: Dict[str, Dict[str, Any]] = {}
        for booking_item in booking_facts:
            client_id_value = str(booking_item["client_id"]).strip()
            booking_dt = booking_item.get("datetime")
            if client_id_value == "" or booking_dt is None:
                continue
            existing_booking = first_booking_by_client.get(client_id_value)
            if existing_booking is None or booking_dt < existing_booking["datetime"]:
                first_booking_by_client[client_id_value] = {
                    "datetime": booking_dt,
                    "source": booking_item.get("source"),
                    "master_name": booking_item.get("master_name"),
                }

        time_to_book_values_minutes: List[float] = []
        time_to_book_buckets = {
            "under_1h": 0,
            "under_6h": 0,
            "under_24h": 0,
            "under_7d": 0,
            "over_7d": 0,
        }
        time_to_book_by_source: Dict[str, List[float]] = defaultdict(list)
        time_to_book_by_master: Dict[str, List[float]] = defaultdict(list)

        for client_id_value, first_booking_data in first_booking_by_client.items():
            first_interaction_dt = first_interaction_by_client.get(client_id_value)
            if first_interaction_dt is None:
                continue
            first_booking_dt = first_booking_data["datetime"]
            delta_minutes = (first_booking_dt - first_interaction_dt).total_seconds() / 60.0
            if delta_minutes < 0:
                continue
            time_to_book_values_minutes.append(delta_minutes)

            if delta_minutes < 60:
                time_to_book_buckets["under_1h"] += 1
            elif delta_minutes < 360:
                time_to_book_buckets["under_6h"] += 1
            elif delta_minutes < 1440:
                time_to_book_buckets["under_24h"] += 1
            elif delta_minutes < 10080:
                time_to_book_buckets["under_7d"] += 1
            else:
                time_to_book_buckets["over_7d"] += 1

            source_name = _normalize_channel(str(first_booking_data.get("source") or "unknown"))
            master_name = str(first_booking_data.get("master_name") or "Unassigned")
            time_to_book_by_source[source_name].append(delta_minutes)
            time_to_book_by_master[master_name].append(delta_minutes)

        source_rows = [
            {
                "source": source_name,
                "avg_minutes": round(_mean(values), 2),
                "median_minutes": round(_median(values), 2),
                "sample_size": len(values),
            }
            for source_name, values in time_to_book_by_source.items()
            if len(values) >= 3
        ]
        source_rows.sort(key=lambda item: item["avg_minutes"])

        master_rows = [
            {
                "master_name": master_name,
                "avg_minutes": round(_mean(values), 2),
                "median_minutes": round(_median(values), 2),
                "sample_size": len(values),
            }
            for master_name, values in time_to_book_by_master.items()
            if len(values) >= 3
        ]
        master_rows.sort(key=lambda item: item["avg_minutes"])

        time_to_book = {
            "sample_size": len(time_to_book_values_minutes),
            "avg_minutes": round(_mean(time_to_book_values_minutes), 2),
            "median_minutes": round(_median(time_to_book_values_minutes), 2),
            "min_minutes": round(min(time_to_book_values_minutes), 2) if time_to_book_values_minutes else 0.0,
            "max_minutes": round(max(time_to_book_values_minutes), 2) if time_to_book_values_minutes else 0.0,
            "buckets": time_to_book_buckets,
            "by_source": source_rows[:12],
            "by_master": master_rows[:12],
        }

        # 7) Extended funnel: message -> booking -> visit -> repeat
        c.execute("""
            SELECT DISTINCT instagram_id
            FROM chat_history
            WHERE sender = 'client'
              AND timestamp >= %s
              AND timestamp <= %s
              AND instagram_id IS NOT NULL
        """, (start_date, end_date))
        chat_contacted_clients = {str(row[0]).strip() for row in c.fetchall() if str(row[0] or "").strip() != ""}

        c.execute("""
            SELECT DISTINCT client_id
            FROM messenger_messages
            WHERE sender_type = 'client'
              AND created_at >= %s
              AND created_at <= %s
              AND client_id IS NOT NULL
        """, (start_date, end_date))
        messenger_contacted_clients = {str(row[0]).strip() for row in c.fetchall() if str(row[0] or "").strip() != ""}

        c.execute("""
            SELECT DISTINCT client_id
            FROM call_logs
            WHERE created_at >= %s
              AND created_at <= %s
              AND client_id IS NOT NULL
              AND direction = 'inbound'
        """, (start_date, end_date))
        call_contacted_clients = {str(row[0]).strip() for row in c.fetchall() if str(row[0] or "").strip() != ""}

        contacted_clients = chat_contacted_clients | messenger_contacted_clients | call_contacted_clients
        booked_clients = {
            str(item["client_id"]).strip()
            for item in booking_facts
            if str(item.get("client_id") or "").strip() != ""
        }
        visited_clients = {
            str(item["client_id"]).strip()
            for item in booking_facts
            if str(item.get("client_id") or "").strip() != "" and str(item.get("status")) == "completed"
        }

        repeat_clients: Set[str] = set()
        if visited_clients:
            visited_client_list = sorted(list(visited_clients))
            c.execute("""
                SELECT instagram_id
                FROM bookings
                WHERE instagram_id = ANY(%s)
                  AND status = 'completed'
                GROUP BY instagram_id
                HAVING COUNT(*) >= 2
            """, (visited_client_list,))
            repeat_clients = {str(row[0]).strip() for row in c.fetchall() if str(row[0] or "").strip() != ""}

        contacted_count = len(contacted_clients)
        booked_count = len(booked_clients)
        visited_count = len(visited_clients)
        repeat_count = len(repeat_clients)

        full_funnel = {
            "stages": [
                {"stage": "contacted", "count": contacted_count},
                {"stage": "booked", "count": booked_count},
                {"stage": "visited", "count": visited_count},
                {"stage": "repeat", "count": repeat_count},
            ],
            "conversions": {
                "contact_to_booked": round((booked_count / float(contacted_count) * 100.0), 2) if contacted_count > 0 else 0.0,
                "booked_to_visited": round((visited_count / float(booked_count) * 100.0), 2) if booked_count > 0 else 0.0,
                "visited_to_repeat": round((repeat_count / float(visited_count) * 100.0), 2) if visited_count > 0 else 0.0,
                "contact_to_repeat": round((repeat_count / float(contacted_count) * 100.0), 2) if contacted_count > 0 else 0.0,
            },
            "sources": {
                "chat_clients": len(chat_contacted_clients),
                "messenger_clients": len(messenger_contacted_clients),
                "call_clients": len(call_contacted_clients),
            },
        }

        # 8) Promo uplift
        promo_bookings = [item for item in booking_facts if str(item.get("promo_code") or "").strip() != ""]
        regular_bookings = [item for item in booking_facts if str(item.get("promo_code") or "").strip() == ""]

        def _booking_completion_rate(booking_rows: List[Dict[str, Any]]) -> float:
            if len(booking_rows) == 0:
                return 0.0
            completed_count = sum(1 for row in booking_rows if str(row.get("status")) == "completed")
            return (completed_count / float(len(booking_rows))) * 100.0

        def _avg_revenue_for_completed(booking_rows: List[Dict[str, Any]]) -> float:
            completed_revenues = [float(row.get("revenue") or 0.0) for row in booking_rows if str(row.get("status")) == "completed"]
            return _mean(completed_revenues) if completed_revenues else 0.0

        promo_completion_rate = _booking_completion_rate(promo_bookings)
        regular_completion_rate = _booking_completion_rate(regular_bookings)
        promo_avg_revenue = _avg_revenue_for_completed(promo_bookings)
        regular_avg_revenue = _avg_revenue_for_completed(regular_bookings)

        promo_code_map: Dict[str, Dict[str, float]] = defaultdict(lambda: {
            "bookings": 0.0,
            "completed": 0.0,
            "revenue_sum": 0.0,
        })
        for booking_item in promo_bookings:
            promo_code_value = str(booking_item.get("promo_code") or "").strip()
            if promo_code_value == "":
                continue
            promo_code_map[promo_code_value]["bookings"] += 1
            if str(booking_item.get("status")) == "completed":
                promo_code_map[promo_code_value]["completed"] += 1
                promo_code_map[promo_code_value]["revenue_sum"] += float(booking_item.get("revenue") or 0.0)

        promo_top_codes = []
        for promo_code_value, promo_stats in promo_code_map.items():
            bookings_count = int(promo_stats["bookings"])
            completed_count = int(promo_stats["completed"])
            completion_rate = (completed_count / float(bookings_count) * 100.0) if bookings_count > 0 else 0.0
            avg_revenue = (promo_stats["revenue_sum"] / float(completed_count)) if completed_count > 0 else 0.0
            promo_top_codes.append({
                "promo_code": promo_code_value,
                "bookings": bookings_count,
                "completion_rate": round(completion_rate, 2),
                "avg_revenue": round(avg_revenue, 2),
            })
        promo_top_codes.sort(key=lambda item: item["bookings"], reverse=True)

        promo_uplift = {
            "promo_bookings": len(promo_bookings),
            "regular_bookings": len(regular_bookings),
            "promo_completion_rate": round(promo_completion_rate, 2),
            "regular_completion_rate": round(regular_completion_rate, 2),
            "completion_rate_uplift": round(promo_completion_rate - regular_completion_rate, 2),
            "promo_avg_revenue": round(promo_avg_revenue, 2),
            "regular_avg_revenue": round(regular_avg_revenue, 2),
            "avg_revenue_uplift": round(promo_avg_revenue - regular_avg_revenue, 2),
            "top_codes": promo_top_codes[:15],
        }

        # 9) RFM segmentation
        c.execute("""
            SELECT
                instagram_id,
                MAX(datetime) as last_booking,
                COUNT(*) as frequency,
                COALESCE(SUM(revenue), 0) as monetary
            FROM bookings
            WHERE status = 'completed'
              AND instagram_id IS NOT NULL
            GROUP BY instagram_id
        """)
        rfm_rows = c.fetchall()

        rfm_client_rows = []
        now_dt = get_current_time()
        for client_id_value, last_booking_value, frequency_value, monetary_value in rfm_rows:
            if last_booking_value is None:
                continue
            recency_days = (now_dt - last_booking_value).days
            rfm_client_rows.append({
                "client_id": str(client_id_value or "").strip(),
                "recency_days": max(recency_days, 0),
                "frequency": int(frequency_value or 0),
                "monetary": float(monetary_value or 0.0),
            })

        recency_values = sorted([float(row["recency_days"]) for row in rfm_client_rows])
        frequency_values = sorted([float(row["frequency"]) for row in rfm_client_rows])
        monetary_values = sorted([float(row["monetary"]) for row in rfm_client_rows])

        recency_q = [_percentile(recency_values, q) for q in [0.2, 0.4, 0.6, 0.8]] if recency_values else [0, 0, 0, 0]
        frequency_q = [_percentile(frequency_values, q) for q in [0.2, 0.4, 0.6, 0.8]] if frequency_values else [0, 0, 0, 0]
        monetary_q = [_percentile(monetary_values, q) for q in [0.2, 0.4, 0.6, 0.8]] if monetary_values else [0, 0, 0, 0]

        def _score_by_quantiles(value: float, quantiles: List[float], reverse: bool = False) -> int:
            score = 1
            if value > quantiles[0]:
                score = 2
            if value > quantiles[1]:
                score = 3
            if value > quantiles[2]:
                score = 4
            if value > quantiles[3]:
                score = 5
            if reverse:
                return 6 - score
            return score

        segment_counts: Dict[str, int] = defaultdict(int)
        segment_examples: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for row in rfm_client_rows:
            r_score = _score_by_quantiles(float(row["recency_days"]), recency_q, reverse=True)
            f_score = _score_by_quantiles(float(row["frequency"]), frequency_q, reverse=False)
            m_score = _score_by_quantiles(float(row["monetary"]), monetary_q, reverse=False)

            segment_name = "promising"
            if r_score >= 4 and f_score >= 4 and m_score >= 4:
                segment_name = "champions"
            elif r_score >= 3 and f_score >= 4:
                segment_name = "loyal"
            elif r_score <= 2 and f_score >= 3:
                segment_name = "at_risk"
            elif r_score >= 4 and f_score <= 2:
                segment_name = "new_customers"
            elif r_score <= 2 and f_score <= 2:
                segment_name = "lost"

            segment_counts[segment_name] += 1
            if len(segment_examples[segment_name]) < 5:
                segment_examples[segment_name].append({
                    "client_id": row["client_id"],
                    "r_score": r_score,
                    "f_score": f_score,
                    "m_score": m_score,
                    "recency_days": row["recency_days"],
                    "frequency": row["frequency"],
                    "monetary": round(row["monetary"], 2),
                })

        rfm_segmentation = {
            "sample_size": len(rfm_client_rows),
            "segments": [
                {"segment": segment_name, "count": int(count_value)}
                for segment_name, count_value in sorted(segment_counts.items(), key=lambda item: item[1], reverse=True)
            ],
            "examples": segment_examples,
        }

        # 10) SLA analytics (chat + calls response speed)
        c.execute("""
            SELECT
                cl.id,
                cl.client_id,
                cl.phone,
                cl.direction,
                cl.status,
                cl.created_at,
                COALESCE(NULLIF(TRIM(cl.manual_manager_name), ''), NULLIF(TRIM(b.master), ''), 'Unassigned') as manager_name
            FROM call_logs cl
            LEFT JOIN bookings b ON b.id = cl.booking_id
            WHERE cl.created_at >= %s
              AND cl.created_at <= %s
            ORDER BY cl.created_at ASC
        """, (start_date, end_date))
        call_rows_for_sla = c.fetchall()

        call_events_by_contact: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for row in call_rows_for_sla:
            created_at_value = row[5]
            if created_at_value is None:
                continue
            contact_key = str(row[1] or "").strip()
            if contact_key == "":
                contact_key = str(row[2] or "").strip()
            if contact_key == "":
                contact_key = f"call_id:{row[0]}"
            call_events_by_contact[contact_key].append({
                "direction": str(row[3] or "").strip().lower(),
                "status": str(row[4] or "").strip().lower(),
                "created_at": created_at_value,
                "manager_name": str(row[6] or "Unassigned").strip() or "Unassigned",
            })

        call_response_seconds: List[float] = []
        call_response_by_employee: Dict[str, List[float]] = defaultdict(list)
        for events in call_events_by_contact.values():
            sorted_events = sorted(events, key=lambda item: item["created_at"])
            for event_index, event_item in enumerate(sorted_events):
                is_incoming = event_item["direction"] == "inbound"
                if not is_incoming:
                    continue
                response_event = None
                for next_event in sorted_events[event_index + 1:]:
                    if next_event["direction"] == "outbound":
                        response_event = next_event
                        break
                if response_event is None:
                    continue
                response_seconds = (response_event["created_at"] - event_item["created_at"]).total_seconds()
                if response_seconds < 0:
                    continue
                call_response_seconds.append(float(response_seconds))
                call_response_by_employee[str(response_event["manager_name"])] .append(float(response_seconds))

        c.execute("""
            SELECT
                ch.instagram_id as client_id,
                ch.timestamp as created_at,
                CASE WHEN ch.sender = 'client' THEN 'client' ELSE 'staff' END as actor,
                COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.username), ''), 'Unassigned') as manager_name
            FROM chat_history ch
            LEFT JOIN clients cc ON cc.instagram_id = ch.instagram_id
            LEFT JOIN users u ON u.id = cc.assigned_employee_id
            WHERE ch.timestamp >= %s
              AND ch.timestamp <= %s
              AND ch.instagram_id IS NOT NULL
            UNION ALL
            SELECT
                mm.client_id as client_id,
                mm.created_at as created_at,
                CASE WHEN mm.sender_type = 'client' THEN 'client' ELSE 'staff' END as actor,
                COALESCE(NULLIF(TRIM(u2.full_name), ''), NULLIF(TRIM(u2.username), ''), 'Unassigned') as manager_name
            FROM messenger_messages mm
            LEFT JOIN clients cc2 ON cc2.instagram_id = mm.client_id
            LEFT JOIN users u2 ON u2.id = cc2.assigned_employee_id
            WHERE mm.created_at >= %s
              AND mm.created_at <= %s
              AND mm.client_id IS NOT NULL
            ORDER BY client_id, created_at
        """, (start_date, end_date, start_date, end_date))
        chat_rows_for_sla = c.fetchall()

        chat_events_by_client: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for client_id_value, created_at_value, actor_value, manager_name_value in chat_rows_for_sla:
            normalized_client_id = str(client_id_value or "").strip()
            if normalized_client_id == "" or created_at_value is None:
                continue
            chat_events_by_client[normalized_client_id].append({
                "created_at": created_at_value,
                "actor": str(actor_value or "staff").strip().lower(),
                "manager_name": str(manager_name_value or "Unassigned").strip() or "Unassigned",
            })

        chat_response_seconds: List[float] = []
        chat_response_by_employee: Dict[str, List[float]] = defaultdict(list)
        for events in chat_events_by_client.values():
            sorted_events = sorted(events, key=lambda item: item["created_at"])
            for event_index, event_item in enumerate(sorted_events):
                if event_item["actor"] != "client":
                    continue
                response_event = None
                for next_event in sorted_events[event_index + 1:]:
                    if next_event["actor"] == "staff":
                        response_event = next_event
                        break
                if response_event is None:
                    continue
                response_seconds = (response_event["created_at"] - event_item["created_at"]).total_seconds()
                if response_seconds < 0:
                    continue
                chat_response_seconds.append(float(response_seconds))
                chat_response_by_employee[str(response_event["manager_name"])].append(float(response_seconds))

        sla_thresholds = [120, 300, 600]

        def _sla_summary(values: List[float]) -> Dict[str, Any]:
            values_count = len(values)
            if values_count == 0:
                return {
                    "sample_size": 0,
                    "avg_seconds": 0.0,
                    "median_seconds": 0.0,
                    "within_thresholds": [{"seconds": threshold, "rate": 0.0} for threshold in sla_thresholds],
                }
            within_rows = []
            for threshold in sla_thresholds:
                within_count = sum(1 for value in values if value <= threshold)
                within_rows.append({
                    "seconds": threshold,
                    "rate": round(within_count / float(values_count) * 100.0, 2),
                })
            return {
                "sample_size": values_count,
                "avg_seconds": round(_mean(values), 2),
                "median_seconds": round(_median(values), 2),
                "within_thresholds": within_rows,
            }

        combined_sla_values = call_response_seconds + chat_response_seconds
        employees_for_sla = set(call_response_by_employee.keys()) | set(chat_response_by_employee.keys())
        sla_by_employee_rows = []
        for employee_name in employees_for_sla:
            call_values = call_response_by_employee.get(employee_name, [])
            chat_values = chat_response_by_employee.get(employee_name, [])
            combined_values = call_values + chat_values
            if len(combined_values) == 0:
                continue
            sla_by_employee_rows.append({
                "employee_name": employee_name,
                "call_sample_size": len(call_values),
                "chat_sample_size": len(chat_values),
                "combined_sample_size": len(combined_values),
                "combined_avg_seconds": round(_mean(combined_values), 2),
                "combined_median_seconds": round(_median(combined_values), 2),
                "combined_sla_5m_rate": round(sum(1 for value in combined_values if value <= 300) / float(len(combined_values)) * 100.0, 2),
            })
        sla_by_employee_rows.sort(key=lambda item: item["combined_sla_5m_rate"], reverse=True)

        sla_analytics = {
            "thresholds_seconds": sla_thresholds,
            "calls_team": _sla_summary(call_response_seconds),
            "chat_team": _sla_summary(chat_response_seconds),
            "combined_team": _sla_summary(combined_sla_values),
            "by_employee": sla_by_employee_rows[:20],
        }

        return {
            "bookings_by_day": bookings_by_day,
            "services_stats": services_stats,
            "status_stats": status_stats,
            "avg_response_time": round(avg_response, 2) if avg_response else 0,
            "bookings_by_hour": bookings_by_hour,
            "bookings_by_weekday": bookings_by_weekday,
            "bookings_by_region": bookings_by_region,
            "top_products": top_products,
            "website_sections_before_booking": section_rows[:15],
            "website_sections_summary": website_sections_summary,
            "association_tests": {
                "region_vs_booking_source": {
                    "chi_square": association_stats["chi_square"],
                    "cramers_v": association_stats["cramers_v"],
                    "p_value": round(chi_square_p_value, 4),
                    "significant": chi_square_significant,
                    "strength": association_strength,
                    "sample_size": chi_square_sample_size,
                }
            },
            "data_reliability": {
                "sample_size": bookings_sample_size,
                "unknown_region_share": round(unknown_region_share * 100.0, 2),
                "unknown_region_count": unknown_region_count,
                "unknown_source_share": round(unknown_source_share * 100.0, 2),
                "unknown_source_count": unknown_source_count,
                "revenue_outlier_share": round(revenue_outlier_share * 100.0, 2),
                "revenue_outlier_count": revenue_outlier_count,
                "hourly_cv": round(hourly_cv, 4),
                "noise_score": round(noise_score, 2),
                "noise_level": noise_level,
                "trust_score": round(trust_score, 2),
                "can_trust": can_trust,
                "confidence_level": confidence_level,
                "filters": {
                    "service_name": normalized_service_name if normalized_service_name != "" else None,
                    "product_name": normalized_product_name if normalized_product_name != "" else None,
                },
                "noise_components": [
                    {
                        "key": "hourly_distribution",
                        "score": round(hourly_noise_component, 2),
                        "raw_value": round(hourly_cv, 4),
                    },
                    {
                        "key": "revenue_outliers",
                        "score": round(outlier_noise_component, 2),
                        "raw_value": round(revenue_outlier_share * 100.0, 2),
                    },
                    {
                        "key": "missing_metadata",
                        "score": round(metadata_noise_component, 2),
                        "raw_value": round(((unknown_region_share + unknown_source_share) / 2.0) * 100.0, 2),
                    },
                ],
            },
            "statistical_tests": {
                "chi_square_region_vs_booking_source": chi_square_test,
                "anova_revenue_by_region": anova_revenue_by_region,
                "spearman_section_time_vs_booking_rate": spearman_test,
                "kendall_section_time_vs_booking_rate": kendall_test,
                "pearson_section_time_vs_booking_rate": pearson_test,
                "comparison": {
                    "strongest_effect_test": strongest_effect_test,
                    "strongest_effect_value": round(strongest_effect_value, 4),
                    "significant_tests_count": len(significant_tests),
                    "enabled_tests_count": len(enabled_tests),
                },
            },
            "cohort_retention_ltv": cohort_retention_ltv,
            "attribution_multi_touch": attribution_multi_touch,
            "load_forecast": load_forecast,
            "no_show_cancellation_analytics": no_show_cancellation_analytics,
            "unit_economics": unit_economics,
            "time_to_book": time_to_book,
            "full_funnel": full_funnel,
            "promo_uplift": promo_uplift,
            "rfm_segmentation": rfm_segmentation,
            "sla_analytics": sla_analytics,
        }
    finally:
        conn.close()

def get_funnel_data():
    """Получить данные воронки продаж"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("SELECT COUNT(*) FROM clients")
    total_visitors = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM clients WHERE total_messages > 0")
    engaged = c.fetchone()[0]
    
    c.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'booking_drafts'
          AND column_name IN ('instagram_id', 'client_id')
        """
    )
    draft_columns = {row[0] for row in c.fetchall()}
    started_booking = 0
    if "instagram_id" in draft_columns and "client_id" in draft_columns:
        c.execute("""
            SELECT COUNT(DISTINCT COALESCE(instagram_id, client_id))
            FROM booking_drafts
            WHERE COALESCE(instagram_id, client_id) IS NOT NULL
        """)
        started_booking = c.fetchone()[0]
    elif "instagram_id" in draft_columns:
        c.execute("""
            SELECT COUNT(DISTINCT instagram_id)
            FROM booking_drafts
            WHERE instagram_id IS NOT NULL
        """)
        started_booking = c.fetchone()[0]
    elif "client_id" in draft_columns:
        c.execute("""
            SELECT COUNT(DISTINCT client_id)
            FROM booking_drafts
            WHERE client_id IS NOT NULL
        """)
        started_booking = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings WHERE status='pending'")
    booked = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings WHERE status='completed'")
    completed = c.fetchone()[0]
    
    conn.close()
    
    total_visitors = max(total_visitors, 1)
    engaged = max(engaged, 1)
    started_booking = max(started_booking, 1)
    booked = max(booked, 1)
    
    return {
        "visitors": total_visitors,
        "engaged": engaged,
        "started_booking": started_booking,
        "booked": booked,
        "completed": completed,
        "conversion_rates": {
            "visitor_to_engaged": round((engaged / total_visitors * 100), 2),
            "engaged_to_booking": round((started_booking / engaged * 100), 2),
            "booking_to_booked": round((booked / started_booking * 100), 2),
            "booked_to_completed": round((completed / booked * 100) if booked > 0 else 0, 2)
        }
    }

def get_advanced_analytics_data(period=30, date_from=None, date_to=None):
    """Получить расширенную аналитику"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Определяем период
    if date_from and date_to:
        start_date = date_from
        end_date = date_to
    else:
        end_date = get_current_time().isoformat()
        start_date = (get_current_time() - timedelta(days=period)).isoformat()
    
    # Активность клиентов по дням
    c.execute("""
        SELECT DATE(timestamp) as date, COUNT(DISTINCT instagram_id) as unique_clients
        FROM chat_history 
        WHERE timestamp >= %s AND timestamp <= %s
        GROUP BY DATE(timestamp)
        ORDER BY date
    """, (start_date, end_date))
    daily_activity = c.fetchall()
    
    # Топ клиентов по активности
    c.execute("""
        SELECT c.instagram_id, c.username, c.name, COUNT(m.id) as message_count,
               c.total_messages, c.lifetime_value
        FROM clients c
        LEFT JOIN chat_history m ON c.instagram_id = m.instagram_id 
            AND m.timestamp >= %s AND m.timestamp <= %s
        GROUP BY c.instagram_id
        HAVING message_count > 0
        ORDER BY message_count DESC
        LIMIT 10
    """, (start_date, end_date))
    top_active_clients = c.fetchall()
    
    # Распределение сообщений по времени суток (Postgres compatible)
    c.execute("""
        SELECT EXTRACT(HOUR FROM timestamp::TIMESTAMP) as hour, COUNT(*) as count
        FROM chat_history 
        WHERE timestamp >= %s AND timestamp <= %s
        GROUP BY EXTRACT(HOUR FROM timestamp::TIMESTAMP)
        ORDER BY hour
    """, (start_date, end_date))
    hourly_distribution = c.fetchall()
    
    # Статистика по типам сообщений
    c.execute("""
        SELECT message_type, COUNT(*) as count
        FROM chat_history 
        WHERE timestamp >= %s AND timestamp <= %s
        GROUP BY message_type
    """, (start_date, end_date))
    message_types = c.fetchall()
    
    # Средняя длина сообщений
    c.execute("""
        SELECT AVG(LENGTH(message)) as avg_length
        FROM chat_history 
        WHERE timestamp >= %s AND timestamp <= %s 
        AND message IS NOT NULL
    """, (start_date, end_date))
    avg_message_length = c.fetchone()[0] or 0
    
    # Конверсия по источникам (если есть данные)
    c.execute("""
        SELECT 
            CASE 
                WHEN username LIKE '%instagram%' OR username LIKE '%ig%' THEN 'Instagram'
                WHEN username LIKE '%whatsapp%' OR username LIKE '%wa%' THEN 'WhatsApp'
                ELSE 'Other'
            END as source,
            COUNT(*) as total_clients,
            COUNT(CASE WHEN total_messages > 0 THEN 1 END) as engaged_clients
        FROM clients
        GROUP BY source
    """)
    source_conversion = c.fetchall()
    
    conn.close()
    
    return {
        "daily_activity": [{"date": d[0], "clients": d[1]} for d in daily_activity],
        "top_active_clients": [
            {
                "instagram_id": c[0],
                "username": c[1],
                "name": c[2],
                "message_count": c[3],
                "total_messages": c[4],
                "lifetime_value": c[5]
            } for c in top_active_clients
        ],
        "hourly_distribution": [{"hour": int(h[0]), "count": h[1]} for h in hourly_distribution],
        "message_types": [{"type": t[0] or "text", "count": t[1]} for t in message_types],
        "avg_message_length": round(avg_message_length, 2),
        "source_conversion": [
            {
                "source": s[0],
                "total_clients": s[1],
                "engaged_clients": s[2],
                "conversion_rate": round((s[2] / s[1] * 100) if s[1] > 0 else 0, 2)
            } for s in source_conversion
        ]
    }

def get_client_insights_data(client_id):
    """Получить инсайты по конкретному клиенту"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Основная информация о клиенте
    c.execute("""
        SELECT instagram_id, username, name, phone, status, 
               total_messages, lifetime_value, first_contact, last_contact
        FROM clients WHERE instagram_id = %s
    """, (client_id,))
    client_info = c.fetchone()
    
    if not client_info:
        conn.close()
        return {"error": "Client not found"}
    
    # История сообщений
    c.execute("""
        SELECT message, sender, message_type, timestamp
        FROM chat_history 
        WHERE instagram_id = %s
        ORDER BY timestamp DESC
        LIMIT 50
    """, (client_id,))
    message_history = c.fetchall()
    
    # Статистика активности
    c.execute("""
        SELECT 
            COUNT(*) as total_messages,
            COUNT(CASE WHEN sender = 'client' THEN 1 END) as client_messages,
            COUNT(CASE WHEN sender = 'bot' THEN 1 END) as bot_messages,
            COUNT(CASE WHEN sender = 'manager' THEN 1 END) as manager_messages,
            MIN(timestamp) as first_message,
            MAX(timestamp) as last_message
        FROM chat_history 
        WHERE instagram_id = %s
    """, (client_id,))
    activity_stats = c.fetchone()
    
    # Записи клиента
    c.execute("""
        SELECT id, service_name, datetime, status, revenue
        FROM bookings 
        WHERE instagram_id = %s
        ORDER BY datetime DESC
    """, (client_id,))
    bookings = c.fetchall()
    
    # Анализ времени ответа (если есть данные)
    c.execute("""
        SELECT 
            AVG(CASE 
                WHEN sender = 'client' AND LAG(sender) OVER (ORDER BY timestamp) = 'bot' 
                THEN EXTRACT(EPOCH FROM (timestamp::TIMESTAMP - LAG(timestamp::TIMESTAMP) OVER (ORDER BY timestamp))) / 60
                END) as avg_response_time_minutes
        FROM chat_history 
        WHERE instagram_id = %s
    """, (client_id,))
    response_time = c.fetchone()[0]
    
    conn.close()
    
    return {
        "client_info": {
            "instagram_id": client_info[0],
            "username": client_info[1],
            "name": client_info[2],
            "phone": client_info[3],
            "status": client_info[4],
            "total_messages": client_info[5],
            "lifetime_value": client_info[6],
            "first_contact": client_info[7],
            "last_contact": client_info[8]
        },
        "message_history": [
            {
                "text": m[0],
                "sender": m[1],
                "type": m[2],
                "created_at": m[3]
            } for m in message_history
        ],
        "activity_stats": {
            "total_messages": activity_stats[0],
            "client_messages": activity_stats[1],
            "bot_messages": activity_stats[2],
            "manager_messages": activity_stats[3],
            "first_message": activity_stats[4],
            "last_message": activity_stats[5],
            "avg_response_time_minutes": round(response_time, 2) if response_time else None
        },
        "bookings": [
            {
                "id": b[0],
                "service": b[1],
                "datetime": b[2],
                "status": b[3],
                "revenue": b[4]
            } for b in bookings
        ]
    }

def get_performance_metrics_data(period=30):
    """Получить метрики производительности"""
    conn = get_db_connection()
    c = conn.cursor()
    
    end_date = get_current_time().isoformat()
    start_date = (get_current_time() - timedelta(days=period)).isoformat()
    
    # Общие метрики
    c.execute("SELECT COUNT(*) FROM clients")
    total_clients = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM chat_history WHERE timestamp >= %s", (start_date,))
    total_messages = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM bookings WHERE created_at >= %s", (start_date,))
    total_bookings = c.fetchone()[0]
    
    # Метрики вовлеченности
    c.execute("""
        SELECT COUNT(DISTINCT instagram_id) 
        FROM chat_history 
        WHERE timestamp >= %s AND sender = 'client'
    """, (start_date,))
    active_clients = c.fetchone()[0]
    
    c.execute("""
        SELECT AVG(message_count) 
        FROM (
            SELECT instagram_id, COUNT(*) as message_count
            FROM chat_history 
            WHERE timestamp >= %s AND sender = 'client'
            GROUP BY instagram_id
        )
    """, (start_date,))
    avg_messages_per_client = c.fetchone()[0] or 0
    
    # Конверсия
    c.execute("""
        SELECT COUNT(DISTINCT instagram_id) 
        FROM bookings 
        WHERE created_at >= %s
    """, (start_date,))
    clients_with_bookings = c.fetchone()[0]
    
    conversion_rate = (clients_with_bookings / active_clients * 100) if active_clients > 0 else 0
    
    # Доходность
    c.execute("""
        SELECT SUM(revenue) 
        FROM bookings 
        WHERE created_at >= %s AND status = 'completed'
    """, (start_date,))
    total_revenue = c.fetchone()[0] or 0
    
    avg_revenue_per_client = total_revenue / active_clients if active_clients > 0 else 0
    
    # Время ответа (приблизительно)
    c.execute("""
        SELECT AVG(
            EXTRACT(EPOCH FROM (timestamp::TIMESTAMP - LAG(timestamp::TIMESTAMP) OVER (ORDER BY timestamp))) / 60
        )
        FROM chat_history 
        WHERE timestamp >= %s AND sender = 'bot'
    """, (start_date,))
    avg_response_time = c.fetchone()[0]
    
    conn.close()
    
    return {
        "total_clients": total_clients,
        "total_messages": total_messages,
        "total_bookings": total_bookings,
        "active_clients": active_clients,
        "avg_messages_per_client": round(avg_messages_per_client, 2),
        "conversion_rate": round(conversion_rate, 2),
        "total_revenue": total_revenue,
        "avg_revenue_per_client": round(avg_revenue_per_client, 2),
        "avg_response_time_minutes": round(avg_response_time, 2) if avg_response_time else None
    }
