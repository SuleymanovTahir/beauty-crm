/**
 * Утилиты для валидации
 */

/**
 * Валидация телефонного номера
 */
export const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'Phone number is required' };
  }

  // Удаляем все нецифровые символы для проверки
  const digitsOnly = phone.replace(/\D/g, '');

  // Минимальная длина - 5 цифр, максимальная - 15
  if (digitsOnly.length < 5) {
    return { valid: false, error: 'Phone number is too short' };
  }

  if (digitsOnly.length > 15) {
    return { valid: false, error: 'Phone number is too long' };
  }

  return { valid: true };
};

/**
 * Валидация URL
 */
export const validateUrl = (url: string): { valid: boolean; error?: string } => {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL is required' };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    // Попробуем добавить протокол, если его нет
    try {
      new URL(`https://${url}`);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }
};

/**
 * Валидация email
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
};

/**
 * Валидация Instagram username
 */
export const validateInstagramUsername = (username: string): { valid: boolean; error?: string } => {
  if (!username || username.trim() === '') {
    return { valid: false, error: 'Instagram username is required' };
  }

  // Убираем @ и URL части, а также trailing slash
  const cleanUsername = username.replace(/^@?/, '').replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, '').replace(/\/$/, '');

  // Instagram username должен быть от 1 до 30 символов, только буквы, цифры, точки и подчеркивания
  const instagramRegex = /^[a-zA-Z0-9._]{1,30}$/;
  if (!instagramRegex.test(cleanUsername)) {
    return { valid: false, error: 'Invalid Instagram username format' };
  }

  return { valid: true };
};
