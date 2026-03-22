"""
Universal Messenger - Единый оркестратор отправки уведомлений
Реализует паттерн SSOT для всех коммуникаций (Email, TG, IG, WA, In-App).
Поддерживает шаблоны из базы данных, отложенную отправку и единый лог.
"""
import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Literal, Set

from db.companies import QuotaExceededError, ensure_company_quota
from utils.logger import log_info, log_error, log_warning
from db.connection import get_db_connection
from utils.datetime_utils import get_current_time
from utils.tenant_context import get_current_company_id

Platform = Literal['instagram', 'telegram', 'whatsapp', 'email', 'in_app', 'auto']
_clients_columns_cache: Optional[Set[str]] = None


def _load_clients_columns() -> Set[str]:
    """Кэшированная загрузка колонок таблицы clients для безопасных запросов."""
    global _clients_columns_cache
    if _clients_columns_cache is not None:
        return _clients_columns_cache

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'clients'
            """
        )
        _clients_columns_cache = {row[0] for row in c.fetchall()}
    except Exception as e:
        log_warning(f"Failed to inspect clients columns: {e}", "messenger")
        _clients_columns_cache = set()
    finally:
        conn.close()

    return _clients_columns_cache


def _has_clients_column(column_name: str) -> bool:
    return column_name in _load_clients_columns()


def _is_valid_instagram_recipient_id(recipient_id: str) -> bool:
    normalized = str(recipient_id or "").strip()
    if not normalized:
        return False
    return normalized.isdigit()


def _resolve_message_company_id(
    recipient_id: str,
    *,
    user_id: Optional[int] = None,
    booking_id: Optional[int] = None,
    context: Optional[Dict[str, Any]] = None,
) -> Optional[int]:
    if isinstance(context, dict):
        raw_company_id = context.get("company_id")
        if raw_company_id not in {None, ""}:
            try:
                resolved = int(raw_company_id)
                if resolved > 0:
                    return resolved
            except (TypeError, ValueError):
                pass

    current_company_id = get_current_company_id()
    if current_company_id:
        return int(current_company_id)

    conn = get_db_connection()
    c = conn.cursor()
    try:
        if user_id:
            c.execute("SELECT company_id FROM users WHERE id = %s LIMIT 1", (user_id,))
            row = c.fetchone()
            if row and row[0]:
                return int(row[0])

        if booking_id:
            c.execute("SELECT company_id FROM bookings WHERE id = %s LIMIT 1", (booking_id,))
            row = c.fetchone()
            if row and row[0]:
                return int(row[0])

        if recipient_id:
            c.execute(
                """
                SELECT company_id
                FROM clients
                WHERE instagram_id = %s
                   OR username = %s
                   OR telegram_id = %s
                   OR email = %s
                LIMIT 1
                """,
                (recipient_id, recipient_id, recipient_id, recipient_id),
            )
            row = c.fetchone()
            if row and row[0]:
                return int(row[0])
    except Exception as e:
        log_warning(f"Failed to resolve company for message recipient '{recipient_id}': {e}", "messenger")
    finally:
        conn.close()

    return None

async def send_universal_message(
    recipient_id: str,
    text: Optional[str] = None,
    platform: Platform = 'auto',
    template_name: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
    user_id: Optional[int] = None,
    booking_id: Optional[int] = None,
    scheduled_at: Optional[datetime] = None,
    subject: Optional[str] = None
) -> Dict[str, Any]:
    """
    Основная функция для отправки любого сообщения.
    
    Args:
        recipient_id: ID получателя (phone, email, tg_id, ig_id)
        text: Текст сообщения (если не используется шаблон)
        platform: Платформа ('auto' для выбора по формату ID)
        template_name: Имя шаблона из notification_templates
        context: Переменные для подстановки в шаблон
        user_id: ID сотрудника (для In-App уведомлений)
        booking_id: ID записи (для привязки в логах)
        scheduled_at: Время отложенной отправки
        subject: Тема письма (для Email)
        
    Returns:
        Dict с результатом: {"success": bool, "error": str, "log_id": int}
    """
    resolved_context = dict(context or {})
    company_id = _resolve_message_company_id(
        recipient_id,
        user_id=user_id,
        booking_id=booking_id,
        context=resolved_context,
    )
    
    # 1. Если запланировано на потом - просто сохраняем в базу со статусом 'scheduled'
    if scheduled_at and scheduled_at > get_current_time():
        log_id = save_to_log(
            recipient_id=recipient_id,
            user_id=user_id,
            booking_id=booking_id,
            company_id=company_id,
            medium=platform,
            title=subject or template_name,
            content=text,
            template_name=template_name,
            status='scheduled',
            scheduled_at=scheduled_at
        )
        log_info(f"📅 Message scheduled for {scheduled_at} to {recipient_id}", "messenger")
        return {"success": True, "log_id": log_id, "status": "scheduled"}

    # 2. Автоопределение платформы
    if platform == 'auto':
        platform = detect_platform(recipient_id)
        log_info(f"📨 Auto-detected platform: {platform} for {recipient_id[:8]}...", "messenger")

    # 3. Обработка шаблона
    final_text = text
    final_subject = subject
    
    if template_name:
        template = get_notification_template(template_name)
        if template:
            final_text = template.get('body') or final_text
            final_subject = subject or template.get('subject')
            
            # Подстановка переменных
            if resolved_context and final_text:
                try:
                    # Добавляем стандартные переменные
                    if 'salon_name' not in resolved_context:
                        from utils.email_service import get_salon_name
                        resolved_context['salon_name'] = get_salon_name()
                    
                    final_text = final_text.format(**resolved_context)
                    if final_subject:
                        final_subject = final_subject.format(**resolved_context)
                except Exception as e:
                    log_warning(f"Error rendering template {template_name}: {e}", "messenger")

    if not final_text:
        return {"success": False, "error": "No content to send"}

    # 4. Отправка
    success = False
    error_msg = None
    
    try:
        if company_id:
            ensure_company_quota(int(company_id), "messages", 1)

        if platform == 'instagram':
            if not _is_valid_instagram_recipient_id(recipient_id):
                error_msg = "invalid_instagram_recipient_id"
                success = False
                log_warning(f"Skip Instagram send: invalid recipient id '{recipient_id}'", "messenger")
            else:
                from integrations.instagram import send_message as send_instagram
                res = await send_instagram(recipient_id, final_text)
                success = "error" not in res
                if not success:
                    error_msg = res.get("error")
            
        elif platform == 'telegram':
            chat_id = await resolve_telegram_id(recipient_id)
            if chat_id:
                from integrations.telegram_bot import telegram_bot
                res = await telegram_bot.send_message(chat_id, final_text)
                success = res.get("ok", False)
                if not success: error_msg = res.get("description") or str(res)
            else:
                error_msg = "Telegram chat_id not found"
                success = False
            
        elif platform == 'email':
            from utils.email_service import send_email
            unsubscribe_link = context.get("unsubscribe_link") if context else None
            success = send_email(
                recipient_id, 
                final_subject or "Notification", 
                final_text,
                unsubscribe_link=unsubscribe_link
            )
            if not success: error_msg = "Smtp failure"
            
        elif platform == 'in_app':
            if user_id:
                from crm_api.notifications import create_notification
                success = create_notification(user_id, final_subject or "System", final_text)
            else:
                error_msg = "user_id required for in_app"
                
        elif platform == 'whatsapp':
            log_error("WhatsApp not implemented", "messenger")
            error_msg = "Not implemented"
            
        else:
            log_error(f"Unknown platform: {platform}", "messenger")
            error_msg = f"Unknown platform: {platform}"
    except QuotaExceededError as quota_error:
        log_warning(
            f"Message quota reached for company {company_id}: {quota_error.detail}",
            "messenger",
        )
        log_id = save_to_log(
            recipient_id=recipient_id,
            user_id=user_id,
            booking_id=booking_id,
            company_id=company_id,
            medium=platform,
            title=final_subject,
            content=final_text,
            template_name=template_name,
            status='failed',
            error_message='quota_exceeded',
        )
        return {
            "success": False,
            "error": "quota_exceeded",
            "quota": quota_error.detail,
            "log_id": log_id,
            "platform": platform,
        }
    except Exception as e:
        log_error(f"❌ Failed to send via {platform}: {e}", "messenger")
        error_msg = str(e)
        success = False

    # 5. Логирование результата
    log_id = save_to_log(
        recipient_id=recipient_id,
        user_id=user_id,
        booking_id=booking_id,
        company_id=company_id,
        medium=platform,
        title=final_subject,
        content=final_text,
        template_name=template_name,
        status='sent' if success else 'failed',
        error_message=error_msg,
        sent_at=get_current_time() if success else None
    )

    if success:
        log_info(f"✅ {platform.capitalize()} message sent to {recipient_id[:15]}...", "messenger")
    
    return {"success": success, "error": error_msg, "log_id": log_id, "platform": platform}

async def resolve_telegram_id(recipient_id: str) -> Optional[str]:
    """Разрешение Telegram ID из различных форматов"""
    if not recipient_id: return None
    
    # Если это уже числовой ID
    clean_id = recipient_id.replace('telegram_', '')
    if clean_id.lstrip('-').isdigit():
        return clean_id
    
    # Поиск в базе по messenger_messages
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT telegram_chat_id FROM messenger_messages 
            WHERE (
                client_id = %s
                OR client_id IN (
                    SELECT instagram_id
                    FROM clients
                    WHERE instagram_id = %s OR username = %s OR telegram_id = %s
                )
            )
            AND messenger_type = 'telegram'
            ORDER BY created_at DESC LIMIT 1
        """, (recipient_id, recipient_id, recipient_id, recipient_id))
        res = c.fetchone()
        if res: return str(res[0])
        
        # Поиск в clients
        c.execute(
            """
            SELECT telegram_id
            FROM clients
            WHERE telegram_id IS NOT NULL
              AND (instagram_id = %s OR username = %s OR telegram_id = %s)
            LIMIT 1
            """,
            (recipient_id, recipient_id, recipient_id),
        )
        res = c.fetchone()
        if res and res[0]: return str(res[0])
    except Exception as e:
        log_warning(f"Failed to resolve telegram id for recipient '{recipient_id}': {e}", "messenger")
    finally: conn.close()
    return None

