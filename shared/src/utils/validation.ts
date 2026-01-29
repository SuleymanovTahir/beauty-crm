// Shared validation utilities for web and mobile

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (basic international format)
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-digits except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Should have 10-15 digits
  const digits = cleaned.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate required field
 */
export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Validate minimum length
 */
export function minLength(value: string, min: number): boolean {
  return value.length >= min;
}

/**
 * Validate maximum length
 */
export function maxLength(value: string, max: number): boolean {
  return value.length <= max;
}

/**
 * Validate number range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validate positive number
 */
export function isPositive(value: number): boolean {
  return value > 0;
}

/**
 * Validate non-negative number
 */
export function isNonNegative(value: number): boolean {
  return value >= 0;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

/**
 * Validate Instagram username
 */
export function isValidInstagramUsername(username: string): boolean {
  // Instagram usernames: 1-30 chars, letters, numbers, periods, underscores
  const regex = /^[a-zA-Z0-9._]{1,30}$/;
  return regex.test(username);
}

/**
 * Sanitize string for safe display
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Form validation helper
 */
export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: number | string | RegExp;
  message: string;
  validator?: (value: unknown) => boolean;
}

export function validateField(value: unknown, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    switch (rule.type) {
      case 'required':
        if (!isRequired(value)) return rule.message;
        break;
      case 'email':
        if (typeof value === 'string' && value && !isValidEmail(value)) return rule.message;
        break;
      case 'phone':
        if (typeof value === 'string' && value && !isValidPhone(value)) return rule.message;
        break;
      case 'minLength':
        if (typeof value === 'string' && !minLength(value, rule.value as number)) return rule.message;
        break;
      case 'maxLength':
        if (typeof value === 'string' && !maxLength(value, rule.value as number)) return rule.message;
        break;
      case 'pattern':
        if (typeof value === 'string' && !(rule.value as RegExp).test(value)) return rule.message;
        break;
      case 'custom':
        if (rule.validator && !rule.validator(value)) return rule.message;
        break;
    }
  }
  return null;
}
