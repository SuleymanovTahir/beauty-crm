#!/usr/bin/env python3
"""
Test automatic language detection
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from translator import Translator

def test_language_detection():
    translator = Translator(use_cache=False)
    
    test_texts = [
        ("Привет, как дела?", "ru"),
        ("Hello, how are you?", "en"),
        ("مرحبا كيف حالك؟", "ar"),
        ("Hola, ¿cómo estás?", "es"),
        ("Bonjour, comment allez-vous?", "fr"),
        ("Get a Discount Up to 50% for All Services", "en"),
        ("Ваша красота — наша страсть", "ru"),
    ]
    
    print("🧪 Testing Language Detection\n")
    
    for text, expected in test_texts:
        detected = translator.detect_language(text)
        status = "✅" if detected == expected else "❌"
        print(f"{status} '{text[:50]}...'")
        print(f"   Expected: {expected}, Detected: {detected}\n")

if __name__ == "__main__":
    test_language_detection()
