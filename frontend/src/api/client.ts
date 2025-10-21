// frontend/src/api/client.ts
// Универсальный API клиент для всех endpoints

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface FetchOptions extends RequestInit {
  body?: any
}

async function apiCall(endpoint: string, options: FetchOptions = {}) {
  const url = `${BASE_URL}${endpoint}`
  const defaultOptions: FetchOptions = {
    credentials: 'include', // включаем cookies для session
    headers: {
      'Content-Type': 'application/json',
    },
  }

  // Если есть body и это не FormData, конвертируем в JSON
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
    apiCall(`/api/chat/${clientId}/history?limit=${limit}`),

  sendMessage: (clientId: string, message: string) =>
    apiCall('/api/chat/send', {
      method: 'POST',
      body: { instagram_id: clientId, message },
    }),

  // ===== SERVICES =====
  getServices: () =>
    apiCall('/api/services'),

  createService: (data: any) =>
    apiCall('/api/services/create', {
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
  getUsers: () =>
    apiCall('/api/users'),

  deleteUser: (id: number) =>
    apiCall(`/api/users/${id}/delete`, {
      method: 'POST',
    }),

  // ===== ANALYTICS =====
  getAnalytics: (period: number = 30) =>
    apiCall(`/api/analytics?period=${period}`),

  getFunnel: () =>
    apiCall('/api/funnel'),

  // ===== EXPORT =====
  exportClients: (format: string = 'csv') =>
    apiCall(`/api/export/clients?format=${format}`),

  exportAnalytics: (format: string = 'csv', period: number = 30) =>
    apiCall(`/api/export/analytics?format=${format}&period=${period}`),
}