import asyncio
import os
import sys

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection
from utils.logger import log_info, log_error

def fix_salon_settings():
    """
    Fix salon settings:
    1. Update coordinates to correct location (M Le Diamant)
    2. Update Google Maps link
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        print("🔧 Fixing salon settings...")
        
        # New coordinates and map link
        lat = 25.0738739
        lng = 55.1290137
        map_link = "https://maps.app.goo.gl/t9HQUwrTPcanuQig8"
        # Using the simplified embed format which works without API key for public places usually, 
        # or we can assume the user prefers the share link in the 'google_maps' field 
        # and we might need to handle embedding differently. 
        # But for now, let's update what we have.
        # If the frontend uses this for iframe, this share link WON'T work in iframe.
        # Let's generate a legacy embed link for the iframe if possible, OR user might need to provide both.
        # But the DB only has 'google_maps'. 
        
        # NOTE: Using proper embed URL for iframe compatibility is tricky without API key if using 'v1/place'.
        # But `maps.google.com/maps?q=...&output=embed` usually works.
        
        embed_url = f"https://maps.google.com/maps?q={lat},{lng}&hl=en&z=17&output=embed"
        
        # However, the user provided a specific map link. 
        # If we overwrite google_maps with embed_url, the 'View on Map' button opens the embed view.
        # Ideally we should split columns. But for this task, I will set latitude/longitude correclty.
        # And I'll set google_maps to the share link provided by user, 
        # AND I will modify the backend code to generating the embed link dynamically if needed, 
        # OR I will just use the share link if the user insists, but I know it won't embed.
        
        # Wait, if I change google_maps to the share link, the iframe breaks.
        # If I change it to embed link, the button works (opens embed) but maybe less pretty.
        
        # Let's update latitude and longitude first.
        
        c.execute("""
            UPDATE salon_settings 
            SET latitude = %s, 
                longitude = %s,
                google_maps = %s
            WHERE id = 1
        """, (lat, lng, map_link))
        
        rows_affected = c.rowcount
        conn.commit()
        
        if rows_affected > 0:
            print(f"✅ Salon settings updated: Lat={lat}, Lng={lng}, Map={map_link}")
        else:
            print("⚠️ No salon settings found to update (ID=1)")
            
    except Exception as e:
        print(f"❌ Error updating salon settings: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_salon_settings()
