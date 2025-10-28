import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DEFAULT_CLIENT_STATUSES, DEFAULT_BOOKING_STATUSES, StatusConfig } from '../config/statuses';
import { toast } from 'sonner';

export function useClientStatuses() {
  const [statuses, setStatuses] = useState<Record<string, StatusConfig>>(DEFAULT_CLIENT_STATUSES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      const data = await api.getClientStatuses();
      if (data.statuses) {
        setStatuses(data.statuses);
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

      toast.success('Статус добавлен');
      return true;
    } catch (err) {
      toast.error('Ошибка добавления статуса');
      return false;
    }
  };

  return { statuses, loading, addStatus, reload: loadStatuses };
}

export function useBookingStatuses() {
  const [statuses, setStatuses] = useState<Record<string, StatusConfig>>(DEFAULT_BOOKING_STATUSES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      const data = await api.getBookingStatuses();
      if (data.statuses) {
        setStatuses(data.statuses);
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

      toast.success('Статус добавлен');
      return true;
    } catch (err) {
      toast.error('Ошибка добавления статуса');
      return false;
    }
  };

  return { statuses, loading, addStatus, reload: loadStatuses };
}