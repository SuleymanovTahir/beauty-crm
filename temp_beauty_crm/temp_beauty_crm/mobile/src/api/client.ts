import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/config';

const SESSION_TOKEN_KEY = 'session_token';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.removeToken();
          // Will be handled by auth store
        }
        return Promise.reject(error);
      }
    );
  }

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  }

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  }

  // HTTP methods
  get<T>(url: string, params?: Record<string, unknown>): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, { params });
  }

  post<T>(url: string, data?: unknown): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data);
  }

  postForm<T>(url: string, data: Record<string, string>): Promise<AxiosResponse<T>> {
    const formData = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    return this.instance.post<T>(url, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  put<T>(url: string, data?: unknown): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data);
  }

  delete<T>(url: string): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
