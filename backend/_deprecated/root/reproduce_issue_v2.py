import pandas as pd
import io
from datetime import datetime

def parse_date(date_str):
    if pd.isna(date_str) or not date_str:
        return None
        
    date_str = str(date_str).strip()
    if not date_str:
        return None
        
    formats = [
        '%d.%m.%Y', '%d-%m-%Y', '%d/%m/%Y',  # DD.MM.YYYY
        '%Y-%m-%d', '%Y.%m.%d', '%Y/%m/%d',  # YYYY-MM-DD
        '%d.%m.%y', '%d-%m-%y', '%d/%m/%y',  # DD.MM.YY
        '%m/%d/%Y', '%m-%d-%Y',              # MM/DD/YYYY
        '%Y-%m-%d %H:%M', '%Y-%m-%d %H:%M:%S', # YYYY-MM-DD HH:MM
        '%d.%m.%Y %H:%M', '%d.%m.%Y %H:%M:%S', # DD.MM.YYYY HH:MM
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).isoformat()
        except ValueError:
            continue
            
    return None

def test_csv_parsing():
    # Simulate problematic CSV content
    csv_content = """Name,Phone,Total Spend, AED,Last visit
John Doe,123456789,1000 AED,2025-11-06 19:30
Jane Doe,987654321,500,23.11.2025"""

    print("--- Original Content ---")
    print(csv_content)
    
    # 1. Pre-processing fix
    fixed_content = csv_content.replace('Total Spend, AED', 'Total Spend AED')
    print("\n--- Fixed Content ---")
    print(fixed_content)
    
    try:
        df = pd.read_csv(io.StringIO(fixed_content))
        print("\n--- DataFrame Columns ---")
        print(df.columns.tolist())
        
        print("\n--- DataFrame Content ---")
        print(df)
        
        # 2. Date parsing test
        print("\n--- Date Parsing Test ---")
        dates = df['Last visit'].tolist()
        for d in dates:
            parsed = parse_date(d)
            print(f"Original: {d} -> Parsed: {parsed}")
            
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    test_csv_parsing()
