// frontend/src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const defaultOptions: RequestInit = {
      method: 'GET',
      headers,
      credentials: 'include',
      ...options,
    }


    try {
      const response = await fetch(url, defaultOptions)

      if (response.status === 401) {
        localStorage.removeItem('user')
        localStorage.removeItem('session_token')
        window.location.href = '/login'
        throw new Error('Сессия истекла. Пожалуйста, перезагрузитесь.')
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(error.error || error.message || `API Error: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }

  }

  // ===== АВТОРИЗАЦИЯ =====
  async login(username: string, password: string) {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)

    const response = await this.request<any>('/api/login', {
      method: 'POST',
      body: formData,
      headers: {},
    })

    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user))
    }
    if (response.token) {
      localStorage.setItem('session_token', response.token)
    }

    return response
  }

  async logout() {
    try {
      await this.request('/api/logout', { method: 'POST' })
    } finally {
      localStorage.removeItem('user')
      localStorage.removeItem('session_token')
    }
  }

  // ===== DASHBOARD =====
  async getDashboard() {
    return this.request<any>('/api/dashboard')
  }

  async getStats() {
    return this.request<any>('/api/stats')
  }


  async getAnalytics(period: number = 30, dateFrom?: string, dateTo?: string) {
    let url = `/api/analytics?period=${period}`
    if (dateFrom && dateTo) {
      url += `&date_from=${dateFrom}&date_to=${dateTo}`
    }
    return this.request<any>(url)
  }

  async getFunnel() {
    return this.request<any>('/api/funnel')
  }
  // ===== НАСТРОЙКИ САЛОНА =====
  async getSalonSettings() {
    return this.request<any>('/api/salon-settings')
  }

  async updateSalonSettings(data: any) {
    return this.request('/api/salon-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

   async getUserProfile(userId: number) {
    return this.request<any>(`/api/users/${userId}/profile`)
  }

  async updateUserProfile(userId: number, data: { username: string; full_name: string; email?: string }) {
    return this.request(`/api/users/${userId}/update-profile`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async changePassword(userId: number, data: { new_password: string; old_password?: string }) {
    return this.request(`/api/users/${userId}/change-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  // ===== КЛИЕНТЫ =====
  async getClients() {
    return this.request<any>('/api/clients')
  }

  async getClient(clientId: string) {
    return this.request<any>(`/api/clients/${clientId}`)
  }

  async updateClient(clientId: string, data: any) {
    return this.request(`/api/clients/${clientId}/update`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateClientStatus(clientId: string, status: string) {
    return this.request(`/api/clients/${clientId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  }

  async pinClient(clientId: string) {
    return this.request(`/api/clients/${clientId}/pin`, {
      method: 'POST',
    })
  }

  async deleteClient(clientId: string) {
    return this.request(`/api/clients/${clientId}/delete`, {
      method: 'POST',
    })
  }

  async createClient(data: any) {
    return this.request('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ===== ЗАПИСИ =====
  async getBookings() {
    return this.request<any>('/api/bookings')
  }

  async getBooking(bookingId: number) {
    return this.request<any>(`/api/bookings/${bookingId}`)
  }

  async createBooking(data: any) {
    return this.request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateBookingStatus(bookingId: number, status: string) {
    return this.request(`/api/bookings/${bookingId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  }

  // ===== ЧАТ =====
  async sendMessage(instagramId: string, message: string) {
    return this.request('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ instagram_id: instagramId, message }),
    })
  }

  // ✅ НОВОЕ: Отправка файлов
  async sendFile(instagramId: string, fileUrl: string, fileType: string = 'image') {
    return this.request('/api/chat/send-file', {
      method: 'POST',
      body: JSON.stringify({ 
        instagram_id: instagramId, 
        file_url: fileUrl,
        file_type: fileType 
      }),
    })
  }


  async getChatMessages(clientId: string, limit: number = 50) {
    return this.request(`/api/chat/messages?client_id=${clientId}&limit=${limit}`)
  }

  // ===== УСЛУГИ =====
  async getServices(activeOnly: boolean = true) {
    return this.request<any>(`/api/services?active_only=${activeOnly}`)
  }

  async createService(data: any) {
    return this.request('/api/services', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateService(serviceId: number, data: any) {
    return this.request(`/api/services/${serviceId}/update`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteService(serviceId: number) {
    return this.request(`/api/services/${serviceId}/delete`, {
      method: 'POST',
    })
  }

  // ===== ПОЛЬЗОВАТЕЛИ =====
  async getUsers() {
    return this.request<any>('/api/users')
  }

  async createUser(data: { username: string; password: string; full_name: string; email?: string; role: string }) {
    const formData = new FormData()
    formData.append('username', data.username)
    formData.append('password', data.password)
    formData.append('full_name', data.full_name)
    if (data.email) formData.append('email', data.email)
    formData.append('role', data.role)

    const response = await fetch(`${this.baseURL}/register`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Ошибка создания пользователя')
    }

    return response.json().catch(() => ({ success: true }))
  }

  async deleteUser(userId: number) {
    return this.request(`/api/users/${userId}/delete`, {
      method: 'POST',
    })
  }


  // ===== ЭКСПОРТ =====
  async exportClients(format: string = 'csv') {
    const response = await fetch(`${this.baseURL}/api/export/clients?format=${format}`, {
      credentials: 'include',
    })

    if (!response.ok) throw new Error('Export failed')

    return response.blob()
  }

  async exportAnalytics(format: string = 'csv', period: number = 30) {
    const response = await fetch(`${this.baseURL}/api/export/analytics?format=${format}&period=${period}`, {
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Export failed' }))
      throw new Error(error.error || 'Export failed')
    }

    return response.blob()
  }




  // ===== UNREAD COUNT =====
  async getUnreadCount() {
    return this.request<any>('/api/unread-count')
  }

  // ===== BOT SETTINGS =====
  async getBotSettings() {
    return this.request<any>('/api/bot-settings')
  }

  async updateBotSettings(data: any) {
    return this.request('/api/bot-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ===== SPECIAL PACKAGES =====
  async getSpecialPackages() {
    return this.request<any>('/api/special-packages')
  }

  async createSpecialPackage(data: any) {
    return this.request('/api/special-packages', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSpecialPackage(packageId: number, data: any) {
    return this.request(`/api/special-packages/${packageId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteSpecialPackage(packageId: number) {
    return this.request(`/api/special-packages/${packageId}`, {
      method: 'DELETE',
    })
  }

  // ===== РОЛИ И ПРАВА =====
  async getRoles() {
    return this.request<any>('/api/roles')
  }

  async createRole(data: { role_key: string; role_name: string; role_description?: string }) {
    return this.request('/api/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteRole(roleKey: string) {
    return this.request(`/api/roles/${roleKey}`, {
      method: 'DELETE',
    })
  }

  async getRolePermissions(roleKey: string) {
    return this.request<any>(`/api/roles/${roleKey}/permissions`)
  }

  async updateRolePermissions(roleKey: string, permissions: any) {
    return this.request(`/api/roles/${roleKey}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permissions }),
    })
  }

  async getAvailablePermissions() {
    return this.request<any>('/api/permissions/available')
  }

  async getUserPermissions(userId: number) {
    return this.request<any>(`/api/users/${userId}/permissions`)
  }

  async updateUserRole(userId: number, role: string) {
    return this.request(`/api/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    })
  }
}

export const api = new ApiClient()