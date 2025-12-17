
import requests
import json
import sys
import os

# Configuration
BASE_URL = "http://localhost:8000"
EMAIL = "client@demo.com"
PASSWORD = "password123"

def run_test():
    print("🚀 Starting Integration Test: Login -> Booking Flow")

    session = requests.Session()

    # 1. Login
    print("\n1️⃣  Testing Login...")
    try:
        # NOTE: /api/login expects Form Data (username, password), NOT JSON!
        login_res = session.post(f"{BASE_URL}/api/login", data={
            "username": EMAIL, 
            "password": PASSWORD
        })
        
        if login_res.status_code != 200:
            # Try with username if email failed (sometimes username is separate)
            print(f"   Login failed with email, checking response: {login_res.text}")
            return False
            
        auth_data = login_res.json()
        if not auth_data.get('success'):
             print(f"❌ Login failed: {auth_data}")
             return False
             
        token = auth_data['token']
        # Set token for future requests
        # Our backend expects Authorization header or cookie? usually Bearer
        # Frontend uses: headers: { Authorization: `Bearer ${token}` }
        session.headers.update({"Authorization": f"Bearer {token}"})
        print(f"✅ Login successful! User: {auth_data['user']['full_name']}")
        
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

    # 2. Get Services (Verified public endpoint)
    print("\n2️⃣  Fetching Services...")
    try:
        services_res = session.get(f"{BASE_URL}/api/public/services")
        services = services_res.json()
        if not services:
             print("❌ No services found!")
             return False
        
        target_service = services[0] # Take first one
        print(f"✅ Found {len(services)} services. Target: {target_service['name']} (ID: {target_service['id']})")
    except Exception as e:
         print(f"❌ Error fetching services: {e}")
         return False

    # 3. Create Booking
    print("\n3️⃣  Creating Booking...")
    import datetime
    # Next day at 10:00
    tomorrow = (datetime.datetime.now() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    time_slot = "10:00"
    
    booking_payload = {
        "service": target_service['name'], # Backend expects Name, not ID currently based on previous analysis
        "date": tomorrow,
        "time": time_slot,
        "phone": "+971501234567",
        "name": "Integration Test User",
        "instagram_id": auth_data['user'].get('username', 'test_user') # ID linking
    }
    
    try:
        book_res = session.post(f"{BASE_URL}/api/bookings", json=booking_payload)
        book_data = book_res.json()
        
        if book_res.status_code == 200 and book_data.get('success'):
             print(f"✅ Booking created successfully! ID: {book_data.get('booking_id')}")
        else:
             print(f"❌ Booking creation failed: {book_res.text}")
             return False
    except Exception as e:
        print(f"❌ Error creating booking: {e}")
        return False

    # 4. Verify in Client History
    print("\n4️⃣  Verifying Booking in History...")
    try:
        # Endpoint we optimized: /api/client/bookings
        history_res = session.get(f"{BASE_URL}/api/client/bookings")
        history = history_res.json()
        print(f"   Debug: History response type: {type(history)}")
        print(f"   Debug: History response content: {history}")
        
        if isinstance(history, dict) and 'bookings' in history:
            print(f"   Debug: Response is dict with 'bookings' key. Count: {history.get('count')}")
            history_list = history['bookings']
        elif isinstance(history, list):
            history_list = history
        else:
             print(f"❌ Expected list or dict with 'bookings', got {type(history)}")
             return False

        found = False
        for b in history_list:
            # Check if our new booking is there (date/service match)
            if b['service_name'] == target_service['name'] and b['datetime'].startswith(tomorrow):
                found = True
                print(f"✅ Found booking in history: {b['id']} - {b['service_name']} @ {b['datetime']}")
                break
        
        if not found:
            print("❌ Booking NOT found in client history!")
            print("History head:", history[:3])
            return False
            
    except Exception as e:
         print(f"❌ Error verification: {e}")
         return False

    print("\n🎉 INTEGRATION TEST PASSED!")
    return True

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)
