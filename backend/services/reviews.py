import logging
import httpx
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from services.google_scraper import google_scraper

logger = logging.getLogger(__name__)

class GoogleReviewsService:
    def __init__(self):
        self.cache = []
        self.cache_timestamp = None
        self.cache_duration = timedelta(hours=24)  # Кэш на 24 часа

    async def get_reviews(self, place_id: str, api_key: Optional[str] = None, lang: str = 'en') -> List[Dict]:
        """
        Получает отзывы с Google Maps через скрапинг.
        Кэширует результаты на 24 часа.
        """
        # Проверяем кэш
        if self.cache and self.cache_timestamp:
            if datetime.now() - self.cache_timestamp < self.cache_duration:
                logger.info("Using cached reviews")
                return await self._translate_reviews(self.cache, lang)
        
        # Получаем google_maps URL из настроек
        from db.settings import get_salon_settings
        settings = get_salon_settings()
        google_maps_url = settings.get("google_maps", "")
        
        if not google_maps_url:
            logger.warning("No Google Maps URL configured")
            return []
        
        # Скрапим отзывы
        logger.info(f"Scraping reviews from {google_maps_url}")
        reviews = await google_scraper.scrape_reviews(google_maps_url)
        
        # Обновляем кэш
        if reviews:
            self.cache = reviews
            self.cache_timestamp = datetime.now()
            logger.info(f"Cached {len(reviews)} reviews")
        
        # Переводим на нужный язык
        return await self._translate_reviews(reviews, lang)

    async def _translate_reviews(self, reviews: List[Dict], target_lang: str) -> List[Dict]:
        """
        Переводит отзывы на целевой язык
        """
        translated = []
        for review in reviews:
            translated_text = await self._translate_text(review.get("text", ""), target_lang)
            translated.append({
                "name": review.get("name"),
                "rating": review.get("rating"),
                "text": translated_text,
                "avatar": review.get("avatar"),
            })
        return translated

    async def _translate_text(self, text: str, target_lang: str) -> str:
        """
        Переводит текст используя Google Translate (бесплатный endpoint)
        """
        if not text:
            return ""
        
        # Если язык русский и текст на русском - не переводим
        if target_lang == "ru" and any(ord(c) >= 0x0400 and ord(c) <= 0x04FF for c in text):
            return text
            
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            "client": "gtx",
            "sl": "auto",
            "tl": target_lang,
            "dt": "t",
            "q": text
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, params=params, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json()
                    return "".join([x[0] for x in data[0]])
        except Exception as e:
            logger.error(f"Translation error: {e}")
            
        return text

reviews_service = GoogleReviewsService()
