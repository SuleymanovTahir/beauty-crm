
import re

def validate_phone_number(phone: str) -> bool:
    """
    Validate phone number format.
    Supports international formats with flexible validation.
    """
    is_valid, _ = validate_phone_detailed(phone)
    return is_valid


def validate_phone_detailed(phone: str) -> tuple[bool, str]:
    """
    Validate phone number format with detailed error messages.
    Supports multiple international formats with smart detection.
    """
    if not phone:
        return False, "номер не указан"
        
    # Remove spaces, dashes, parentheses, plus
    clean_phone = re.sub(r'[^\d]', '', phone)
    
    # Check if contains only allowed characters (digits, +, spaces, dashes, parens)
    if not re.match(r'^[\d\+\-\(\)\s]+$', phone):
        return False, "номер содержит недопустимые символы"
    
    digit_count = len(clean_phone)
    
    # 1. UAE/GCC Validation (971 country code)
    # International: 971 50 123 4567 (12 digits)
    # Local: 050 123 4567 (10 digits)
    # Short local: 50 123 4567 (9 digits)
    if clean_phone.startswith('971'):
        if digit_count != 12:
            return False, f"номер UAE должен содержать 12 цифр, у вас {digit_count}"
        return True, None
        
    if clean_phone.startswith('05'):
        if digit_count != 10:
            return False, f"номер UAE должен содержать 10 цифр, у вас {digit_count}"
        return True, None
        
    if clean_phone.startswith('5'):
        if digit_count != 9:
            return False, f"номер UAE должен содержать 9 цифр, у вас {digit_count}"
        return True, None

    # 2. CIS/Russia/Kazakhstan Validation (7 country code)
    # Format: 7 700 123 45 67 (11 digits total)
    if clean_phone.startswith('7'):
        if digit_count != 11:
            return False, f"номер должен содержать 11 цифр, у вас {digit_count}"
        return True, None
        
    # 3. General Fallback
    if digit_count < 9:
        return False, f"номер слишком короткий (минимум 9 цифр, у вас {digit_count})"
    
    if digit_count > 15:
        return False, f"номер слишком длинный (максимум 15 цифр, у вас {digit_count})"
        
    return True, None
