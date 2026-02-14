import { buildApiUrl, resolveApiEndpoint } from '../api/client'

const API_URL = import.meta.env.VITE_API_URL || window.location.origin

type PromoCodeApiItem = {
  id: number
  code: string
  discount_type: 'percent' | 'fixed' | string
  value: number
  min_amount: number | null
  valid_from: string
  valid_until: string | null
  max_uses: number | null
  current_uses: number | null
  is_active: boolean
  category?: string | null
  description?: string | null
  target_client_id?: string | number | null
  target_scope?: 'all' | 'categories' | 'services' | 'clients' | string
  target_categories?: string[]
  target_service_ids?: number[]
  target_client_ids?: (string | number)[]
  created_at: string
}

type PromoCodeListResponse = { promo_codes?: PromoCodeApiItem[] } | PromoCodeApiItem[]

type PromoCodeUiItem = {
  id: number
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_booking_amount: number
  valid_from: string
  valid_until: string | null
  usage_limit: number | null
  times_used: number
  is_active: boolean
  is_personalized: boolean
  description: string | null
  target_client_id: string | null
  target_scope: 'all' | 'categories' | 'services' | 'clients'
  target_categories: string[]
  target_service_ids: number[]
  target_client_ids: string[]
  created_at: string
}

export class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const resolvedEndpoint = resolveApiEndpoint(endpoint)
    const url = buildApiUrl(endpoint, this.baseURL)

    const headers: HeadersInit = {
      ...options.headers,
    }

    if (options.body) {
      ;(headers as Record<string, string>)['Content-Type'] = 'application/json'
    }

    const defaultOptions: RequestInit = {
      method: 'GET',
      headers,
      credentials: 'include',
      ...options,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    defaultOptions.signal = controller.signal

    try {
      const response = await fetch(url, defaultOptions)
      clearTimeout(timeoutId)

      if (response.status === 401) {
        if (resolvedEndpoint === '/api/login') {
          const errorData = await response.json().catch(() => ({ error: 'invalid_credentials' }))
          const error: any = new Error(errorData.error || 'authorization_error')
          error.error = errorData.error || 'invalid_credentials'
          error.status = 401
          throw error
        }
        localStorage.removeItem('user')
        window.location.href = '/login'
        throw new Error('Сессия истекла. Пожалуйста, перезагрузитесь.')
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        const error: any = new Error(errorData.error || errorData.message || `API Error: ${response.status}`)
        error.error = errorData.error
        error.reason = errorData.reason
        error.nearest_slots = errorData.nearest_slots
        error.details = errorData
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

  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

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

    return response
  }

  async registerClient(
    username: string,
    password: string,
    full_name: string,
    email: string,
    phone: string,
    privacy_accepted: boolean,
    captcha_token?: string
  ) {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    formData.append('full_name', full_name)
    formData.append('email', email)
    formData.append('phone', phone)
    formData.append('privacy_accepted', privacy_accepted.toString())
    if (captcha_token) {
      formData.append('captcha_token', captcha_token)
    }

    return this.request<any>('/api/register/client', {
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

  async getPlatformGates() {
    let settings: any = {}
    try {
      settings = await this.request<any>('/api/platform-gates')
    } catch (_error) {
      settings = {}
    }

    let runtimeProfile: any = {}
    try {
      runtimeProfile = await this.request<any>('/api/runtime-profile')
    } catch (_error) {
      runtimeProfile = {}
    }

    let crmEnabled = typeof settings?.crm_enabled === 'boolean' ? settings.crm_enabled : undefined
    let siteEnabled = typeof settings?.site_enabled === 'boolean' ? settings.site_enabled : undefined
    const hasExplicitSettings = typeof crmEnabled === 'boolean' && typeof siteEnabled === 'boolean'

    if (!hasExplicitSettings) {
      if (runtimeProfile?.backend_product_group === 'crm' || runtimeProfile?.crm_runtime_enabled === true) {
        crmEnabled = true
        siteEnabled = typeof siteEnabled === 'boolean' ? siteEnabled : false
      } else if (runtimeProfile?.backend_product_group === 'site' || runtimeProfile?.site_runtime_enabled === true) {
        crmEnabled = typeof crmEnabled === 'boolean' ? crmEnabled : false
        siteEnabled = true
      }
    }

    return {
      business_type: settings?.business_type,
      product_mode: settings?.product_mode,
      crm_enabled: typeof crmEnabled === 'boolean' ? crmEnabled : true,
      site_enabled: typeof siteEnabled === 'boolean' ? siteEnabled : true,
    }
  }

  async getSalonSettings() {
    return this.request<any>('/api/salon-settings')
  }

  async getPublicSalonSettings() {
    return this.request<any>('/api/public/salon-settings')
  }

  async getPublicServices() {
    return this.request<any>('/api/public/services')
  }

  async getPublicEmployees(language: string = 'ru') {
    return this.request<any>(`/api/public/employees?language=${language}&_t=${Date.now()}`)
  }

  async getClientProfile() {
    return this.request<any>('/api/client/profile')
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

  async getAccountMenuSettings() {
    return this.request<{
      hidden_items: string[]
      apply_mode: 'all' | 'selected'
      target_client_ids: string[]
    }>('/api/account-menu-settings')
  }

  async getPromoCodes(): Promise<PromoCodeUiItem[]> {
    const response = await this.request<PromoCodeListResponse>('/api/promo-codes')
    const promoCodes = Array.isArray(response)
      ? response
      : Array.isArray(response.promo_codes)
        ? response.promo_codes
        : []

    return promoCodes.map((promo) => {
      const category = typeof promo.category === 'string' ? promo.category.toLowerCase() : ''
      const rawTargetClientId = promo.target_client_id
      const targetClientId = rawTargetClientId === null || rawTargetClientId === undefined
        ? null
        : String(rawTargetClientId)
      const parsedTargetScope = promo.target_scope === 'categories'
        || promo.target_scope === 'services'
        || promo.target_scope === 'clients'
        ? promo.target_scope
        : 'all'
      const targetCategories = Array.isArray(promo.target_categories)
        ? promo.target_categories.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : []
      const targetServiceIds = Array.isArray(promo.target_service_ids)
        ? promo.target_service_ids.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
        : []
      const targetClientIds = Array.isArray(promo.target_client_ids)
        ? promo.target_client_ids.map((value) => String(value).trim()).filter((value) => value.length > 0)
        : []

      return {
        id: Number(promo.id),
        code: String(promo.code ?? ''),
        discount_type: promo.discount_type === 'fixed' ? 'fixed' : 'percent',
        discount_value: Number(promo.value ?? 0),
        min_booking_amount: Number(promo.min_amount ?? 0),
        valid_from: String(promo.valid_from ?? ''),
        valid_until: promo.valid_until ?? null,
        usage_limit: typeof promo.max_uses === 'number' ? promo.max_uses : null,
        times_used: Number(promo.current_uses ?? 0),
        is_active: Boolean(promo.is_active),
        is_personalized: category === 'personal'
          || category === 'personalized'
          || category === 'birthday'
          || targetClientId !== null
          || parsedTargetScope === 'clients'
          || targetClientIds.length > 0,
        description: typeof promo.description === 'string' ? promo.description : null,
        target_client_id: targetClientId,
        target_scope: parsedTargetScope,
        target_categories: targetCategories,
        target_service_ids: targetServiceIds,
        target_client_ids: targetClientIds,
        created_at: String(promo.created_at ?? ''),
      }
    })
  }

  async validatePromoCode(
    code: string,
    amount: number = 0,
    context?: {
      service_ids?: number[]
      service_categories?: string[]
      client_id?: string
    }
  ) {
    const params = new URLSearchParams({
      code,
      amount: String(amount),
    })
    if (Array.isArray(context?.service_ids) && context.service_ids.length > 0) {
      params.set('service_ids', context.service_ids.join(','))
    }
    if (Array.isArray(context?.service_categories) && context.service_categories.length > 0) {
      params.set('service_categories', context.service_categories.join(','))
    }
    if (typeof context?.client_id === 'string' && context.client_id.trim().length > 0) {
      params.set('client_id', context.client_id.trim())
    }

    return this.request(`/api/promo-codes/validate?${params.toString()}`, {
      method: 'POST',
    })
  }

  async getPublicReferralLinkProfile(
    shareToken: string,
    params?: { period?: string; date_from?: string; date_to?: string }
  ) {
    const query = new URLSearchParams()
    if (params?.period) query.set('period', params.period)
    if (params?.date_from) query.set('date_from', params.date_from)
    if (params?.date_to) query.set('date_to', params.date_to)
    const queryString = query.toString()
    const endpoint = queryString.length > 0
      ? `/api/public/referral-links/${encodeURIComponent(shareToken)}?${queryString}`
      : `/api/public/referral-links/${encodeURIComponent(shareToken)}`
    return this.request<any>(endpoint)
  }

  async getAvailableDates(masterName: string, year: number, month: number, duration: number = 60) {
    const encodedMasterName = encodeURIComponent(masterName)
    return this.request<{
      success: boolean
      master: string
      year: number
      month: number
      available_dates: string[]
    }>(`/api/public/schedule/${encodedMasterName}/available-dates?year=${year}&month=${month}&duration=${duration}`)
  }

  async getPublicAvailableSlots(
    date: string,
    employeeId?: number,
    serviceId?: number,
    context?: {
      serviceIds?: number[]
      durationMinutes?: number
    }
  ) {
    const params = new URLSearchParams({ date })
    if (employeeId) params.append('employee_id', String(employeeId))
    if (serviceId) params.append('service_id', String(serviceId))
    if (Array.isArray(context?.serviceIds) && context.serviceIds.length > 0) {
      const normalizedServiceIds = context.serviceIds
        .map((serviceItem) => Number(serviceItem))
        .filter((serviceItem) => Number.isFinite(serviceItem) && serviceItem > 0)
        .map((serviceItem) => Math.trunc(serviceItem))
      if (normalizedServiceIds.length > 0) {
        params.append('service_ids', normalizedServiceIds.join(','))
      }
    }
    if (
      typeof context?.durationMinutes === 'number'
      && Number.isFinite(context.durationMinutes)
      && context.durationMinutes > 0
    ) {
      params.append('duration_minutes', String(Math.trunc(context.durationMinutes)))
    }

    return this.request<{
      date: string
      slots: { time: string; available: boolean; isOptimal?: boolean; is_optimal?: boolean }[]
    }>(`/api/public/available-slots?${params.toString()}`)
  }

  async getPublicBatchAvailability(
    date: string,
    context?: {
      serviceId?: number
      serviceIds?: number[]
      durationMinutes?: number
    }
  ) {
    const params = new URLSearchParams({ date })
    if (
      typeof context?.serviceId === 'number'
      && Number.isFinite(context.serviceId)
      && context.serviceId > 0
    ) {
      params.append('service_id', String(Math.trunc(context.serviceId)))
    }
    if (Array.isArray(context?.serviceIds) && context.serviceIds.length > 0) {
      const normalizedServiceIds = context.serviceIds
        .map((serviceItem) => Number(serviceItem))
        .filter((serviceItem) => Number.isFinite(serviceItem) && serviceItem > 0)
        .map((serviceItem) => Math.trunc(serviceItem))
      if (normalizedServiceIds.length > 0) {
        params.append('service_ids', normalizedServiceIds.join(','))
      }
    }
    if (
      typeof context?.durationMinutes === 'number'
      && Number.isFinite(context.durationMinutes)
      && context.durationMinutes > 0
    ) {
      params.append('duration_minutes', String(Math.trunc(context.durationMinutes)))
    }

    return this.request<{
      date: string
      availability: Record<number, string[]>
    }>(`/api/public/available-slots/batch?${params.toString()}`)
  }
}

export const api = new ApiClient()
