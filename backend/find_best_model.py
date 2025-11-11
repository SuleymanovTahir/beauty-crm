#!/usr/bin/env python3
"""
Автоматический поиск лучшей бесплатной модели Gemini
"""
import httpx
import asyncio
import time
from typing import Dict, List, Tuple
import os
from dotenv import load_dotenv

# Загружаем .env.local
load_dotenv('.env.local')

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Приоритетные модели для проверки (бесплатные, стабильные)
PRIORITY_MODELS = [
    "gemini-2.5-flash",           # Новейшая Flash
    "gemini-2.0-flash",           # Стабильная 2.0
    "gemini-2.0-flash-001",       # Версионная 2.0
    "gemini-flash-latest",        # Алиас на актуальную
    "gemini-2.5-pro",             # Мощная Pro
    "gemini-2.0-pro-exp",         # Экспериментальная Pro
    "gemini-2.5-flash-lite",      # Лёгкая версия
    "gemini-2.0-flash-lite",      # Лёгкая 2.0
]

async def check_model(model_name: str, key: str) -> Dict:
    """Проверить одну модель"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
    
    payload = {
        "contents": [{
            "parts": [{"text": "Hello, test"}]
        }],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 50
        }
    }
    
    result = {
        "name": model_name,
        "status": "unknown",
        "response_time": None,
        "error": None,
        "working": False
    }
    
    try:
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload)
            
        response_time = time.time() - start_time
        result["response_time"] = round(response_time, 2)
        
        if response.status_code == 200:
            data = response.json()
            if "candidates" in data:
                result["status"] = "✅ РАБОТАЕТ"
                result["working"] = True
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                result["sample"] = text[:30] + "..." if len(text) > 30 else text
            else:
                result["status"] = "⚠️ Странный ответ"
                
        elif response.status_code == 429:
            result["status"] = "⏱️ RATE LIMIT"
            result["error"] = "Лимит исчерпан"
            
        elif response.status_code == 404:
            result["status"] = "❌ НЕ НАЙДЕНА"
            result["error"] = "Модель не существует"
            
        elif response.status_code == 400:
            result["status"] = "❌ INVALID KEY"
            result["error"] = "Ключ недействителен"
            
        elif response.status_code == 403:
            result["status"] = "❌ FORBIDDEN"
            result["error"] = "Доступ запрещён"
            
        else:
            result["status"] = f"⚠️ HTTP {response.status_code}"
            result["error"] = response.text[:100]
            
    except httpx.TimeoutException:
        result["status"] = "⏱️ TIMEOUT"
        result["error"] = "Не ответил за 15 секунд"
        
    except Exception as e:
        result["status"] = "❌ ОШИБКА"
        result["error"] = str(e)[:100]
    
    return result

async def main():
    print("\n" + "="*70)
    print("🔍 ПОИСК ЛУЧШЕЙ БЕСПЛАТНОЙ МОДЕЛИ GEMINI")
    print("="*70)
    print(f"🔑 API Key: {GEMINI_API_KEY[:20]}...{GEMINI_API_KEY[-10:]}")
    print(f"📦 Проверяем {len(PRIORITY_MODELS)} моделей...")
    print("="*70)
    
    # Проверяем все модели параллельно (но с небольшой задержкой)
    results = []
    for i, model in enumerate(PRIORITY_MODELS):
        print(f"\n[{i+1}/{len(PRIORITY_MODELS)}] Проверяем: {model}...", end=" ")
        result = await check_model(model, GEMINI_API_KEY)
        results.append(result)
        print(result["status"], end="")
        if result["response_time"]:
            print(f" ({result['response_time']}s)")
        else:
            print()
        
        # Небольшая задержка между запросами
        if i < len(PRIORITY_MODELS) - 1:
            await asyncio.sleep(0.5)
    
    # Фильтруем работающие модели
    working_models = [r for r in results if r["working"]]
    
    print("\n" + "="*70)
    print("📊 РЕЗУЛЬТАТЫ")
    print("="*70)
    
    if not working_models:
        print("❌ НИ ОДНА МОДЕЛЬ НЕ РАБОТАЕТ!")
        print("\n💡 Возможные причины:")
        print("1. Все модели исчерпали лимит → Подожди 1-2 минуты")
        print("2. API ключ недействителен → Создай новый")
        print("3. Проблемы с сетью → Проверь подключение")
        print("\n🔗 Создать новый ключ: https://aistudio.google.com/app/apikey")
        return
    
    # Сортируем по скорости (быстрые лучше)
    working_models.sort(key=lambda x: x["response_time"])
    
    print(f"\n✅ Работающих моделей: {len(working_models)}")
    print("\n🏆 ТОП-3 ЛУЧШИХ МОДЕЛЕЙ:\n")
    
    for i, model in enumerate(working_models[:3], 1):
        print(f"{i}. {model['name']}")
        print(f"   Скорость: {model['response_time']}s")
        if 'sample' in model:
            print(f"   Пример: {model['sample']}")
        print()
    
    # Выбираем лучшую
    best_model = working_models[0]
    
    print("="*70)
    print("🎯 РЕКОМЕНДАЦИЯ")
    print("="*70)
    print(f"\n✅ Лучшая модель: {best_model['name']}")
    print(f"⚡ Скорость ответа: {best_model['response_time']}s")
    print(f"💰 Статус: Бесплатная (Free Tier)")
    
    print("\n📝 ЧТО ДЕЛАТЬ ДАЛЬШЕ:")
    print(f"\n1. Открой файл: backend/bot/core.py")
    print(f"\n2. Найди строку ~52:")
    print(f"   self.model = genai.GenerativeModel('gemini-2.0-flash-exp')")
    print(f"\n   Замени на:")
    print(f"   self.model = genai.GenerativeModel('{best_model['name']}')")
    
    print(f"\n3. Найди строку ~173:")
    print(f"   url = f\"...models/gemini-2.0-flash-exp:generateContent...\"")
    print(f"\n   Замени на:")
    print(f"   url = f\"...models/{best_model['name']}:generateContent...\"")
    
    print("\n4. Перезапусти бота:")
    print("   python main.py")
    
    print("\n" + "="*70)
    
    # Показываем модели с rate limit
    rate_limited = [r for r in results if "RATE LIMIT" in r["status"]]
    if rate_limited:
        print(f"\n⏱️ Модели с Rate Limit ({len(rate_limited)}):")
        for model in rate_limited:
            print(f"   • {model['name']}")
        print("   Подожди 1-2 минуты и они снова заработают")
    
    print("\n" + "="*70)
    
    # Сохраняем конфиг
    print("\n💾 Сохранить конфигурацию?")
    config_content = f"""# Лучшая модель (автоматически выбрана {time.strftime('%Y-%m-%d %H:%M:%S')})
GEMINI_MODEL={best_model['name']}
# Скорость ответа: {best_model['response_time']}s
# Остальные работающие модели:
{chr(10).join([f'# - {m["name"]} ({m["response_time"]}s)' for m in working_models[1:4]])}
"""
    
    with open('.gemini_best_model', 'w') as f:
        f.write(config_content)
    
    print(f"✅ Конфигурация сохранена в .gemini_best_model")

if __name__ == "__main__":
    asyncio.run(main())