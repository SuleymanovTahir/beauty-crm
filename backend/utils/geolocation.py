"""
Geolocation utilities for visitor tracking
"""
import requests
import hashlib
import math
from typing import Optional, Dict, Tuple
from utils.logger import log_info, log_error

# Salon location (will be updated from DB in production)
SALON_LAT = 25.2048
SALON_LON = 55.2708

def get_salon_coordinates() -> Tuple[float, float]:
    """Get salon coordinates from database"""
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT latitude, longitude FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        conn.close()
        if row and row[0] and row[1]:
            return float(row[0]), float(row[1])
    except Exception as e:
        log_error(f"Error getting salon coordinates from DB: {e}", "geolocation")
    return SALON_LAT, SALON_LON

def get_ip_hash(ip: str) -> str:
    """Generate SHA256 hash of IP for privacy"""
    return hashlib.sha256(ip.encode()).hexdigest()

def get_location_from_ip(ip: str) -> Optional[Dict]:
    """
    Get geolocation data from IP address using ip-api.com
    Returns: {latitude, longitude, city, country} or None if failed
    """
    # Skip localhost/private IPs
    if ip in ['127.0.0.1', 'localhost', '::1'] or ip.startswith('192.168.') or ip.startswith('10.'):
        log_info(f"Using mock geolocation for local IP: {ip}", "geolocation")
        return {
            'latitude': SALON_LAT,
            'longitude': SALON_LON,
            'city': 'Localhost',
            'country': 'Local Network'
        }
    
    try:
        # Using ip-api.com (free, no API key needed, 45 req/min limit)
        url = f"http://ip-api.com/json/{ip}?fields=status,message,country,city,lat,lon"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                return {
                    'latitude': data.get('lat'),
                    'longitude': data.get('lon'),
                    'city': data.get('city'),
                    'country': data.get('country')
                }
            else:
                log_error(f"Geolocation API error: {data.get('message')}", "geolocation")
                return None
        else:
            log_error(f"Geolocation API HTTP error: {response.status_code}", "geolocation")
            return None
            
    except Exception as e:
        log_error(f"Geolocation error for IP {ip}: {e}", "geolocation")
        return None

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points using Haversine formula
    Returns distance in kilometers
    """
    # Earth radius in kilometers
    R = 6371.0
    
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return round(distance, 2)

def is_local(distance_km: float, threshold_km: float = 50) -> bool:
    """
    Determine if visitor is local based on distance from salon
    Default threshold: 50km
    """
    return distance_km <= threshold_km

def get_visitor_location_data(ip: str) -> Optional[Dict]:
    """
    Get complete location data for a visitor including distance from salon
    Returns: {ip_hash, latitude, longitude, city, country, distance_km, is_local}
    """
    location = get_location_from_ip(ip)
    if not location:
        return None
    
    # Calculate distance from salon
    salon_lat, salon_lon = get_salon_coordinates()
    distance = calculate_distance(
        location['latitude'],
        location['longitude'],
        salon_lat,
        salon_lon
    )
    
    return {
        'ip_hash': get_ip_hash(ip),
        'latitude': location['latitude'],
        'longitude': location['longitude'],
        'city': location['city'],
        'country': location['country'],
        'distance_km': distance,
        'is_local': is_local(distance)
    }
