import i18n from '../i18n'

export const BASE_URL = import.meta.env.VITE_API_URL || window.location.origin
const API_PATH_PREFIX = String(import.meta.env.VITE_API_PATH_PREFIX || '')
  .trim()
  .replace(/\/+$/, '')

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
    // Ignore malformed BASE_URL and keep runtime origin.
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
    cache: 'no-store',
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
  login: (username: string, password: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)

    return fetch(buildApiUrl('/api/login'), {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then((response) => response.json())
  },

  logout: () =>
    apiCall('/api/logout', { method: 'POST' }),

  getSpecialPackages: (activeOnly: boolean = true) =>
    apiCall(`/api/services/special-packages?active_only=${activeOnly}`),

  getClientDashboard: () =>
    apiCall('/api/client/dashboard'),

  getClientBookings: (language?: string) => {
    const normalizedLanguage = typeof language === 'string' && language.trim().length > 0
      ? language.trim()
      : i18n.language
    return apiCall(`/api/client/my-bookings?language=${encodeURIComponent(normalizedLanguage)}`)
  },

  getClientAchievements: () =>
    apiCall('/api/client/achievements'),

  getClientLoyalty: () =>
    apiCall('/api/client/loyalty'),

  getClientGallery: () =>
    apiCall('/api/client/gallery'),

  getClientNotifications: () =>
    apiCall('/api/client/my-notifications'),

  markNotificationRead: (notificationId: number) =>
    apiCall(`/api/client/notifications/${notificationId}/read`, {
      method: 'POST',
    }),

  markAllNotificationsRead: () =>
    apiCall('/api/client/notifications/mark-all-read', {
      method: 'POST',
    }),

  getClientProfile: () =>
    apiCall('/api/client/profile'),

  cancelClientBooking: (bookingId: number) =>
    apiCall(`/api/client/bookings/${bookingId}/cancel`, {
      method: 'POST',
    }),

  cancelBooking: (bookingId: number) =>
    apiCall(`/api/client/bookings/${bookingId}/cancel`, {
      method: 'POST',
    }),

  getClientBeautyMetrics: () =>
    apiCall('/api/client/beauty-metrics'),

  getFavoriteMasters: (language: string = 'ru') =>
    apiCall(`/api/client/favorite-masters?language=${language}`),

  toggleFavoriteMaster: (data: { master_id: number; is_favorite: boolean }) =>
    apiCall('/api/client/favorite-masters', {
      method: 'POST',
      body: data,
    }),

  updateNotificationPreferences: (data: any) =>
    apiCall('/api/client/notifications/preferences', {
      method: 'POST',
      body: data,
    }),

  updatePrivacyPreferences: (data: any) =>
    apiCall('/api/client/privacy/preferences', {
      method: 'POST',
      body: data,
    }),

  updateClientProfile: (data: any) =>
    apiCall('/api/client/profile/update', {
      method: 'POST',
      body: data,
    }),

  changeClientPassword: (data: { old_password: string; new_password: string }) =>
    apiCall('/api/client/profile/change-password', {
      method: 'POST',
      body: data,
    }),

  getClientAccountMenuSettings: () =>
    apiCall('/api/client/account-menu-settings'),

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
