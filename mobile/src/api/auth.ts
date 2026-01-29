import apiClient from './client';
import { API_ENDPOINTS } from '@beauty-crm/shared/api';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@beauty-crm/shared/types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.postForm<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      username: data.username,
      password: data.password,
    });
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data);
    return response.data;
  },

  registerClient: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER_CLIENT, data);
    return response.data;
  },

  googleLogin: async (token: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.GOOGLE_LOGIN, { token });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  verifyEmail: async (code: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { code });
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      API_ENDPOINTS.AUTH.RESEND_VERIFICATION,
      { email }
    );
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email }
    );
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      token,
      password,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await apiClient.get<{ user: User }>(API_ENDPOINTS.AUTH.ME);
      return response.data.user;
    } catch {
      return null;
    }
  },
};
