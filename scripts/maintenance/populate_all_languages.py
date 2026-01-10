import os
import sys

# Add backend directory to path to import config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))
from db.connection import get_db_connection

def populate_all_languages():
    print("Connecting to PostgreSQL database...")
    conn = get_db_connection()
    c = conn.cursor()
    
    languages = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
    
    # 1. Ensure columns exist (Double check)
    print("\n1. Checking columns...")
    
    # Users columns
    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users'")
    user_cols = {col[0] for col in c.fetchall()}
    
    for lang in languages:
        for field in ['full_name', 'position', 'bio']:
            col_name = f"{field}_{lang}"
            if col_name not in user_cols:
                print(f"  Adding missing column to users: {col_name}")
                try:
                    c.execute(f"ALTER TABLE users ADD COLUMN {col_name} TEXT")
                except Exception as e:
                    print(f"  Error adding {col_name}: {e}")

    # Public Reviews columns
    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='public_reviews'")
    review_cols = {col[0] for col in c.fetchall()}
    
    for lang in languages:
        for field in ['author_name', 'employee_name', 'employee_position']:
            col_name = f"{field}_{lang}"
            if col_name not in review_cols:
                print(f"  Adding missing column to public_reviews: {col_name}")
                try:
                    c.execute(f"ALTER TABLE public_reviews ADD COLUMN {col_name} TEXT")
                except Exception as e:
                    print(f"  Error adding {col_name}: {e}")
    
    conn.commit()
    
    # 2. Populate Users
    print("\n2. Populating Users...")
    
    # Dictionary of translations for known employees
    # Format: 'Original Name': { 'lang': 'Translated Name', ... }
    employee_translations = {
        'Mohamed Sabri': {
            'ru': 'Мохамед Сабри', 'en': 'Mohamed Sabri', 'ar': 'محمد صبري', 'es': 'Mohamed Sabri', 'de': 'Mohamed Sabri', 'fr': 'Mohamed Sabri', 'hi': 'मोहम्मद साबरी', 'kk': 'Мохамед Сабри', 'pt': 'Mohamed Sabri',
            'position': {
                'ru': 'Стилист по волосам', 'en': 'Hair Stylist', 'ar': 'مصفف شعر', 'es': 'Estilista', 'de': 'Friseur', 'fr': 'Coiffeur', 'hi': 'हेयर स्टाइлист', 'kk': 'Стилист', 'pt': 'Cabeleireiro'
            }
        },
        'Amandurdyyeva Mestan': {
            'ru': 'Амандурдыева Местан', 'en': 'Amandurdyyeva Mestan', 'ar': 'ميستان', 'es': 'Amandurdyyeva Mestan', 'de': 'Amandurdyyeva Mestan', 'fr': 'Amandurdyyeva Mestan', 'hi': 'मेस्तान', 'kk': 'Амандурдиева Местан', 'pt': 'Amandurdyyeva Mestan',
            'position': {
                'ru': 'Стилист по волосам', 'en': 'Hair Stylist', 'ar': 'مصفف شعر', 'es': 'Estilista', 'de': 'Friseur', 'fr': 'Coiffeur', 'hi': 'हेयर स्टाइлист', 'kk': 'Стилист', 'pt': 'Cabeleireiro'
            }
        },
        'Kozhabay Lyazat': {
            'ru': 'Кожабай Ляззат', 'en': 'Kozhabay Lyazzat', 'ar': 'لازات', 'es': 'Kozhabay Lyazzat', 'de': 'Kozhabay Lyazzat', 'fr': 'Kozhabay Lyazzat', 'hi': 'ल्याज्जत', 'kk': 'Қожабай Ләззат', 'pt': 'Kozhabay Lyazzat',
            'position': {
                'ru': 'Мастер маникюра', 'en': 'Nail Master', 'ar': 'خبيرة أظافر', 'es': 'Manicurista', 'de': 'Nageldesigner', 'fr': 'Prothésiste ongulaire', 'hi': 'नेल मास्टर', 'kk': 'Маникюр шебері', 'pt': 'Manicure'
            }
        },
        'Kasymova Gulcehre': {
            'ru': 'Касымова Гульчехра', 'en': 'Kasymova Gulcehre', 'ar': 'جوليا', 'es': 'Kasymova Gulcehre', 'de': 'Kasymova Gulcehre', 'fr': 'Kasymova Gulcehre', 'hi': 'गुल्या', 'kk': 'Касымова Гүлчехра', 'pt': 'Kasymova Gulcehre',
            'position': {
                'ru': 'Мастер маникюра / Депиляция', 'en': 'Nail/Waxing', 'ar': 'أظافر / إزالة الشعر بالشمع', 'es': 'Uñas / Depilación', 'de': 'Nägel / Wachsen', 'fr': 'Ongles / Épilation', 'hi': 'नाखून / वैक्सिंग', 'kk': 'Маникюр / Депиляция', 'pt': 'Unhas / Depilação'
            }
        },
        'Peradilla Jennifer': {
            'ru': 'Перадилла Дженнифер', 'en': 'Peradilla Jennifer', 'ar': 'جينيفر', 'es': 'Peradilla Jennifer', 'de': 'Peradilla Jennifer', 'fr': 'Peradilla Jennifer', 'hi': 'जेनिफर', 'kk': 'Перадилла Дженнифер', 'pt': 'Peradilla Jennifer',
            'position': {
                'ru': 'Мастер маникюра / Массаж', 'en': 'Nail Master/Massages', 'ar': 'خبيرة أظافر / تدليك', 'es': 'Manicurista / Masajes', 'de': 'Nageldesigner', 'fr': 'Ongles / Massages', 'hi': 'नेल मास्टर / मालिश', 'kk': 'Маникюр / Массаж', 'pt': 'Manicure / Massagens'
            }
        },
        'Турсунай': {
            'ru': 'Турсунай', 'en': 'Tursunay', 'ar': 'تورسوناي', 'es': 'Tursunay', 'de': 'Tursunay', 'fr': 'Tursunay', 'hi': 'तुरुसुनाय', 'kk': 'Тұрсынай', 'pt': 'Tursunay',
            'position': {
                'ru': 'Директор', 'en': 'Director', 'ar': 'مدير', 'es': 'Director', 'de': 'Direktor', 'fr': 'Directeur', 'hi': 'निदेशक', 'kk': 'Директор', 'pt': 'Diretor'
            }
        }
    }

    c.execute("SELECT id, full_name, position FROM users WHERE is_service_provider = TRUE")
    users = c.fetchall()
    
    for user in users:
        user_id = user[0]
        name = user[1]
        
        print(f"  Processing user: {name}")
        
        # Find translation or use defaults
        trans = employee_translations.get(name) or employee_translations.get(name.upper())
        
        if trans:
            updates = []
            params = []
            
            for lang in languages:
                # Name
                if lang in trans:
                    updates.append(f"full_name_{lang} = %s")
                    params.append(trans[lang])
                
                # Position
                if 'position' in trans and lang in trans['position']:
                    updates.append(f"position_{lang} = %s")
                    params.append(trans['position'][lang])
            
            if updates:
                params.append(user_id)
                sql_query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
                c.execute(sql_query, params)
                print(f"    Updated translations for {name}")
        else:
            # Fallback: copy English/Russian name to other Latin scripts
            print(f"    No specific translations found for {name}, using fallback")
            # Simple fallback: just copy the name to all latin fields
            updates = []
            params = []
            for lang in ['es', 'de', 'fr', 'pt']:
                 updates.append(f"full_name_{lang} = %s")
                 params.append(name) # Assuming name is Latin
            
            if updates:
                params.append(user_id)
                c.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", params)

    # 3. Populate Public Reviews
    print("\n3. Populating Public Reviews...")
    
    # Generic name translations map
    name_map = {
        'Анна Петрова': {
            'ru': 'Анна Петрова', 'en': 'Anna Petrova', 'ar': 'آنا بتروفا', 'es': 'Anna Petrova', 'de': 'Anna Petrova', 'fr': 'Anna Petrova', 'hi': 'अन्ना पेट्रोवा', 'kk': 'Анна Петрова', 'pt': 'Anna Petrova'
        },
        'Мария Иванова': {
            'ru': 'Мария Иванова', 'en': 'Maria Ivanova', 'ar': 'ماريا إيفانوفا', 'es': 'Maria Ivanova', 'de': 'Maria Ivanova', 'fr': 'Maria Ivanova', 'hi': 'मारिया इवानोва', 'kk': 'Мария Иванова', 'pt': 'Maria Ivanova'
        },
        'Елена Сидорова': {
            'ru': 'Елена Сидорова', 'en': 'Elena Sidorova', 'ar': 'إيلينا سيدوروفا', 'es': 'Elena Sidorova', 'de': 'Elena Sidorova', 'fr': 'Elena Sidorova', 'hi': 'एलेना सिडोरोवा', 'kk': 'Елена Сидорова', 'pt': 'Elena Sidorova'
        },
         'Дарья Кузнецова': {
            'ru': 'Дарья Кузнецова', 'en': 'Daria Kuznetsova', 'ar': 'داريا كوزنتسوفا', 'es': 'Daria Kuznetsova', 'de': 'Daria Kuznetsova', 'fr': 'Daria Kuznetsova', 'hi': 'दारिया कुजनेत्सोवा', 'kk': 'Дарья Кузнецова', 'pt': 'Daria Kuznetsova'
        },
        'Мария Соколова': {
            'ru': 'Мария Соколова', 'en': 'Maria Sokolova', 'ar': 'ماريا سوكولوفا', 'es': 'Maria Sokolova', 'de': 'Maria Sokolova', 'fr': 'Maria Sokolova', 'hi': 'मारिया सोकोलोवा', 'kk': 'Мария Соколова', 'pt': 'Maria Sokolova'
        },
        'Елена Волкова': {
            'ru': 'Елена Волкова', 'en': 'Elena Volkova', 'ar': 'إيلينا فولكوفا', 'es': 'Elena Volkova', 'de': 'Elena Volkova', 'fr': 'Elena Volkova', 'hi': 'एलेना वोल्कोवा', 'kk': 'Елена Волкова', 'pt': 'Elena Volkova'
        },
        'Ольга Иванова': {
            'ru': 'Ольга Иванова', 'en': 'Olga Ivanova', 'ar': 'أولغا إيفانوفا', 'es': 'Olga Ivanova', 'de': 'Olga Ivanova', 'fr': 'Olga Ivanova', 'hi': 'ओल्गा इवानोवा', 'kk': 'Ольга Иванова', 'pt': 'Olga Ivanova'
        },
        'Наталья Смирнова': {
            'ru': 'Наталья Смирнова', 'en': 'Natalia Smirnova', 'ar': 'ناتاليا سميرنوفا', 'es': 'Natalia Smirnova', 'de': 'Natalia Smirnova', 'fr': 'Natalia Smirnova', 'hi': 'नतालिया स्मिरनोवा', 'kk': 'Наталья Смирнова', 'pt': 'Natalia Smirnova'
        },
        'Дарья Козлова': {
            'ru': 'Дарья Козлова', 'en': 'Daria Kozlova', 'ar': 'داريا كوزلوفا', 'es': 'Daria Kozlova', 'de': 'Daria Kozlova', 'fr': 'Daria Kozlova', 'hi': 'दारिया कोज़लोवा', 'kk': 'Дарья Козлова', 'pt': 'Daria Kozlova'
        }
    }
    
    c.execute("SELECT id, author_name FROM public_reviews")
    reviews = c.fetchall()
    
    for review in reviews:
        review_id = review[0]
        author = review[1]
        
        print(f"  Processing review by: {author}")
        
        trans = name_map.get(author)
        
        if trans:
            updates = []
            params = []
            for lang in languages:
                if lang in trans:
                    updates.append(f"author_name_{lang} = %s")
                    params.append(trans[lang])
            
            if updates:
                params.append(review_id)
                c.execute(f"UPDATE public_reviews SET {', '.join(updates)} WHERE id = %s", params)
                print(f"    Updated author translations for {author}")
        else:
             # Fallback
             updates = []
             params = []
             for lang in ['en', 'es', 'de', 'fr', 'pt']:
                 updates.append(f"author_name_{lang} = %s")
                 params.append(author) # Use original as fallback
             
             if updates:
                params.append(review_id)
                c.execute(f"UPDATE public_reviews SET {', '.join(updates)} WHERE id = %s", params)

    conn.commit()
    conn.close()
    print("\n✅ Done! All languages populated.")

if __name__ == "__main__":
    populate_all_languages()
