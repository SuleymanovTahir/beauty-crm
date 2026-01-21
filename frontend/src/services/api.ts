// frontend/src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || window.location.origin

export class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_URL) {
    this.baseURL = baseURL
  }

  static longestRequest = { url: '', duration: 0 }


  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const headers: HeadersInit = {
      ...options.headers,
    }

    // Only add Content-Type if we have a body
    if (options.body) {
      (headers as any)['Content-Type'] = 'application/json';
    }

    const defaultOptions: RequestInit = {
      method: 'GET',
      headers,
      credentials: 'include',
      ...options,
    }

    // Таймаут для предотвращения зависания (30 секунд)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    defaultOptions.signal = controller.signal

    try {
      const startTime = performance.now()
      const response = await fetch(url, defaultOptions)
      const endTime = performance.now()
      const duration = endTime - startTime
      clearTimeout(timeoutId)

      // Log request timing
      const durationFormatted = duration.toFixed(2) + 'ms'

      if (duration > 1000) {
        console.warn(`⚠️ SLOW REQUEST: ${endpoint} took ${durationFormatted}`, {
          url: url,
          duration: duration
        })
      } else {
        console.log(`⏱️ API Request: ${endpoint} took ${durationFormatted}`)
      }

      // Track longest request
      if (duration > ApiClient.longestRequest.duration) {
        ApiClient.longestRequest = { url: endpoint, duration: duration }
        console.log(`🐢 NEW RECORD: Slowest request so far is ${endpoint} (${durationFormatted})`)
      }

      if (response.status === 401) {
        localStorage.removeItem('user')
        localStorage.removeItem('session_token')
        window.location.href = '/login'
        throw new Error('Сессия истекла. Пожалуйста, перезагрузитесь.')
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        // Выбрасываем объект с полной информацией об ошибке
        const error: any = new Error(errorData.error || errorData.message || `API Error: ${response.status}`)
        error.error_type = errorData.error_type
        error.email = errorData.email
        error.status = response.status
        throw error
      }

      return response.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Запрос превысил время ожидания. Попробуйте еще раз.')
      }
      throw error
    }
  }

  // Generic HTTP methods
  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ===== АВТОРИЗАЦИЯ =====
  async login(username: string, password: string) {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    const response = await this.request<any>('/api/login', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user))
    }
    if (response.token) {
      localStorage.setItem('session_token', response.token)
    }

    return response
  }

  async googleLogin(token: string) {
    const response = await this.request<any>('/api/google-login', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })

    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user))
    }
    if (response.token) {
      localStorage.setItem('session_token', response.token)
    }

    return response
  }

  async register(username: string, password: string, full_name: string, email: string, phone: string, role: string = 'employee', position: string = '', privacy_accepted: boolean = false, newsletter_subscribed: boolean = true) {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    formData.append('full_name', full_name)
    formData.append('email', email)
    formData.append('phone', phone)
    formData.append('role', role)
    formData.append('position', position)
    formData.append('privacy_accepted', privacy_accepted.toString())
    formData.append('newsletter_subscribed', newsletter_subscribed.toString())

    return this.request<any>('/api/register', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  async registerClient(username: string, password: string, full_name: string, email: string, phone: string, privacy_accepted: boolean) {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    formData.append('full_name', full_name)
    formData.append('email', email)
    formData.append('phone', phone)
    formData.append('privacy_accepted', privacy_accepted.toString())

    return this.request<any>('/api/register/client', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  async registerEmployee(username: string, password: string, full_name: string, email: string, phone: string, role: string, position: string, privacy_accepted: boolean) {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    formData.append('full_name', full_name)
    formData.append('email', email)
    formData.append('phone', phone)
    formData.append('role', role)
    formData.append('position', position)
    formData.append('privacy_accepted', privacy_accepted.toString())

    return this.request<any>('/api/register/employee', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }


  async verifyEmailToken(token: string) {
    return this.request<any>(`/api/verify-email-token?token=${token}`, {
      method: 'GET',
    })
  }

  async verifyEmail(email: string, code: string) {
    const formData = new URLSearchParams()
    formData.append('email', email)
    formData.append('code', code)

    return this.request<any>('/api/verify-email', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  async resendVerification(email: string) {
    const formData = new URLSearchParams()
    formData.append('email', email)

    return this.request<any>('/api/resend-verification', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  async forgotPassword(email: string) {
    const formData = new URLSearchParams()
    formData.append('email', email)

    return this.request<any>('/api/forgot-password', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  async resetPassword(token: string, newPassword: string) {
    const formData = new URLSearchParams()
    formData.append('token', token)
    formData.append('new_password', newPassword)

    return this.request<any>('/api/reset-password', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  async askBotAdvice(question: string, context?: string): Promise<any> {
    return this.request('/api/chat/ask-bot', {
      method: 'POST',
      body: JSON.stringify({
        question: question,
        context: context || ''
      }),
    })
  }

  async getBotSuggestion(clientId: string): Promise<any> {
    return this.request('/api/chat/bot-suggest', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId }),
    })
  }

  async updateClientBotMode(clientId: string, mode: 'manual' | 'assistant' | 'autopilot') {
    return this.request(`/api/clients/${clientId}/bot-mode`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    })
  }

  async updateBotGloballyEnabled(enabled: boolean) {
    return this.request('/api/settings/bot-globally-enabled', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    })
  }

  async logout() {
    try {
      await this.request('/api/logout', { method: 'POST' })
    } finally {
      localStorage.removeItem('user')
      localStorage.removeItem('session_token')
    }
  }

  async deleteAccount(password: string, confirm: boolean) {
    return this.request('/api/account/delete', {
      method: 'POST',
      body: JSON.stringify({ password, confirm }),
    })
  }

  // ===== DASHBOARD =====
  async getDashboard() {
    return this.request<any>('/api/dashboard')
  }

  async getStats(comparisonPeriod: string = '7days') {
    return this.request<any>(`/api/stats?comparison_period=${comparisonPeriod}`)
  }


  async getAnalytics(period: number = 30, dateFrom?: string, dateTo?: string) {
    let url = `/api/analytics?period=${period}`
    if (dateFrom && dateTo) {
      url += `&date_from=${dateFrom}&date_to=${dateTo}`
    }
    return this.request<any>(url)
  }

  async getFunnel() {
    return this.request<any>('/api/analytics/funnel')
  }

  // ===== FEEDBACK =====
  async getFeedbackStats() {
    return this.request<any>('/api/feedback/stats')
  }

  async submitFeedback(data: any) {
    return this.request('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ===== ПЛАНЫ И ЦЕЛИ =====
  // Role-based plan methods
  async getMyPlans() {
    return this.request<any>('/api/plans/my-plans')
  }

  async getMyPlanForMetric(metricType: string, periodType?: string) {
    const url = periodType
      ? `/api/plans/my-plan/${metricType}?period_type=${periodType}`
      : `/api/plans/my-plan/${metricType}`
    return this.request<any>(url)
  }

  async getRolePlans(roleKey: string, activeOnly: boolean = true) {
    return this.request<any>(`/api/plans/role/${roleKey}?active_only=${activeOnly}`)
  }

  async createRolePlan(roleKey: string, metricType: string, targetValue: number,
    periodType: string, visibleToRoles?: string[],
    canEditRoles?: string[], startDate?: string, endDate?: string, comment?: string) {
    const data: any = {
      role_key: roleKey,
      metric_type: metricType,
      target_value: targetValue,
      period_type: periodType
    }
    if (visibleToRoles) data.visible_to_roles = visibleToRoles
    if (canEditRoles) data.can_edit_roles = canEditRoles
    if (startDate) data.start_date = startDate
    if (endDate) data.end_date = endDate
    if (comment) data.comment = comment

    return this.request('/api/plans/role', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async createIndividualPlan(userId: number, metricType: string, targetValue: number,
    periodType: string, startDate?: string, endDate?: string, comment?: string) {
    const data: any = {
      user_id: userId,
      metric_type: metricType,
      target_value: targetValue,
      period_type: periodType
    }
    if (startDate) data.start_date = startDate
    if (endDate) data.end_date = endDate
    if (comment) data.comment = comment

    return this.request('/api/plans/individual', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getPlanMetrics() {
    return this.request<any>('/api/plans/metrics/all')
  }

  async createPlanMetric(data: { key: string; name: string; unit?: string; description?: string; name_ru?: string; name_en?: string }) {
    return this.request('/api/plans/metrics', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deletePlanMetric(key: string) {
    return this.request(`/api/plans/metrics/${key}`, {
      method: 'DELETE',
    })
  }

  async canEditPlan(planId: number) {
    return this.request<any>(`/api/plans/${planId}/can-edit`)
  }

  // Backward compatibility methods
  async getPlans(activeOnly: boolean = true) {
    return this.request<any>(`/api/plans?active_only=${activeOnly}`)
  }

  async getPlan(metricType: string, periodType?: string) {
    const url = periodType
      ? `/api/plans/${metricType}?period_type=${periodType}`
      : `/api/plans/${metricType}`
    return this.request<any>(url)
  }

  async setPlan(metricType: string, targetValue: number, periodType: string, startDate?: string, endDate?: string) {
    const data: any = { metric_type: metricType, target_value: targetValue, period_type: periodType }
    if (startDate) data.start_date = startDate
    if (endDate) data.end_date = endDate

    return this.request('/api/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getPlanProgress(metricType: string, currentValue: number) {
    return this.request<any>(`/api/plans/${metricType}/progress?current_value=${currentValue}`)
  }

  async deletePlan(planId: number) {
    return this.request(`/api/plans/${planId}`, {
      method: 'DELETE',
    })
  }
  // ===== НАСТРОЙКИ САЛОНА =====
  async getSalonSettings() {
    return this.request<any>('/api/salon-settings')
  }

  async getPublicSalonSettings() {
    return this.request<any>('/api/public/salon-settings')
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

  async getUserProfileByUsername(username: string) {
    return this.request<any>(`/api/users/by-username/${username}/profile`)
  }

  async updateUserProfile(userId: number, data: {
    username?: string;
    full_name?: string;
    email?: string;
    position?: string;
    photo?: string;
    years_of_experience?: string | number;
    specialization?: string;
    about_me?: string;
    phone_number?: string;
    birth_date?: string;
    telegram?: string;
    whatsapp?: string;
    instagram_link?: string;
    is_public_visible?: boolean;
  }) {
    return this.request(`/api/users/${userId}/update-profile`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateUserContact(userId: number, data: {
    email?: string;
    telegram_id?: string;
    instagram_username?: string;
  }) {
    return this.request(`/api/users/${userId}/update-contact`, {
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
  async getClients(messenger: string = 'all') {
    return this.request<any>(`/api/clients?messenger=${messenger}`)
  }

  async getClientUnreadCount(clientId: string) {
    return this.request<any>(`/api/chat/unread/${clientId}`)
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

  async updateClientTemperature(clientId: string, temperature: string) {
    return this.request(`/api/clients/${clientId}/temperature`, {
      method: 'POST',
      body: JSON.stringify({ temperature }),
    })
  }

  async pinClient(clientId: string) {
    return this.request(`/api/clients/${clientId}/pin`, {
      method: 'POST',
    })
  }

  async deleteClient(clientId: string) {
    return this.request(`/api/clients/${encodeURIComponent(clientId)}/delete`, {
      method: 'POST',
    })
  }

  async createClient(data: any) {
    return this.request('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async bulkAction(action: string, clientIds: string[]) {
    return this.request('/api/clients/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, client_ids: clientIds }),
    })
  }

  // ===== ЗАПИСИ =====
  async getBookings() {
    return this.request<any>('/api/bookings')
  }

  async getClientBookings() {
    return this.request<any>('/api/client/bookings')
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

  async createPublicBooking(data: any) {
    return this.request('/api/public/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateBookingStatus(key: string, data: any) {
    return this.request(`/api/statuses/booking/${key}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async cancelBooking(bookingId: number) {
    return this.request(`/api/bookings/${bookingId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: 'cancelled' }),
    })
  }

  // ===== CLIENT ACCOUNT ENHANCEMENTS =====
  async getClientDashboard() {
    return this.request<any>('/api/client/dashboard')
  }

  async getClientGallery() {
    return this.request<any>('/api/client/gallery')
  }

  async getClientAchievements() {
    return this.request<any>('/api/client/achievements')
  }

  async getClientFavoriteMasters() {
    return this.request<any>('/api/client/favorite-masters')
  }

  async toggleFavoriteMaster(masterId: number, isFavorite: boolean) {
    return this.request('/api/client/favorite-masters/toggle', {
      method: 'POST',
      body: JSON.stringify({ master_id: masterId, is_favorite: isFavorite }),
    })
  }

  async getClientBeautyMetrics() {
    return this.request<any>('/api/client/beauty-metrics')
  }

  async getClientNotifications() {
    return this.request<any>('/api/client/my-notifications')
  }

  async getClientLoyalty() {
    return this.request<any>('/api/client/loyalty')
  }

  async getClientProfile() {
    return this.request<any>('/api/client/profile')
  }

  async updateClientProfile(data: any) {
    return this.request('/api/client/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // ===== ЗАМЕТКИ КЛИЕНТА =====
  async getClientNotes(clientId: string) {
    return this.request<any>(`/api/clients/${clientId}/notes`)
  }

  async addClientNote(clientId: string, noteText: string) {
    return this.request(`/api/clients/${clientId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note_text: noteText }),
    })
  }

  async deleteClientNote(clientId: string, noteId: number) {
    return this.request(`/api/clients/${clientId}/notes/${noteId}`, {
      method: 'DELETE',
    })
  }

  async updateClientNote(clientId: string, noteId: number, noteText: string) {
    return this.request(`/api/clients/${clientId}/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({ note_text: noteText }),
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


  async getChatMessages(clientId: string, limit: number = 50, messenger: string = 'instagram'): Promise<any> {
    return this.request(`/api/chat/messages?client_id=${clientId}&limit=${limit}&messenger=${messenger}`)
  }

  // ===== ТЕЛЕФОНИЯ =====
  async getTelephonySettings() {
    return this.request<any>('/api/telephony/settings')
  }

  async saveTelephonySettings(settings: any) {
    return this.request('/api/telephony/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    })
  }

  async testTelephonyIntegration(settings: any) {
    return this.request<any>('/api/telephony/test-integration', {
      method: 'POST',
      body: JSON.stringify(settings)
    })
  }

  async getCalls(search?: string, limit: number = 50, offset: number = 0, dateFrom?: string, dateTo?: string, bookingId?: number, sortBy?: string, order?: string, status?: string, direction?: string) {
    let url = `/api/telephony/calls?limit=${limit}&offset=${offset}`
    if (search) url += `&search=${search}`
    if (dateFrom) url += `&start_date=${dateFrom}`
    if (dateTo) url += `&end_date=${dateTo}`
    if (bookingId) url += `&booking_id=${bookingId}`
    if (sortBy) url += `&sort_by=${sortBy}`
    if (order) url += `&order=${order}`
    if (status) url += `&status=${status}`
    if (direction) url += `&direction=${direction}`
    return this.request<any>(url)
  }

  async createCall(data: any) {
    return this.request('/api/telephony/calls', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async uploadRecording(callId: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const token = localStorage.getItem('token')
    const response = await fetch(`/api/telephony/upload-recording/${callId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    return response.json()
  }

  async updateCall(id: number, data: any) {
    return this.request(`/api/telephony/calls/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteCall(id: number) {
    return this.request(`/api/telephony/calls/${id}`, {
      method: 'DELETE'
    })
  }

  async getTelephonyStats(startDate?: string, endDate?: string) {
    let url = '/api/telephony/stats?'
    if (startDate) url += `start_date=${startDate}&`
    if (endDate) url += `end_date=${endDate}`
    return this.request<any>(url)
  }

  async getTelephonyAnalytics(startDate?: string, endDate?: string, managerName?: string, status?: string, direction?: string, minDuration?: number, maxDuration?: number) {
    let url = '/api/telephony/analytics?'
    if (startDate) url += `start_date=${startDate}&`
    if (endDate) url += `end_date=${endDate}&`
    if (managerName) url += `manager_name=${encodeURIComponent(managerName)}&`
    if (status && status !== 'all') url += `status=${status}&`
    if (direction && direction !== 'all') url += `direction=${direction}&`
    if (minDuration !== undefined) url += `min_duration=${minDuration}&`
    if (maxDuration !== undefined) url += `max_duration=${maxDuration}`
    return this.request<any>(url)
  }

  // ===== НАСТРОЙКИ МЕНЮ =====
  async getMenuSettings() {
    return this.request<{ menu_order: string[] | null; hidden_items: string[] | null }>('/api/menu-settings')
  }

  async saveMenuSettings(settings: { menu_order: string[]; hidden_items: string[] }, saveForRole: boolean = false) {
    return this.request('/api/menu-settings', {
      method: 'POST',
      body: JSON.stringify({ ...settings, save_for_role: saveForRole })
    })
  }

  async resetMenuSettings() {
    return this.request('/api/menu-settings', { method: 'DELETE' })
  }

  // ===== КОРЗИНА (TRASH) =====
  async getTrashItems(entityType?: string) {
    const url = entityType ? `/api/admin/trash?entity_type=${entityType}` : '/api/admin/trash'
    return this.request<{ items: any[] }>(url)
  }

  async restoreTrashItem(entityType: string, entityId: string | number) {
    return this.request(`/api/admin/trash/restore/${entityType}/${entityId}`, {
      method: 'POST'
    })
  }

  async permanentDeleteTrashItem(entityType: string, entityId: string | number) {
    return this.request(`/api/admin/trash/permanent/${entityType}/${entityId}`, {
      method: 'DELETE'
    })
  }

  async emptyTrash() {
    return this.request('/api/admin/trash/empty', {
      method: 'DELETE',
    })
  }

  async restoreTrashItemsBatch(items: { type: string; id: string }[]) {
    return this.request<{ success: boolean; count: number }>('/api/admin/trash/restore-batch', {
      method: 'POST',
      body: JSON.stringify({ items })
    })
  }

  async deleteTrashItemsBatch(items: { type: string; id: string }[]) {
    return this.request<{ success: boolean; count: number }>('/api/admin/trash/delete-batch', {
      method: 'POST',
      body: JSON.stringify({ items })
    })
  }

  // ===== ЖУРНАЛ АУДИТА (AUDIT LOG) =====
  async getAuditLog(filters: { entity_type?: string; entity_id?: string; user_id?: number; action?: string; limit?: number } = {}) {
    const params = new URLSearchParams()
    if (filters.entity_type) params.append('entity_type', filters.entity_type)
    if (filters.entity_id) params.append('entity_id', filters.entity_id)
    if (filters.user_id) params.append('user_id', filters.user_id.toString())
    if (filters.action) params.append('action', filters.action)
    if (filters.limit) params.append('limit', filters.limit.toString())

    return this.request<{ history: any[] }>(`/api/admin/audit-log?${params.toString()}`)
  }

  async getAuditSummary() {
    return this.request<{ summary: any }>('/api/admin/audit-log/summary')
  }

  async clearAuditLog() {
    return this.request<{ success: boolean; message: string }>('/api/admin/audit-log/clear', {
      method: 'DELETE'
    })
  }

  async deleteAuditLog(logId: number) {
    return this.request<{ success: boolean; message: string }>(`/api/admin/audit-log/${logId}`, {
      method: 'DELETE'
    })
  }

  async deleteAuditLogsBatch(ids: number[]) {
    return this.request<{ success: boolean; count: number }>('/api/admin/audit-log/delete-batch', {
      method: 'POST',
      body: JSON.stringify({ ids })
    })
  }

  // ===== УСЛУГИ =====
  async getServices(activeOnly: boolean = true) {
    return this.request<any>(`/api/services?active_only=${activeOnly}`)
  }

  async getPublicServices() {
    return this.request<any>('/api/public/services')
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

  // ===== СОТРУДНИКИ =====
  async getEmployeesForService(serviceId: number) {
    return this.request<{ employees: Array<{ id: number; full_name: string; position: string; photo: string | null; is_active: boolean }> }>(`/api/services/${serviceId}/employees`)
  }

  async getEmployeeBusySlots(employeeId: number, date: string) {
    return this.request<{ busy_slots: Array<{ booking_id: number; start_time: string; end_time: string; service_name: string }> }>(`/api/employees/${employeeId}/busy-slots?date=${date}`)
  }

  // ===== ПОЛЬЗОВАТЕЛИ =====
  async getUsers(language: string = 'ru') {
    return this.request<any>(`/api/users?language=${language}&_t=${Date.now()}`)
  }

  async getPublicEmployees(language: string = 'ru') {
    return this.request<any>(`/api/public/employees?language=${language}&_t=${Date.now()}`)
  }

  // После getUsers() (примерно строка 150)

  async getRoles(): Promise<{ roles: Array<{ key: string; name: string; level: number }> }> {
    const response = await fetch('/api/roles', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Ошибка загрузки ролей');
    return response.json();
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

  // Экспорт с обработкой длинных названий
  async exportAnalytics(format: string = 'csv', period: number = 30, dateFrom?: string, dateTo?: string) {
    let url = `${this.baseURL}/api/export/analytics?format=${format}&period=${period}`;
    if (dateFrom && dateTo) {
      url += `&date_from=${dateFrom}&date_to=${dateTo}`;
    }

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(error.error || 'Export failed');
    }

    return response.blob();
  }

  async exportMessages(clientId?: string, format: string = 'csv', dateFrom?: string, dateTo?: string) {
    let url = `${this.baseURL}/api/export/messages?format=${format}`;
    if (clientId) url += `&client_id=${clientId}`;
    if (dateFrom && dateTo) {
      url += `&date_from=${dateFrom}&date_to=${dateTo}`;
    }

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Export failed');

    return response.blob();
  }

  async exportFullData(format: string = 'csv') {
    const response = await fetch(`${this.baseURL}/api/export/full-data?format=${format}`, {
      credentials: 'include',
    })

    if (!response.ok) throw new Error('Export failed')

    return response.blob()
  }

  // ===== ИМПОРТ =====
  async importClients(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/api/clients/import`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Import failed' }))
      throw new Error(error.detail || 'Import failed')
    }

    return response.json()
  }


  // ===== NOTIFICATIONS =====
  async getNotifications(unreadOnly: boolean = false, limit: number = 50) {
    return this.request<{ notifications: any[] }>(`/api/notifications?unread_only=${unreadOnly}&limit=${limit}`)
  }

  async markNotificationRead(id: number) {
    return this.request(`/api/notifications/${id}/read`, {
      method: 'POST',
    })
  }

  async markAllNotificationsRead() {
    return this.request('/api/notifications/read-all', {
      method: 'POST',
    })
  }

  async deleteNotification(id: number) {
    return this.request(`/api/notifications/${id}`, {
      method: 'DELETE',
    })
  }

  async clearAllNotifications() {
    return this.request('/api/notifications/clear-all', {
      method: 'DELETE',
    })
  }

  // ===== UNREAD COUNT =====
  async getUnreadCount() {
    return this.request<any>('/api/notifications/unread-count')
  }

  async getTotalUnread() {
    return this.request<{ count: number }>('/api/unread-count').then(data => ({ total: data.count }))
  }

  // ===== BOT SETTINGS =====
  async getBotSettings() {
    return this.request<any>('/api/bot-settings')  // ✅ Правильный путь
  }

  async updateBotSettings(data: any) {
    return this.request('/api/settings/bot', {
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

  // ===== CHALLENGES =====
  async getChallenges() {
    return this.request<any>('/api/challenges')
  }

  async createChallenge(data: any) {
    return this.request('/api/challenges', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateChallenge(id: number, data: any) {
    return this.request(`/api/challenges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteChallenge(id: number) {
    return this.request(`/api/challenges/${id}`, {
      method: 'DELETE',
    })
  }

  // ===== ADMIN CLIENT GALLERY =====
  async getAdminClientGallery(clientId: string) {
    return this.request<any>(`/api/admin/client-gallery/${clientId}`)
  }

  async uploadClientGalleryPhoto(clientId: string, photoType: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)

    // We use fetch directly for FormData to avoid complex handling in this.request if it's not set up for it
    const response = await fetch(`${this.baseURL}/api/admin/client-gallery/upload?client_id=${clientId}&photo_type=${photoType}`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })

    if (!response.ok) throw new Error('Upload failed')
    return response.json()
  }

  async addClientGalleryEntry(data: any) {
    return this.request('/api/admin/client-gallery', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteClientGalleryEntry(id: number) {
    return this.request(`/api/admin/client-gallery/${id}`, {
      method: 'DELETE',
    })
  }

  // ===== РОЛИ И ПРАВА =====


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
    return this.request<any>(`/api/permissions/user/${userId}`)
  }

  async updateUserRole(userId: number, role: string) {
    return this.request(`/api/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    })
  }

  async updateUserCustomPermissions(userId: number, permissions: Record<string, boolean>) {
    return this.request(`/api/permissions/user/${userId}/custom`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    })
  }

  async getAllRoles() {
    return this.request<any>('/api/permissions/roles')
  }

  async getPermissionDescriptions() {
    return this.request<any>('/api/permissions/descriptions')
  }

  // ===== РЕАКЦИИ =====
  async reactToMessage(messageId: number, emoji: string) {
    return this.request('/api/chat/react', {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId, emoji }),
    })
  }

  async getMessageReactions(messageId: number) {
    return this.request<any>(`/api/chat/reactions/${messageId}`)
  }

  // ===== ШАБЛОНЫ СООБЩЕНИЙ =====
  async getMessageTemplates() {
    return this.request<any>('/api/chat/templates')
  }

  async createMessageTemplate(data: { title: string; content: string; category?: string }) {
    return this.request('/api/chat/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: data.title,
        content: data.content,
        category: data.category || 'general'
      }),
    })
  }

  async updateMessageTemplate(templateId: number, data: { name?: string; title?: string; content?: string; category?: string }) {
    const requestData: any = {};

    // Добавляем только те поля, которые переданы
    if (data.title !== undefined) requestData.name = data.title;
    if (data.name !== undefined) requestData.name = data.name;
    if (data.content !== undefined) requestData.content = data.content;
    if (data.category !== undefined) requestData.category = data.category;

    return this.request(`/api/chat/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    })
  }

  async deleteMessageTemplate(templateId: number) {
    return this.request(`/api/chat/templates/${templateId}`, {
      method: 'DELETE',
    })
  }

  // ===== ОТЛОЖЕННЫЕ СООБЩЕНИЯ =====
  async scheduleMessage(clientId: string, message: string, sendAt: string) {
    return this.request('/api/chat/schedule', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, message, send_at: sendAt }),
    })
  }

  async getScheduledMessages() {
    return this.request<any>('/api/chat/scheduled')
  }

  async cancelScheduledMessage(messageId: number) {
    return this.request(`/api/chat/scheduled/${messageId}/cancel`, {
      method: 'POST',
    })
  }

  // После метода deleteMessageTemplate, добавь:

  // ===== СТАТУСЫ =====
  async getClientStatuses() {
    return this.request<any>('/api/statuses/client')
  }

  async createClientStatus(data: { status_key: string; status_label: string; status_color: string }) {
    return this.request('/api/statuses/client', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteClientStatus(statusKey: string) {
    return this.request(`/api/statuses/client/${statusKey}`, {
      method: 'DELETE',
    })
  }



  async createBookingStatus(data: { status_key: string; status_label: string; status_color: string }) {
    return this.request('/api/statuses/booking', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getBookingStatuses() {
    return this.request<any>('/api/statuses/booking')
  }

  // После метода deleteClientNote добавить:

  // ===== МАСТЕРА =====
  async getMasters() {
    return this.request<any>('/api/employees')
  }

  async addMasterTimeOff(masterId: number, data: { date_from: string; date_to: string; reason?: string }) {
    return this.request(`/api/masters/${masterId}/time-off`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getMasterTimeOff(masterId: number) {
    return this.request<any>(`/api/masters/${masterId}/time-off`)
  }

  async deleteMasterTimeOff(timeOffId: number) {
    return this.request(`/api/masters/time-off/${timeOffId}`, {
      method: 'DELETE',
    })
  }

  async addSalonHoliday(data: { date: string; name?: string }) {
    return this.request('/api/salon/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getSalonHolidays() {
    return this.request<any>('/api/salon/holidays')
  }

  async deleteSalonHoliday(date: string) {
    return this.request(`/api/salon/holidays/${date}`, {
      method: 'DELETE',
    })
  }

  async updateUserPermissions(userId: number, data: { permissions: any }) {
    return this.request(`/api/users/${userId}/permissions`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ===== EMPLOYEE PROFILE (Self-Service) =====
  async getMyEmployeeProfile() {
    return this.request<any>('/api/employees/my-profile')
  }

  async getMyProfile() {
    return this.request<any>('/api/employees/my-profile')
  }

  async updateMyEmployeeProfile(data: {
    full_name?: string;
    name_ru?: string;
    name_ar?: string;
    position?: string;
    position_ru?: string;
    position_ar?: string;
    experience?: string;
    photo?: string;
    bio?: string;
    phone?: string;
    email?: string;
    instagram?: string;
  }) {
    return this.request('/api/employees/my-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateMyProfile(data: any) {
    return this.request<any>('/api/my-profile/update', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async uploadFile(file: File, subfolder?: string) {
    const formData = new FormData()
    formData.append('file', file)

    let url = `${this.baseURL}/api/upload`
    if (subfolder) {
      url += `?subfolder=${encodeURIComponent(subfolder)}`
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || error.detail || 'Upload failed')
    }

    return response.json() as Promise<{
      file_url: string;
      full_url: string;
      filename: string;
      content_type: string;
      size: number;
      category: string;
      subfolder?: string;
    }>
  }

  // ===== USER MANAGEMENT =====
  async getPendingUsers() {
    return this.request<any>('/api/pending-users')
  }

  async approveUser(userId: number) {
    return this.request(`/api/users/${userId}/approve`, {
      method: 'POST',
    })
  }

  // ===== ГРАФИК РАБОТЫ =====
  async getUserSchedule(userId: number) {
    return this.request<any[]>(`/api/schedule/user/${userId}`)
  }

  async updateUserSchedule(userId: number, schedule: any[]) {
    return this.request(`/api/schedule/user/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ schedule }),
    })
  }

  async getUserTimeOff(userId: number) {
    return this.request<any[]>(`/api/schedule/user/${userId}/time-off`)
  }

  async addUserTimeOff(userId: number, data: { start_datetime: string; end_datetime: string; type: string; reason?: string }) {
    return this.request(`/api/schedule/user/${userId}/time-off`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteTimeOff(id: number) {
    return this.request(`/api/schedule/time-off/${id}`, {
      method: 'DELETE',
    })
  }

  async rejectUser(userId: number) {
    return this.request(`/api/users/${userId}/reject`, {
      method: 'POST',
    })
  }

  async grantPermission(userId: number, resource: string) {
    return this.request(`/api/users/${userId}/permissions/grant`, {
      method: 'POST',
      body: JSON.stringify({ resource }),
    })
  }

  async revokePermission(userId: number, resource: string) {
    return this.request(`/api/users/${userId}/permissions/revoke`, {
      method: 'POST',
      body: JSON.stringify({ resource }),
    })
  }

  // ===== РАСПИСАНИЕ (НОВОЕ) =====
  async getWorkingHours(masterName: string) {
    return this.request<any>(`/api/schedule/${masterName}/working-hours`)
  }

  async setWorkingHours(masterName: string, dayOfWeek: number, startTime: string, endTime: string) {
    return this.request(`/api/schedule/${masterName}/working-hours`, {
      method: 'POST',
      body: JSON.stringify({
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime
      }),
    })
  }

  async addTimeOff(masterName: string, startDate: string, endDate: string, type: string = 'vacation', reason?: string) {
    return this.request(`/api/schedule/${masterName}/time-off`, {
      method: 'POST',
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        type: type,
        reason: reason
      }),
    })
  }

  async getTimeOffs(masterName: string) {
    return this.request<any>(`/api/schedule/${masterName}/time-off`)
  }

  async getAvailableSlots(masterName: string, date: string, duration: number = 60) {
    return this.request<{
      success: boolean;
      master: string;
      date: string;
      available_slots: { time: string; is_optimal: boolean }[];
      count: number;
    }>(`/api/schedule/${masterName}/available-slots?date=${date}&duration=${duration}`)
  }

  async getAvailableDates(masterName: string, year: number, month: number, duration: number = 60) {
    // Use public endpoint to avoid auth issues
    return this.request<{
      success: boolean;
      master: string;
      year: number;
      month: number;
      available_dates: string[]; // YYYY-MM-DD
    }>(`/api/public/schedule/${masterName}/available-dates?year=${year}&month=${month}&duration=${duration}`)
  }

  async createHold(data: { service_id: number, master_name: string, date: string, time: string, client_id: string }) {
    // Публичный endpoint для холда слота находится под /api/public
    return this.request<{ success: boolean; error?: string }>('/api/public/bookings/hold', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getAllMastersAvailability(date: string) {
    return this.request<{
      success: boolean;
      date: string;
      availability: Record<string, string[]>;
    }>(`/api/schedule/available-slots?date=${date}`);
  }

  async getHolidays(start?: string, end?: string): Promise<any[]> {
    const params: any = {};
    if (start) params.start_date = start;
    if (end) params.end_date = end;

    // Note: We use the public fetch wrapper if available or standard request
    try {
      // Using 'request' helper which wraps fetch
      return this.request<any[]>('/api/holidays?' + new URLSearchParams(params).toString());
    } catch (e) {
      console.error("Failed to fetch holidays", e);
      return [];
    }
  }

  async createHoliday(data: { date: string; name: string; is_closed?: boolean; master_exceptions?: number[] }) {
    return this.request<{ success: boolean }>('/api/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteHoliday(date: string) {
    return this.request<{ success: boolean }>(`/api/holidays/${date}`, {
      method: 'DELETE',
    });
  }


  // ===== BOOKING REMINDERS =====
  async getBookingReminderSettings() {
    return this.request<{ settings: any[] }>('/api/booking-reminder-settings')
  }

  async createBookingReminderSetting(data: any) {
    return this.request('/api/booking-reminder-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async toggleBookingReminderSetting(id: number) {
    return this.request(`/api/booking-reminder-settings/${id}/toggle`, {
      method: 'PUT',
    })
  }

  async deleteBookingReminderSetting(id: number) {
    return this.request(`/api/booking-reminder-settings/${id}`, {
      method: 'DELETE',
    })
  }

  // ===== MESSENGERS =====
  async getMessengerSettings() {
    return this.request<{ settings: any[] }>('/api/messengers/settings')
  }

  async updateMessengerSetting(type: string, data: any) {
    return this.request(`/api/messengers/settings/${type}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // ===== MESSENGERS =====
  async getEnabledMessengers() {
    return this.request<{
      enabled_messengers: Array<{
        type: string
        name: string
      }>
    }>('/api/messengers/enabled')
  }

  // ===== POSITIONS =====
  async getPositions(activeOnly: boolean = true) {
    return this.request<{
      positions: Array<{
        id: number
        name: string
        name_en?: string
        name_ar?: string
        description?: string
        is_active: number
        sort_order: number
        created_at: string
        updated_at: string
      }>
    }>(`/api/positions?active_only=${activeOnly}`)
  }
  // ===== BROADCASTS =====
  async getUserSubscriptions() {
    return this.request<{
      subscriptions: Record<string, { is_subscribed: boolean; channels: { email: boolean; telegram: boolean; instagram: boolean } }>;
      available_types: Record<string, { name: string; description: string }>;
    }>('/api/subscriptions')
  }

  async updateSubscription(type: string, isSubscribed: boolean, channels?: { email?: boolean; telegram?: boolean; instagram?: boolean }) {
    const data: any = {
      subscription_type: type,
      is_subscribed: isSubscribed
    };
    if (channels) {
      if (channels.email !== undefined) data.email_enabled = channels.email;
      if (channels.telegram !== undefined) data.telegram_enabled = channels.telegram;
      if (channels.instagram !== undefined) data.instagram_enabled = channels.instagram;
    }
    return this.request('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async previewBroadcast(data: {
    subscription_type: string;
    channels: string[];
    subject: string;
    message: string;
    target_role?: string;
    user_ids?: number[];
    force_send?: boolean;
  }) {
    return this.request<{
      total_users: number;
      by_channel: Record<string, number>;
      users_sample: Array<{
        id: number;
        username: string;
        full_name: string;
        role: string;
        contact: string;
        channel: string;
      }>;
    }>('/api/broadcasts/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async sendBroadcast(data: {
    subscription_type: string;
    channels: string[];
    subject: string;
    message: string;
    target_role?: string;
    user_ids?: number[];
    force_send?: boolean;
  }) {
    return this.request<{
      success: boolean;
      results: Record<string, { sent: number; failed: number }>;
      message: string;
    }>('/api/broadcasts/send', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getBroadcastHistory() {
    return this.request<{
      history: Array<{
        id: number;
        subscription_type: string;
        channels: string[];
        subject: string;
        total_sent: number;
        created_at: string;
        results: string;
      }>;
    }>('/api/broadcasts/history')
  }

  async getBroadcastUsers(type: string, role?: string) {
    return this.request<{
      users: Array<{
        id: number;
        username: string;
        full_name: string;
        role: string;
        email: string | null;
        telegram_id: string | null;
        instagram_username: string | null;
        is_subscribed: boolean;
        channels: {
          email: boolean;
          telegram: boolean;
          instagram: boolean;
        };
      }>;
    }>(`/api/broadcasts/users?type=${type}${role ? `&role=${role}` : ''}`)
  }

  // ===== SUBSCRIPTION TYPES =====
  async getSubscriptionTypes() {
    return this.request<any[]>('/api/subscription-types')
  }

  async createSubscriptionType(data: any) {
    return this.request('/api/subscription-types', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSubscriptionType(id: number, data: any) {
    return this.request(`/api/subscription-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteSubscriptionType(id: number) {
    return this.request(`/api/subscription-types/${id}`, {
      method: 'DELETE',
    })
  }

  async getSalonWorkingHours() {
    return this.get('/api/salon-settings/working-hours');
  }

  // ===== PUBLIC BOOKING (CLIENT CABINET) =====
  // Использует публичный endpoint, который просто проверяет наличие записей в базе
  // и не зависит от настроек расписания мастеров.
  async getPublicAvailableSlots(
    date: string,
    employeeId?: number,
    serviceId?: number
  ) {
    const params = new URLSearchParams({ date });
    if (employeeId) params.append('employee_id', String(employeeId));
    if (serviceId) params.append('service_id', String(serviceId));

    return this.request<{
      date: string;
      slots: { time: string; available: boolean }[];
    }>(`/api/public/available-slots?${params.toString()}`);
  }

  async getPublicBatchAvailability(date: string) {
    return this.request<{
      date: string;
      availability: Record<number, string[]>;
    }>(`/api/public/available-slots/batch?date=${date}`);
  }
  // ===== ADMIN PANEL =====
  async getAdminStats() {
    return this.request<any>('/api/admin/stats')
  }

  async getLoyaltyTransactions(limit: number = 50) {
    return this.request<any>(`/api/admin/loyalty/transactions?limit=${limit}`)
  }

  async adjustLoyaltyPoints(data: { client_email: string; points: number; reason: string }) {
    return this.request('/api/admin/loyalty/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getLoyaltyStats() {
    return this.request<any>('/api/admin/loyalty/stats')
  }

  async getReferrals(limit: number = 100) {
    return this.request<any>(`/api/admin/referrals?limit=${limit}`)
  }

  async getReferralStats() {
    return this.request<any>('/api/admin/referrals/stats')
  }

  async getReferralSettings() {
    return this.request<any>('/api/admin/referrals/settings')
  }

  async updateReferralSettings(data: { referrer_bonus?: number; referred_bonus?: number; min_purchase_amount?: number }) {
    return this.request('/api/admin/referrals/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getAdminChallenges() {
    return this.request<any>('/api/admin/challenges')
  }

  async createAdminChallenge(data: any) {
    return this.request('/api/admin/challenges', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteAdminChallenge(challengeId: number) {
    return this.request(`/api/admin/challenges/${challengeId}`, {
      method: 'DELETE',
    })
  }

  async getChallengesStats() {
    return this.request<any>('/api/admin/challenges/stats')
  }

  async getAdminNotifications(limit: number = 50) {
    return this.request<any>(`/api/admin/notifications?limit=${limit}`)
  }

  async sendAdminNotification(data: any) {
    return this.request('/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getGalleryPhotos(category?: string) {
    const params = category ? `?category=${category}` : ''
    return this.request<any>(`/api/admin/gallery${params}`)
  }

  async uploadGalleryPhoto(data: any) {
    return this.request('/api/admin/gallery', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteGalleryPhoto(photoId: string) {
    return this.request(`/api/admin/gallery/${photoId}`, {
      method: 'DELETE',
    })
  }

  // ===== ДОГОВОРЫ (CONTRACTS) =====
  async getContracts(clientId?: string, status?: string) {
    let url = '/api/contracts?'
    if (clientId) url += `client_id=${clientId}&`
    if (status) url += `status=${status}`
    return this.request<any>(url)
  }

  async createContract(data: any) {
    return this.request('/api/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateContract(id: number, data: any) {
    return this.request(`/api/contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteContract(id: number) {
    return this.request(`/api/contracts/${id}`, {
      method: 'DELETE',
    })
  }

  async sendContract(id: number, data: { delivery_method: string; recipient: string }) {
    return this.request(`/api/contracts/${id}/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ===== ТОВАРЫ (PRODUCTS) =====
  async getProducts(category?: string, isActive?: boolean, search?: string) {
    let url = '/api/products?'
    if (category) url += `category=${category}&`
    if (isActive !== undefined) url += `is_active=${isActive}&`
    if (search) url += `search=${search}`
    return this.request<any>(url)
  }

  async getProduct(id: number) {
    return this.request<any>(`/api/products/${id}`)
  }

  async createProduct(data: any) {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProduct(id: number, data: any) {
    return this.request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteProduct(id: number) {
    return this.request(`/api/products/${id}`, {
      method: 'DELETE',
    })
  }

  async createProductMovement(data: any) {
    return this.request('/api/products/movements', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getProductMovements(productId: number) {
    return this.request<any>(`/api/products/${productId}/movements`)
  }

  async getProductStats(productId: number) {
    return this.request<any>(`/api/products/${productId}/stats`)
  }

  async getProductCategories() {
    return this.request<any>('/api/products/categories')
  }

  // ===== СЧЕТА (INVOICES) =====
  async getInvoices(clientId?: string, status?: string) {
    let url = '/api/invoices?'
    if (clientId) url += `client_id=${clientId}&`
    if (status) url += `status=${status}`
    return this.request<any>(url)
  }

  async createInvoice(data: any) {
    return this.request('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateInvoice(id: number, data: any) {
    return this.request(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteInvoice(id: number) {
    return this.request(`/api/invoices/${id}`, {
      method: 'DELETE',
    })
  }

  async addInvoicePayment(id: number, data: any) {
    return this.request(`/api/invoices/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async sendInvoice(id: number, deliveryMethod: string, recipient: string) {
    return this.request(`/api/invoices/${id}/send?delivery_method=${deliveryMethod}&recipient=${recipient}`, {
      method: 'POST',
    })
  }

  // ===== КОНТРОЛЬНЫЕ ТОЧКИ ВОРОНКИ =====
  async getFunnelCheckpoints(stageId?: number, isActive?: boolean) {
    let url = '/api/funnel/checkpoints?'
    if (stageId) url += `stage_id=${stageId}&`
    if (isActive !== undefined) url += `is_active=${isActive}`
    return this.request<any>(url)
  }

  async createFunnelCheckpoint(data: any) {
    return this.request('/api/funnel/checkpoints', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateFunnelCheckpoint(id: number, data: any) {
    return this.request(`/api/funnel/checkpoints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteFunnelCheckpoint(id: number) {
    return this.request(`/api/funnel/checkpoints/${id}`, {
      method: 'DELETE',
    })
  }

  async getClientCheckpointProgress(clientId: string) {
    return this.request<any>(`/api/funnel/clients/${clientId}/progress`)
  }

  async updateClientCheckpoint(clientId: string, checkpointId: number, data: any) {
    return this.request(`/api/funnel/clients/${clientId}/checkpoints/${checkpointId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // ===== ПЛАТЕЖНЫЕ ИНТЕГРАЦИИ =====
  async getPaymentProviders() {
    return this.request<any>('/api/payment-providers')
  }

  async createPaymentProvider(data: any) {
    return this.request('/api/payment-providers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async createPayment(data: any) {
    return this.request('/api/create-payment', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getPaymentTransactions(invoiceId?: number, status?: string, provider?: string) {
    let url = '/api/transactions?'
    if (invoiceId) url += `invoice_id=${invoiceId}&`
    if (status) url += `status=${status}&`
    if (provider) url += `provider=${provider}`
    return this.request<any>(url)
  }

  // ===== МАРКЕТПЛЕЙС ИНТЕГРАЦИИ =====
  async getMarketplaceProviders() {
    return this.request<any>('/api/marketplace-providers')
  }

  async createMarketplaceProvider(data: any) {
    return this.request('/api/marketplace-providers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async syncMarketplace(provider: string) {
    return this.request(`/api/marketplace/sync/${provider}`, {
      method: 'POST',
    })
  }

  async getMarketplaceStats() {
    return this.request<any>('/api/marketplace/stats')
  }
  // ===== CONTRACT TYPES =====
  async getContractTypes() {
    return this.request<{ types: any[] }>('/api/contract-types')
  }

  async createContractType(data: any) {
    return this.request('/api/contract-types', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateContractType(id: number, data: any) {
    return this.request(`/api/contract-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteContractType(id: number, deleteDocuments: boolean) {
    return this.request(`/api/contract-types/${id}?delete_documents=${deleteDocuments}`, {
      method: 'DELETE'
    })
  }
}

export const api = new ApiClient()
