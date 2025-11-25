import pandas as pd
import io
from datetime import datetime

# Mocking the normalize function from client_import.py
def normalize_column_name(col: str) -> str:
    col_lower = col.lower().strip()
    mappings = {
        'имя': 'name', 'name': 'name', 'фио': 'name',
        'телефон': 'phone', 'phone': 'phone', 'тел': 'phone',
        'email': 'email', 'почта': 'email',
        'категория': 'category', 'category': 'category',
        'дата рождения': 'date_of_birth', 'date of birth': 'date_of_birth',
        'birthday': 'date_of_birth',
        'заметки': 'notes', 'notes': 'notes',
        'статус': 'status', 'status': 'status',
        'gender': 'gender', 'пол': 'gender',
        'first visit': 'first_contact', 'first date': 'first_contact',
        'last visit': 'last_contact', 'last date': 'last_contact',
        'total spent': 'total_spend', 'total spend': 'total_spend',
        'visits': 'total_visits', 'total visits': 'total_visits',
        'discount': 'discount', 'скидка': 'discount',
        'card number': 'card_number', 'card': 'card_number',
        'total spend, aed': 'total_spend',
        'total spend aed': 'total_spend',
        'paid, aed': 'paid_amount',
        'paid aed': 'paid_amount',
        'paid': 'paid_amount',
    }
    return mappings.get(col_lower, col_lower)

def parse_date(date_str):
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
        '%Y-%m-%dT%H:%M:%S',
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).isoformat()
        except ValueError:
            continue
    return None

def debug_import():
    print("=== START DEBUGGING ===")
    
    # 1. Simulate Raw Content
    raw_csv = """Name,Phone,Total Spend, AED,Last visit,Paid, AED
John Doe,123456789,1000 AED,2025-11-06 19:30,500 AED"""
    
    print(f"\n[1] Raw CSV Content:\n{raw_csv}")
    
    # 2. Apply Replacements
    text_content = raw_csv.replace('Total Spend, AED', 'Total Spend AED')
    text_content = text_content.replace('Paid, AED', 'Paid AED')
    
    print(f"\n[2] After Replacement:\n{text_content}")
    
    # 3. Parse CSV
    df = pd.read_csv(io.StringIO(text_content), dtype=str)
    print(f"\n[3] DataFrame Columns (Raw): {df.columns.tolist()}")
    
    # 4. Normalize Columns
    normalized_cols = [normalize_column_name(str(col)) for col in df.columns]
    print(f"\n[4] Normalized Columns: {normalized_cols}")
    
    # Check for missing mappings
    expected_fields = ['total_spend', 'paid_amount', 'last_contact']
    for field in expected_fields:
        if field not in normalized_cols:
            print(f"❌ CRITICAL: Expected field '{field}' NOT found in normalized columns!")
        else:
            print(f"✅ Field '{field}' found.")

    # 5. Row Processing
    df.columns = normalized_cols
    for idx, row in df.iterrows():
        print(f"\n[5] Row {idx} Data:")
        print(f"   - total_spend (raw): {row.get('total_spend')}")
        print(f"   - total_spend (lookup 'Total Spend AED'): {row.get('total spend aed')}")
        
        # Date parsing
        last_contact_raw = row.get('last_contact')
        parsed_date = parse_date(last_contact_raw)
        print(f"   - last_contact (raw): '{last_contact_raw}' -> Parsed: {parsed_date}")
        
        if parsed_date is None:
            print("   ❌ Date parsing FAILED")
        else:
            print("   ✅ Date parsing SUCCESS")

if __name__ == "__main__":
    debug_import()
