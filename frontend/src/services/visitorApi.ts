// Visitor Analytics API client
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

export const visitorApi = {
    async getVisitors(period: string = 'week') {
        const response = await fetch(
            `${API_URL}/api/analytics/visitors?period=${period}`,
            { credentials: 'include' }
        );
        if (!response.ok) throw new Error('Failed to load visitors');
        return response.json();
    },

    async getLocationBreakdown(period: string = 'week') {
        const response = await fetch(
            `${API_URL}/api/analytics/visitors/location-breakdown?period=${period}`,
            { credentials: 'include' }
        );
        if (!response.ok) throw new Error('Failed to load location breakdown');
        return response.json();
    },

    async getCountryBreakdown(period: string = 'week') {
        const response = await fetch(
            `${API_URL}/api/analytics/visitors/country-breakdown?period=${period}`,
            { credentials: 'include' }
        );
        if (!response.ok) throw new Error('Failed to load country breakdown');
        return response.json();
    },

    async getCityBreakdown(period: string = 'week') {
        const response = await fetch(
            `${API_URL}/api/analytics/visitors/city-breakdown?period=${period}`,
            { credentials: 'include' }
        );
        if (!response.ok) throw new Error('Failed to load city breakdown');
        return response.json();
    },

    async getDistanceBreakdown(period: string = 'week', maxDistance: number = 50) {
        const response = await fetch(
            `${API_URL}/api/analytics/visitors/distance-breakdown?period=${period}&max_distance=${maxDistance}`,
            { credentials: 'include' }
        );
        if (!response.ok) throw new Error('Failed to load distance breakdown');
        return response.json();
    },

    async exportVisitorAnalytics(period: string = 'week') {
        const response = await fetch(
            `${API_URL}/api/analytics/visitors/export?period=${period}`,
            { credentials: 'include' }
        );
        if (!response.ok) throw new Error('Failed to export visitor analytics');
        return response.blob();
    },

    async getVisitorTrend(period: string = 'week') {
        const response = await fetch(
            `${API_URL}/api/analytics/visitors/trend?period=${period}`,
            { credentials: 'include' }
        );
        if (!response.ok) throw new Error('Failed to load visitor trend');
        return response.json();
    },

    async getLandingSections(period: string = 'week') {
        const response = await fetch(
            `${API_URL}/api/analytics/visitors/landing-sections?period=${period}`,
            { credentials: 'include' }
        );
        if (!response.ok) throw new Error('Failed to load landing sections');
        return response.json();
    },

    async getPeakHours(period: string = 'week') {
        const response = await fetch(
            `${API_URL}/api/analytics/visitors/peak-hours?period=${period}`,
            { credentials: 'include' }
        );
        if (!response.ok) throw new Error('Failed to load peak hours');
        return response.json();
    },

    /**
     * Консолидированный endpoint для получения всех данных аналитики одним запросом.
     * Поддерживает стандартные периоды и произвольные даты.
     */
    async getDashboard(period: string = 'week', maxDistance: number = 50, dateFrom?: string, dateTo?: string) {
        let url = `${API_URL}/api/analytics/visitors/dashboard?period=${period}&max_distance=${maxDistance}`;
        if (dateFrom && dateTo) {
            url += `&date_from=${dateFrom}&date_to=${dateTo}`;
        }

        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load visitor dashboard');
        return response.json();
    }
};
