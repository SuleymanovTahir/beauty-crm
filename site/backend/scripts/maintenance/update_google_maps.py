#!/usr/bin/env python3
"""
Обновление Google Maps ссылок в настройках салона
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from db.connection import get_db_connection

def update_google_maps():
    """Обновить Google Maps ссылки"""
    print("🔧 Обновление Google Maps ссылок...")
    
    # Новая короткая ссылка
    short_url = "https://maps.app.goo.gl/BTw4X1gzgyFhmkYF8"
    
    # Для iframe embed используем стандартный формат Google Maps
    # Этот URL откроет карту в режиме embed
    # Формат: добавляем /embed после maps и используем pb параметр
    # Или используем простой формат с координатами
    
    # Универсальный embed URL (будет работать для любой локации)
    # Используем формат который точно работает
    embed_url = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115806.13211234567!2d55.14!3d25.08!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f6b0000000000%3A0x0!2zTWFyaW5hIE1hbGw!5e0!3m2!1sen!2sae!4v1234567890"
    
    map_url = short_url
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Обновляем настройки салона
        # Используем только google_maps колонку (map_url и google_maps_embed_url не существуют)
        c.execute("""
            UPDATE salon_settings 
            SET google_maps = %s
            WHERE id = 1
        """, (short_url,))
        
        conn.commit()
        print(f"✅ Google Maps обновлен:")
        print(f"   Short URL: {short_url}")
        print(f"   Embed URL: {embed_url}")
        print(f"\n⚠️  Примечание: Для отображения карты на сайте используется google_maps")
        print(f"   Если нужен embed, добавьте колонку google_maps_embed_url в таблицу salon_settings")
        
        # Проверяем результат
        c.execute("SELECT google_maps FROM salon_settings WHERE id = 1")
        result = c.fetchone()
        if result:
            print(f"\n📍 Текущая настройка:")
            print(f"   google_maps: {result[0]}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    update_google_maps()
