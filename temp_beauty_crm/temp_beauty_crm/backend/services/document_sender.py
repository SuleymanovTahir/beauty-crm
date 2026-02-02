"""
Сервис для отправки документов через различные каналы
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional, List
import httpx
from utils.logger import log_info, log_error

class DocumentSender:
    """Отправка документов через различные каналы"""
    
    def __init__(self):
        self.smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_user = os.getenv('SMTP_USER', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.telegram_bot_token = os.getenv('TELEGRAM_BOT_TOKEN', '')
        self.whatsapp_api_url = os.getenv('WHATSAPP_API_URL', '')
        self.whatsapp_api_token = os.getenv('WHATSAPP_API_TOKEN', '')
    
    async def send_via_email(
        self,
        recipient_email: str,
        subject: str,
        body: str,
        file_path: str,
        filename: Optional[str] = None
    ) -> bool:
        """
        Отправить документ по email
        
        Args:
            recipient_email: Email получателя
            subject: Тема письма
            body: Текст письма
            file_path: Путь к файлу
            filename: Имя файла для вложения
            
        Returns:
            True если отправлено успешно
        """
        try:
            if not self.smtp_user or not self.smtp_password:
                log_error("SMTP credentials not configured", "email")
                return False
            
            # Создаем сообщение
            msg = MIMEMultipart()
            msg['From'] = self.smtp_user
            msg['To'] = recipient_email
            msg['Subject'] = subject
            
            # Добавляем текст
            msg.attach(MIMEText(body, 'html', 'utf-8'))
            
            # Добавляем файл
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    attachment = MIMEApplication(f.read(), _subtype='pdf')
                    attachment.add_header(
                        'Content-Disposition',
                        'attachment',
                        filename=filename or os.path.basename(file_path)
                    )
                    msg.attach(attachment)
            
            # Отправляем
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            log_info(f"Email sent to {recipient_email}", "email")
            return True
            
        except Exception as e:
            log_error(f"Error sending email: {e}", "email")
            return False
    
    async def send_via_telegram(
        self,
        chat_id: str,
        caption: str,
        file_path: str
    ) -> bool:
        """
        Отправить документ через Telegram
        
        Args:
            chat_id: ID чата Telegram
            caption: Подпись к документу
            file_path: Путь к файлу
            
        Returns:
            True если отправлено успешно
        """
        try:
            if not self.telegram_bot_token:
                log_error("Telegram bot token not configured", "telegram")
                return False
            
            url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendDocument"
            
            with open(file_path, 'rb') as f:
                files = {'document': f}
                data = {
                    'chat_id': chat_id,
                    'caption': caption
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, files=files, data=data)
                    
                if response.status_code == 200:
                    log_info(f"Telegram document sent to {chat_id}", "telegram")
                    return True
                else:
                    log_error(f"Telegram API error: {response.text}", "telegram")
                    return False
                    
        except Exception as e:
            log_error(f"Error sending Telegram document: {e}", "telegram")
            return False
    
    async def send_via_whatsapp(
        self,
        phone: str,
        message: str,
        file_path: str
    ) -> bool:
        """
        Отправить документ через WhatsApp
        
        Args:
            phone: Номер телефона получателя
            message: Текст сообщения
            file_path: Путь к файлу
            
        Returns:
            True если отправлено успешно
        """
        try:
            if not self.whatsapp_api_url or not self.whatsapp_api_token:
                log_error("WhatsApp API not configured", "whatsapp")
                return False
            
            # Используем WhatsApp Business API или сторонний сервис
            headers = {
                'Authorization': f'Bearer {self.whatsapp_api_token}',
                'Content-Type': 'application/json'
            }
            
            # Пример для WhatsApp Business API
            # Реальная реализация зависит от используемого API
            async with httpx.AsyncClient() as client:
                # Сначала загружаем медиа
                with open(file_path, 'rb') as f:
                    files = {'file': f}
                    upload_response = await client.post(
                        f"{self.whatsapp_api_url}/media",
                        headers={'Authorization': f'Bearer {self.whatsapp_api_token}'},
                        files=files
                    )
                
                if upload_response.status_code != 200:
                    log_error(f"WhatsApp media upload failed: {upload_response.text}", "whatsapp")
                    return False
                
                media_id = upload_response.json().get('id')
                
                # Отправляем документ
                payload = {
                    'messaging_product': 'whatsapp',
                    'to': phone,
                    'type': 'document',
                    'document': {
                        'id': media_id,
                        'caption': message
                    }
                }
                
                send_response = await client.post(
                    f"{self.whatsapp_api_url}/messages",
                    headers=headers,
                    json=payload
                )
                
                if send_response.status_code == 200:
                    log_info(f"WhatsApp document sent to {phone}", "whatsapp")
                    return True
                else:
                    log_error(f"WhatsApp send failed: {send_response.text}", "whatsapp")
                    return False
                    
        except Exception as e:
            log_error(f"Error sending WhatsApp document: {e}", "whatsapp")
            return False
    
    async def send_via_instagram(
        self,
        instagram_id: str,
        message: str,
        file_path: str
    ) -> bool:
        """
        Отправить документ через Instagram Direct
        
        Args:
            instagram_id: Instagram ID получателя
            message: Текст сообщения
            file_path: Путь к файлу
            
        Returns:
            True если отправлено успешно
        """
        try:
            # Instagram API не поддерживает отправку файлов напрямую
            # Можно использовать сторонние библиотеки или сервисы
            # Здесь заглушка для будущей реализации
            
            log_info(f"Instagram document sending not implemented yet for {instagram_id}", "instagram")
            return False
            
        except Exception as e:
            log_error(f"Error sending Instagram document: {e}", "instagram")
            return False


async def send_document(
    method: str,
    recipient: str,
    subject: str,
    message: str,
    file_path: str,
    filename: Optional[str] = None
) -> bool:
    """
    Универсальная функция отправки документа
    
    Args:
        method: Метод отправки (email, telegram, whatsapp, instagram)
        recipient: Получатель (email, chat_id, phone, instagram_id)
        subject: Тема/заголовок
        message: Текст сообщения
        file_path: Путь к файлу
        filename: Имя файла
        
    Returns:
        True если отправлено успешно
    """
    sender = DocumentSender()
    
    if method == 'email':
        return await sender.send_via_email(recipient, subject, message, file_path, filename)
    elif method == 'telegram':
        return await sender.send_via_telegram(recipient, message, file_path)
    elif method == 'whatsapp':
        return await sender.send_via_whatsapp(recipient, message, file_path)
    elif method == 'instagram':
        return await sender.send_via_instagram(recipient, message, file_path)
    else:
        log_error(f"Unknown sending method: {method}", "sender")
        return False
