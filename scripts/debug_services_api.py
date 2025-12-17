
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

try:
    print(f"Fetching {BASE_URL}/api/public/services ...")
    res = requests.get(f"{BASE_URL}/api/public/services")
    if res.status_code != 200:
        print(f"Error: {res.status_code} {res.text}")
        sys.exit(1)
        
    data = res.json()
    print(f"Status: {res.status_code}")
    print(f"Type: {type(data)}")
    
    if isinstance(data, list):
        print(f"Count: {len(data)}")
        if len(data) > 0:
            print("First item keys:", data[0].keys())
            print("First item sample:", json.dumps(data[0], indent=2, ensure_ascii=False))
            
            categories = set(d.get('category') for d in data)
            print(f"Categories found: {categories}")
    else:
        print("Data is not a list. Keys:", data.keys())

except Exception as e:
    print(f"Exception: {e}")
