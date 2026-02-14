
import os
import sys
import re
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / '.env.local')
load_dotenv(backend_dir / '.env')

from db.connection import get_db_connection

def update_index_html():
    print("🔄 Updating index.html with production data...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Fetch salon settings
        cursor.execute("SELECT name, address, phone, hours, whatsapp, instagram FROM salon_settings LIMIT 1")
        row = cursor.fetchone()
        
        if not row:
            print("❌ No salon settings found!")
            return
            
        name, address, phone, hours, whatsapp, instagram = row
        
        # Parse opening hours
        opens = "10:30"
        closes = "21:00"
        
        if hours:
            # Handle formats like "10:30 - 21:00" or "Ежедневно: 10:30 - 21:00"
            time_match = re.search(r'(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})', hours)
            if time_match:
                opens = time_match.group(1)
                closes = time_match.group(2)
            
        # Format phone with +
        if phone and not phone.startswith('+'):
            phone = f"+{phone[:3]}-{phone[3:5]}-{phone[5:8]}-{phone[8:]}"
        
        print(f"  🏢 Salon: {name}")
        print(f"  📍 Address: {address}")
        print(f"  📞 Phone: {phone}")
        print(f"  ⏰ Hours: {opens} - {closes}")
        print(f"  📱 WhatsApp: {whatsapp}")
        print(f"  📸 Instagram: {instagram}")
        
        index_path = backend_dir.parent / "frontend" / "index.html"
        
        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Update Telephone
        if phone:
            content = re.sub(r'"telephone":\s*"[^"]*"', f'"telephone": "{phone}"', content)
            
        # Update Address
        if address:
            content = re.sub(r'"streetAddress":\s*"[^"]*"', f'"streetAddress": "{address}"', content)
            
        # Update Opening Hours
        content = re.sub(r'"opens":\s*"[^"]*"', f'"opens": "{opens}"', content)
        content = re.sub(r'"closes":\s*"[^"]*"', f'"closes": "{closes}"', content)
        
        # Update sameAs array with Instagram and WhatsApp
        same_as_items = []
        if instagram:
            if not instagram.startswith('http'):
                instagram = f"https://www.instagram.com/{instagram.replace('@', '')}"
            same_as_items.append(f'"{instagram}"')
        if whatsapp:
            if not whatsapp.startswith('http'):
                whatsapp_clean = whatsapp.replace('+', '').replace('-', '').replace(' ', '')
                whatsapp = f"https://wa.me/{whatsapp_clean}"
            same_as_items.append(f'"{whatsapp}"')
        
        if same_as_items:
            same_as_json = ',\n      '.join(same_as_items)
            content = re.sub(
                r'"sameAs":\s*\[[^\]]*\]',
                f'"sameAs": [\n      {same_as_json}\n    ]',
                content
            )
        
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print("✅ index.html updated successfully!")
        
    except Exception as e:
        print(f"❌ Error updating index.html: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    update_index_html()
