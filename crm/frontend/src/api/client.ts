import i18n from '../i18n';
const configuredApiUrl = String(import.meta.env.VITE_API_URL ?? '').trim();
export const BASE_URL = configuredApiUrl.length > 0 ? configuredApiUrl : window.location.origin;
const API_PATH_PREFIX = String(import.meta.env.VITE_API_PATH_PREFIX || '')
  .trim()
  .replace(/\/+$/, '');

interface FetchOptions extends RequestInit {
  body?: any
}

function normalizeLegacyNamespacedEndpoint(endpoint: string): string {
  return endpoint
}

function applyApiPathPrefix(endpoint: string): string {
  if (!endpoint.startsWith('/api') || API_PATH_PREFIX.length === 0) {
    return endpoint
  }
  return `${API_PATH_PREFIX}${endpoint}`
}

export function resolveApiEndpoint(endpoint: string): string {
  const normalizedEndpoint = normalizeLegacyNamespacedEndpoint(endpoint)
  return applyApiPathPrefix(normalizedEndpoint)
}

export function buildApiUrl(endpoint: string, baseUrl: string = BASE_URL): string {
  return `${baseUrl}${resolveApiEndpoint(endpoint)}`
}

function resolveWebSocketEndpoint(endpoint: string): string {
  const normalizedEndpoint = normalizeLegacyNamespacedEndpoint(endpoint)
  return applyApiPathPrefix(normalizedEndpoint)
}

export function buildWebSocketUrl(endpoint: string, baseUrl: string = BASE_URL): string {
  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const parsedBase = new URL(baseUrl, fallbackOrigin)
  const wsProtocol = parsedBase.protocol === 'https:' ? 'wss:' : 'ws:'
  const resolvedEndpoint = resolveWebSocketEndpoint(endpoint)
  return `${wsProtocol}//${parsedBase.host}${resolvedEndpoint}`
}

function getApiOrigins(): string[] {
  const origins = new Set<string>()
  if (typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
    origins.add(window.location.origin)
  }

  try {
    origins.add(new URL(BASE_URL, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').origin)
  } catch (_error) {
    // BASE_URL can be malformed only with invalid env values; ignore silently and keep runtime origin fallback.
  }

  return Array.from(origins)
}

function rewriteApiUrl(rawUrl: string): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl, window.location.origin)
  } catch (_error) {
    return null
  }

  const apiOrigins = getApiOrigins()
  if (!apiOrigins.includes(parsedUrl.origin)) {
    return null
  }

  const sourceEndpoint = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
  const resolvedEndpoint = resolveApiEndpoint(sourceEndpoint)
  if (resolvedEndpoint === sourceEndpoint) {
    return null
  }

  return new URL(resolvedEndpoint, parsedUrl.origin).toString()
}

let fetchInterceptorInstalled = false

export function installApiNamespaceFetchInterceptor(): void {
  if (fetchInterceptorInstalled || typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return
  }

  fetchInterceptorInstalled = true
  const originalFetch = window.fetch.bind(window)

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') {
      const rewritten = rewriteApiUrl(input)
      return originalFetch(rewritten ?? input, init)
    }

    if (input instanceof URL) {
      const rewritten = rewriteApiUrl(input.toString())
      return originalFetch(rewritten ?? input.toString(), init)
    }

    if (input instanceof Request) {
      const rewritten = rewriteApiUrl(input.url)
      if (!rewritten) {
        return originalFetch(input, init)
      }

      const rewrittenRequest = new Request(rewritten, input)
      return originalFetch(rewrittenRequest, init)
    }

    return originalFetch(input, init)
  }) as typeof window.fetch
}

async function apiCall(endpoint: string, options: FetchOptions = {}) {
  const url = buildApiUrl(endpoint)
  const defaultOptions: FetchOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // Prevent caching
  }

  if (options.body && !(options.body instanceof FormData)) {
    options.body = JSON.stringify(options.body)
  }

  const finalOptions = { ...defaultOptions, ...options }

  const response = await fetch(url, finalOptions)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || error.message || 'API Error')
  }

  return response.json()
}

