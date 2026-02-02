/**
 * Утилиты для работы с URL
 */

import { EXTERNAL_SERVICES } from './constants';
import { validatePhone, validateUrl, validateInstagramUsername } from './validation';

/**
 * Форматирует номер телефона для WhatsApp URL
 * @param phone - номер телефона
 * @returns WhatsApp URL или пустую строку при ошибке
 */
export const formatWhatsAppUrl = (phone: string): string => {
  if (!phone) return '';

  // Удаляем все нецифровые символы
  const cleanedPhone = phone.replace(/\D/g, '');

  // Валидация
  const validation = validatePhone(phone);
  if (!validation.valid) {
    console.warn('Invalid phone number for WhatsApp:', validation.error);
    return '';
  }

  return `${EXTERNAL_SERVICES.WHATSAPP_BASE}${cleanedPhone}`;
};

/**
 * Форматирует WhatsApp URL с текстом сообщения
 */
export const formatWhatsAppUrlWithText = (phone: string, text: string): string => {
  const baseUrl = formatWhatsAppUrl(phone);
  return `${baseUrl}?text=${encodeURIComponent(text)}`;
};

/**
 * Форматирует Instagram URL
 * @param username - Instagram username или URL
 * @returns Валидный Instagram URL или пустую строку при ошибке
 */
export const formatInstagramUrl = (username: string): string => {
  if (!username) return '';

  // Если уже полный URL, валидируем и возвращаем
  if (username.startsWith('http')) {
    const validation = validateUrl(username);
    return validation.valid ? username : '';
  }

  // Handle www. start
  if (username.startsWith('www.')) {
    return `https://${username}`;
  }

  // Убираем @ если есть
  const cleanUsername = username.replace(/^@?/, '').replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, '');

  // Валидация username
  const validation = validateInstagramUsername(cleanUsername);
  if (!validation.valid) {
    console.warn('Invalid Instagram username:', validation.error);
    return '';
  }

  return `https://instagram.com/${cleanUsername}`;
};

/**
 * Форматирует Google Maps URL
 * @param address - адрес для поиска (опционально)
 * @returns Google Maps URL
 */
export const formatGoogleMapsUrl = (address?: string): string => {
  if (address && address.trim()) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
  }
  return EXTERNAL_SERVICES.GOOGLE_MAPS;
};

/**
 * Параметры для Google Calendar URL
 */
export interface GoogleCalendarParams {
  action?: string;
  text?: string;
  dates?: string;
  details?: string;
  location?: string;
}

/**
 * Форматирует Google Calendar URL
 * @param params - параметры события
 * @returns Google Calendar URL
 */
export const formatGoogleCalendarUrl = (params: GoogleCalendarParams): string => {
  const urlParams = new URLSearchParams();

  if (params.action) urlParams.set('action', params.action);
  if (params.text) urlParams.set('text', params.text);
  if (params.dates) urlParams.set('dates', params.dates);
  if (params.details) urlParams.set('details', params.details);
  if (params.location) urlParams.set('location', params.location);

  return `${EXTERNAL_SERVICES.GOOGLE_CALENDAR}?${urlParams.toString()}`;
};
