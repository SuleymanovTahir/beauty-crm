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

  const removeStatus = async (key: string) => {
    try {
      await api.deleteClientStatus(key);

      const newStatuses = { ...statuses };
      delete newStatuses[key];
      setStatuses(newStatuses);

      toast.success('Статус удален');
      return true;
    } catch (err) {
      toast.error('Ошибка удаления статуса');
      return false;
    }
  };

  const updateStatus = async (key: string, label?: string, color?: string) => {
    try {
      await api.updateClientStatus(key, {
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

      toast.success('Статус обновлен');
      return true;
    } catch (err) {
      toast.error('Ошибка обновления статуса');
      return false;
    }
  };

  return { statuses, loading, addStatus, removeStatus, updateStatus, reload: loadStatuses };
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

  const removeStatus = async (key: string) => {
    try {
      await api.deleteBookingStatus(key);

      const newStatuses = { ...statuses };
      delete newStatuses[key];
      setStatuses(newStatuses);

      toast.success('Статус удален');
      return true;
    } catch (err) {
      toast.error('Ошибка удаления статуса');
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

      toast.success('Статус обновлен');
      return true;
    } catch (err) {
      toast.error('Ошибка обновления статуса');
      return false;
    }
  };

  return { statuses, loading, addStatus, removeStatus, updateStatus, reload: loadStatuses };
}