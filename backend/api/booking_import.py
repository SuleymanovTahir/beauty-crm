"""
API endpoint for importing bookings from Excel/CSV files
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
import pandas as pd
import io
from datetime import datetime
from typing import Dict, List, Any
from utils.logger import log_info, log_error

from core.config import DATABASE_NAME
from db.connection import get_db_connection

router = APIRouter()

def normalize_column_name(col: str) -> str:
    """Normalize column names to match database fields"""
    col_lower = col.lower().strip()
    
    mappings = {
        'client': 'client_name',
        'клиент': 'client_name',
        'имя': 'client_name',
        'name': 'client_name',
        'service': 'service_name',
        'услуга': 'service_name',
        'сервис': 'service_name',
        'date': 'datetime',
        'дата': 'datetime',
        'datetime': 'datetime',
        'дата и время': 'datetime',
        'time': 'time',
        'время': 'time',
        'phone': 'phone',
        'телефон': 'phone',
        'тел': 'phone',
        'master': 'master',
        'мастер': 'master',
        'employee': 'master',
        'сотрудник': 'master',
        'status': 'status',
        'статус': 'status',
        'revenue': 'revenue',
        'price': 'revenue',
        'стоимость': 'revenue',
        'цена': 'revenue',
        'notes': 'notes',
        'заметки': 'notes',
        'примечания': 'notes',
        'comment': 'notes',
    }
    
    return mappings.get(col_lower, col_lower)

def parse_datetime(date_str: Any, time_str: Any = None) -> str:
    """Parse date and time from various formats to ISO 8601"""
    if pd.isna(date_str) or not date_str:
        return None
        
    date_str = str(date_str).strip()
    if not date_str:
        return None
    
    # If time is provided separately, combine them
    if time_str and not pd.isna(time_str):
        time_str = str(time_str).strip()
        if time_str:
            date_str = f"{date_str} {time_str}"
        
    formats = [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d %H:%M',
        '%d.%m.%Y %H:%M',
        '%d.%m.%Y %H:%M:%S',
        '%d/%m/%Y %H:%M',
        '%d-%m-%Y %H:%M',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d',
        '%d.%m.%Y',
        '%d/%m/%Y',
        '%d-%m-%Y',
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            # If no time was in the format, add default time 10:00
            if '%H' not in fmt:
                dt = dt.replace(hour=10, minute=0, second=0)
            return dt.isoformat()
        except ValueError:
            continue
            
    return None

def parse_currency(value: Any) -> float:
    """Parse currency string to float"""
    if pd.isna(value) or not value:
        return 0.0
        
    val_str = str(value).strip()
    clean_val = ''.join(c for c in val_str if c.isdigit() or c in '.,')
    
    if not clean_val:
        return 0.0
        
    try:
        if ',' in clean_val and '.' not in clean_val:
            clean_val = clean_val.replace(',', '.')
        return float(clean_val)
    except ValueError:
        return 0.0

def validate_phone(phone: str) -> str:
    """Validate and normalize phone number"""
    if not phone or pd.isna(phone) or phone == 'nan':
        return None
    
    phone_str = str(phone).strip()
    
    if 'e+' in phone_str.lower():
        try:
            phone_str = str(int(float(phone_str)))
        except:
            pass
            
    phone_clean = ''.join(filter(str.isdigit, phone_str))
    
    if len(phone_clean) < 7:
        return None
    
    return phone_clean

def find_or_create_client(name: str, phone: str = None) -> str:
    """
    Find existing client by name or phone, or create a temporary one
    Returns instagram_id
    """
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    try:
        # Search by phone first
        if phone:
            c.execute("SELECT instagram_id FROM clients WHERE phone LIKE %s", (f'%{phone}%',))
            result = c.fetchone()
            if result:
                return result['instagram_id']
        
        # Search by name
        if name:
            c.execute("SELECT instagram_id FROM clients WHERE LOWER(name) = LOWER(%s)", (name,))
            result = c.fetchone()
            if result:
                return result['instagram_id']
        
        # Create temporary client
        import json
        instagram_id = f"import_booking_{int(datetime.now().timestamp())}_{name.replace(' ', '_')}"
        phone_json = json.dumps([phone]) if phone else '[]'
        
        c.execute("""
            INSERT INTO clients 
            (instagram_id, name, phone, status, labels, total_messages, detected_language)
            VALUES (%s, %s, %s, 'new', 'Imported', 0, 'ru')
        """, (instagram_id, name, phone_json))
        
        conn.commit()
        log_info(f"✅ Created temporary client: {name} ({instagram_id})", "import")
        
        return instagram_id
        
    finally:
        conn.close()

def find_service(service_name: str) -> str:
    """Find service by name, return service name or original"""
    if not service_name:
        return "Imported Service"
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("SELECT name_ru FROM services WHERE LOWER(name_ru) = LOWER(%s) OR LOWER(name) = LOWER(%s)", 
                  (service_name, service_name))
        result = c.fetchone()
        if result:
            return result[0]
        return service_name
    finally:
        conn.close()

@router.post("/bookings/import")
async def import_bookings(file: UploadFile = File(...)):
    """Import bookings from CSV/Excel file"""
    try:
        log_info(f"📥 Starting booking import from file: {file.filename}", "import")
        
        contents = await file.read()
        filename = file.filename.lower()
        df = None
        
        if filename.endswith('.csv'):
            try:
                text_content = contents.decode('utf-8-sig')
            except UnicodeDecodeError:
                text_content = contents.decode('latin1', errors='replace')
            
            try:
                df = pd.read_csv(io.StringIO(text_content), dtype=str)
                if len(df.columns) <= 1:
                    df = pd.read_csv(io.StringIO(text_content), sep=';', dtype=str)
            except Exception as e:
                log_error(f"CSV parsing error: {e}", "import")
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
            'imported': 0,
            'skipped': 0,
            'errors': []
        }
        
        for idx, row in df.iterrows():
            try:
                # Parse required fields
                client_name = str(row.get('client_name', '')).strip() if not pd.isna(row.get('client_name')) else ''
                service_name = str(row.get('service_name', '')).strip() if not pd.isna(row.get('service_name')) else ''
                
                if not client_name or not service_name:
                    results['skipped'] += 1
                    results['errors'].append({
                        'row': idx + 2,
                        'error': 'Missing client name or service name'
                    })
                    continue
                
                # Parse datetime
                datetime_str = parse_datetime(
                    row.get('datetime') or row.get('date'),
                    row.get('time')
                )
                
                if not datetime_str:
                    results['skipped'] += 1
                    results['errors'].append({
                        'row': idx + 2,
                        'error': 'Invalid or missing date/time'
                    })
                    continue
                
                # Get or create client
                phone = validate_phone(row.get('phone'))
                client_id = find_or_create_client(client_name, phone)
                
                # Find service
                service = find_service(service_name)
                
                # Parse other fields
                master = str(row.get('master', '')).strip() if not pd.isna(row.get('master')) else ''
                status = str(row.get('status', 'pending')).strip().lower() if not pd.isna(row.get('status')) else 'pending'
                revenue = parse_currency(row.get('revenue'))
                notes = str(row.get('notes', '')).strip() if not pd.isna(row.get('notes')) else ''
                
                # Insert booking
                c.execute("""
                    INSERT INTO bookings 
                    (client_id, name, service, service_name, datetime, phone, master, status, revenue, notes, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    client_id,
                    client_name,
                    service,
                    service,
                    datetime_str,
                    phone or '',
                    master,
                    status,
                    revenue,
                    notes,
                    datetime.now().isoformat()
                ))
                
                results['imported'] += 1
                
            except Exception as e:
                log_error(f"Error importing row {idx + 2}: {e}", "import")
                results['skipped'] += 1
                results['errors'].append({
                    'row': idx + 2,
                    'error': str(e)
                })
        
        conn.commit()
        conn.close()
        
        log_info(f"✅ Booking import completed: {results['imported']} imported, {results['skipped']} skipped", "import")
        
        return JSONResponse(content={
            'success': True,
            'imported': results['imported'],
            'skipped': results['skipped'],
            'errors': results['errors'][:10],  # Limit errors to first 10
            'message': f"Import completed: {results['imported']} bookings imported, {results['skipped']} skipped"
        })
        
    except Exception as e:
        log_error(f"❌ Booking import failed: {e}", "import", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Import failed: {str(e)}"
        )

@router.get("/bookings/import/template")
async def download_booking_template(format: str = 'csv'):
    """Download booking import template"""
    try:
        # Create template dataframe
        template_data = {
            'Client': ['Anna Ivanova', 'Maria Petrova'],
            'Service': ['Manicure', 'Hair Coloring'],
            'Date': ['2025-01-15', '2025-01-16'],
            'Time': ['14:00', '10:00'],
            'Phone': ['971501234567', '971509876543'],
            'Master': ['Olga Masterova', 'Victoria Stylist'],
            'Status': ['pending', 'confirmed'],
            'Revenue': ['200', '450'],
            'Notes': ['Regular client', 'First visit']
        }
        
        df = pd.DataFrame(template_data)
        
        if format == 'excel':
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Bookings')
            output.seek(0)
            
            return StreamingResponse(
                output,
                media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                headers={'Content-Disposition': 'attachment; filename=bookings_template.xlsx'}
            )
        else:
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)
            
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename=bookings_template.csv'}
            )
            
    except Exception as e:
        log_error(f"Error generating template: {e}", "import")
        raise HTTPException(status_code=500, detail=f"Failed to generate template: {str(e)}")
