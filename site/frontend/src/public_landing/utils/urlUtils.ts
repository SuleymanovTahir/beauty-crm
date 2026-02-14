/**
 * Утилиты для работы с URL
 */

import { EXTERNAL_SERVICES } from './constants';
import { validatePhone, validateUrl, validateInstagramUsername } from './validation';
import { supportedLanguages } from '@site/utils/i18nUtils';

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

export interface ReferralAttributionState {
  campaignId: number;
  shareToken: string;
  capturedAt: string;
  expiresAt: string;
  sourcePath: string;
}

const REFERRAL_ATTRIBUTION_STORAGE_KEY = 'beauty_referral_attribution_v1';
const REFERRAL_ATTRIBUTION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const normalizeReferralToken = (value: unknown): string => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized.replace(/[^a-z0-9]/g, '');
};

const normalizeReferralCampaignId = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
};

const readStoredReferralAttributionRaw = (): ReferralAttributionState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(REFERRAL_ATTRIBUTION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const shareToken = normalizeReferralToken(parsed?.shareToken);
    const campaignId = normalizeReferralCampaignId(parsed?.campaignId);
    const capturedAt = String(parsed?.capturedAt ?? '');
    const expiresAt = String(parsed?.expiresAt ?? '');
    const sourcePath = String(parsed?.sourcePath ?? '/');

    if (!shareToken && campaignId <= 0) {
      return null;
    }

    return {
      campaignId,
      shareToken,
      capturedAt,
      expiresAt,
      sourcePath,
    };
  } catch (error) {
    return null;
  }
};

const parseReferralAttributionFromLocation = (
  pathname: string,
  search: string
): { campaignId: number; shareToken: string } => {
  const normalizedPath = String(pathname ?? '').trim();
  const params = new URLSearchParams(search ?? '');
  const shareFromQuery = normalizeReferralToken(params.get('ref_share'));
  const campaignId = normalizeReferralCampaignId(params.get('ref_campaign'));

  const pathMatch = normalizedPath.match(/^\/ref\/([a-z0-9]+)/i);
  const shareFromPath = pathMatch && pathMatch[1] ? normalizeReferralToken(pathMatch[1]) : '';
  const shareToken = shareFromPath.length > 0 ? shareFromPath : shareFromQuery;
  const inferredCampaignMatch = shareToken.match(/^cmp(\d+)$/);
  const inferredCampaignId = inferredCampaignMatch && inferredCampaignMatch[1]
    ? normalizeReferralCampaignId(inferredCampaignMatch[1])
    : 0;
  const resolvedCampaignId = campaignId > 0 ? campaignId : inferredCampaignId;

  return { campaignId: resolvedCampaignId, shareToken };
};

export const getStoredReferralAttribution = (): ReferralAttributionState | null => {
  const stored = readStoredReferralAttributionRaw();
  if (!stored) {
    return null;
  }

  const expiresAtDate = new Date(stored.expiresAt);
  const expiresAtTime = expiresAtDate.getTime();
  if (!Number.isFinite(expiresAtTime) || expiresAtTime < Date.now()) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(REFERRAL_ATTRIBUTION_STORAGE_KEY);
    }
    return null;
  }

  return stored;
};

export const persistReferralAttribution = (
  value: Partial<ReferralAttributionState> & { campaignId?: number; shareToken?: string },
  sourcePath?: string
): ReferralAttributionState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const existing = getStoredReferralAttribution();
  const shareToken = normalizeReferralToken(value.shareToken ?? existing?.shareToken ?? '');
  const campaignId = normalizeReferralCampaignId(value.campaignId ?? existing?.campaignId ?? 0);

  if (!shareToken && campaignId <= 0) {
    return null;
  }

  const capturedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + REFERRAL_ATTRIBUTION_TTL_MS).toISOString();
  const payload: ReferralAttributionState = {
    campaignId,
    shareToken,
    capturedAt,
    expiresAt,
    sourcePath: String(sourcePath ?? window.location.pathname ?? '/'),
  };

  window.localStorage.setItem(REFERRAL_ATTRIBUTION_STORAGE_KEY, JSON.stringify(payload));
  return payload;
};

export const captureReferralAttributionFromCurrentUrl = (
  pathname = window.location.pathname,
  search = window.location.search
): ReferralAttributionState | null => {
  const parsed = parseReferralAttributionFromLocation(pathname, search);
  if (parsed.shareToken.length === 0 && parsed.campaignId <= 0) {
    return getStoredReferralAttribution();
  }
  return persistReferralAttribution(parsed, pathname);
};

export const clearStoredReferralAttribution = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(REFERRAL_ATTRIBUTION_STORAGE_KEY);
};

export const buildReferralBookingSource = (
  baseSource: string,
  attribution?: { campaignId?: number; shareToken?: string } | null
): string => {
  const normalizedBase = String(baseSource ?? '').trim();
  if (normalizedBase.length === 0) {
    return '';
  }

  const normalizedCampaignId = normalizeReferralCampaignId(attribution?.campaignId ?? 0);
  const normalizedShareToken = normalizeReferralToken(attribution?.shareToken ?? '');

  if (normalizedCampaignId > 0 && normalizedShareToken.length > 0) {
    return `${normalizedBase}_ref_campaign_${normalizedCampaignId}_ref_share_${normalizedShareToken}`;
  }
  if (normalizedCampaignId > 0) {
    return `${normalizedBase}_ref_campaign_${normalizedCampaignId}`;
  }
  if (normalizedShareToken.length > 0) {
    return `${normalizedBase}_ref_share_${normalizedShareToken}`;
  }
  return normalizedBase;
};
