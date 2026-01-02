// frontend/src/api/client.ts
// Универсальный API клиент для всех endpoints

const BASE_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? `${window.location.protocol}//${window.location.hostname}:8000` : window.location.origin)

interface FetchOptions extends RequestInit {
  body?: any
}

async function apiCall(endpoint: string, options: FetchOptions = {}) {
  const url = `${BASE_URL}${endpoint}`
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

    return fetch(`${BASE_URL}/api/login`, {
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
  getBookings: () =>
    apiCall('/api/bookings'),

  getBooking: (id: number) =>
    apiCall(`/api/bookings/${id}`),

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

  // ===== CHAT =====
  getChatMessages: (clientId: string, limit: number = 50, messenger: string = 'instagram') =>
    apiCall(`/api/chat/messages?client_id=${clientId}&limit=${limit}&messenger=${messenger}`),

  sendMessage: (clientId: string, message: string) =>
    apiCall('/api/chat/send', {
      method: 'POST',
      body: { instagram_id: clientId, message },
    }),

  // ===== SERVICES =====
  getServices: (activeOnly: boolean = true) =>
    apiCall(`/api/services?active_only=${activeOnly}`),

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
  getUsers: () =>
    apiCall('/api/users'),

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
    apiCall(`/api/export/clients?format=${format}`),

  exportAnalytics: (format: string = 'csv', period: number = 30) =>
    apiCall(`/api/export/analytics?format=${format}&period=${period}`),

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
    apiCall('/api/permissions/available'),
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
    const url = subfolder
      ? `${BASE_URL}/api/upload?subfolder=${encodeURIComponent(subfolder)}`
      : `${BASE_URL}/api/upload`;

    return fetch(url, {
      method: 'POST',
      body: formData,
    }).then(r => r.json());
  },

  // ===== CLIENT DASHBOARD =====
  getClientDashboard: () =>
    apiCall('/api/client/dashboard'),

  getClientBookings: () =>
    apiCall('/api/client/my-bookings'),

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

  getFavoriteMasters: () =>
    apiCall('/api/client/favorite-masters'),

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