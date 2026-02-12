/**
 * Утилиты для работы с URL
 */

import { EXTERNAL_SERVICES } from './constants';
import { validatePhone, validateUrl, validateInstagramUsername } from './validation';
import { supportedLanguages } from '../../src/utils/i18nUtils';

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

const OG_LOCALE_BY_LANG: Record<string, string> = {
  en: 'en_US',
  ru: 'ru_RU',
  ar: 'ar_AE',
  es: 'es_ES',
  de: 'de_DE',
  fr: 'fr_FR',
  hi: 'hi_IN',
  kk: 'kk_KZ',
  pt: 'pt_PT',
};

export const SEO_LANGUAGES: string[] = supportedLanguages.map((lang) => lang.code);
export const DEFAULT_SEO_LANGUAGE = 'en';

const trimBaseUrl = (baseUrl: string): string => {
  const fallback = typeof window !== 'undefined' ? window.location.origin : '';
  return (baseUrl || fallback).replace(/\/+$/, '');
};

const normalizePathname = (pathname: string): string => {
  if (!pathname) return '/';
  const pathOnly = pathname.split('?')[0].split('#')[0];
  return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
};

const upsertLink = (rel: string, href: string, attrs: Record<string, string> = {}): void => {
  const selectorParts = [`link[rel="${rel}"]`];
  Object.entries(attrs).forEach(([key, value]) => {
    selectorParts.push(`[${key}="${value}"]`);
  });
  const selector = selectorParts.join('');

  let el = document.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    Object.entries(attrs).forEach(([key, value]) => el!.setAttribute(key, value));
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

const upsertMeta = (selector: string, attr: string, value: string): void => {
  if (!value) return;
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    const nameMatch = selector.match(/meta\[name="([^"]+)"\]/);
    const propMatch = selector.match(/meta\[property="([^"]+)"\]/);
    if (nameMatch) el.setAttribute('name', nameMatch[1]);
    if (propMatch) el.setAttribute('property', propMatch[1]);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

export const normalizeSeoLanguage = (lang?: string | null): string => {
  const normalized = (lang || '').split('-')[0].toLowerCase().trim();
  return SEO_LANGUAGES.includes(normalized) ? normalized : DEFAULT_SEO_LANGUAGE;
};

export const getLanguageFromQuery = (search = window.location.search): string | null => {
  const params = new URLSearchParams(search || '');
  const value = params.get('lang');
  if (!value) return null;
  return normalizeSeoLanguage(value);
};

export const buildLocalizedUrl = (baseUrl: string, pathname: string, language: string): string => {
  const root = trimBaseUrl(baseUrl);
  const path = normalizePathname(pathname);
  const lang = normalizeSeoLanguage(language);
  if (lang === DEFAULT_SEO_LANGUAGE) {
    return `${root}${path}`;
  }
  return `${root}${path}?lang=${encodeURIComponent(lang)}`;
};

export const syncLanguageQueryParam = (language: string): void => {
  if (typeof window === 'undefined') return;
  const lang = normalizeSeoLanguage(language);
  const url = new URL(window.location.href);
  if (lang === DEFAULT_SEO_LANGUAGE) {
    url.searchParams.delete('lang');
  } else {
    url.searchParams.set('lang', lang);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(null, '', next);
  }
};

export const syncCanonicalAndHreflang = (baseUrl: string, pathname: string, language: string): string => {
  const lang = normalizeSeoLanguage(language);
  const canonical = buildLocalizedUrl(baseUrl, pathname, lang);
  upsertLink('canonical', canonical);

  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
  SEO_LANGUAGES.forEach((code) => {
    const href = buildLocalizedUrl(baseUrl, pathname, code);
    upsertLink('alternate', href, { hreflang: code });
  });
  upsertLink('alternate', buildLocalizedUrl(baseUrl, pathname, DEFAULT_SEO_LANGUAGE), { hreflang: 'x-default' });

  return canonical;
};

export const syncHtmlLanguageMeta = (language: string): void => {
  const lang = normalizeSeoLanguage(language);
  document.documentElement.lang = lang;

  upsertMeta('meta[property="og:locale"]', 'content', OG_LOCALE_BY_LANG[lang] || OG_LOCALE_BY_LANG.en);
  document.querySelectorAll('meta[property="og:locale:alternate"]').forEach((el) => el.remove());
  SEO_LANGUAGES
    .filter((code) => code !== lang)
    .forEach((code) => {
      const el = document.createElement('meta');
      el.setAttribute('property', 'og:locale:alternate');
      el.setAttribute('content', OG_LOCALE_BY_LANG[code] || OG_LOCALE_BY_LANG.en);
      document.head.appendChild(el);
    });
};
