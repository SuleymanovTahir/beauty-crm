"""
Universal Messenger
Platform-agnostic message sending
"""
import asyncio
from typing import Optional, Literal
from utils.logger import log_info, log_error
from db.connection import get_db_connection

Platform = Literal['instagram', 'telegram', 'whatsapp', 'auto']

async def send_universal_message(
    recipient_id: str,
    text: str,
    platform: Platform = 'auto'
) -> bool:
    """
    Send a message to any platform.
    
    Args:
        recipient_id: User's ID (instagram_id, telegram_id, etc.)
        text: Message text
        platform: Target platform ('instagram', 'telegram', 'whatsapp', 'auto')
                  'auto' will try to detect based on recipient_id format
    
    Returns:
        bool: True if message was sent successfully
    
    Example:
        await send_universal_message("123456789", "Hello!", platform='telegram')
        await send_universal_message("9876543210123456", "Hi!", platform='auto')
    """
    
    # Auto-detect platform if needed
    if platform == 'auto':
        platform = detect_platform(recipient_id)
        log_info(f"📨 Auto-detected platform: {platform} for {recipient_id[:8]}...", "messenger")
    
    try:
        if platform == 'instagram':
            from integrations.instagram import send_message as send_instagram
            await send_instagram(recipient_id, text)
            log_info(f"✅ Instagram message sent to {recipient_id[:8]}...", "messenger")
            return True
            
        elif platform == 'telegram':
            from integrations.telegram_bot import send_telegram_message
            await send_telegram_message(recipient_id, text)
            log_info(f"✅ Telegram message sent to {recipient_id[:8]}...", "messenger")
            return True
            
        elif platform == 'whatsapp':
            # WhatsApp integration placeholder
            log_error("WhatsApp integration not implemented yet", "messenger")
            return False
            
        else:
            log_error(f"Unknown platform: {platform}", "messenger")
            return False
            
    except Exception as e:
        log_error(f"❌ Failed to send message via {platform}: {e}", "messenger")
        return False

def detect_platform(recipient_id: str) -> Platform:
    """
    Detect platform based on recipient_id format or database lookup.
    
    - Instagram IDs: Long numeric strings (17+ digits)
    - Telegram IDs: Shorter numeric strings (usually 9-10 digits)
    """
    
    # First, try to look up in database
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Check if this ID exists in clients table
        c.execute("""
            SELECT instagram_id, telegram_id, preferred_messenger 
            FROM clients 
            WHERE instagram_id = %s OR telegram_id = %s
            LIMIT 1
        """, (recipient_id, recipient_id))
        
        result = c.fetchone()
        
        if result:
            instagram_id, telegram_id, preferred = result
            
            # If client has preferred messenger set, use it
            if preferred and preferred in ['instagram', 'telegram', 'whatsapp']:
                return preferred
            
            # Match by ID
            if recipient_id == instagram_id:
                return 'instagram'
            if recipient_id == telegram_id:
                return 'telegram'
                
    except Exception as e:
        log_error(f"Error detecting platform from DB: {e}", "messenger")
    finally:
        conn.close()
    
    # Fallback: detect by ID format
    if recipient_id.isdigit():
        if len(recipient_id) >= 15:
            return 'instagram'  # Instagram IDs are very long
        elif len(recipient_id) <= 12:
            return 'telegram'   # Telegram IDs are shorter
    
    # Default to Instagram (legacy behavior)
    return 'instagram'

async def send_to_all_channels(
    client_id: str,
    text: str
) -> dict:
    """
    Send message to all available channels for a client.
    Useful for critical notifications.
    
    Returns:
        dict: Status of each channel {'instagram': True, 'telegram': False, ...}
    """
    results = {}
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT instagram_id, telegram_id 
            FROM clients 
            WHERE instagram_id = %s OR telegram_id = %s OR id::text = %s
            LIMIT 1
        """, (client_id, client_id, client_id))
        
        result = c.fetchone()
        
        if result:
            instagram_id, telegram_id = result
            
            if instagram_id:
                try:
                    from integrations.instagram import send_message as send_instagram
                    await send_instagram(instagram_id, text)
                    results['instagram'] = True
                except Exception as e:
                    log_error(f"Instagram send failed: {e}", "messenger")
                    results['instagram'] = False
                    
            if telegram_id:
                try:
                    from integrations.telegram_bot import send_telegram_message
                    await send_telegram_message(telegram_id, text)
                    results['telegram'] = True
                except Exception as e:
                    log_error(f"Telegram send failed: {e}", "messenger")
                    results['telegram'] = False
                    
    except Exception as e:
        log_error(f"Error in send_to_all_channels: {e}", "messenger")
    finally:
        conn.close()
    
    return results

# Backward compatibility alias
async def send_message(recipient_id: str, text: str) -> bool:
    """Backward compatible wrapper for existing code"""
    return await send_universal_message(recipient_id, text, platform='auto')
