"""
Enhanced database functions for visitor tracking with city and distance breakdowns
"""
from db.connection import get_db_connection
from utils.geolocation import get_visitor_location_data
from utils.logger import log_info, log_error
from typing import Optional, List, Dict
from datetime import datetime, timedelta

def track_visitor(ip: str, user_agent: str, page_url: str) -> bool:
    """
    Track a visitor by IP address with geolocation
    Deduplicates visits from the same IP within 10 seconds
    Returns True if successfully tracked, False otherwise
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Check if this IP was already tracked in the last 10 seconds
        # This prevents duplicate records from simultaneous API calls
        # but allows tracking section transitions (hero -> services -> gallery)
        c.execute("""
            SELECT id FROM visitor_tracking 
            WHERE ip_address = %s 
            AND visited_at > NOW() - INTERVAL '10 seconds'
            LIMIT 1
        """, (ip,))
        
        recent_visit = c.fetchone()
        
        if recent_visit:
            # Already tracked recently, skip
            conn.close()
            log_info(f"Skipping duplicate visit from {ip} (tracked within last 10 sec)", "visitor_tracking")
            return False
        
        # Get location data
        location_data = get_visitor_location_data(ip)
        
        # If geolocation failed (e.g., localhost), still track with minimal data
        if not location_data:
            location_data = {
                'ip_hash': None,
                'latitude': None,
                'longitude': None,
                'city': None,
                'country': None,
                'distance_km': None,
                'is_local': None
            }
        
        c.execute("""
            INSERT INTO visitor_tracking 
            (ip_address, ip_hash, latitude, longitude, city, country, distance_km, is_local, user_agent, page_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            ip,
            location_data['ip_hash'],
            location_data['latitude'],
            location_data['longitude'],
            location_data['city'],
            location_data['country'],
            location_data['distance_km'],
            location_data['is_local'],
            user_agent,
            page_url
        ))
        
        conn.commit()
        conn.close()
        log_info(f"Tracked new visitor from {ip} ({location_data.get('city', 'Unknown')})", "visitor_tracking")
        return True
        
    except Exception as e:
        log_error(f"Error tracking visitor: {e}", "visitor_tracking")
        return False

