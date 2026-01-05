import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { formatCurrency as formatCurrencyUtil } from '../utils/currency';

interface SalonSettings {
    currency?: string;
    name?: string;
    // ... other settings
}

let cachedSettings: SalonSettings | null = null;
let settingsPromise: Promise<SalonSettings> | null = null;

/**
 * Get salon settings with caching
 */
export async function getSalonSettings(): Promise<SalonSettings> {
    if (cachedSettings) {
        return cachedSettings;
    }

    if (settingsPromise) {
        return settingsPromise;
    }

    settingsPromise = api.getPublicSalonSettings()
        .then((settings) => {
            cachedSettings = settings;
            return settings;
        })
        .catch((error) => {
            console.error('Failed to load salon settings:', error);
            return { currency: 'AED' }; // Fallback
        })
        .finally(() => {
            settingsPromise = null;
        });

    return settingsPromise;
}

/**
 * Get currency from salon settings
 */
export async function getCurrency(): Promise<string> {
    const settings = await getSalonSettings();
    return settings.currency;
}

/**
 * React hook to use salon settings
 */
export function useSalonSettings() {
    const [settings, setSettings] = useState<SalonSettings>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSalonSettings()
            .then(setSettings)
            .finally(() => setLoading(false));
    }, []);

    const currency = settings.currency;

    const formatCurrency = useCallback((amount: number | string, overrideCurrency?: string) => {
        return formatCurrencyUtil(amount, overrideCurrency || currency);
    }, [currency]);

    return { settings, loading, currency, formatCurrency };
}

/**
 * React hook to use currency
 */
export function useCurrency() {
    const { currency, loading, formatCurrency } = useSalonSettings();
    return { currency, loading, formatCurrency };
}

/**
 * Clear cached settings (useful after updating settings)
 */
export function clearSalonSettingsCache() {
    cachedSettings = null;
    settingsPromise = null;
}
