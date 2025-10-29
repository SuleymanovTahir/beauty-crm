// frontend/src/api/client.ts
// Универсальный API клиент для всех endpoints

const BASE_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://mlediamant.com')

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
  getChatMessages: (clientId: string, limit: number = 50) =>
    apiCall(`/api/chat/messages?client_id=${clientId}&limit=${limit}`),

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

  updateService: (id: number, data: any) =>
    apiCall(`/api/services/{id}/update`, {
      method: 'POST',
      body: data,
    }),

  deleteService: (id: number) =>
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
}