import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface StatusConfig {
  label: string;
  color: string;
}

export function useClientStatuses() {
  const { t } = useTranslation('common');

  const DEFAULT_CLIENT_STATUSES: Record<string, StatusConfig> = {
    new: { label: t('status_new'), color: 'blue' },
    active: { label: t('status_active'), color: 'green' },
    inactive: { label: t('status_inactive'), color: 'gray' },
    vip: { label: t('status_vip'), color: 'purple' },
    blocked: { label: t('status_blocked'), color: 'red' }
  };

  const [statuses, setStatuses] = useState<Record<string, StatusConfig>>(DEFAULT_CLIENT_STATUSES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      const data = await api.getClientStatuses();
      if (data.statuses) {
        // Translate status labels from backend
        const translatedStatuses: Record<string, StatusConfig> = {};
        for (const [key, config] of Object.entries(data.statuses)) {
          const statusConfig = config as StatusConfig;
          translatedStatuses[key] = {
            ...statusConfig,
            label: t(`status_${key}`) || statusConfig.label // Use translation key or fallback to backend label
          };
        }
        setStatuses(translatedStatuses);
      }
    } catch (err) {
      console.error('Error loading statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  const addStatus = async (key: string, label: string, color: string) => {
    try {
      await api.createClientStatus({
        status_key: key,
        status_label: label,
        status_color: color
      });

      setStatuses({
        ...statuses,
        [key]: { label, color }
      });

      toast.success(t('status_added'));
      return true;
    } catch (err) {
      toast.error(t('error_adding_status'));
      return false;
    }
  };

  const removeStatus = async (key: string) => {
    try {
      await api.deleteClientStatus(key);

      const newStatuses = { ...statuses };
      delete newStatuses[key];
      setStatuses(newStatuses);

      toast.success(t('status_deleted'));
      return true;
    } catch (err) {
      toast.error(t('error_deleting_status'));
      return false;
    }
  };

  const updateStatus = async (key: string, label?: string, color?: string) => {
    try {
      await api.updateClientStatus(key, label ?? statuses[key]?.label);

      setStatuses({
        ...statuses,
        [key]: {
          label: label || statuses[key].label,
          color: color || statuses[key].color
        }
      });

      toast.success(t('status_updated'));
      return true;
    } catch (err) {
      toast.error(t('error_updating_status'));
      return false;
    }
  };

  return { statuses, loading, addStatus, removeStatus, updateStatus, reload: loadStatuses };
}

export function useBookingStatuses() {
  const { t } = useTranslation('common');

  const DEFAULT_BOOKING_STATUSES: Record<string, StatusConfig> = {
    pending: { label: t('status_pending'), color: 'yellow' },
    confirmed: { label: t('status_confirmed'), color: 'green' },
    completed: { label: t('status_completed'), color: 'blue' },
    cancelled: { label: t('status_cancelled'), color: 'red' },
    no_show: { label: t('status_no_show'), color: 'orange' }
  };

  const [statuses, setStatuses] = useState<Record<string, StatusConfig>>(DEFAULT_BOOKING_STATUSES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      const data = await api.getBookingStatuses();
      if (data.statuses) {
        // Translate status labels from backend
        const translatedStatuses: Record<string, StatusConfig> = {};
        for (const [key, config] of Object.entries(data.statuses)) {
          const statusConfig = config as StatusConfig;
          translatedStatuses[key] = {
            ...statusConfig,
            label: t(`status_${key}`) || statusConfig.label // Use translation key or fallback to backend label
          };
        }
        setStatuses(translatedStatuses);
      }
    } catch (err) {
      console.error('Error loading statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  const addStatus = async (key: string, label: string, color: string) => {
    try {
      await api.createBookingStatus({
        status_key: key,
        status_label: label,
        status_color: color
      });

      setStatuses({
        ...statuses,
        [key]: { label, color }
      });

      toast.success(t('status_added'));
      return true;
    } catch (err) {
      toast.error(t('error_adding_status'));
      return false;
    }
  };

  const removeStatus = async (key: string) => {
    try {
      await api.updateBookingStatus(key, {});

      const newStatuses = { ...statuses };
      delete newStatuses[key];
      setStatuses(newStatuses);

      toast.success(t('status_deleted'));
      return true;
    } catch (err) {
      toast.error(t('error_deleting_status'));
      return false;
    }
  };

  const updateStatus = async (key: string, label?: string, color?: string) => {
    try {
      await api.updateBookingStatus(key, {
        status_label: label,
        status_color: color
      });

      setStatuses({
        ...statuses,
        [key]: {
          label: label || statuses[key].label,
          color: color || statuses[key].color
        }
      });

      toast.success(t('status_updated'));
      return true;
    } catch (err) {
      toast.error(t('error_updating_status'));
      return false;
    }
  };

  return { statuses, loading, addStatus, removeStatus, updateStatus, reload: loadStatuses };
}