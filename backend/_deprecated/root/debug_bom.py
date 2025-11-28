import pandas as pd
import io

def normalize_column_name(col: str) -> str:
    col_lower = col.lower().strip()
    mappings = {
        'name': 'name',
        'phone': 'phone',
        'total spend': 'total_spend',
    }
    return mappings.get(col_lower, col_lower)

def test_bom_issue():
    print("=== BOM Issue Reproduction ===")
    
    # Simulate content with BOM
    content_with_bom = b'\xef\xbb\xbfName,Phone,Total Spend\nJohn,123,100'
    
    print(f"Original bytes: {content_with_bom}")
    
    # Current logic: decode('utf-8')
    text_content = content_with_bom.decode('utf-8')
    print(f"Decoded (utf-8): {repr(text_content)}")
    
    df = pd.read_csv(io.StringIO(text_content))
    print(f"Columns: {df.columns.tolist()}")
    
    # Check if 'name' is mapped correctly
    normalized = [normalize_column_name(c) for c in df.columns]
    print(f"Normalized: {normalized}")
    
    if 'name' not in normalized:
        print("❌ 'name' column NOT found due to BOM!")
        print(f"First column is actually: {repr(normalized[0])}")
    else:
        print("✅ 'name' column found.")

    print("\n=== Fix Test (utf-8-sig) ===")
    try:
        text_content_fixed = content_with_bom.decode('utf-8-sig')
        print(f"Decoded (utf-8-sig): {repr(text_content_fixed)}")
        
        df_fixed = pd.read_csv(io.StringIO(text_content_fixed))
        print(f"Columns: {df_fixed.columns.tolist()}")
        
        normalized_fixed = [normalize_column_name(c) for c in df_fixed.columns]
        print(f"Normalized: {normalized_fixed}")
        
        if 'name' in normalized_fixed:
            print("✅ 'name' column found with fix.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_bom_issue()