def detect_platform(recipient_id: str) -> Platform:
    """Определение платформы по формату ID и истории"""
    if not recipient_id: return 'instagram'
    
    if '@' in recipient_id: return 'email'
    if recipient_id.startswith('telegram_'): return 'telegram'
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # 1. Проверяем preferred_messenger в профиле
        if _has_clients_column("preferred_messenger"):
            c.execute(
                """
                SELECT preferred_messenger
                FROM clients
                WHERE instagram_id = %s OR telegram_id = %s OR username = %s
                LIMIT 1
                """,
                (recipient_id, recipient_id, recipient_id),
            )
            res = c.fetchone()
            if res and res[0]:
                return res[0]
        
        # 2. Проверяем наличие истории в Telegram
        c.execute("SELECT COUNT(*) FROM messenger_messages WHERE client_id = %s AND messenger_type = 'telegram'", (recipient_id,))
        if c.fetchone()[0] > 0: return 'telegram'
        
        # 3. Проверяем наличие истории в Instagram
        c.execute("SELECT COUNT(*) FROM chat_history WHERE instagram_id = %s", (recipient_id,))
        if c.fetchone()[0] > 0: return 'instagram'
        
    except Exception as e:
        log_warning(f"Failed to auto-detect platform for recipient '{recipient_id}': {e}", "messenger")
    finally: conn.close()
    
    if recipient_id.isdigit():
        if len(recipient_id) >= 15: return 'instagram'
        return 'telegram'
        
    return 'instagram'

