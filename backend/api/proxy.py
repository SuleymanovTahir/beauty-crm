
from fastapi import APIRouter, Query
from fastapi.responses import Response
import httpx
from utils.logger import log_error, log_info

router = APIRouter(tags=["Proxy"])

@router.get("/proxy/image")
async def proxy_image(url: str = Query(...)):
    """
    Прокси для загрузки изображений Instagram
    Обходит ограничения CORS и 403 Forbidden
    """
    try:
        log_info(f"🔄 Прокси запрос для изображения: {url[:100]}...", "proxy")
        log_info(f"🔍 Полный URL: {url}", "proxy")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.instagram.com/',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            # Проверяем, что получили изображение, а не HTML
            content_type = response.headers.get('content-type', '').lower()
            if 'text/html' in content_type:
                log_error(f"❌ Получен HTML вместо изображения: {content_type}", "proxy")
                return Response(
                    content=b'',
                    status_code=404,
                    media_type='image/png'
                )
            
            log_info(f"✅ Изображение загружено: {len(response.content)} bytes, тип: {content_type}", "proxy")
            
            return Response(
                content=response.content,
                media_type=response.headers.get('content-type', 'image/jpeg'),
                headers={
                    'Cache-Control': 'public, max-age=31536000',
                    'Access-Control-Allow-Origin': '*'
                }
            )
            
    except Exception as e:
        log_error(f"❌ Ошибка прокси: {e}", "proxy")
        # Возвращаем placeholder изображение
        return Response(
            content=b'',
            status_code=404,
            media_type='image/png'
        )