// frontend/src/api/client.ts
// Универсальный API клиент для всех endpoints
import i18n from '../i18n';

export const BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;
export const API_NAMESPACE_PREFIXES = {
  crm: '/api/crm',
  site: '/api/site',
} as const;

interface FetchOptions extends RequestInit {
  body?: any
}

function splitApiEndpoint(endpoint: string): { path: string; suffix: string } {
  const queryIndex = endpoint.indexOf('?')
  const hashIndex = endpoint.indexOf('#')
  const suffixIndexCandidates = [queryIndex, hashIndex].filter(index => index >= 0)
  const suffixIndex = suffixIndexCandidates.length > 0 ? Math.min(...suffixIndexCandidates) : -1
  if (suffixIndex < 0) {
    return { path: endpoint, suffix: '' }
  }
  return {
    path: endpoint.slice(0, suffixIndex),
    suffix: endpoint.slice(suffixIndex),
  }
}

function matchesPathPrefix(path: string, prefix: string): boolean {
  if (path === prefix) {
    return true
  }
  return path.startsWith(`${prefix}/`)
}

export function resolveApiEndpoint(endpoint: string): string {
  if (!endpoint.startsWith('/api')) {
    return endpoint
  }

  const { path, suffix } = splitApiEndpoint(endpoint)
  if (matchesPathPrefix(path, API_NAMESPACE_PREFIXES.crm)) {
    const normalizedPath = path.slice(API_NAMESPACE_PREFIXES.crm.length) || '/'
    const tail = normalizedPath === '/' ? '' : normalizedPath
    return `/api${tail}${suffix}`
  }

  if (matchesPathPrefix(path, API_NAMESPACE_PREFIXES.site)) {
    const normalizedPath = path.slice(API_NAMESPACE_PREFIXES.site.length) || '/'
    const tail = normalizedPath === '/' ? '' : normalizedPath
    return `/api${tail}${suffix}`
  }

  return endpoint
}

export function buildApiUrl(endpoint: string, baseUrl: string = BASE_URL): string {
  return `${baseUrl}${resolveApiEndpoint(endpoint)}`
}

