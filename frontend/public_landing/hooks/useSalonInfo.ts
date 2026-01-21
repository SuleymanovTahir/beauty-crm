/**
 * Хук для загрузки информации о салоне из публичного API
 * Используется для компонентов, которым нужна только базовая информация
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { config } from '../utils/config';
import { safeFetch } from '../utils/errorHandler';

export interface SalonInfo {
  name?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  map_url?: string;
  google_maps_embed_url?: string;
  instagram?: string;
  whatsapp?: string;
  [key: string]: any;
}

export const useSalonInfo = (initialSalonInfo?: SalonInfo | null) => {
  const { i18n } = useTranslation();
  const [salonInfo, setSalonInfo] = useState<SalonInfo | null>(initialSalonInfo || null);
  const [loading, setLoading] = useState(!initialSalonInfo);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Если данные уже предоставлены, используем их
    if (initialSalonInfo) {
      setSalonInfo(initialSalonInfo);
      setLoading(false);
      return;
    }

    // Загружаем данные из API
    const fetchSalonInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const API_URL = config.api.baseUrl;
        const res = await safeFetch(`${API_URL}/api/public/salon-info?language=${i18n.language}`);
        const data = await res.json();
        setSalonInfo(data);
      } catch (err) {
        console.error('Error loading salon info:', err);
        setError(err instanceof Error ? err : new Error('Failed to load salon info'));
      } finally {
        setLoading(false);
      }
    };

    fetchSalonInfo();
  }, [i18n.language, initialSalonInfo]);

  return {
    salonInfo,
    loading,
    error,
    // Удобные геттеры с fallback значениями из backend
    salonName: salonInfo?.name || '',
    logoUrl: salonInfo?.logo_url || '',
    phone: salonInfo?.phone || '',
    email: salonInfo?.email || '',
    address: salonInfo?.address || '',
    workingHours: salonInfo?.hours || '',
    mapUrl: salonInfo?.map_url || '',
    googleMapsEmbedUrl: salonInfo?.google_maps_embed_url || '',
    instagram: salonInfo?.instagram || '',
    whatsapp: salonInfo?.whatsapp || '',
  };
};
