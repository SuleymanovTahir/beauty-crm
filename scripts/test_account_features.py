import requests
import json
import os
import secrets

# Configuration
API_URL = "http://localhost:8000/api"
EMAIL = f"test_account_{secrets.token_hex(4)}@example.com"
PASSWORD = "password123"
NAME = "Test User"
PHONE = "+11223344"

def print_step(step, emoji="🔹"):
    print(f"\n{emoji} {step}...")

def run_test():
    print("🚀 Starting Account Features Test")
    
    # 1. Register
    print_step("Registering new user", "📝")
    resp = requests.post(f"{API_URL}/client/register", json={
        "email": EMAIL,
        "password": PASSWORD,
        "name": NAME,
        "phone": PHONE
    })
    if resp.status_code != 200:
        print(f"❌ Registration failed: {resp.text}")
        return
    client_id = resp.json().get("client_id")
    print(f"✅ Registered with ID: {client_id}")
    
    # 2. Login
    print_step("Logging in", "🔑")
    resp = requests.post(f"{API_URL}/client/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    if resp.status_code != 200:
        print(f"❌ Login failed: {resp.text}")
        return
    token = resp.json().get("token")
    client_data = resp.json().get("client")
    print(f"✅ Logged in. Token: {token[:10]}...")
    
    # 3. Update Profile
    print_step("Updating Profile", "✏️")
    new_name = f"Updated {NAME}"
    new_birth_date = "1990-01-01"
    
    resp = requests.put(f"{API_URL}/client/profile", json={
        "client_id": client_data["id"],
        "name": new_name,
        "birth_date": new_birth_date,
        "notification_preferences": json.dumps({"sms": False, "email": True})
    })
    
    if resp.status_code != 200:
        print(f"❌ Profile update failed: {resp.text}")
        return
        
    updated_client = resp.json().get("client")
    if updated_client["name"] == new_name and updated_client["birthday"] == new_birth_date:
        print(f"✅ Profile updated successfully: {updated_client['name']}, {updated_client['birthday']}")
    else:
        print(f"⚠️ Profile update mismatch: {updated_client}")

    # 4. Upload Avatar
    print_step("Uploading Avatar", "📸")
    # Create a dummy image file
    with open("temp_avatar.txt", "w") as f:
        f.write("dummy image content")
    
    files = {'file': ('avatar.png', open('temp_avatar.txt', 'rb'), 'image/png')}
    resp = requests.post(f"{API_URL}/client/upload-avatar", files=files)
    os.remove("temp_avatar.txt")
    
    if resp.status_code == 200:
        avatar_url = resp.json().get("url")
        print(f"✅ Avatar uploaded: {avatar_url}")
        
        # Link avatar to profile
        requests.put(f"{API_URL}/client/profile", json={
            "client_id": client_data["id"],
            "avatar_url": avatar_url
        })
    else:
        print(f"❌ Avatar upload failed: {resp.text}")

    # 5. Check Loyalty
    print_step("Checking Loyalty", "🎁")
    resp = requests.get(f"{API_URL}/client/loyalty", params={"client_id": client_data["id"]})
    if resp.status_code == 200:
        loyalty = resp.json()
        print(f"✅ Loyalty points: {loyalty.get('points')}")
    else:
        print(f"❌ Loyalty check failed: {resp.text}")

    # 6. Check Notifications
    print_step("Checking Notifications", "🔔")
    resp = requests.get(f"{API_URL}/client/my-notifications", params={"client_id": client_data["id"]})
    if resp.status_code == 200:
        notifs = resp.json().get("notifications")
        print(f"✅ Notifications count: {len(notifs)}")
    else:
        print(f"❌ Notification check failed: {resp.text}")

    print("\n✨ Test Completed Successfully!")

if __name__ == "__main__":
    run_test()
