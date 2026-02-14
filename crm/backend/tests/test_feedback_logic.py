
# import pytest
import re

def parse_rating(message_text):
    rating = None
    # Ищем цифру 1-5
    match = re.search(r'\b([1-5])\b', message_text)
    if match:
        rating = int(match.group(1))
    elif any(w in message_text.lower() for w in ["супер", "класс", "отлично", "great", "perfect", "good", "amazing"]):
        rating = 5
    elif any(w in message_text.lower() for w in ["ужас", "плохо", "bad", "terrible"]):
        rating = 1
    return rating

def test_rating_parsing():
    assert parse_rating("5") == 5
    assert parse_rating("Оценка 5 спасибо") == 5
    assert parse_rating("Все было супер") == 5
    assert parse_rating("Ужас просто") == 1
    assert parse_rating("Ставлю 4") == 4
    assert parse_rating("1") == 1
    
    # Негативные кейсы
    assert parse_rating("Привет, как дела") is None
    assert parse_rating("Хочу записаться на 15:00") is None # 15 может быть триггером если не \\b
    assert parse_rating("Мне 25 лет") is None # 25 не попадает в [1-5]
    
if __name__ == "__main__":
    test_rating_parsing()
    print("✅ Feedback parsing tests passed")
