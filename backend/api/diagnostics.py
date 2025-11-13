"""
Диагностический роутер для отладки проблем с мастерами и услугами
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3
from datetime import datetime

from config import DATABASE_NAME
from utils import require_auth
from logger import log_info, log_error

router = APIRouter(tags=["Diagnostics"])


@router.get("/diagnostics/full")
async def full_diagnostics(session_token: Optional[str] = Cookie(None)):
    """ПОЛНАЯ диагностика: БД + Промпты + Настройки"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "database": {},
            "bot_prompt": {},
            "sample_request": {}
        }
        
        # ===== 1. ПРОВЕРКА БАЗЫ ДАННЫХ =====
        
        # Таблица employees
        c.execute("SELECT COUNT(*) FROM employees WHERE is_active = 1")
        active_employees = c.fetchone()[0]
        
        c.execute("""
            SELECT id, full_name, position, is_active, sort_order
            FROM employees 
            ORDER BY sort_order
            LIMIT 5
        """)
        sample_employees = c.fetchall()
        
        result["database"]["employees"] = {
            "total_active": active_employees,
            "sample": [
                {
                    "id": emp[0],
                    "name": emp[1],
                    "position": emp[2],
                    "is_active": emp[3],
                    "sort_order": emp[4]
                }
                for emp in sample_employees
            ]
        }
        
        # Таблица employee_services
        c.execute("""
            SELECT COUNT(*) 
            FROM employee_services es
            JOIN employees e ON es.employee_id = e.id
            WHERE e.is_active = 1
        """)
        active_links = c.fetchone()[0]
        
        c.execute("""
            SELECT e.full_name, s.name, s.name_ru
            FROM employee_services es
            JOIN employees e ON es.employee_id = e.id
            JOIN services s ON es.service_id = s.id
            WHERE e.is_active = 1
            LIMIT 10
        """)
        sample_links = c.fetchall()
        
        result["database"]["employee_services"] = {
            "total_links": active_links,
            "sample": [
                {
                    "employee": link[0],
                    "service": link[1],
                    "service_ru": link[2]
                }
                for link in sample_links
            ]
        }
        
        # Таблица services
        c.execute("SELECT COUNT(*) FROM services WHERE is_active = 1")
        active_services = c.fetchone()[0]
        
        c.execute("""
            SELECT id, name, name_ru, category, price
            FROM services
            WHERE is_active = 1
            ORDER BY category
            LIMIT 10
        """)
        sample_services = c.fetchall()
        
        result["database"]["services"] = {
            "total_active": active_services,
            "sample": [
                {
                    "id": svc[0],
                    "name": svc[1],
                    "name_ru": svc[2],
                    "category": svc[3],
                    "price": svc[4]
                }
                for svc in sample_services
            ]
        }
        
        # ===== 2. ПРОВЕРКА ПРОМПТА БОТА =====
        
        from bot import get_bot
        from db import get_client_language
        
        bot = get_bot()
        
        # Создаем тестовую историю
        test_history = [
            ("Привет! Хочу записаться на маникюр", "client", datetime.now().isoformat(), "text", 1),
        ]
        
        # Генерируем промпт
        test_instagram_id = "diagnostic_test_user"
        test_language = "ru"
        
        system_prompt = bot.build_system_prompt(
            instagram_id=test_instagram_id,
            history=test_history,
            booking_progress={},
            client_language=test_language
        )
        
        # Ищем блок с мастерами
        has_masters_block = "ДОСТУПНЫЕ МАСТЕРА" in system_prompt or "МАСТЕРА" in system_prompt
        has_services_block = "УСЛУГИ САЛОНА" in system_prompt or "SERVICES" in system_prompt
        
        # Считаем упоминания
        c.execute("SELECT full_name, name_ru FROM employees WHERE is_active = 1")
        active_masters = c.fetchall()
        
        master_mentions = 0
        for eng_name, ru_name in active_masters:
            if eng_name and eng_name in system_prompt:
                master_mentions += 1
            if ru_name and ru_name in system_prompt:
                master_mentions += 1
        
        service_mentions = system_prompt.count("Manicure") + system_prompt.count("маникюр")
        
        result["bot_prompt"] = {
            "prompt_length": len(system_prompt),
            "has_masters_block": has_masters_block,
            "has_services_block": has_services_block,
            "master_mentions": master_mentions,
            "service_mentions": service_mentions,
            "prompt_preview": system_prompt[:500] + "..." if len(system_prompt) > 500 else system_prompt,
            "masters_section": extract_section(system_prompt, "МАСТЕРА") or extract_section(system_prompt, "EMPLOYEES"),
            "services_section": extract_section(system_prompt, "УСЛУГИ") or extract_section(system_prompt, "SERVICES")
        }
        
        # ===== 3. ТЕСТОВЫЙ ЗАПРОС =====
        
        from db.employees import get_employees_by_service
        from db.services import get_all_services
        
        # Находим услугу "Manicure"
        c.execute("""
            SELECT id, name, name_ru 
            FROM services 
            WHERE (name LIKE '%Manicure%' OR name_ru LIKE '%маникюр%')
            AND is_active = 1
            LIMIT 1
        """)
        manicure_service = c.fetchone()
        
        if manicure_service:
            service_id, service_name, service_name_ru = manicure_service
            
            # Получаем мастеров для этой услуги
            masters_for_service = get_employees_by_service(service_id)
            
            result["sample_request"] = {
                "service_id": service_id,
                "service_name": service_name,
                "service_name_ru": service_name_ru,
                "masters_found": len(masters_for_service),
                "masters": [
                    {
                        "id": m[0],
                        "name": m[1],
                        "position": m[2] if len(m) > 2 else None
                    }
                    for m in masters_for_service[:5]
                ]
            }
        else:
            result["sample_request"] = {
                "error": "Услуга 'Manicure' не найдена в БД!"
            }
        
        conn.close()
        
        # ===== 4. ИТОГОВАЯ ДИАГНОСТИКА =====
        
        issues = []
        
        if active_employees == 0:
            issues.append("❌ КРИТИЧНО: В таблице employees нет активных мастеров!")
        
        if active_services == 0:
            issues.append("❌ КРИТИЧНО: В таблице services нет активных услуг!")
        
        if active_links == 0:
            issues.append("❌ КРИТИЧНО: Таблица employee_services пуста - мастера не привязаны к услугам!")
        
        if not has_masters_block:
            issues.append("⚠️ В промпте отсутствует блок 'ДОСТУПНЫЕ МАСТЕРА'")
        
        if not has_services_block:
            issues.append("⚠️ В промпте отсутствует блок 'УСЛУГИ САЛОНА'")
        
        if master_mentions == 0:
            issues.append("⚠️ В промпте не упоминаются имена мастеров")
        
        if service_mentions == 0:
            issues.append("⚠️ В промпте не упоминаются названия услуг")
        
        result["issues"] = issues
        result["status"] = "CRITICAL" if any("КРИТИЧНО" in i for i in issues) else "WARNING" if issues else "OK"
        
        return result
        
    except Exception as e:
        log_error(f"Diagnostics error: {e}", "diagnostics")
        import traceback
        return JSONResponse({
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status_code=500)


def extract_section(text: str, marker: str) -> Optional[str]:
    """Извлечь секцию между маркером и следующей секцией"""
    try:
        start = text.find(marker)
        if start == -1:
            return None
        
        # Ищем следующую секцию (===)
        next_section = text.find("===", start + len(marker))
        if next_section == -1:
            return text[start:start+500]  # Берем 500 символов
        
        return text[start:next_section].strip()
    except:
        return None


@router.get("/diagnostics/prompt-test")
async def test_prompt_generation(
    service: str = "Manicure",
    session_token: Optional[str] = Cookie(None)
):
    """Тест генерации промпта для конкретной услуги"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        from bot import get_bot
        
        bot = get_bot()
        
        # Создаем тестовую историю
        test_history = [
            (f"Хочу записаться на {service}", "client", datetime.now().isoformat(), "text", 1),
        ]
        
        # Генерируем промпт
        system_prompt = bot.build_system_prompt(
            instagram_id="test_user",
            history=test_history,
            booking_progress={"service_name": service},
            client_language="ru"
        )
        
        # Извлекаем блоки
        masters_block = extract_section(system_prompt, "МАСТЕРА") or extract_section(system_prompt, "ДОСТУПНЫЕ МАСТЕРА")
        services_block = extract_section(system_prompt, "УСЛУГИ")
        availability_block = extract_section(system_prompt, "BOOKING AVAILABILITY") or extract_section(system_prompt, "📅 ДОСТУПНЫЕ МАСТЕРА")
        
        return {
            "service": service,
            "prompt_length": len(system_prompt),
            "full_prompt": system_prompt,
            "extracted_blocks": {
                "masters": masters_block,
                "services": services_block,
                "availability": availability_block
            }
        }
        
    except Exception as e:
        log_error(f"Prompt test error: {e}", "diagnostics")
        import traceback
        return JSONResponse({
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status_code=500)