def get_visitor_stats(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[Dict]:
    """
    Get visitor statistics for a date range
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    query = """
        SELECT ip_hash, city, country, distance_km, is_local, page_url, visited_at, ip_address
        FROM visitor_tracking
        WHERE 1=1
    """
    params = []
    
    if start_date:
        query += " AND visited_at >= %s"
        params.append(start_date)
    
    if end_date:
        query += " AND visited_at <= %s"
        params.append(end_date)
    
    query += " ORDER BY visited_at DESC LIMIT 1000"
    
    c.execute(query, params)
    
    visitors = []
    for row in c.fetchall():
        visitors.append({
            'ip_hash': row[0],
            'city': row[1],
            'country': row[2],
            'distance_km': row[3],
            'is_local': row[4],
            'page_url': row[5],
            'visited_at': row[6].isoformat() if row[6] else None,
            'ip_address': row[7]
        })
    
    conn.close()
    return visitors

def get_location_distribution(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict:
    """
    Get breakdown of local vs non-local visitors
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    query = """
        SELECT 
            COUNT(CASE WHEN is_local = TRUE THEN 1 END) as local_count,
            COUNT(CASE WHEN is_local = FALSE THEN 1 END) as non_local_count,
            COUNT(*) as total_count
        FROM visitor_tracking
        WHERE is_local IS NOT NULL
    """
    params = []
    
    if start_date:
        query += " AND visited_at >= %s"
        params.append(start_date)
    
    if end_date:
        query += " AND visited_at <= %s"
        params.append(end_date)
    
    c.execute(query, params)
    row = c.fetchone()
    
    conn.close()
    
    local_count = row[0] or 0
    non_local_count = row[1] or 0
    total = row[2] or 0
    
    return {
        'local': local_count,
        'non_local': non_local_count,
        'total': total,
        'local_percentage': round((local_count / total * 100) if total > 0 else 0, 1),
        'non_local_percentage': round((non_local_count / total * 100) if total > 0 else 0, 1)
    }

def get_country_distribution(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[Dict]:
    """
    Get visitor distribution by country
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    query = """
        SELECT country, COUNT(*) as count
        FROM visitor_tracking
        WHERE country IS NOT NULL
    """
    params = []
    
    if start_date:
        query += " AND visited_at >= %s"
        params.append(start_date)
    
    if end_date:
        query += " AND visited_at <= %s"
        params.append(end_date)
    
    query += " GROUP BY country ORDER BY count DESC"
    
    c.execute(query, params)
    
    total = 0
    countries = []
    for row in c.fetchall():
        count = row[1]
        total += count
        countries.append({
            'country': row[0],
            'count': count
        })
    
    # Calculate percentages
    for country in countries:
        country['percentage'] = round((country['count'] / total * 100) if total > 0 else 0, 1)
    
    conn.close()
    return countries

def get_city_distribution(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[Dict]:
    """
    Get visitor distribution by city
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    query = """
        SELECT city, country, COUNT(*) as count
        FROM visitor_tracking
        WHERE city IS NOT NULL
    """
    params = []
    
    if start_date:
        query += " AND visited_at >= %s"
        params.append(start_date)
    
    if end_date:
        query += " AND visited_at <= %s"
        params.append(end_date)
    
    query += " GROUP BY city, country ORDER BY count DESC LIMIT 20"
    
    c.execute(query, params)
    
    total = 0
    cities = []
    for row in c.fetchall():
        count = row[2]
        total += count
        cities.append({
            'city': row[0],
            'country': row[1],
            'count': count
        })
    
    # Calculate percentages
    for city in cities:
        city['percentage'] = round((city['count'] / total * 100) if total > 0 else 0, 1)
    
    conn.close()
    return cities

def get_distance_distribution(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, max_distance: float = 50) -> Dict:
    """
    Get visitor distribution by distance ranges up to max_distance
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    query = """
        SELECT 
            COUNT(CASE WHEN distance_km <= 1 THEN 1 END) as within_1km,
            COUNT(CASE WHEN distance_km > 1 AND distance_km <= 2 THEN 1 END) as within_2km,
            COUNT(CASE WHEN distance_km > 2 AND distance_km <= 5 THEN 1 END) as within_5km,
            COUNT(CASE WHEN distance_km > 5 AND distance_km <= 10 THEN 1 END) as within_10km,
            COUNT(CASE WHEN distance_km > 10 AND distance_km <= 15 THEN 1 END) as within_15km,
            COUNT(CASE WHEN distance_km > 15 AND distance_km <= 20 THEN 1 END) as within_20km,
            COUNT(CASE WHEN distance_km > 20 AND distance_km <= %s THEN 1 END) as within_max,
            COUNT(CASE WHEN distance_km > %s THEN 1 END) as beyond_max,
            COUNT(*) as total_count
        FROM visitor_tracking
        WHERE distance_km IS NOT NULL
    """
    params = [max_distance, max_distance]
    
    if start_date:
        query += " AND visited_at >= %s"
        params.append(start_date)
    
    if end_date:
        query += " AND visited_at <= %s"
        params.append(end_date)
    
    c.execute(query, params)
    row = c.fetchone()
    
    conn.close()
    
    total = row[8] or 0
    
    return {
        'within_1km': row[0] or 0,
        'within_2km': row[1] or 0,
        'within_5km': row[2] or 0,
        'within_10km': row[3] or 0,
        'within_15km': row[4] or 0,
        'within_20km': row[5] or 0,
        f'within_{int(max_distance)}km': row[6] or 0,
        f'beyond_{int(max_distance)}km': row[7] or 0,
        'total': total
    }

def get_visitor_trend(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[Dict]:
    """
    Get visitor trend by date (daily breakdown)
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    query = """
        SELECT DATE(visited_at) as visit_date, COUNT(*) as count
        FROM visitor_tracking
        WHERE visited_at IS NOT NULL
    """
    params = []
    
    if start_date:
        query += " AND visited_at >= %s"
        params.append(start_date)
    
    if end_date:
        query += " AND visited_at <= %s"
        params.append(end_date)
    
    query += " GROUP BY DATE(visited_at) ORDER BY visit_date ASC"
    
    c.execute(query, params)
    
    trend = []
    for row in c.fetchall():
        trend.append({
            'date': row[0].isoformat() if row[0] else None,
            'count': row[1]
        })
    
    conn.close()
    return trend

def get_landing_sections(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[Dict]:
    """
    Get most visited landing page sections (from URL anchors)
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    query = """
        SELECT page_url, COUNT(*) as count
        FROM visitor_tracking
        WHERE page_url IS NOT NULL
    """
    params = []
    
    if start_date:
        query += " AND visited_at >= %s"
        params.append(start_date)
    
    if end_date:
        query += " AND visited_at <= %s"
        params.append(end_date)
    
    query += " GROUP BY page_url ORDER BY count DESC"
    
    c.execute(query, params)
    
    # Extract sections from URLs and group
    sections_count = {}
    for row in c.fetchall():
        url = row[0]
        count = row[1]
        
        # Extract section from URL anchor (e.g., /#services -> services)
        section = 'hero'  # default
        if '#' in url:
            section = url.split('#')[-1].split('?')[0] or 'hero'
        elif url.endswith('/'):
            section = 'hero'
        
        # Normalize section names
        section = section.lower().strip()
        if not section or section == '/':
            section = 'hero'
        
        sections_count[section] = sections_count.get(section, 0) + count
    
    conn.close()
    
    # Convert to list and calculate percentages
    total = sum(sections_count.values())
    sections = []
    for section, count in sorted(sections_count.items(), key=lambda x: x[1], reverse=True):
        sections.append({
            'section': section.capitalize(),
            'count': count,
            'percentage': round((count / total * 100) if total > 0 else 0, 1)
        })
    
    return sections[:10]  # Top 10 sections

def get_peak_hours(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[Dict]:
    """
    Get visitor distribution by hour of day
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    query = """
        SELECT EXTRACT(HOUR FROM visited_at) as hour, COUNT(*) as count
        FROM visitor_tracking
        WHERE visited_at IS NOT NULL
    """
    params = []
    
    if start_date:
        query += " AND visited_at >= %s"
        params.append(start_date)
    
    if end_date:
        query += " AND visited_at <= %s"
        params.append(end_date)
    
    query += " GROUP BY EXTRACT(HOUR FROM visited_at) ORDER BY hour ASC"
    
    c.execute(query, params)
    
    # Create full 24-hour array
    hours_data = {i: 0 for i in range(24)}
    for row in c.fetchall():
        hour = int(row[0]) if row[0] is not None else 0
        count = row[1]
        hours_data[hour] = count
    
    conn.close()
    
    # Convert to list
    peak_hours = []
    for hour in range(24):
        peak_hours.append({
            'hour': f'{hour:02d}:00',
            'count': hours_data[hour]
        })
    
    return peak_hours

def get_all_visitor_analytics(start_date: datetime, end_date: datetime, max_distance: float = 50) -> Dict:
    """
    Получить ВСЕ данные аналитики одним проходом (оптимизация)
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Основные посетители
        c.execute("""
            SELECT ip_hash, city, country, distance_km, is_local, page_url, visited_at, ip_address
            FROM visitor_tracking
            WHERE visited_at >= %s AND visited_at <= %s
            ORDER BY visited_at DESC LIMIT 100
        """, (start_date, end_date))
        visitors = [{
            'ip_hash': r[0], 'city': r[1], 'country': r[2], 'distance_km': r[3],
            'is_local': r[4], 'page_url': r[5], 'visited_at': r[6].isoformat() if r[6] else None,
            'ip_address': r[7]
        } for r in c.fetchall()]

        # 2. Распределение local/non-local
        c.execute("""
            SELECT 
                COUNT(CASE WHEN is_local = TRUE THEN 1 END),
                COUNT(CASE WHEN is_local = FALSE THEN 1 END),
                COUNT(*)
            FROM visitor_tracking
            WHERE visited_at >= %s AND visited_at <= %s AND is_local IS NOT NULL
        """, (start_date, end_date))
        local_row = c.fetchone()
        local_count = local_row[0] or 0
        non_local_count = local_row[1] or 0
        total = local_row[2] or 0
        
        location_breakdown = {
            'local': local_count, 'non_local': non_local_count, 'total': total,
            'local_percentage': round((local_count / total * 100) if total > 0 else 0, 1),
            'non_local_percentage': round((non_local_count / total * 100) if total > 0 else 0, 1)
        }

        # 3. Страны
        c.execute("""
            SELECT country, COUNT(*) as count FROM visitor_tracking
            WHERE visited_at >= %s AND visited_at <= %s AND country IS NOT NULL
            GROUP BY country ORDER BY count DESC
        """, (start_date, end_date))
        countries = [{'country': r[0], 'count': r[1]} for r in c.fetchall()]
        c_total = sum(c['count'] for c in countries)
        for country in countries:
            country['percentage'] = round((country['count'] / c_total * 100) if c_total > 0 else 0, 1)

        # 4. Города
        c.execute("""
            SELECT city, country, COUNT(*) as count FROM visitor_tracking
            WHERE visited_at >= %s AND visited_at <= %s AND city IS NOT NULL
            GROUP BY city, country ORDER BY count DESC LIMIT 20
        """, (start_date, end_date))
        cities = [{'city': r[0], 'country': r[1], 'count': r[2]} for r in c.fetchall()]
        city_total = sum(c['count'] for c in cities)
        for city in cities:
            city['percentage'] = round((city['count'] / city_total * 100) if city_total > 0 else 0, 1)

        # 5. Дистанция
        c.execute("""
            SELECT 
                COUNT(CASE WHEN distance_km <= 1 THEN 1 END),
                COUNT(CASE WHEN distance_km > 1 AND distance_km <= 2 THEN 1 END),
                COUNT(CASE WHEN distance_km > 2 AND distance_km <= 5 THEN 1 END),
                COUNT(CASE WHEN distance_km > 5 AND distance_km <= 10 THEN 1 END),
                COUNT(CASE WHEN distance_km > 10 AND distance_km <= 15 THEN 1 END),
                COUNT(CASE WHEN distance_km > 15 AND distance_km <= 20 THEN 1 END),
                COUNT(CASE WHEN distance_km > 20 AND distance_km <= %s THEN 1 END),
                COUNT(CASE WHEN distance_km > %s THEN 1 END),
                COUNT(*)
            FROM visitor_tracking
            WHERE visited_at >= %s AND visited_at <= %s AND distance_km IS NOT NULL
        """, (max_distance, max_distance, start_date, end_date))
        dist_row = c.fetchone()
        distance_breakdown = {
            'within_1km': dist_row[0] or 0, 'within_2km': dist_row[1] or 0,
            'within_5km': dist_row[2] or 0, 'within_10km': dist_row[3] or 0,
            'within_15km': dist_row[4] or 0, 'within_20km': dist_row[5] or 0,
            f'within_{int(max_distance)}km': dist_row[6] or 0,
            f'beyond_{int(max_distance)}km': dist_row[7] or 0,
            'total': dist_row[8] or 0
        }

        # 6. Тренд
        c.execute("""
            SELECT DATE(visited_at) as visit_date, COUNT(*) as count FROM visitor_tracking
            WHERE visited_at >= %s AND visited_at <= %s
            GROUP BY DATE(visited_at) ORDER BY visit_date ASC
        """, (start_date, end_date))
        trend = [{'date': r[0].isoformat() if r[0] else None, 'count': r[1]} for r in c.fetchall()]

        # 7. Секции
        c.execute("""
            SELECT page_url, COUNT(*) as count FROM visitor_tracking
            WHERE visited_at >= %s AND visited_at <= %s AND page_url IS NOT NULL
            GROUP BY page_url ORDER BY count DESC
        """, (start_date, end_date))
        sections_count = {}
        for r in c.fetchall():
            url, count = r[0], r[1]
            section = 'hero'
            if '#' in url: section = url.split('#')[-1].split('?')[0] or 'hero'
            elif url.endswith('/'): section = 'hero'
            section = section.lower().strip() or 'hero'
            sections_count[section] = sections_count.get(section, 0) + count
        
        sec_total = sum(sections_count.values())
        sections = [{
            'section': k.capitalize(), 'count': v,
            'percentage': round((v / sec_total * 100) if sec_total > 0 else 0, 1)
        } for k, v in sorted(sections_count.items(), key=lambda x: x[1], reverse=True)[:10]]

        # 8. Часы
        c.execute("""
            SELECT EXTRACT(HOUR FROM visited_at) as hour, COUNT(*) as count FROM visitor_tracking
            WHERE visited_at >= %s AND visited_at <= %s
            GROUP BY hour ORDER BY hour ASC
        """, (start_date, end_date))
        hours_raw = {int(r[0]): r[1] for r in c.fetchall()}
        hours = [{'hour': f'{h:02d}:00', 'count': hours_raw.get(h, 0)} for h in range(24)]

        return {
            'visitors': visitors,
            'location_breakdown': location_breakdown,
            'countries': countries,
            'cities': cities,
            'distance_breakdown': distance_breakdown,
            'trend': trend,
            'sections': sections,
            'hours': hours
        }
    finally:
        conn.close()
