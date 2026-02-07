// Shared API endpoints for web and mobile
// This ensures consistency between platforms

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/login',
    REGISTER: '/api/register',
    REGISTER_CLIENT: '/api/register/client',
    LOGOUT: '/api/logout',
    GOOGLE_LOGIN: '/api/google-login',
    VERIFY_EMAIL: '/api/verify-email',
    RESEND_VERIFICATION: '/api/resend-verification',
    FORGOT_PASSWORD: '/api/forgot-password',
    RESET_PASSWORD: '/api/reset-password',
    CHANGE_PASSWORD: '/api/change-password',
    ME: '/api/me',
    REFRESH_TOKEN: '/api/refresh-token',
  },

  // Users
  USERS: {
    LIST: '/api/users',
    DETAIL: (id: number) => `/api/users/${id}`,
    CREATE: '/api/users',
    UPDATE: (id: number) => `/api/users/${id}`,
    DELETE: (id: number) => `/api/users/${id}`,
  },

  // Employees
  EMPLOYEES: {
    LIST: '/api/employees',
    DETAIL: (id: number) => `/api/employees/${id}`,
    SCHEDULE: (id: number) => `/api/employees/${id}/schedule`,
    SERVICES: (id: number) => `/api/employees/${id}/services`,
    AVAILABILITY: (id: number, date: string) => `/api/employees/${id}/availability?date=${date}`,
  },

  // Clients
  CLIENTS: {
    LIST: '/api/clients',
    DETAIL: (id: number | string) => `/api/clients/${id}`,
    CREATE: '/api/clients',
    UPDATE: (id: number | string) => `/api/clients/${id}`,
    DELETE: (id: number | string) => `/api/clients/${id}`,
    SEARCH: '/api/clients/search',
    STATS: '/api/clients/stats',
    BOOKINGS: (id: number | string) => `/api/clients/${id}/bookings`,
    NOTES: (id: number | string) => `/api/clients/${id}/notes`,
  },

  // Bookings
  BOOKINGS: {
    LIST: '/api/bookings',
    DETAIL: (id: number) => `/api/bookings/${id}`,
    CREATE: '/api/bookings',
    UPDATE: (id: number) => `/api/bookings/${id}`,
    DELETE: (id: number) => `/api/bookings/${id}`,
    CANCEL: (id: number) => `/api/bookings/${id}/cancel`,
    CONFIRM: (id: number) => `/api/bookings/${id}/confirm`,
    COMPLETE: (id: number) => `/api/bookings/${id}/complete`,
    CALENDAR: '/api/bookings/calendar',
    AVAILABLE_SLOTS: '/api/bookings/available-slots',
    STATS: '/api/bookings/stats',
  },

  // Services
  SERVICES: {
    LIST: '/api/services',
    DETAIL: (id: number) => `/api/services/${id}`,
    BY_KEY: (key: string) => `/api/services/by-key/${key}`,
    CREATE: '/api/services',
    UPDATE: (id: number) => `/api/services/${id}`,
    DELETE: (id: number) => `/api/services/${id}`,
    CATEGORIES: '/api/services/categories',
    PUBLIC: '/api/public/services',
  },

  // Chat
  CHAT: {
    CONVERSATIONS: '/api/chat/conversations',
    CONVERSATION: (id: number) => `/api/chat/conversations/${id}`,
    MESSAGES: (conversationId: number) => `/api/chat/conversations/${conversationId}/messages`,
    SEND: (conversationId: number) => `/api/chat/conversations/${conversationId}/messages`,
    READ: (conversationId: number) => `/api/chat/conversations/${conversationId}/read`,
    INTERNAL: '/api/internal-chat',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: (id: number) => `/api/notifications/${id}/read`,
    MARK_ALL_READ: '/api/notifications/read-all',
    SETTINGS: '/api/notifications/settings',
    UNREAD_COUNT: '/api/notifications/unread-count',
  },

  // Tasks
  TASKS: {
    LIST: '/api/tasks',
    DETAIL: (id: number) => `/api/tasks/${id}`,
    CREATE: '/api/tasks',
    UPDATE: (id: number) => `/api/tasks/${id}`,
    DELETE: (id: number) => `/api/tasks/${id}`,
    COMPLETE: (id: number) => `/api/tasks/${id}/complete`,
  },

  // Dashboard
  DASHBOARD: {
    STATS: '/api/dashboard/stats',
    EMPLOYEE: '/api/dashboard/employee',
    CLIENT: '/api/dashboard/client',
    ANALYTICS: '/api/analytics',
  },

  // Client Portal
  CLIENT_PORTAL: {
    DASHBOARD: '/api/client-portal/dashboard',
    BOOKINGS: '/api/client-portal/bookings',
    LOYALTY: '/api/client-portal/loyalty',
    PROFILE: '/api/client-portal/profile',
  },

  // Settings
  SETTINGS: {
    SALON: '/api/settings/salon',
    USER: '/api/settings/user',
    NOTIFICATIONS: '/api/settings/notifications',
  },

  // WebSocket
  WS: {
    NOTIFICATIONS: '/ws/notifications',
    CHAT: '/ws/chat',
  },
} as const;

// Helper type to extract endpoint values
export type ApiEndpoint = typeof API_ENDPOINTS;
