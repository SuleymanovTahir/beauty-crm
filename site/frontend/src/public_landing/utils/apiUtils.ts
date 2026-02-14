/**
 * Утилиты для работы с API
 */

import { config } from './config';
import { safeFetch } from './errorHandler';
import { buildApiUrl } from '@site/api/client';

/**
 * Получает базовый URL API
 * @returns Базовый URL API
 */
export const getApiUrl = (): string => {
  return config.api.baseUrl;
};

/**
 * Безопасный вызов публичного API
 * @param endpoint - endpoint API (без /api/public)
 * @param params - параметры запроса
 * @returns Promise с данными
 */
export const fetchPublicApi = async <T = any>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> => {
  const API_URL = getApiUrl();
  const queryString = params
    ? '?' + new URLSearchParams(params).toString()
    : '';
  const normalizedEndpoint = endpoint.replace(/^\/+/, '');
  const url = buildApiUrl(`/api/public/${normalizedEndpoint}${queryString}`, API_URL);
  
  const res = await safeFetch(url);
  return res.json();
};

/**
 * Безопасный вызов API с языком
 * @param endpoint - endpoint API
 * @param language - язык для запроса
 * @param params - дополнительные параметры
 * @returns Promise с данными
 */
export const fetchPublicApiWithLanguage = async <T = any>(
  endpoint: string,
  language: string,
  params?: Record<string, string>
): Promise<T> => {
  return fetchPublicApi<T>(endpoint, {
    language,
    ...params,
  });
};
