import apiClient from './client';
import { API_ENDPOINTS } from '@beauty-crm/shared/api';
import type { Client, ClientDashboard, LoyaltyInfo } from '@beauty-crm/shared/types';

export const clientPortalApi = {
  getDashboard: async (): Promise<ClientDashboard> => {
    const response = await apiClient.get<ClientDashboard>(API_ENDPOINTS.CLIENT_PORTAL.DASHBOARD);
    return response.data;
  },

  getProfile: async (): Promise<Client> => {
    const response = await apiClient.get<{ client: Client }>(API_ENDPOINTS.CLIENT_PORTAL.PROFILE);
    return response.data.client;
  },

  updateProfile: async (data: Partial<Client>): Promise<Client> => {
    const response = await apiClient.post<{ client: Client }>(API_ENDPOINTS.CLIENT_PORTAL.PROFILE, data);
    return response.data.client;
  },

  getLoyalty: async (): Promise<LoyaltyInfo> => {
    const response = await apiClient.get<LoyaltyInfo>(API_ENDPOINTS.CLIENT_PORTAL.LOYALTY);
    return response.data;
  },

  getReferralCode: async (): Promise<{ code: string; bonus: number }> => {
    const response = await apiClient.get<{ code: string; bonus: number }>(
      `${API_ENDPOINTS.CLIENT_PORTAL.LOYALTY}/referral-code`
    );
    return response.data;
  },

  applyReferralCode: async (code: string): Promise<{ success: boolean; bonus?: number }> => {
    const response = await apiClient.post<{ success: boolean; bonus?: number }>(
      `${API_ENDPOINTS.CLIENT_PORTAL.LOYALTY}/apply-referral`,
      { code }
    );
    return response.data;
  },
};
