#!/usr/bin/env python3
"""
Force update bot emoji rules
"""
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from core.config import DATABASE_NAME
import sqlite3

def force_update_emoji_rules():
    """Force update the emoji usage rules"""
    
    new_emoji_usage = """ТОЛЬКО эмоции и РЕДКО сердечки:
✅ Разрешены: 😊 😔 😉 🎉 и редко ❤️ 💖
❌ ЗАПРЕЩЕНЫ: 💎 💅 ✨ 🌟 (декоративные смайлики - это спам!)

Правило: 1-2 смайлика на сообщение МАКСИМУМ
Используй только для передачи эмоций, НЕ для украшения!"""
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""
            UPDATE bot_settings 
            SET emoji_usage = ?
            WHERE id = 1
        """, (new_emoji_usage,))
        
        conn.commit()
        print("✅ Обновлены правила использования смайликов")
        print("✅ Разрешены только эмоции: 😊😔😉🎉 и редко ❤️💖")
        print("❌ Запрещены декоративные: 💎💅✨🌟")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    force_update_emoji_rules()
