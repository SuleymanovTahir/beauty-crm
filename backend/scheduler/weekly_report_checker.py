"""
Периодическая задача для отправки еженедельного отчета администратору
"""
import os
import json
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from db.connection import get_db_connection
from db.settings import get_salon_settings
from utils.email import send_email_async
from utils.logger import log_info, log_error
from utils.language_utils import validate_language

def _get_translation_string(language: str, key: str, default_val: str) -> str:
    """Helper to load translation from common.json files"""
    import json
    from pathlib import Path
    
    base_dir = Path(__file__).parent.parent.parent
    locales_file = base_dir / 'frontend' / 'src' / 'locales' / language / 'common.json'
    
    if locales_file.exists():
        try:
            with open(locales_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Handle nested keys like 'calls.duration'
                parts = key.split('.')
                current = data
                for p in parts:
                    if isinstance(current, dict) and p in current:
                        current = current[p]
                    else:
                        return default_val
                return current
        except:
            pass
    return default_val

async def generate_and_send_weekly_report():
    """Сгенерировать и отправить еженедельный аналитический отчет"""
    log_info("📊 Генерируем еженедельный отчет...", "scheduler")
    
    settings = get_salon_settings()
    admin_email = settings.get('email')
    salon_name = settings.get('name', 'Beauty CRM')
    currency = settings.get('currency', '₽')
    
    # Определяем язык для отчета (приоритет: настройки салона, затем системный default)
    report_lang = validate_language(settings.get('language', 'ru'))

    if not admin_email:
        log_error("❌ Email администратора не настроен, отчет не будет отправлен", "scheduler")
        return

    # Период: прошлая неделя (с понедельника по воскресенье)
    today = datetime.now()
    last_monday = today - timedelta(days=today.weekday() + 7)
    last_sunday = last_monday + timedelta(days=6)
    
    # Форматирование дат для SQL и отображения
    start_date = last_monday.replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = last_sunday.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    period_text = f"{start_date.strftime('%d.%m.%Y')} - {end_date.strftime('%d.%m.%Y')}"

    # Локализация текстов (адаптация под выбранный язык)
    texts = {
        "report_title": _get_translation_string(report_lang, "weekly_report_title", "Weekly Analytics Report"),
        "period": _get_translation_string(report_lang, "period_label", "Period"),
        "active_bookings": _get_translation_string(report_lang, "active_bookings_end", "Active bookings at the end of the period"),
        "active_sum": _get_translation_string(report_lang, "active_sum_label", "Sum of active bookings"),
        "completed_count": _get_translation_string(report_lang, "completed_bookings", "Successfully completed bookings"),
        "revenue": _get_translation_string(report_lang, "revenue_label", "Weekly revenue"),
        "failed_count": _get_translation_string(report_lang, "failed_bookings", "Cancelled or rejected bookings"),
        "lost_revenue": _get_translation_string(report_lang, "lost_revenue_label", "Lost revenue"),
        "new_bookings": _get_translation_string(report_lang, "new_bookings_created", "New bookings created"),
        "new_clients": _get_translation_string(report_lang, "new_clients_registered", "New clients registered"),
        "footer_text": _get_translation_string(report_lang, "report_footer", "This is an automatic report for the past week. You can change notification settings in the admin panel."),
        "per_week": _get_translation_string(report_lang, "per_week", "per week")
    }

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 1. Активные записи на конец периода (pending, confirmed)
        c.execute("""
            SELECT count(*), COALESCE(sum(revenue), 0) 
            FROM bookings 
            WHERE status IN ('pending', 'confirmed') 
            AND datetime <= %s
        """, (end_date,))
        active_count, active_sum = c.fetchone()

        # 2. Успешно завершено (completed) за неделю
        c.execute("""
            SELECT count(*), COALESCE(sum(revenue), 0) 
            FROM bookings 
            WHERE status = 'completed' 
            AND datetime >= %s AND datetime <= %s
        """, (start_date, end_date))
        completed_count, completed_sum = c.fetchone()

        # 3. Нереализовано (cancelled, rejected) за неделю 
        c.execute("""
            SELECT count(*), COALESCE(sum(revenue), 0) 
            FROM bookings 
            WHERE status IN ('cancelled', 'rejected') 
            AND datetime >= %s AND datetime <= %s
        """, (start_date, end_date))
        failed_count, failed_sum = c.fetchone()

        # 4. Создано новых записей за период
        c.execute("""
            SELECT count(*) 
            FROM bookings 
            WHERE created_at >= %s AND created_at <= %s
        """, (start_date, end_date))
        new_bookings_count = c.fetchone()[0]

        # 5. Новых клиентов за период
        c.execute("""
            SELECT count(*) 
            FROM clients 
            WHERE first_contact >= %s AND first_contact <= %s
        """, (start_date, end_date))
        new_clients_count = c.fetchone()[0]

        # HTML Шаблон (адаптированный под пользователя)
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #fdf2f8; color: #333; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }}
                .header {{ background: #000; color: #fff; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 24px; letter-spacing: 1px; }}
                .header p {{ margin: 10px 0 0; opacity: 0.8; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; }}
                .content {{ padding: 30px; }}
                .stat-card {{ border-bottom: 1px solid #eee; padding: 15px 0; display: flex; justify-content: space-between; align-items: center; }}
                .stat-card:last-child {{ border-bottom: none; }}
                .label {{ font-size: 14px; color: #666; }}
                .value {{ font-weight: bold; font-size: 18px; color: #000; }}
                .sub-text {{ font-size: 11px; color: #999; margin-top: 2px; }}
                .footer {{ background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999; }}
                .brand-accent {{ width: 40px; height: 3px; background-color: #db2777; margin: 15px auto 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{texts['report_title']}</h1>
                    <div class="brand-accent"></div>
                    <p>{salon_name} | {period_text}</p>
                </div>
                <div class="content">
                    <div class="stat-card">
                        <div>
                            <div class="label">{texts['active_bookings']}</div>
                            <div class="sub-text">{texts['per_week']}</div>
                        </div>
                        <div class="value">{active_count}</div>
                    </div>
                    <div class="stat-card">
                        <div>
                            <div class="label">{texts['active_sum']}</div>
                            <div class="sub-text">{texts['per_week']}</div>
                        </div>
                        <div class="value">{active_sum:,.0f} {currency}</div>
                    </div>
                    <div class="stat-card" style="margin-top: 10px; border-top: 2px solid #000; padding-top: 20px;">
                        <div>
                            <div class="label" style="font-weight: bold; color: #000;">{texts['completed_count']}</div>
                            <div class="sub-text">{texts['per_week']}</div>
                        </div>
                        <div class="value" style="color: #10b981;">{completed_count}</div>
                    </div>
                    <div class="stat-card">
                        <div>
                            <div class="label" style="font-weight: bold; color: #000;">{texts['revenue']}</div>
                            <div class="sub-text">{texts['per_week']}</div>
                        </div>
                        <div class="value" style="color: #10b981;">{completed_sum:,.0f} {currency}</div>
                    </div>
                    <div class="stat-card" style="margin-top: 10px;">
                        <div>
                            <div class="label">{texts['failed_count']}</div>
                            <div class="sub-text">{texts['per_week']}</div>
                        </div>
                        <div class="value" style="color: #ef4444;">{failed_count}</div>
                    </div>
                    <div class="stat-card">
                        <div>
                            <div class="label">{texts['lost_revenue']}</div>
                            <div class="sub-text">{texts['per_week']}</div>
                        </div>
                        <div class="value" style="color: #ef4444;">{failed_sum:,.0f} {currency}</div>
                    </div>
                    <div class="stat-card" style="margin-top: 20px; background: #fdf2f8; padding: 15px; border-radius: 8px; border: none;">
                        <div>
                            <div class="label">{texts['new_bookings']}</div>
                            <div class="sub-text">{texts['per_week']}</div>
                        </div>
                        <div class="value" style="color: #db2777;">{new_bookings_count}</div>
                    </div>
                    <div class="stat-card" style="background: #fdf2f8; padding: 15px; margin-top: 10px; border-radius: 8px; border: none;">
                        <div>
                            <div class="label">{texts['new_clients']}</div>
                            <div class="sub-text">{texts['per_week']}</div>
                        </div>
                        <div class="value" style="color: #db2777;">{new_clients_count}</div>
                    </div>
                </div>
                <div class="footer">
                    {texts['footer_text']}
                </div>
            </div>
        </body>
        </html>
        """

        subject = f"📊 {texts['report_title']} {salon_name}: {period_text}"
        
        await send_email_async(
            recipients=[admin_email],
            subject=subject,
            message=f"{texts['report_title']} {period_text} - {salon_name}",
            html=html_content
        )
        
        log_info(f"✅ Еженедельный отчет успешно отправлен на {admin_email} (Язык: {report_lang})", "scheduler")

    except Exception as e:
        log_error(f"❌ Ошибка генерации еженедельного отчета: {e}", "scheduler")
    finally:
        conn.close()

def start_weekly_report_checker(scheduler: AsyncIOScheduler):
    """Запустить планировщик для еженедельного отчета (каждый понедельник в 09:00)"""
    scheduler.add_job(
        generate_and_send_weekly_report,
        'cron',
        day_of_week='mon',
        hour=9,
        minute=0,
        id='weekly_analytics_report'
    )
    log_info("⏰ Планировщик еженедельных отчетов запущен (Mon 09:00)", "scheduler")
