import apiClient from './client';
import { Client, ClientDashboard, LoyaltyInfo } from '../types';

export const clientPortalApi = {
  getDashboard: async (): Promise<ClientDashboard> => {
    const response = await apiClient.get<ClientDashboard>('/api/client/dashboard');
    return response.data;
  },

  getProfile: async (): Promise<Client> => {
    const response = await apiClient.get<{ client: Client }>('/api/client/profile');
    return response.data.client;
  },

  updateProfile: async (data: Partial<Client>): Promise<Client> => {
    const response = await apiClient.post<{ client: Client }>('/api/client/profile', data);
    return response.data.client;
  },

  getLoyalty: async (): Promise<LoyaltyInfo> => {
    const response = await apiClient.get<LoyaltyInfo>('/api/client/loyalty');
    return response.data;
  },

  getReferralCode: async (): Promise<{ code: string; bonus: number }> => {
    const response = await apiClient.get<{ code: string; bonus: number }>(
      '/api/client/referral-code'
    );
    return response.data;
  },

  applyReferralCode: async (code: string): Promise<{ success: boolean; bonus?: number }> => {
    const response = await apiClient.post<{ success: boolean; bonus?: number }>(
      '/api/client/apply-referral',
      { code }
    );
    return response.data;
  },
};
