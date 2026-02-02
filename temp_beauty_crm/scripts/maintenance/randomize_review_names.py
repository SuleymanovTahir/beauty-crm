import os
import sys
import random

# Add project root/backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))
from db.connection import get_db_connection

ARABIC_NAMES = ["Amina", "Fatima", "Layla", "Mariam", "Noor", "Zara", "Aisha", "Hana", "Salma", "Yasmin", "Omar", "Ahmed", "Ali", "Hassan", "Youssef"]
ENGLISH_NAMES = ["Sarah", "Jessica", "Emily", "Jennifer", "Emma", "Olivia", "Sophia", "Isabella", "Mia", "Charlotte"]
RUSSIAN_NAMES = ["Elena", "Maria", "Anna", "Olga", "Tatiana"]

def randomize_review_names():
    print("Connecting to PostgreSQL database...")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM public_reviews")
    reviews = cursor.fetchall()
    
    print(f"Found {len(reviews)} reviews. Updating names...")
    
    for i, review_row in enumerate(reviews):
        review_id = review_row[0]
        # Logic: Predominantly Arabic, then English, then 1 Russian
        if i == len(reviews) - 1: # Make the last one Russian
             name = random.choice(RUSSIAN_NAMES)
        elif i % 3 == 0: # Every 3rd is English
             name = random.choice(ENGLISH_NAMES)
        else: # Rest are Arabic
             name = random.choice(ARABIC_NAMES)
             
        cursor.execute("UPDATE public_reviews SET author_name = %s WHERE id = %s", (name, review_id))
        print(f"  Review {review_id}: {name}")
        
    conn.commit()
    conn.close()
    print("✅ Review names updated.")

if __name__ == "__main__":
    randomize_review_names()
