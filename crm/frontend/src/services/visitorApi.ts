// /frontend/src/services/visitorApi.ts
import { api } from './api';
import { buildApiUrl } from '../api/client';

export const visitorApi = {
    async getVisitors(period: string = 'week') {
        return api.get(`/api/analytics/visitors?period=${period}`);
    },

    async getLocationBreakdown(period: string = 'week') {
        return api.get(`/api/analytics/visitors/location-breakdown?period=${period}`);
    },

    async getCountryBreakdown(period: string = 'week') {
        return api.get(`/api/analytics/visitors/country-breakdown?period=${period}`);
    },

    async getCityBreakdown(period: string = 'week') {
        return api.get(`/api/analytics/visitors/city-breakdown?period=${period}`);
    },

    async getDistanceBreakdown(period: string = 'week', maxDistance: number = 50) {
        return api.get(`/api/analytics/visitors/distance-breakdown?period=${period}&max_distance=${maxDistance}`);
    },

    async exportVisitorAnalytics(period: string = 'week') {
        // For blobs we might need to use the method in api that returns a blob or handle it effectively.
        // ApiClient returns json by default. We need to handle blob.
        // Let's use the explicit fetch for blob export or add a blob method to ApiClient.
        // For now, let's keep the explicit fetch for export to avoid breaking if ApiClient doesn't support blob.
        // But better to check ApiClient.
        const response = await fetch(
            buildApiUrl(`/api/analytics/visitors/export?period=${period}`),
            { credentials: 'include' }
        );
        if (!response.ok) throw new Error('Failed to export visitor analytics');
        return response.blob();
    },

    async getVisitorTrend(period: string = 'week') {
        return api.get(`/api/analytics/visitors/trend?period=${period}`);
    },

    async getLandingSections(period: string = 'week') {
        return api.get(`/api/analytics/visitors/landing-sections?period=${period}`);
    },

    async getPeakHours(period: string = 'week') {
        return api.get(`/api/analytics/visitors/peak-hours?period=${period}`);
    },

    /**
     * Консолидированный endpoint для получения всех данных аналитики одним запросом.
     * Поддерживает стандартные периоды и произвольные даты.
     */
    async getDashboard(period: string = 'week', maxDistance: number = 50, dateFrom?: string, dateTo?: string) {
        let url = `/api/analytics/visitors/dashboard?period=${period}&max_distance=${maxDistance}`;
        if (dateFrom && dateTo) {
            url += `&date_from=${dateFrom}&date_to=${dateTo}`;
        }

        return api.get(url);
    },

    async bulkDelete(filters: any) {
        return api.delete('/api/analytics/visitors/bulk-delete', filters);
    }
};