def get_notification_template(name: str) -> Optional[Dict[str, Any]]:
    """Получить шаблон из БД"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM notification_templates WHERE name = %s", (name,))
        row = c.fetchone()
        if row:
            cols = [d[0] for d in c.description]
            return dict(zip(cols, row))
    except Exception as e:
        log_error(f"Error fetching template {name}: {e}", "messenger")
    finally:
        conn.close()
    return None

def save_to_log(**kwargs) -> int:
    """Сохранение в unified_communication_log"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO unified_communication_log 
            (client_id, user_id, booking_id, company_id, medium, template_name, title, content, status, error_message, scheduled_at, sent_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            kwargs.get('recipient_id'),
            kwargs.get('user_id'),
            kwargs.get('booking_id'),
            kwargs.get('company_id'),
            kwargs.get('medium'),
            kwargs.get('template_name'),
            kwargs.get('title'),
            kwargs.get('content'),
            kwargs.get('status', 'sent'),
            kwargs.get('error_message'),
            kwargs.get('scheduled_at'),
            kwargs.get('sent_at')
        ))
        log_id = c.fetchone()[0]
        conn.commit()
        return log_id
    except Exception as e:
        log_error(f"Error saving message log: {e}", "messenger")
        return 0
    finally:
        conn.close()

# Backward compatibility items
async def send_message(recipient_id: str, text: str) -> bool:
    res = await send_universal_message(recipient_id, text=text)
    return res.get("success", False)

async def send_to_all_channels(client_id: str, text: str) -> Dict[str, bool]:
    """Заглушка для совместимости, шлет во все известные каналы клиента"""
    results = {}
    platforms: List[Platform] = ['instagram', 'telegram', 'email']
    for p in platforms:
        res = await send_universal_message(client_id, text=text, platform=p)
        results[p] = res.get("success", False)
    return results
