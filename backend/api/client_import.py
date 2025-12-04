"""
API endpoint for importing clients from Excel/CSV files
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import io
from datetime import datetime
from typing import Dict, List, Any
from utils.logger import log_info, log_error
from db.clients import get_or_create_client, update_client_info

from core.config import DATABASE_NAME
from db.connection import get_db_connection

router = APIRouter()

def normalize_column_name(col: str) -> str:
    """Normalize column names to match database fields"""
    col_lower = col.lower().strip()
    
    # Mapping of common column names to database fields
    # Mapping of common column names to database fields
    mappings = {
        'имя': 'name',
        'name': 'name',
        'фио': 'name',
        'телефон': 'phone',
        'phone': 'phone',
        'тел': 'phone',
        '# clients': 'phone',
        '#clients': 'phone',
        'clients': 'phone',
        'email': 'email',
        'почта': 'email',
        'категория': 'category',
        'category': 'category',
        'дата рождения': 'date_of_birth',
        'date of birth': 'date_of_birth',
        'birthday': 'date_of_birth',
        'др': 'date_of_birth',
        'instagram': 'instagram_id',
        'инстаграм': 'instagram_id',
        'username': 'username',
        'юзернейм': 'username',
        'заметки': 'notes',
        'notes': 'notes',
        'примечания': 'notes',
        'comment': 'notes',
        'комментарий': 'notes',
        'статус': 'status',
        'status': 'status',
        'gender': 'gender',
        'пол': 'gender',
        
        # New mappings
        'first visit': 'first_contact',
        'first date': 'first_contact',
        'дата первого посещения': 'first_contact',
        'last visit': 'last_contact',
        'last date': 'last_contact',
        'дата последнего посещения': 'last_contact',
        'total spent': 'total_spend',
        'total spend': 'total_spend',
        'revenue': 'total_spend',
        'общая сумма': 'total_spend',
        'lifetime_value': 'total_spend',
        'ltv': 'total_spend',
        'visits': 'total_visits',
        'total visits': 'total_visits',
        'количество посещений': 'total_visits',
        'discount': 'discount',
        'скидка': 'discount',
        'card number': 'card_number',
        'card': 'card_number',
        'номер карты': 'card_number',
        
        # User specific mappings
        'total spend, aed': 'total_spend',
        'total spend aed': 'total_spend',
        'paid, aed': 'paid_amount',
        'paid aed': 'paid_amount',
        'paid': 'paid_amount',
        'additional phone number': 'additional_phone',
        'agreed to receive newsletter': 'newsletter_agreed',
        'agreed to the processing of personal data': 'personal_data_agreed',
        'comment': 'notes',
    }
    
    return mappings.get(col_lower, col_lower)

def parse_date(date_str: Any) -> str:
    """Parse date from various formats to ISO 8601"""
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
        '%Y-%m-%dT%H:%M:%S',                 # ISO format
        '%d.%m.%y %H:%M', '%d.%m.%y %H:%M:%S', # DD.MM.YY HH:MM

    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).isoformat()
        except ValueError:
            continue
            
    return None

def parse_currency(value: Any) -> float:
    """Parse currency string to float"""
    if pd.isna(value) or not value:
        return 0.0
        
    val_str = str(value).strip()
    # Remove common currency symbols and non-numeric chars (except dot/comma)
    clean_val = ''.join(c for c in val_str if c.isdigit() or c in '.,')
    
    if not clean_val:
        return 0.0
        
    try:
        # Replace comma with dot if it's likely a decimal separator
        if ',' in clean_val and '.' not in clean_val:
            clean_val = clean_val.replace(',', '.')
        return float(clean_val)
    except ValueError:
        return 0.0

def validate_phone(phone: str) -> str:
    """Validate and normalize phone number"""
    if not phone or pd.isna(phone) or phone == 'nan':
        return None
    
    # Convert to string and remove all non-digit characters
    phone_str = str(phone).strip()
    
    # Handle scientific notation if it happens (though we try to avoid it with dtype=str)
    if 'e+' in phone_str.lower():
        try:
            phone_str = str(int(float(phone_str)))
        except:
            pass
            
    phone_clean = ''.join(filter(str.isdigit, phone_str))
    
    if len(phone_clean) < 7:
        return None
    
    return phone_clean

def find_existing_client(phone: str = None, email: str = None, instagram_id: str = None) -> dict:
    """
    Find existing client by phone, email, or Instagram ID
    Returns client data if found, None otherwise
    """
    if not phone and not email and not instagram_id:
        return None
    
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    try:
        # Search by phone (check if phone is in JSON array)
        if phone:
            c.execute("SELECT * FROM clients WHERE phone LIKE %s", (f'%{phone}%',))
            result = c.fetchone()
            if result:
                return dict(result)
        
        # Search by email
        if email:
            c.execute("SELECT * FROM clients WHERE LOWER(username) = LOWER(%s)", (email,))
            result = c.fetchone()
            if result:
                return dict(result)
        
        # Search by Instagram ID
        if instagram_id:
            c.execute("SELECT * FROM clients WHERE instagram_id = %s", (instagram_id,))
            result = c.fetchone()
            if result:
                return dict(result)
        
        return None
    finally:
        conn.close()

def merge_phone_numbers(existing_phones: str, new_phone: str) -> str:
    """
    Merge new phone into existing phone array
    Returns JSON array of unique phones
    """
    import json
    
    # Parse existing phones
    try:
        phones = json.loads(existing_phones) if existing_phones else []
        if not isinstance(phones, list):
            phones = [existing_phones] if existing_phones else []
    except (json.JSONDecodeError, TypeError):
        phones = [existing_phones] if existing_phones else []
    
    # Add new phone if not duplicate
    if new_phone and new_phone not in phones:
        phones.append(new_phone)
    
    return json.dumps(phones)

def merge_client_fields(existing: dict, new_data: dict) -> tuple:
    """
    Merge new data into existing client, filling only empty fields
    Returns (updated_data, changed_fields)
    """
    updated = {}
    changed_fields = []
    
    # Fields to check for merging
    mergeable_fields = [
        'name', 'username', 'notes', 'labels', 'status', 'email',
        'card_number', 'discount', 'total_visits', 'total_spend', 
        'first_contact', 'last_contact', 'birthday', 'gender'
    ]
    
    for field in mergeable_fields:
        existing_value = existing.get(field)
        new_value = new_data.get(field)
        
        # Update if existing is empty and new has value
        if (not existing_value or existing_value == '' or existing_value == 0 or existing_value == '0') and new_value:
            updated[field] = new_value
            changed_fields.append(field)
    
    # Handle phone separately (merge arrays)
    if new_data.get('phone'):
        new_phones = merge_phone_numbers(existing.get('phone', ''), new_data['phone'])
        if new_phones != existing.get('phone'):
            updated['phone'] = new_phones
            changed_fields.append('phone')
    
    return updated, changed_fields

def merge_or_create_client(client_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Smart merge: Find existing client and fill empty fields, or create new
    """
    try:
        # Generate instagram_id if not provided
        instagram_id = client_data.get('instagram_id') or client_data.get('username')
        if not instagram_id:
            if client_data.get('phone'):
                instagram_id = f"import_{client_data['phone']}"
            else:
                instagram_id = f"import_{int(datetime.now().timestamp())}"
        
        # Find existing client
        existing = find_existing_client(
            phone=client_data.get('phone'),
            email=client_data.get('email'),
            instagram_id=instagram_id
        )
        
        if existing:
            # Merge data into existing client
            updated_data, changed_fields = merge_client_fields(existing, client_data)
            
            if not changed_fields:
                # All fields already filled
                return {
                    'success': True,
                    'action': 'unchanged',
                    'instagram_id': existing['instagram_id'],
                    'name': existing.get('name', ''),
                    'reason': f"Client exists (ID: {existing['instagram_id']}) and all fields match"
                }
            
            # Update client with merged data
            conn = get_db_connection()
            c = conn.cursor()
            
            # Build UPDATE query dynamically
            set_clause = ', '.join([f"{field} = %s" for field in updated_data.keys()])
            values = list(updated_data.values()) + [existing['instagram_id']]
            
            c.execute(
                f"UPDATE clients SET {set_clause} WHERE instagram_id = %s",
                values
            )
            
            conn.commit()
            conn.close()
            
            log_info(f"🔄 Updated client: {existing.get('name', instagram_id)} (fields: {', '.join(changed_fields)})", "import")
            
            return {
                'success': True,
                'action': 'updated',
                'instagram_id': existing['instagram_id'],
                'name': existing.get('name', ''),
                'updated_fields': changed_fields
            }
        
        else:
            # Create new client
            conn = get_db_connection()
            c = conn.cursor()
            
            now = datetime.now().isoformat()
            
            # Convert single phone to JSON array
            import json
            phone_json = json.dumps([client_data['phone']]) if client_data.get('phone') else '[]'
            
            c.execute("""
                INSERT INTO clients 
                (instagram_id, username, phone, name, first_contact, last_contact, 
                 total_messages, labels, status, detected_language, notes,
                 email, card_number, discount, total_visits, total_spend, gender, birthday)
                VALUES (%s, %s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                instagram_id,
                client_data.get('username', ''),
                phone_json,
                client_data.get('name', ''),
                client_data.get('first_contact'),
                client_data.get('last_contact'),
                client_data.get('category', 'Imported'),
                client_data.get('status', 'new'),
                'ru',
                client_data.get('notes', ''),
                client_data.get('email', ''),
                client_data.get('card_number', ''),
                client_data.get('discount', 0),
                client_data.get('total_visits', 0),
                client_data.get('total_spend', 0),
                client_data.get('gender', ''),
                client_data.get('birthday', '')
            ))
            
            conn.commit()
            conn.close()
            
            log_info(f"✅ Created client: {client_data.get('name', instagram_id)}", "import")
            
            return {
                'success': True,
                'action': 'created',
                'instagram_id': instagram_id,
                'name': client_data.get('name', '')
            }
        
    except Exception as e:
        log_error(f"Error merging/creating client: {e}", "import")
        return {
            'success': False,
            'error': str(e),
            'data': client_data
        }

@router.post("/clients/import")
async def import_clients(file: UploadFile = File(...)):
    """Import clients from CSV file"""
    try:
        log_info(f"📥 Starting import from file: {file.filename}", "import")
        
        contents = await file.read()
        filename = file.filename.lower()
        df = None
        
        if filename.endswith('.csv'):
            # Pre-process CSV to handle unquoted headers with commas
            try:
                # Try utf-8-sig first to handle BOM
                text_content = contents.decode('utf-8-sig')
            except UnicodeDecodeError:
                # Fallback to latin1 if utf-8 fails
                text_content = contents.decode('latin1', errors='replace')
                
            # Fix specific problematic headers known to cause issues
            # Handle various spacing and case
            text_content = text_content.replace('Total Spend, AED', 'Total Spend AED')
            text_content = text_content.replace('Paid, AED', 'Paid AED')
            text_content = text_content.replace('Total Spend,AED', 'Total Spend AED')
            text_content = text_content.replace('Paid,AED', 'Paid AED')
            
            try:
                # Try parsing with comma delimiter first (standard CSV)
                df = pd.read_csv(io.StringIO(text_content), dtype=str)
                
                # If parsing failed to separate columns (e.g. wrong delimiter), try semicolon
                if len(df.columns) <= 1:
                     df = pd.read_csv(io.StringIO(text_content), sep=';', dtype=str)
                     
            except Exception as e:
                log_error(f"CSV parsing error: {e}", "import")
                # Last resort: try python engine with auto-detection
                try:
                    df = pd.read_csv(io.StringIO(text_content), sep=None, engine='python', dtype=str)
                except Exception as e2:
                    raise HTTPException(status_code=400, detail=f"Could not parse CSV file: {str(e2)}")

        elif filename.endswith(('.xls', '.xlsx')):
            try:
                df = pd.read_excel(io.BytesIO(contents), dtype=str)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Could not parse Excel file: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a CSV or Excel file.")
        
        if df is None or len(df.columns) <= 1:
            raise HTTPException(status_code=400, detail="Could not parse file or file is empty/malformed.")

        # Normalize columns
        df.columns = [normalize_column_name(str(col)) for col in df.columns]
        
        log_info(f"📋 Normalized columns: {df.columns.tolist()}", "import")
        
        conn = get_db_connection()
        c = conn.cursor()
        
        results = {
            'created': 0,
            'updated': 0,
            'unchanged': 0,
            'errors': []
        }
        
        for idx, row in df.iterrows():
            # 1. Phone processing
            raw_phone = row.get('phone')
            phone = validate_phone(raw_phone)
            
            # Debug first 5 rows
            if idx < 5:
                log_info(f"🔍 Row {idx+1} Raw: {row.to_dict()}", "import")
            
            # Generate ID
            if phone:
                instagram_id = f"import_{phone}"
            else:
                # Skip rows without phone if strict, or generate random ID
                # For now, let's skip rows without phone as it's primary identifier
                if idx < 5:
                    log_info(f"⚠️ Row {idx+1} skipped: No valid phone (raw: {raw_phone})", "import")
                continue
            
            # Prepare client data
            client_data = {
                'instagram_id': instagram_id,
                'phone': phone,
                'name': str(row.get('name', '')).strip() if not pd.isna(row.get('name')) else '',
                'username': str(row.get('username', '')).strip() if not pd.isna(row.get('username')) else '',
                'email': str(row.get('email', '')).strip() if not pd.isna(row.get('email')) else '',
                'category': str(row.get('category', '')).strip() if not pd.isna(row.get('category')) else 'Imported',
                'gender': str(row.get('gender', '')).strip() if not pd.isna(row.get('gender')) else '',
                'birthday': parse_date(row.get('date_of_birth')),
                'notes': str(row.get('notes', '')).strip() if not pd.isna(row.get('notes')) else '',
                'status': str(row.get('status', '')).strip() if not pd.isna(row.get('status')) else 'new',
                
                # New fields with parsing
                'card_number': str(row.get('card_number', '')).strip() if not pd.isna(row.get('card_number')) else '',
                'discount': parse_currency(row.get('discount')),
                'total_visits': int(parse_currency(row.get('total_visits'))),
                'additional_phone': str(row.get('additional_phone', '')).strip() if not pd.isna(row.get('additional_phone')) else '',
                'newsletter_agreed': 1 if str(row.get('newsletter_agreed', '')).lower() in ['true', '1', 'yes', 'да'] else 0,
                'personal_data_agreed': 1 if str(row.get('personal_data_agreed', '')).lower() in ['true', '1', 'yes', 'да'] else 0,
                'total_spend': parse_currency(row.get('total_spend')),
                'paid_amount': parse_currency(row.get('paid_amount')),
                'first_contact': parse_date(row.get('first_contact')),
                'last_contact': parse_date(row.get('last_contact')),
            }

            if idx < 5:
                log_info(f"✨ Row {idx+1} Parsed: {client_data}", "import")

            # Merge or create client
            result = merge_or_create_client(client_data)
            
            if result['success']:
                action = result.get('action', 'created')
                if action == 'created':
                    results['created'] += 1
                elif action == 'updated':
                    results['updated'] += 1
                elif action == 'unchanged':
                    results['unchanged'] += 1
                    # Add to skipped details
                    results['errors'].append({
                        'row': idx + 2,
                        'status': 'skipped',
                        'reason': result.get('reason', 'Client already exists and no new data to update'),
                        'name': client_data.get('name', ''),
                        'phone': client_data.get('phone', '')
                    })
            else:
                results['errors'].append({
                    'row': idx + 2,
                    'status': 'error',
                    'error': result.get('error', 'Unknown error'),
                    'name': client_data.get('name', '')
                })
        
        log_info(f"✅ Import completed: {results['created']} created, {results['updated']} updated, {results['unchanged']} unchanged", "import")
        
        return JSONResponse(content={
            'success': True,
            'results': results,
            'message': f"Import completed: {results['created']} created, {results['updated']} updated, {results['unchanged']} skipped (duplicates)"
        })
        
    except Exception as e:
        log_error(f"❌ Import failed: {e}", "import", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Import failed: {str(e)}"
        )