export const apiClient = {
  // ===== AUTH =====
  login: (username: string, password: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)

    return fetch(buildApiUrl('/api/login'), {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(r => r.json())
  },

  logout: () =>
    apiCall('/api/logout', { method: 'POST' }),

  // ===== DASHBOARD =====
  getDashboard: () =>
    apiCall('/api/dashboard'),

  getQuickStats: () =>
    apiCall('/api/dashboard/quick-stats'),

  getStats: () =>
    apiCall('/api/stats'),

  // ===== CLIENTS =====
  getClients: () =>
    apiCall('/api/clients'),

  getClient: (id: string) =>
    apiCall(`/api/clients/${id}`),

  updateClient: (id: string, data: any) =>
    apiCall(`/api/clients/${id}/update`, {
      method: 'POST',
      body: data,
    }),

  updateClientStatus: (id: string, status: string) =>
    apiCall(`/api/clients/${id}/status`, {
      method: 'POST',
      body: { status },
    }),

  pinClient: (id: string) =>
    apiCall(`/api/clients/${id}/pin`, {
      method: 'POST',
    }),

  // ===== BOOKINGS =====
  getBookings: (params?: { page?: number; limit?: number; language?: string }) => {
    if (!params) {
      return apiCall('/api/bookings')
    }

    const searchParams = new URLSearchParams()
    if (typeof params.page === 'number' && Number.isFinite(params.page)) {
      searchParams.append('page', String(params.page))
    }
    if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
      searchParams.append('limit', String(params.limit))
    }
    if (typeof params.language === 'string' && params.language.trim().length > 0) {
      searchParams.append('language', params.language.trim())
    }

    const query = searchParams.toString()
    return apiCall(`/api/bookings${query.length > 0 ? `?${query}` : ''}`)
  },

  getBooking: (id: number, language?: string) => {
    const languageParam = typeof language === 'string' && language.trim().length > 0
      ? `?language=${encodeURIComponent(language.trim())}`
      : ''
    return apiCall(`/api/bookings/${id}${languageParam}`)
  },

  createBooking: (data: any) =>
    apiCall('/api/bookings', {
      method: 'POST',
      body: data,
    }),

  updateBookingStatus: (id: number, status: string) =>
    apiCall(`/api/bookings/${id}/status`, {
      method: 'POST',
      body: { status },
    }),

  updateBookingDetails: (id: number, data: any) =>
    apiCall(`/api/bookings/${id}`, {
      method: 'PUT',
      body: data,
    }),

  // ===== CHAT =====
  getChatMessages: (clientId: string, limit: number = 50, messenger: string = 'instagram') =>
    apiCall(`/api/chat/messages?client_id=${clientId}&limit=${limit}&messenger=${messenger}`),

  sendMessage: (clientId: string, message: string) =>
    apiCall('/api/chat/send', {
      method: 'POST',
      body: { instagram_id: clientId, message },
    }),

  // ===== SERVICES =====
  getServices: (activeOnly: boolean = true, lang: string = 'ru') =>
    apiCall(`/api/services?active_only=${activeOnly}&language=${lang}`),

  createService: (data: any) =>
    apiCall('/api/services', {
      method: 'POST',
      body: data,
    }),

  updateService: (id: number, data: any) =>
    apiCall(`/api/services/${id}/update`, {
      method: 'POST',
      body: data,
    }),

  deleteService: (id: number) =>
    apiCall(`/api/services/${id}/delete`, {
      method: 'POST',
    }),

  // ===== USERS =====
  getUsers: (lang: string = 'ru') =>
    apiCall(`/api/users?language=${lang}`),

  deleteUser: (id: number) =>
    apiCall(`/api/users/${id}/delete`, {
      method: 'POST',
    }),

  // ===== ANALYTICS =====
  getAnalytics: (
    period: number = 30,
    options?: {
      serviceName?: string;
      productName?: string;
      forecastHorizonDays?: number;
    }
  ) => {
    const params = new URLSearchParams({ period: String(period) });
    if (options?.serviceName) {
      params.set('service_name', options.serviceName);
    }
    if (options?.productName) {
      params.set('product_name', options.productName);
    }
    if (options?.forecastHorizonDays) {
      params.set('forecast_horizon_days', String(options.forecastHorizonDays));
    }
    return apiCall(`/api/analytics?${params.toString()}`);
  },

  getAnalyticsRange: (
    dateFrom: string,
    dateTo: string,
    options?: {
      serviceName?: string;
      productName?: string;
      forecastHorizonDays?: number;
    }
  ) => {
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    });
    if (options?.serviceName) {
      params.set('service_name', options.serviceName);
    }
    if (options?.productName) {
      params.set('product_name', options.productName);
    }
    if (options?.forecastHorizonDays) {
      params.set('forecast_horizon_days', String(options.forecastHorizonDays));
    }
    return apiCall(`/api/analytics?${params.toString()}`);
  },

  getFunnel: () =>
    apiCall('/api/funnel'),

  getBotAnalytics: (days: number = 30) =>
    apiCall(`/api/bot-analytics?days=${days}`),

  // ===== EXPORT =====
  exportClients: (format: string = 'csv') =>
    apiCall(`/api/export/clients?format=${format}&lang=${i18n.language || 'en'}`),

  exportAnalytics: (format: string = 'csv', period: number = 30) =>
    apiCall(`/api/export/analytics?format=${format}&period=${period}&lang=${i18n.language || 'en'}`),

  // ===== BOT SETTINGS =====
  getBotSettings: () =>
    apiCall('/api/bot-settings'),

  updateBotSettings: (data: any) =>
    apiCall('/api/bot-settings', {
      method: 'POST',
      body: data,
    }),

  // ===== ROLES ===== (ДОБАВЛЕНО)
  getRoles: () =>
    apiCall('/api/roles'),

  createRole: (data: any) =>
    apiCall('/api/roles', {
      method: 'POST',
      body: data,
    }),

  deleteRole: (roleKey: string) =>
    apiCall(`/api/roles/${roleKey}`, {
      method: 'DELETE',
    }),

  getRolePermissions: (roleKey: string) =>
    apiCall(`/api/roles/${roleKey}/permissions`),

  updateRolePermissions: (roleKey: string, permissions: any) =>
    apiCall(`/api/roles/${roleKey}/permissions`, {
      method: 'POST',
      body: { permissions },
    }),

  getAvailablePermissions: () =>
    apiCall('/api/roles/permissions/available'),
  // ===== USER PROFILE ===== (ДОБАВЛЕНО)
  getUserProfile: (userId: number) =>
    apiCall(`/api/users/${userId}/profile`),

  updateUserProfile: (userId: number, data: any) =>
    apiCall(`/api/users/${userId}/update-profile`, {
      method: 'POST',
      body: data,
    }),

  changePassword: (userId: number, data: any) =>
    apiCall(`/api/users/${userId}/change-password`, {
      method: 'POST',
      body: data,
    }),

  updateUserRole: (userId: number, role: string) =>
    apiCall(`/api/users/${userId}/role`, {
      method: 'POST',
      body: { role },
    }),

  // ===== SALON SETTINGS ===== (ДОБАВЛЕНО)
  getSalonSettings: () =>
    apiCall('/api/salon-settings'),

  updateSalonSettings: (data: any) =>
    apiCall('/api/salon-settings', {
      method: 'POST',
      body: data,
    }),

  // ===== CLIENT OPERATIONS ===== (ДОБАВЛЕНО)
  createClient: (data: any) =>
    apiCall('/api/clients', {
      method: 'POST',
      body: data,
    }),

  deleteClient: (id: string) =>
    apiCall(`/api/clients/${id}/delete`, {
      method: 'POST',
    }),

  // ===== UNREAD =====
  getUnreadCount: () =>
    apiCall('/api/unread-count'),

  // ===== UPLOADS =====
  uploadFile: (file: File, subfolder?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const endpoint = subfolder
      ? `/api/upload?subfolder=${encodeURIComponent(subfolder)}`
      : '/api/upload';
    const url = buildApiUrl(endpoint);

    return fetch(url, {
      method: 'POST',
      body: formData,
    }).then(r => {
      if (!r.ok) {
        throw new Error(`Upload failed with status ${r.status}`);
      }
      return r.json();
    });
  },

  // ===== FEATURES =====
  getFeatures: () =>
    apiCall('/api/client/features'),
}

export const api = {
  get: (url: string) => apiCall(url),
  post: (url: string, body?: any) => apiCall(url, { method: 'POST', body }),
  put: (url: string, body?: any) => apiCall(url, { method: 'PUT', body }),
  delete: (url: string) => apiCall(url, { method: 'DELETE' }),
  patch: (url: string, body?: any) => apiCall(url, { method: 'PATCH', body }),
}
