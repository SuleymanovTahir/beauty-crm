import sys
import os
import re
import csv
import io

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection

def parse_duration_text(duration_str):
    """
    Parse '01 ч 30 м' or '30m' to minutes.
    """
    if not duration_str:
        return 0
    
    d = duration_str.lower().strip()
    
    # Handle "00 ч 30 м / 00 ч 50 м" -> take first
    if '/' in d:
        d = d.split('/')[0].strip()

    hours = 0
    minutes = 0
    
    # "01 ч 30 м" or "01 ч 00 м"
    h_match = re.search(r'(\d+)\s*ч', d)
    if h_match:
        hours = int(h_match.group(1))
    
    m_match = re.search(r'(\d+)\s*м', d)
    if m_match:
        minutes = int(m_match.group(1))
        
    total = hours * 60 + minutes
    if total > 0:
        return total
        
    # Fallback to digits if simple "60"
    digits = re.findall(r'\d+', d)
    if digits:
        return int(digits[0])
        
    return 0

def check_durations():
    print("🔍 Starting Service Duration Audit...\n")
    
    # 1. User Data
    raw_data = """Category,Service,Price,Duration,Status (Mestan),Status (Jennifer),Status (Simo),Status (Lyazzat),Status (Gulya)
Hair wash,Hair Cut Kids,60 - 80 д.и,00 ч 30 м / 00 ч 50 м,On,—,On,—,—
,Blow Dry,100 - 250 д.и,01 ч 00 м,On,On,On,—,—
,Hair wash,60 д.и,00 ч 30 м,Off,Off,Off,—,—
,Hair cut,175 д.и,01 ч 00 м,Off,—,Off,—,—
,Trimming without wash,80 - 100 д.и,01 ч 00 м,Off,—,Off,—,—
,Hair style,225 - 500 д.и,01 ч 00 м,Off,—,Off,—,—
,Hair cut and blow dry,250 - 300 д.и,01 ч 00 м,Off,—,Off,—,—
Highlights,Roots Color and blow dry,200 - 350 д.и,01 ч 00 м,On,—,On,—,—
,Full Head Color and blow dry,350 - 500 д.и,02 ч 00 м,On,—,On,—,—
,Balayage+Cut+hair style,400 д.и,02 ч 00 м,Off,—,Off,—,—
,"Ombre, shatush, air-touch","1,000 - 1,500 д.и",02 ч 00 м,On,—,On,—,—
,Balayage,"700 - 1,200 д.и",01 ч 00 м,Off,—,Off,—,—
,Roots bleach and blow dry,350 - 450 д.и,01 ч 00 м,Off,—,Off,—,—
,Toner and blow dry,300 - 450 д.и,01 ч 00 м,Off,—,Off,—,—
,Bleach hair,"1,300 - 2,300 д.и",01 ч 00 м,Off,—,Off,—,—
Hair Treatment,Hair Treatment,"600 - 1,500 д.и",03 ч 00 м,On,On,On,—,—
,Natural Treatment,200 д.и,01 ч 00 м,On,—,On,—,—
,Hair extension (only removal),"1,500 д.и",01 ч 00 м,Off,—,Off,—,—
,Hair extensions (1 can),10 - 12 д.и,01 ч 00 м,Off,—,Off,—,—
Eyelashes/Eyebrows,Eyebrows coloring,40 д.и,01 ч 00 м,On,—,—,—,—
,Remove lashes,50 д.и,01 ч 00 м,—,On,—,—,—
Manicure/Pedicure,Manicure basic,80 д.и,01 ч 00 м,—,On,—,On,On
,Pedicure basic,100 д.и,01 ч 00 м,—,On,—,On,On
,Manicure classic,100 д.и,01 ч 00 м,—,On,—,On,On
,Pedicure classic,120 д.и,01 ч 00 м,—,On,—,On,On
,Manicure gel,130 д.и,01 ч 00 м / 02 ч 00 м,—,On,—,On,On
,Pedicure gel,160 д.и,01 ч 00 м / 02 ч 00 м,—,On,—,On,On
,Spa manicure,50 д.и,01 ч 00 м,—,On,—,On,On
,Remove classic,30 д.и,01 ч 00 м,—,On,—,On,On
,Remove gel,25 - 50 д.и,01 ч 00 м,—,On,—,On,On
,Change gel,100 - 120 д.и,01 ч 00 м,—,—,—,On,On
,Spa pedicure,60 д.и,01 ч 00 м,—,On,—,On,On
,Change classic polish,40 - 90 д.и,01 ч 00 м,—,—,—,On,On
,French,30 д.и,01 ч 00 м,—,Off,—,Off,Off
,Hard gel,30 д.и,01 ч 00 м,—,Off,—,Off,Off
,Baby manicure,50 д.и,01 ч 00 м,—,Off,—,Off,Off
,Japanese manicure,100 д.и,01 ч 30 м,—,On,—,On,On
,Nail design,30 д.и,01 ч 00 м,—,—,—,Off,Off
,Починка 1 ноготь,35 д.и,01 ч 00 м,—,—,—,Off,Off
,Накладные ногти,250 д.и,01 ч 00 м,—,—,—,Off,Off
,Podology,200 д.и,01 ч 00 м,—,—,—,—,Off
Nail Extension,Remove nail extensions,50 д.и,01 ч 00 м,—,On,—,On,On
,Gel overlay,250 д.и,01 ч 00 м,—,—,—,Off,—
,Gel extension,350 д.и,01 ч 00 м,—,—,—,Off,—
,Acrylic overlay,300 д.и,01 ч 00 м,—,—,—,Off,Off
,Acrylic extension,380 д.и,01 ч 00 м,—,—,—,Off,Off
Waxing/Sugaring,Full legs,150 д.и,01 ч 00 м,—,On,—,—,On
,Half legs,80 д.и,01 ч 00 м,—,On,—,—,On
,Full arms,80 д.и,01 ч 00 м,—,On,—,—,On
,Half arms,50 д.и,01 ч 00 м,—,On,—,—,On
,Full body,400 д.и,01 ч 00 м,—,On,—,—,On
,Bikini line,100 д.и,01 ч 00 м,—,—,—,—,On
,Under arms,50 д.и,01 ч 00 м,—,Off,—,—,Off
,Full bikini,150 д.и,01 ч 00 м,—,—,—,—,Off
,Brazilian,120 д.и,01 ч 00 м,—,—,—,—,On
,Full face,90 д.и,01 ч 00 м,—,—,—,—,On
,Cheeks,40 д.и,01 ч 00 м,—,—,—,—,On
,Upper lip,30 д.и,01 ч 00 м,—,—,—,—,On
,Chin,30 д.и,01 ч 00 м,—,—,—,—,On
Massage,Moroccan bath loofa,50 д.и,00 ч 30 м,—,On,—,—,—
,Moroccan bathhouse,250 д.и,00 ч 30 м,—,On,—,—,—
,Head 40 min,100 д.и,01 ч 00 м,—,Off,—,—,—
,Leg/feet/ hand 40 min,150 д.и,01 ч 00 м,—,Off,—,—,—
,Neck & shoulder 30 min,165 д.и,01 ч 00 м,—,Off,—,—,—
,Back 30 min,180 д.и,01 ч 00 м,—,Off,—,—,—
,Full body 60 min,260 д.и,01 ч 00 м,—,Off,—,—,—
,Hotstone,310 д.и,01 ч 00 м,—,Off,—,—,—
,Anti-cellulite massage,"300 д.и / 1,080 - 1,920 д.и",01 ч 00 м,—,On,—,—,—
,Back massage (5-10),540 - 960 д.и,01 ч 00 м,—,Off,—,—,—
,Classic general massag...,"1,080 - 1,920 д.и",01 ч 00 м,—,Off,—,—,—
,Sculpture body massag...,370 д.и,01 ч 00 м,—,On,—,—,—
Skin Care,Deep facial cleaning,400 д.и,01 ч 00 м,—,On,—,—,—
,Face lift massage wit...,250 д.и,00 ч 30 м,—,On,—,—,—
,Medical facial cleanin...,450 д.и,01 ч 00 м,—,On,—,—,—
,Piling,300 - 400 д.и,01 ч 00 м,—,On,—,—,—
Promo,Blow dry packages 5,500 д.и,01 ч 00 м,On,—,—,—,—
,Promo 390,390 д.и,01 ч 00 м,Off,Off,—,Off,Off
,Promotion overlay ma...,145 д.и,01 ч 30 м,—,Off,—,Off,Off
,Promo mani pedi 250 ...,125 д.и,01 ч 00 м,—,Off,—,Off,Off
,Combo basic 150,75 д.и,01 ч 00 м,—,Off,—,Off,Off"""

    # 2. Fetch DB Data
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id, name, duration FROM services WHERE is_active = TRUE")
    db_services = {row[1].lower().strip(): row[2] for row in c.fetchall()}
    conn.close()
    
    # 3. Parse and Compare
    reader = csv.reader(io.StringIO(raw_data))
    header = next(reader)
    
    missing_in_db = []
    duration_mismatch = []
    db_only_services = set(db_services.keys())
    
    # Fuzzy match helper
    def find_db_service(search_name):
        search_name = search_name.lower().strip()
        
        # 1. Exact match
        if search_name in db_services:
            return search_name
            
        # 2. Handle Ellipsis "massag..."
        if '...' in search_name:
            prefix = search_name.replace('...', '').strip()
            for db_name in db_services:
                if db_name.startswith(prefix):
                    return db_name
                    
        # 3. Common overrides
        overrides = {
            'face lift massage wit...': 'face lift massage with mask',
            'medical facial cleanin...': 'medical facial cleaning',
            'classic general massag...': 'classic general massage',
            'sculpture body massag...': 'sculpture body massage',
            'promotion overlay ma...': 'promotion overlay manicure',
            'promo mani pedi 250 ...': 'promo mani pedi 250'
        }
        if search_name in overrides:
             ov = overrides[search_name]
             if ov in db_services: return ov
             
        return None

    print(f"{'СТАТУС':<5} | {'УСЛУГА (CSV)':<30} | {'CSV ВРЕМЯ':<10} | {'DB ВРЕМЯ':<10} | {'ПРОБЛЕМА'}")
    print("-" * 80)

    for row in reader:
        if not row: continue
        
        service_csv = row[1].strip()
        duration_str = row[3].strip()
        csv_minutes = parse_duration_text(duration_str)
        
        db_name_key = find_db_service(service_csv)
        
        if not db_name_key:
            print(f"❌    | {service_csv[:30]:<30} | {csv_minutes:<10} | {'-':<10} | Нет в базе данных")
            missing_in_db.append(service_csv)
            continue
            
        # Remove from db_only set as we found it
        if db_name_key in db_only_services:
            db_only_services.remove(db_name_key)
            
        db_minutes = db_services[db_name_key]
        
        # Validation
        db_minutes_int = parse_duration_text(str(db_minutes)) if db_minutes else 0
        
        if db_minutes is None:
            print(f"⚠️    | {service_csv[:30]:<30} | {csv_minutes:<10} | {'NULL':<10} | В базе не указано время")
        elif db_minutes_int != csv_minutes:
             # Check if it is just a format issue "1h" vs 60
             print(f"⚠️    | {service_csv[:30]:<30} | {csv_minutes:<10} | {db_minutes:<10} (={db_minutes_int}m) | Время отличается")
             duration_mismatch.append((service_csv, csv_minutes, db_minutes))
        else:
            # Match
            # print(f"✅    | {service_csv[:30]:<30} | {csv_minutes:<10} | {db_minutes:<10} | OK")
            pass

    print("\n" + "="*80)
    print("📋 УСЛУГИ КОТОРЫЕ ЕСТЬ В БАЗЕ, НО НЕТ В ВАШЕМ СПИСКЕ:")
    print("="*80)
    if db_only_services:
        for s in sorted(list(db_only_services)):
            print(f"🔹 {s} ({db_services[s]} мин)")
    else:
        print("Все услуги из базы есть в списке.")

if __name__ == "__main__":
    check_durations()
