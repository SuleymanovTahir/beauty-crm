"""
API Endpoints для отчетов
"""
from fastapi import APIRouter, Query, Cookie, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional, List, Dict, Any
import json
import csv
import io
from datetime import datetime, timedelta

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_info

router = APIRouter(tags=["Reports"])

@router.get("/reports/sales")
async def get_sales_report(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    format: str = Query("json"),
    session_token: Optional[str] = Cookie(None)
):
    """Отчет по продажам"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Базовый запрос
        query = """
            SELECT 
                b.id,
                b.instagram_id,
                c.username,
                c.name,
                b.service_name,
                b.datetime,
                b.revenue,
                b.status,
                b.created_at
            FROM bookings b
            LEFT JOIN clients c ON b.instagram_id = c.instagram_id
            WHERE 1=1
        """
        params = []
        
        if date_from:
            query += " AND DATE(b.datetime) >=%s"
            params.append(date_from)
        
        if date_to:
            query += " AND DATE(b.datetime) <=%s"
            params.append(date_to)
        
        query += " ORDER BY b.datetime DESC"
        
        c.execute(query, params)
        bookings = c.fetchall()
        
        # Статистика
        total_revenue = sum(b[6] for b in bookings if b[6])
        total_bookings = len(bookings)
        completed_bookings = len([b for b in bookings if b[7] == 'completed'])
        
        # Группировка по услугам
        service_stats = {}
        for booking in bookings:
            service = booking[4]
            revenue = booking[6] or 0
            if service not in service_stats:
                service_stats[service] = {'count': 0, 'revenue': 0}
            service_stats[service]['count'] += 1
            service_stats[service]['revenue'] += revenue
        
        # Группировка по дням
        daily_stats = {}
        for booking in bookings:
            date = booking[5][:10] if booking[5] else booking[8][:10]
            revenue = booking[6] or 0
            if date not in daily_stats:
                daily_stats[date] = {'count': 0, 'revenue': 0}
            daily_stats[date]['count'] += 1
            daily_stats[date]['revenue'] += revenue
        
        report_data = {
            "summary": {
                "total_revenue": total_revenue,
                "total_bookings": total_bookings,
                "completed_bookings": completed_bookings,
                "completion_rate": (completed_bookings / total_bookings * 100) if total_bookings > 0 else 0
            },
            "service_stats": service_stats,
            "daily_stats": daily_stats,
            "bookings": [
                {
                    "id": b[0],
                    "instagram_id": b[1],
                    "username": b[2],
                    "name": b[3],
                    "service_name": b[4],
                    "datetime": b[5],
                    "revenue": b[6],
                    "status": b[7],
                    "created_at": b[8]
                } for b in bookings
            ]
        }
        
        if format == "csv":
            # CSV экспорт
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Заголовки
            writer.writerow(['ID', 'Instagram ID', 'Username', 'Name', 'Service', 'DateTime', 'Revenue', 'Status'])
            
            # Данные
            for booking in bookings:
                writer.writerow([
                    booking[0], booking[1], booking[2], booking[3],
                    booking[4], booking[5], booking[6], booking[7]
                ])
            
            content = output.getvalue()
            output.close()
            
            return StreamingResponse(
                io.BytesIO(content.encode('utf-8')),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=sales_report.csv"}
            )
        
        conn.close()
        return report_data
        
    except Exception as e:
        log_error(f"Error generating sales report: {e}", "reports")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/reports/clients")
async def get_clients_report(
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    format: str = Query("json"),
    session_token: Optional[str] = Cookie(None)
):
    """Отчет по клиентам"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Базовый запрос
        query = """
            SELECT 
                c.instagram_id,
                c.username,
                c.name,
                c.status,
                c.source,
                c.lifetime_value,
                c.created_at,
                COUNT(b.id) as booking_count,
                SUM(b.revenue) as total_revenue
            FROM clients c
            LEFT JOIN bookings b ON c.instagram_id = b.instagram_id
            WHERE 1=1
        """
        params = []
        
        if status:
            query += " AND c.status =%s"
            params.append(status)
        
        if date_from:
            query += " AND DATE(c.created_at) >=%s"
            params.append(date_from)
        
        if date_to:
            query += " AND DATE(c.created_at) <=%s"
            params.append(date_to)
        
        query += " GROUP BY c.instagram_id ORDER BY c.created_at DESC"
        
        c.execute(query, params)
        clients = c.fetchall()
        
        # Статистика
        total_clients = len(clients)
        new_clients = len([c for c in clients if c[3] == 'new'])
        active_clients = len([c for c in clients if c[7] > 0])  # booking_count > 0
        total_lifetime_value = sum(c[5] or 0 for c in clients)
        
        # Группировка по статусам
        status_stats = {}
        for client in clients:
            status = client[3]
            if status not in status_stats:
                status_stats[status] = 0
            status_stats[status] += 1
        
        # Группировка по источникам
        source_stats = {}
        for client in clients:
            source = client[4] or 'unknown'
            if source not in source_stats:
                source_stats[source] = 0
            source_stats[source] += 1
        
        report_data = {
            "summary": {
                "total_clients": total_clients,
                "new_clients": new_clients,
                "active_clients": active_clients,
                "total_lifetime_value": total_lifetime_value,
                "avg_lifetime_value": total_lifetime_value / total_clients if total_clients > 0 else 0
            },
            "status_stats": status_stats,
            "source_stats": source_stats,
            "clients": [
                {
                    "instagram_id": c[0],
                    "username": c[1],
                    "name": c[2],
                    "status": c[3],
                    "source": c[4],
                    "lifetime_value": c[5],
                    "created_at": c[6],
                    "booking_count": c[7],
                    "total_revenue": c[8] or 0
                } for c in clients
            ]
        }
        
        if format == "csv":
            # CSV экспорт
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Заголовки
            writer.writerow(['Instagram ID', 'Username', 'Name', 'Status', 'Source', 'Lifetime Value', 'Created At', 'Bookings', 'Total Revenue'])
            
            # Данные
            for client in clients:
                writer.writerow([
                    client[0], client[1], client[2], client[3],
                    client[4], client[5], client[6], client[7], client[8] or 0
                ])
            
            content = output.getvalue()
            output.close()
            
            return StreamingResponse(
                io.BytesIO(content.encode('utf-8')),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=clients_report.csv"}
            )
        
        conn.close()
        return report_data
        
    except Exception as e:
        log_error(f"Error generating clients report: {e}", "reports")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/reports/performance")