export function buildWebSocketUrl(endpoint: string, baseUrl: string = BASE_URL): string {
  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const parsedBase = new URL(baseUrl, fallbackOrigin)
  const wsProtocol = parsedBase.protocol === 'https:' ? 'wss:' : 'ws:'
  const resolvedEndpoint = resolveApiEndpoint(endpoint)
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

  deleteAccount: (password: string, confirm: boolean) =>
    apiCall('/api/delete-account', {
      method: 'POST',
      body: { password, confirm }
    }),

  // ===== DASHBOARD =====
  getDashboard: () =>
    apiCall('/api/dashboard'),

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

  updateService: (data: any) =>
    apiCall(`/api/services/{id}/update`, {
      method: 'POST',
      body: data,
    }),

  deleteService: () =>
    apiCall(`/api/services/{id}/delete`, {
      method: 'DELETE',
    }),

  // ===== USERS =====
  getUsers: (lang: string = 'ru') =>
    apiCall(`/api/users?language=${lang}`),

  deleteUser: (id: number) =>
    apiCall(`/api/users/${id}/delete`, {
      method: 'POST',
    }),

  // ===== ANALYTICS =====
  getAnalytics: (period: number = 30) =>
    apiCall(`/api/analytics?period=${period}`),

  getAnalyticsRange: (dateFrom: string, dateTo: string) =>
    apiCall(`/api/analytics?date_from=${dateFrom}&date_to=${dateTo}`),

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

  // ===== SPECIAL PACKAGES ===== (ДОБАВЛЕНО)
  getSpecialPackages: (activeOnly: boolean = true) =>
    apiCall(`/api/services/special-packages?active_only=${activeOnly}`),

  createSpecialPackage: (data: any) =>
    apiCall('/api/services/special-packages', {
      method: 'POST',
      body: data,
    }),

  updateSpecialPackage: (id: number, data: any) =>
    apiCall(`/api/services/special-packages/${id}`, {
      method: 'POST',
      body: data,
    }),

  deleteSpecialPackage: (id: number) =>
    apiCall(`/api/services/special-packages/${id}`, {
      method: 'DELETE',
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
  // ===== PUBLIC =====
  getSalonInfo: (lang: string = 'ru') =>
    apiCall(`/api/public/salon-info?language=${lang}`),

  getPublicServices: (lang: string = 'ru') =>
    apiCall(`/api/public/services?language=${lang}`),

  getPublicEmployees: (lang: string) =>
    apiCall(`/api/public/employees?language=${lang}&active_only=true`),

  getPublicReviews: (lang: string) =>
    apiCall(`/api/public/reviews?language=${lang}`),

  getPublicFAQ: (lang: string) =>
    apiCall(`/api/public/faq?language=${lang}`),

  getPublicGallery: (category?: string) =>
    apiCall(`/api/public/gallery${category ? `?category=${category}` : ''}`),

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

  // ===== PUBLIC CONTENT ADMIN =====
  getPublicContentReviews: () =>
    apiCall('/api/public-admin/reviews'),

  createPublicReview: (data: any) =>
    apiCall('/api/public-admin/reviews', {
      method: 'POST',
      body: data,
    }),

  updatePublicReview: (id: number, data: any) =>
    apiCall(`/api/public-admin/reviews/${id}`, {
      method: 'PUT',
      body: data,
    }),

  deletePublicReview: (id: number) =>
    apiCall(`/api/public-admin/reviews/${id}`, {
      method: 'DELETE',
    }),

  togglePublicReview: (id: number) =>
    apiCall(`/api/public-admin/reviews/${id}/toggle`, {
      method: 'PATCH',
    }),

  // ===== PUBLIC CONTENT ADMIN FAQ =====
  // Public Content - Banners
  // Public Content - Banners
  getPublicBanners: () =>
    apiCall('/api/public-admin/banners'),

  createPublicBanner: (data: any) =>
    apiCall('/api/public-admin/banners', {
      method: 'POST',
      body: data,
    }),

  updatePublicBanner: (id: number, data: any) =>
    apiCall(`/api/public-admin/banners/${id}`, {
      method: 'PUT',
      body: data,
    }),

  deletePublicBanner: (id: number) =>
    apiCall(`/api/public-admin/banners/${id}`, {
      method: 'DELETE',
    }),

  getPublicContentFAQ: () =>
    apiCall('/api/public-admin/faq'),

  createPublicFAQ: (data: any) =>
    apiCall('/api/public-admin/faq', {
      method: 'POST',
      body: data,
    }),

  updatePublicFAQ: (id: number, data: any) =>
    apiCall(`/api/public-admin/faq/${id}`, {
      method: 'PUT',
      body: data,
    }),

  deletePublicFAQ: (id: number) =>
    apiCall(`/api/public-admin/faq/${id}`, {
      method: 'DELETE',
    }),

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
    }).then(r => r.json());
  },

  // ===== CLIENT DASHBOARD =====
  getClientDashboard: () =>
    apiCall('/api/client/dashboard'),

  getClientBookings: (language?: string) => {
    const normalizedLanguage = typeof language === 'string' && language.trim().length > 0
      ? language.trim()
      : i18n.language;
    return apiCall(`/api/client/my-bookings?language=${encodeURIComponent(normalizedLanguage)}`);
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

  getClientProfile: () =>
    apiCall('/api/client/profile'),

  cancelClientBooking: (bookingId: number) =>
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

  // ===== CLIENT DASHBOARD - ADDITIONAL ENDPOINTS =====

  markAllNotificationsRead: () =>
    apiCall('/api/client/notifications/mark-all-read', {
      method: 'POST',
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

  // Profile management for clients
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

  // Booking management
  cancelBooking: (bookingId: number) =>
    apiCall(`/api/client/bookings/${bookingId}/cancel`, {
      method: 'POST',
    }),

  updateBooking: (bookingId: number, data: any) =>
    apiCall(`/api/client/bookings/${bookingId}/update`, {
      method: 'POST',
      body: data,
    }),

  getClientAccountMenuSettings: () =>
    apiCall('/api/client/account-menu-settings'),

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
