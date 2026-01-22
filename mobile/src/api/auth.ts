import apiClient from './client';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.postForm<AuthResponse>('/api/login', {
      username: data.username,
      password: data.password,
    });
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/register', data);
    return response.data;
  },

  registerClient: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/register/client', data);
    return response.data;
  },

  googleLogin: async (token: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/google-login', { token });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/logout');
  },

  verifyEmail: async (code: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/verify-email', { code });
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/resend-verification',
      { email }
    );
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/forgot-password',
      { email }
    );
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/reset-password', {
      token,
      password,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await apiClient.get<{ user: User }>('/api/me');
      return response.data.user;
    } catch {
      return null;
    }
  },
};
