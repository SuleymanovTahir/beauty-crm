"""
API endpoints for visitor analytics
"""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from db.cookies import log_cookie_consent, check_cookie_consent
from utils.logger import log_error

router = APIRouter(tags=["Analytics"])

@router.get("/cookies/check")
async def check_cookies(request: Request):
    """Проверить статус куки для IP"""
    try:
        ip = request.client.host
        status = check_cookie_consent(ip)
        return {"status": status} # 'accept', 'decline', or None
    except Exception as e:
        log_error(f"Error checking cookies: {e}", "analytics")
        return {"status": None}

@router.post("/cookies/consent")
async def cookie_consent(request: Request, data: dict):
    """Сохранить выбор пользователя по куки"""
    try:
        action = data.get('action') # 'accept' or 'decline'
        if action not in ['accept', 'decline']:
             return JSONResponse({"error": "Invalid action"}, status_code=400)
             
        ip = request.client.host
        user_agent = request.headers.get('user-agent', '')
        
        log_cookie_consent(ip, action, user_agent)
        
        return {"success": True}
    except Exception as e:
        log_error(f"Error logging cookie consent: {e}", "analytics")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/analytics/visitors/track")
async def track_visitor_api(request: Request, data: dict):
    """
    Явный трекинг посетителя (с поддержкой якорей URL)
    Этого метода не хватает для SPA, где смена секций не перезагружает страницу
    """
    try:
        from db.visitor_tracking import track_visitor
        import asyncio
        
        ip = request.client.host
        user_agent = request.headers.get('user-agent', '')
        # Фронтенд должен прислать полный URL через тело запроса
        page_url = data.get('url', str(request.url))
        
        referrer = data.get('referrer', request.headers.get('referer', ''))
        
        # Трекаем в фоне
        asyncio.create_task(asyncio.to_thread(track_visitor, ip, user_agent, page_url, referrer))
        
        return {"success": True}
    except Exception as e:
        log_error(f"Error tracking visitor via API: {e}", "analytics")
        return {"success": False}
