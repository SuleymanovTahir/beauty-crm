import asyncio
import os
import sys
from datetime import datetime

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from bot.core import SalonBot
from bot.prompts import PromptBuilder

async def test_persona():
    print("🚀 Testing Bot Persona...")
    
    bot = SalonBot()
    
    # Mock data
    instagram_id = "test_user_123"
    history = [
        ("Привет, сколько стоит маникюр?", "client", datetime.now().isoformat(), "text"),
    ]
    bot_settings = bot.bot_settings
    salon_info = bot.salon
    
    # 1. Check Prompt Construction
    print("\n📝 Checking Prompt Construction...")
    prompt_builder = PromptBuilder(salon_info, bot_settings)
    full_prompt = prompt_builder.build_full_prompt(
        instagram_id=instagram_id,
        history=history,
        client_language='ru'
    )
    
    if "СТИЛЬ ОБЩЕНИЯ - ЭНЕРГИЧНЫЙ И ЖИВОЙ" in full_prompt:
        print("✅ New Persona Instructions FOUND")
    else:
        print("❌ New Persona Instructions NOT FOUND")
        
    if "ВСЕГДА ЗАДАВАЙ ВОПРОС" in full_prompt:
        print("✅ 'Always Ask Question' Rule FOUND")
    else:
        print("❌ 'Always Ask Question' Rule NOT FOUND")

    # 2. Test Generation (if API key is valid)
    print("\n🤖 Testing Generation (may fail if API key is invalid)...")
    try:
        response = await bot.generate_response(
            instagram_id=instagram_id,
            user_message="Привет, сколько стоит маникюр?",
            history=history,
            bot_settings=bot_settings,
            salon_info=salon_info,
            client_language='ru'
        )
        print(f"\n✅ Response:\n{response}")
        
        if "?" in response:
            print("✅ Response contains a question")
        else:
            print("⚠️ Response does NOT contain a question (Check if rule is followed)")
            
    except Exception as e:
        print(f"❌ Generation failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_persona())
