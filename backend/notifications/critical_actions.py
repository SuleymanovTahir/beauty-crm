"""
Email уведомления о критичных действиях
"""
import asyncio
from typing import Dict, Any
from datetime import datetime
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from utils.audit import get_pending_critical_actions, mark_critical_as_notified

async def send_critical_action_notification(action_data: Dict[str, Any]):
    """
    Отправить email уведомление о критичном действии
    
    Args:
        action_data: Данные из audit_log
    """
    try:
        # Получаем email директоров
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            SELECT email, full_name FROM users 
            WHERE role = 'director' AND email IS NOT NULL
        """)
        
        directors = c.fetchall()
        conn.close()
        
        if not directors:
            log_info("⚠️ No directors with email found", "notifications")
            return
        
        # Формируем тему и текст письма
        action = action_data.get('action', 'unknown')
        entity_type = action_data.get('entity_type', 'unknown')
        username = action_data.get('username', 'Unknown')
        user_role = action_data.get('user_role', 'unknown')
        created_at = action_data.get('created_at', datetime.now())
        
        # Эмодзи для разных действий
        emoji_map = {
            'delete': '🗑️',
            'create': '➕',
            'update': '✏️',
            'restore': '♻️'
        }
        emoji = emoji_map.get(action, '⚠️')
        
        # Русские названия действий
        action_names = {
            'delete': 'Удаление',
            'create': 'Создание',
            'update': 'Изменение',
            'restore': 'Восстановление'
        }
        action_name = action_names.get(action, action)
        
        # Русские названия сущностей
        entity_names = {
            'booking': 'записи',
            'client': 'клиента',
            'user': 'пользователя',
            'settings': 'настроек'
        }
        entity_name = entity_names.get(entity_type, entity_type)
        
        subject = f"{emoji} Критичное действие: {action_name} {entity_name}"
        
        body = f"""
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
        .info-row {{ margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }}
        .label {{ font-weight: bold; color: #374151; }}
        .value {{ color: #1f2937; }}
        .footer {{ margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 4px; font-size: 12px; color: #6b7280; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>{emoji} Критичное действие в системе</h2>
        </div>
        <div class="content">
            <div class="info-row">
                <span class="label">Действие:</span>
                <span class="value">{action_name} {entity_name}</span>
            </div>
            <div class="info-row">
                <span class="label">Пользователь:</span>
                <span class="value">{username} ({user_role})</span>
            </div>
            <div class="info-row">
                <span class="label">Время:</span>
                <span class="value">{created_at}</span>
            </div>
            <div class="info-row">
                <span class="label">IP адрес:</span>
                <span class="value">{action_data.get('ip_address', 'Неизвестно')}</span>
            </div>
"""
        
        # Добавляем детали изменений если есть
        if action_data.get('old_value') or action_data.get('new_value'):
            body += """
            <div class="info-row">
                <span class="label">Детали изменений:</span>
                <div style="margin-top: 10px;">
"""
            if action_data.get('old_value'):
                body += f"""
                    <div style="margin: 5px 0;">
                        <strong>Было:</strong><br>
                        <code style="background: #fee; padding: 5px; display: block; margin-top: 5px;">{action_data.get('old_value')}</code>
                    </div>
"""
            if action_data.get('new_value'):
                body += f"""
                    <div style="margin: 5px 0;">
                        <strong>Стало:</strong><br>
                        <code style="background: #efe; padding: 5px; display: block; margin-top: 5px;">{action_data.get('new_value')}</code>
                    </div>
"""
            body += """
                </div>
            </div>
"""
        
        body += """
        </div>
        <div class="footer">
            <p>Это автоматическое уведомление из Beauty CRM.</p>
            <p>Если вы не ожидали этого действия, немедленно проверьте систему.</p>
        </div>
    </div>
</body>
</html>
"""
        
        # Отправляем email всем директорам
        from notifications.email_service import send_email
        
        for email, name in directors:
            try:
                await send_email(
                    to_email=email,
                    subject=subject,
                    body=body,
                    is_html=True
                )
                log_info(f"✅ Critical action notification sent to {name} ({email})", "notifications")
            except Exception as e:
                log_error(f"❌ Failed to send notification to {email}: {e}", "notifications")
        
    except Exception as e:
        log_error(f"Error sending critical action notification: {e}", "notifications")

async def process_pending_notifications():
    """Обработать все ожидающие уведомления о критичных действиях"""
    try:
        pending = get_pending_critical_actions()
        
        if not pending:
            return
        
        log_info(f"📧 Processing {len(pending)} pending critical action notifications", "notifications")
        
        for action in pending:
            await send_critical_action_notification(action)
            mark_critical_as_notified(action['critical_id'])
        
        log_info(f"✅ Processed {len(pending)} notifications", "notifications")
        
    except Exception as e:
        log_error(f"Error processing pending notifications: {e}", "notifications")

# Фоновая задача для периодической отправки уведомлений
async def notification_worker():
    """Фоновая задача для отправки уведомлений каждые 5 минут"""
    while True:
        try:
            await process_pending_notifications()
        except Exception as e:
            log_error(f"Error in notification worker: {e}", "notifications")
        
        # Ждем 5 минут
        await asyncio.sleep(300)
