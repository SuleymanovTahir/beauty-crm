import { create } from 'zustand';
import { authApi } from '../api/auth';
import apiClient from '../api/client';
import { User, AuthState, LoginRequest, RegisterRequest } from '../types';

interface AuthActions {
  login: (data: LoginRequest) => Promise<{ success: boolean; message?: string }>;
  register: (data: RegisterRequest, asClient?: boolean) => Promise<{ success: boolean; message?: string }>;
  googleLogin: (token: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  verifyEmail: (code: string) => Promise<{ success: boolean; message?: string }>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  token: null,

  login: async (data: LoginRequest) => {
    try {
      const response = await authApi.login(data);

      if (response.success && response.token) {
        await apiClient.setToken(response.token);
        set({
          user: response.user || null,
          isAuthenticated: true,
          token: response.token,
        });
        return { success: true };
      }

      if (response.requires_verification) {
        return { success: false, message: 'Email не подтверждён. Проверьте почту.' };
      }

      if (response.requires_approval) {
        return { success: false, message: 'Аккаунт ожидает одобрения администратора.' };
      }

      return { success: false, message: response.message || 'Ошибка входа' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка входа';
      return { success: false, message };
    }
  },

  register: async (data: RegisterRequest, asClient = false) => {
    try {
      const response = asClient
        ? await authApi.registerClient(data)
        : await authApi.register(data);

      if (response.success) {
        if (response.requires_verification) {
          return { success: true, message: 'Проверьте почту для подтверждения' };
        }
        if (response.token) {
          await apiClient.setToken(response.token);
          set({
            user: response.user || null,
            isAuthenticated: true,
            token: response.token,
          });
        }
        return { success: true };
      }

      return { success: false, message: response.message || 'Ошибка регистрации' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка регистрации';
      return { success: false, message };
    }
  },

  googleLogin: async (token: string) => {
    try {
      const response = await authApi.googleLogin(token);

      if (response.success && response.token) {
        await apiClient.setToken(response.token);
        set({
          user: response.user || null,
          isAuthenticated: true,
          token: response.token,
        });
        return { success: true };
      }

      return { success: false, message: response.message || 'Ошибка входа через Google' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка входа через Google';
      return { success: false, message };
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      await apiClient.removeToken();
      set({
        user: null,
        isAuthenticated: false,
        token: null,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await apiClient.getToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const user = await authApi.getCurrentUser();
      if (user) {
        set({
          user,
          isAuthenticated: true,
          token,
          isLoading: false,
        });
      } else {
        await apiClient.removeToken();
        set({
          user: null,
          isAuthenticated: false,
          token: null,
          isLoading: false,
        });
      }
    } catch {
      await apiClient.removeToken();
      set({
        user: null,
        isAuthenticated: false,
        token: null,
        isLoading: false,
      });
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },

  verifyEmail: async (code: string) => {
    try {
      const response = await authApi.verifyEmail(code);
      if (response.success && response.token) {
        await apiClient.setToken(response.token);
        set({
          user: response.user || null,
          isAuthenticated: true,
          token: response.token,
        });
        return { success: true };
      }
      return { success: false, message: response.message || 'Неверный код' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка подтверждения';
      return { success: false, message };
    }
  },
}));
