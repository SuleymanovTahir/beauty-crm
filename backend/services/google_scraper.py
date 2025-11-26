"""
Google Reviews Scraper using Playwright
"""
import asyncio
import re
from typing import List, Dict

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    async_playwright = None

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False
    BeautifulSoup = None

try:
    from utils.logger import log_info, log_error
except ImportError:
    # Fallback if logger not available
    def log_info(msg, tag=""): print(f"INFO: {msg}")
    def log_error(msg, tag=""): print(f"ERROR: {msg}")

class GoogleMapsScraper:
    def __init__(self):
        self.reviews_cache = []
        self.cache_timestamp = None
        
    async def scrape_reviews(self, google_maps_url: str) -> List[Dict]:
        """
        Парсит отзывы с Google Maps используя Playwright
        """
        try:
            async with async_playwright() as p:
                # Запускаем браузер в headless режиме
                browser = await p.chromium.launch(
                    headless=True,
                    args=['--disable-blink-features=AutomationControlled']
                )
                context = await browser.new_context(
                    user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                )
                page = await context.new_page()
                
                # Увеличиваем таймаут до 60 секунд
                page.set_default_timeout(60000)
                
                # Переходим на страницу
                logger.info(f"Loading Google Maps page: {google_maps_url}")
                await page.goto(google_maps_url, wait_until='domcontentloaded', timeout=60000)
                
                # Ждем загрузки основного контента
                await page.wait_for_timeout(5000)
                
                # Пытаемся найти и кликнуть на вкладку с отзывами
                try:
                    # Ищем кнопку "Reviews" на разных языках
                    reviews_selectors = [
                        'button[aria-label*="Reviews"]',
                        'button[aria-label*="Отзывы"]',
                        'button[aria-label*="المراجعات"]',
                        'button:has-text("Reviews")',
                        'button:has-text("Отзывы")',
                        'div[role="tab"]:has-text("Reviews")',
                        'div[role="tab"]:has-text("Отзывы")'
                    ]
                    
                    for selector in reviews_selectors:
                        try:
                            element = page.locator(selector).first
                            if await element.count() > 0:
                                await element.click(timeout=5000)
                                logger.info(f"Clicked reviews tab using selector: {selector}")
                                await page.wait_for_timeout(3000)
                                break
                        except:
                            continue
                except Exception as e:
                    logger.warning(f"Could not click reviews tab: {e}")
                
                # Скроллим вниз чтобы загрузить больше отзывов
                try:
                    # Ищем scrollable контейнер с отзывами
                    scrollable_selectors = [
                        'div[role="feed"]',
                        'div[aria-label*="Reviews"]',
                        'div.m6QErb'
                    ]
                    
                    for selector in scrollable_selectors:
                        scrollable = page.locator(selector).first
                        if await scrollable.count() > 0:
                            for i in range(3):
                                await scrollable.evaluate('el => el.scrollTop = el.scrollHeight')
                                await page.wait_for_timeout(1500)
                            logger.info(f"Scrolled reviews using selector: {selector}")
                            break
                except Exception as e:
                    logger.warning(f"Could not scroll reviews: {e}")
                
                # Получаем HTML
                content = await page.content()
                await browser.close()
                
                # Парсим HTML с помощью BeautifulSoup
                soup = BeautifulSoup(content, 'lxml')
                reviews = []
                
                # Ищем блоки с отзывами (несколько вариантов селекторов)
                review_divs = soup.find_all('div', {'data-review-id': True})
                
                if not review_divs:
                    # Альтернативные селекторы
                    review_divs = soup.find_all('div', class_=re.compile(r'jftiEf|fontBodyMedium'))
                
                logger.info(f"Found {len(review_divs)} potential review elements")
                
                for review_div in review_divs[:15]:  # Берем первые 15 отзывов
                    try:
                        # Извлекаем имя (несколько вариантов)
                        name = "Anonymous"
                        name_selectors = [
                            review_div.find('div', class_=re.compile(r'd4r55')),
                            review_div.find('button', class_=re.compile(r'WEBjve')),
                            review_div.find('div', class_=re.compile(r'TSUbDb'))
                        ]
                        for name_elem in name_selectors:
                            if name_elem and name_elem.text.strip():
                                name = name_elem.text.strip()
                                break
                        
                        # Извлекаем рейтинг
                        rating = 5  # По умолчанию
                        rating_elem = review_div.find('span', {'role': 'img', 'aria-label': True})
                        if rating_elem:
                            aria_label = rating_elem.get('aria-label', '')
                            rating_match = re.search(r'(\d+)', aria_label)
                            if rating_match:
                                rating = int(rating_match.group(1))
                        
                        # Извлекаем текст отзыва (несколько вариантов)
                        text = ""
                        text_selectors = [
                            review_div.find('span', class_=re.compile(r'wiI7pd')),
                            review_div.find('div', class_=re.compile(r'MyEned')),
                            review_div.find('span', {'data-expandable-section': True})
                        ]
                        for text_elem in text_selectors:
                            if text_elem and text_elem.text.strip():
                                text = text_elem.text.strip()
                                break
                        
                        # Фильтруем только 5-звездочные с текстом
                        if rating == 5 and text and len(text) > 20:  # Минимум 20 символов
                            reviews.append({
                                "name": name,
                                "rating": rating,
                                "text": text,
                                "avatar": name[0].upper() if name and name != "Anonymous" else "?"
                            })
                            logger.info(f"Extracted review from {name}: {text[:50]}...")
                    except Exception as e:
                        logger.error(f"Error parsing review: {e}")
                        continue
                
                logger.info(f"Successfully scraped {len(reviews)} 5-star reviews from Google Maps")
                return reviews
                
        except Exception as e:
            logger.error(f"Error scraping Google Maps: {e}")
            return []

google_scraper = GoogleMapsScraper()