async def get_performance_report(
    period: int = Query(30),
    session_token: Optional[str] = Cookie(None)
):
    """Отчет по производительности"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Период
        end_date = datetime.now()
        start_date = end_date - timedelta(days=period)
        
        # Новые клиенты за период
        c.execute("""
            SELECT COUNT(*) 
            FROM clients 
            WHERE DATE(created_at) >=%s AND DATE(created_at) <=%s
        """, (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')))
        new_clients = c.fetchone()[0]
        
        # Записи за период
        c.execute("""
            SELECT COUNT(*), SUM(revenue)
            FROM bookings 
            WHERE DATE(datetime) >=%s AND DATE(datetime) <=%s
        """, (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')))
        bookings_result = c.fetchone()
        total_bookings = bookings_result[0]
        total_revenue = bookings_result[1] or 0
        
        # Сообщения за период
        c.execute("""
            SELECT COUNT(*) 
            FROM chat_history 
            WHERE DATE(timestamp) >=%s AND DATE(timestamp) <=%s
        """, (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')))
        total_messages = c.fetchone()[0]
        
        # Активность по дням
        c.execute("""
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM clients 
            WHERE DATE(created_at) >=%s AND DATE(created_at) <=%s
            GROUP BY DATE(created_at)
            ORDER BY date
        """, (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')))
        daily_clients = c.fetchall()
        
        # Топ услуги
        c.execute("""
            SELECT service_name, COUNT(*) as count, SUM(revenue) as revenue
            FROM bookings 
            WHERE DATE(datetime) >=%s AND DATE(datetime) <=%s
            GROUP BY service_name
            ORDER BY count DESC
            LIMIT 10
        """, (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')))
        top_services = c.fetchall()
        
        report_data = {
            "period": {
                "start_date": start_date.strftime('%Y-%m-%d'),
                "end_date": end_date.strftime('%Y-%m-%d'),
                "days": period
            },
            "summary": {
                "new_clients": new_clients,
                "total_bookings": total_bookings,
                "total_revenue": total_revenue,
                "total_messages": total_messages,
                "avg_revenue_per_booking": total_revenue / total_bookings if total_bookings > 0 else 0
            },
            "daily_clients": [
                {"date": d[0], "count": d[1]} for d in daily_clients
            ],
            "top_services": [
                {"service": s[0], "count": s[1], "revenue": s[2] or 0} for s in top_services
            ]
        }
        
        conn.close()
        return report_data
        
    except Exception as e:
        log_error(f"Error generating performance report: {e}", "reports")
        return JSONResponse({"error": str(e)}, status_code=500)
