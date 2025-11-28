
import pandas as pd
from datetime import datetime
import io

# Mock the normalize_column_name function
def normalize_column_name(col: str) -> str:
    col_lower = col.lower().strip()
    mappings = {
        'имя': 'name', 'name': 'name', 'фио': 'name',
        'телефон': 'phone', 'phone': 'phone', 'тел': 'phone',
        'email': 'email', 'почта': 'email',
        'категория': 'category', 'category': 'category',
        'дата рождения': 'date_of_birth', 'date of birth': 'date_of_birth', 'birthday': 'date_of_birth',
        'notes': 'notes', 'заметки': 'notes',
        'статус': 'status', 'status': 'status',
        'gender': 'gender', 'пол': 'gender',
        'first visit': 'first_contact', 'first date': 'first_contact',
        'last visit': 'last_contact', 'last date': 'last_contact',
        'total spent': 'total_spend', 'total spend': 'total_spend', 'total spend, aed': 'total_spend',
        'visits': 'total_visits', 'total visits': 'total_visits',
        'discount': 'discount', 'скидка': 'discount',
        'card number': 'card_number', 'card': 'card_number',
        'paid, aed': 'paid_amount',
        'additional phone number': 'additional_phone',
        'agreed to receive newsletter': 'newsletter_agreed',
        'agreed to the processing of personal data': 'personal_data_agreed',
        'comment': 'notes',
    }
    return mappings.get(col_lower, col_lower)

# Mock the parse_date function
def parse_date(date_str) -> str:
    if pd.isna(date_str) or not date_str:
        return None
    date_str = str(date_str).strip()
    if not date_str:
        return None
    formats = [
        '%d.%m.%Y', '%d-%m-%Y', '%d/%m/%Y',
        '%Y-%m-%d', '%Y.%m.%d', '%Y/%m/%d',
        '%d.%m.%y', '%d-%m-%y', '%d/%m/%y',
        '%m/%d/%Y', '%m-%d-%Y',
        '%Y-%m-%d %H:%M', '%Y-%m-%d %H:%M:%S',
        '%d.%m.%Y %H:%M', '%d.%m.%Y %H:%M:%S',
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).isoformat()
        except ValueError:
            continue
    return None

# Create sample data based on user's request
csv_data = """Name,Phone,Email,Category,Date of birth,Total Spend, AED,Paid, AED,Gender,Card,Discount,Last visit,First visit,Total visits,Comment,Additional phone number,Agreed to receive newsletter,Agreed to the processing of personal data
Yasmin,971508604031,,,1915,1915,,0,,0,2025-11-06 19:30,2025-07-01 17:00,18,,No,No
Sreelakshmi,971527161547,,,0,0,,0,,0,,,0,,No,No
"""

# Simulate the import process
df = pd.read_csv(io.StringIO(csv_data), dtype=str)
print("Original Columns:", df.columns.tolist())

df.columns = [normalize_column_name(col) for col in df.columns]
print("Normalized Columns:", df.columns.tolist())

for idx, row in df.iterrows():
    print(f"\n--- Row {idx} ---")
    print("Raw Last Visit:", row.get('last_contact'))
    print("Parsed Last Visit:", parse_date(row.get('last_contact')))
    print("Raw First Visit:", row.get('first_contact'))
    print("Parsed First Visit:", parse_date(row.get('first_contact')))
