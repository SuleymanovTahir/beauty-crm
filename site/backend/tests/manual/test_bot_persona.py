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
    
    personality = bot_settings.get('personality_traits', '')
    if personality in full_prompt:
        print(f"✅ Persona Instructions FOUND ('{personality[:30]}...')")
    else:
        print("❌ Persona Instructions NOT FOUND")
        
    comm_style = bot_settings.get('communication_style', '')
    if comm_style in full_prompt:
        print(f"✅ Communication Style Rule FOUND ('{comm_style[:30]}...')")
    else:
        print("❌ Communication Style Rule NOT FOUND")

    # 2. Test Generation
    print("\n🤖 Testing Generation...")
    
    # Check for fast test flag
    if os.getenv('SKIP_REAL_MAIL', '').lower() == 'true':
        print("   ⏩ FAST MODE: Mocking AI response instead of real API call")
        response = "Здравствуйте! Конечно, маникюр у нас стоит от 150 AED. Желаете записаться?"
    else:
        print("   📡 REAL MODE: Calling AI API (may take a few seconds)...")
        try:
            response = await bot.generate_response(
                instagram_id=instagram_id,
                user_message="Привет, сколько стоит маникюр?",
                history=history,
                bot_settings=bot_settings,
                salon_info=salon_info,
                client_language='ru'
            )
        except Exception as e:
            print(f"❌ Generation failed: {e}")
            return

    print(f"\n✅ Response:\n{response}")
    
    if "?" in response:
        print("✅ Response contains a question")
    else:
        print("⚠️ Response does NOT contain a question (Check if rule is followed)")

if __name__ == "__main__":
    asyncio.run(test_persona())
