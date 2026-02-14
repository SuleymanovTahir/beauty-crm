/**
 * Хук для работы с настройками салона
 * Централизованный доступ к настройкам салона
 */

import { useState, useEffect } from 'react';
import { api } from '@crm/services/api';
import { DEFAULT_VALUES } from '../utils/constants';

export interface SalonSettings {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  instagram?: string;
  map_url?: string;
  google_maps?: string;
  hours?: string;
  currency?: string;
  [key: string]: any;
}

export const useSalonSettings = () => {
  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const salonSettings = await api.getSalonSettings();
        setSettings(salonSettings);
      } catch (err) {
        console.error('Error loading salon settings:', err);
        setError(err instanceof Error ? err : new Error('Failed to load salon settings'));
        // Устанавливаем значения по умолчанию при ошибке
        setSettings({
          email: DEFAULT_VALUES.DEFAULT_EMAIL,
          currency: DEFAULT_VALUES.CURRENCY,
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    // Удобные геттеры с fallback значениями
    salonName: settings?.name || DEFAULT_VALUES.DEFAULT_SALON_NAME,
    address: settings?.address || DEFAULT_VALUES.DEFAULT_ADDRESS,
    phone: settings?.phone || DEFAULT_VALUES.DEFAULT_PHONE,
    email: settings?.email || DEFAULT_VALUES.DEFAULT_EMAIL,
    whatsapp: settings?.whatsapp || settings?.phone || DEFAULT_VALUES.DEFAULT_WHATSAPP,
    instagram: settings?.instagram || DEFAULT_VALUES.DEFAULT_INSTAGRAM,
    mapUrl: settings?.map_url || settings?.google_maps || '',
    workingHours: settings?.hours || '',
    currency: settings?.currency || DEFAULT_VALUES.CURRENCY,
    logoUrl: settings?.logo_url || '',
  };
};
