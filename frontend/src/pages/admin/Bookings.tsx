// /frontend/src/pages/admin/Bookings.tsx
// frontend/src/pages/admin/Bookings.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Search, MessageSquare, Eye, Loader, RefreshCw, AlertCircle, Plus, Upload, Edit, Instagram, Send, Trash2, Clock, CheckCircle2, CalendarDays, DollarSign, ChevronDown, Users, AlertTriangle, X, FileText, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { ExportDropdown } from '../../components/shared/ExportDropdown';
import { StatusSelect } from '../../components/shared/StatusSelect';
import { SourceSelect } from '../../components/shared/SourceSelect';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Button } from '../../components/ui/button';
import { useBookingStatuses } from '../../hooks/useStatuses';
import { useCurrency } from '../../hooks/useSalonSettings';

import { getDynamicAvatar } from '../../utils/avatarUtils';
import { Pagination } from '../../components/shared/Pagination';
import './Bookings.css';



const api = {
  baseURL: import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? `${window.location.protocol}//${window.location.hostname}:8000` : window.location.origin),

  async getBookings(params: any = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.status && params.status !== 'all') searchParams.append('status', params.status);
    if (params.master && params.master !== 'all') searchParams.append('master', params.master);
    if (params.dateFrom) searchParams.append('date_from', params.dateFrom);
    if (params.dateTo) searchParams.append('date_to', params.dateTo);
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.order) searchParams.append('order', params.order);

    const res = await fetch(`${this.baseURL}/api/bookings?${searchParams.toString()}`, { credentials: 'include' });
    return res.json();
  },

  async getClients() {
    const res = await fetch(`${this.baseURL}/api/clients`, { credentials: 'include' });
    return res.json();
  },

  async getServices() {
    const res = await fetch(`${this.baseURL}/api/services`, { credentials: 'include' });
    return res.json();
  },

  async updateBooking(id: number, data: any) {
    const res = await fetch(`${this.baseURL}/api/bookings/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('update_failed');
    return res.json();
  },

  async exportBookings(format: string, dateFrom?: string, dateTo?: string) {
    let url = `${this.baseURL}/api/export/bookings?format=${format}`;
    if (dateFrom && dateTo) {
      url += `&date_from=${dateFrom}&date_to=${dateTo}`;
    }
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('export_failed');
    return res.blob();
  },

  async importBookings(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${this.baseURL}/api/import/bookings`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!res.ok) throw new Error('import_failed');
    return res.json();
  },

  async downloadImportTemplate(format: 'csv' | 'excel') {
    const res = await fetch(`${this.baseURL}/api/import/bookings/template?format=${format}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('template_download_failed');
    return res.blob();
  },

  async deleteBooking(id: number) {
    const res = await fetch(`${this.baseURL}/api/bookings/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('delete_failed');
    return res.json();
  },

  async getUsers() {
    const res = await fetch(`${this.baseURL}/api/users`, { credentials: 'include' });
    return res.json();
  },

  async createBooking(data: any) {
    const res = await fetch(`${this.baseURL}/api/bookings`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateBookingStatus(id: number, status: string) {
    const res = await fetch(`${this.baseURL}/api/bookings/${id}/status`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async getEmployeesForService(serviceId: number) {
    const res = await fetch(`${this.baseURL}/api/services/${serviceId}/employees`, {
      credentials: 'include'
    });
    return res.json();
  },

  async getEmployeeBusySlots(employeeId: number, date: string) {
    const res = await fetch(`${this.baseURL}/api/employees/${employeeId}/busy-slots?date=${date}`, {
      credentials: 'include'
    });
    return res.json();
  },


  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};


export default function Bookings() {
  const navigate = useNavigate();
  const { statuses: statusConfig } = useBookingStatuses();
  const statusConfigArray = useMemo(() =>
    Object.entries(statusConfig).map(([value, config]) => ({
      value,
      label: config.label,
      color: config.color,
      bgColor: `bg-${config.color}-100`,
      textColor: `text-${config.color}-700`
    })),
    [statusConfig]
  );
  const { currency } = useCurrency();
  const [bookings, setBookings] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const { t, i18n } = useTranslation(['admin/bookings', 'admin/services', 'common', 'public_landing']);
  const [services, setServices] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    // Load saved filter from localStorage
    return localStorage.getItem('bookings_status_filter') || 'all';
  });
  const [masterFilter, setMasterFilter] = useState(() => {
    return localStorage.getItem('bookings_master_filter') || 'all';
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    total: 0,
    revenue: 0
  });

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [masters, setMasters] = useState<any[]>([]);
  const currentUser = useMemo(() => api.getCurrentUser(), []);
  const isEmployee = currentUser?.role === 'employee';
  const isSales = currentUser?.role === 'sales';
  const isAdmin = currentUser?.role === 'admin';
  const isDirector = currentUser?.role === 'director';
  const canEdit = isDirector || isAdmin || isSales;
  const canDelete = isDirector;

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [addingBooking, setAddingBooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);

  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);

  // Smart filtering states
  const [filteredMasters, setFilteredMasters] = useState<any[]>([]);
  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(false);

  const [addForm, setAddForm] = useState({
    phone: '',
    date: '',
    time: '',
    revenue: 0,
    master: '',
    status: 'confirmed', // Default status
    source: 'manual'
  });

  // Export states
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');

  // Import states
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const [period, setPeriod] = useState(() => {
    // Load saved period filter from localStorage
    return localStorage.getItem('bookings_period_filter') || 'all';
  });
  const [dateFrom, setDateFrom] = useState(() => {
    return localStorage.getItem('bookings_date_from') || '';
  });
  const [dateTo, setDateTo] = useState(() => {
    return localStorage.getItem('bookings_date_to') || '';
  });

  // Sorting states
  const [sortField, setSortField] = useState<'name' | 'service_name' | 'datetime' | 'revenue' | 'source' | 'created_at'>('datetime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadData();
  }, [itemsPerPage, currentPage, searchTerm, statusFilter, masterFilter, period, dateFrom, dateTo, sortField, sortDirection]);



  useEffect(() => {
    // Client-side filtering removed in favor of Server-side
    // Just update filteredBookings when bookings change (which are already filtered from server)
    setFilteredBookings(bookings);
  }, [bookings]);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('bookings_status_filter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('bookings_master_filter', masterFilter);
  }, [masterFilter]);

  useEffect(() => {
    localStorage.setItem('bookings_period_filter', period);
  }, [period]);

  useEffect(() => {
    if (dateFrom) localStorage.setItem('bookings_date_from', dateFrom);
  }, [dateFrom]);

  useEffect(() => {
    if (dateTo) localStorage.setItem('bookings_date_to', dateTo);
  }, [dateTo]);

  // Handle sorting
  const handleSort = (field: 'name' | 'service_name' | 'datetime' | 'revenue' | 'source' | 'created_at') => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Smart filtering: load masters when service is selected
  useEffect(() => {
    const loadFilteredMasters = async () => {
      if (selectedService) {
        try {
          setLoadingMasters(true);
          const data = await api.getEmployeesForService(selectedService.id);
          setFilteredMasters(data.employees || []);
        } catch (err) {
          console.error('Error loading filtered masters:', err);
          toast.error(t('bookings:error_loading_masters'));
          setFilteredMasters(masters); // Fallback to all masters
        } finally {
          setLoadingMasters(false);
        }
      } else {
        setFilteredMasters(masters); // No service selected, show all
      }
    };

    loadFilteredMasters();
  }, [selectedService, masters]);

  // Load busy slots when master and date are selected
  useEffect(() => {
    const loadBusySlots = async () => {
      if (addForm.master && addForm.date) {
        try {
          // Find master ID by name
          const master = masters.find((m: any) => m.full_name === addForm.master);
          if (master) {
            const data = await api.getEmployeeBusySlots(master.id, addForm.date);
            setBusySlots(data.busy_slots || []);
          }
        } catch (err) {
          console.error('Error loading busy slots:', err);
          setBusySlots([]);
        }
      } else {
        setBusySlots([]);
      }
    };

    loadBusySlots();
  }, [addForm.master, addForm.date, masters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 [Bookings] Загрузка данных (Server-Side)...');

      // Calculate dates based on period
      let queryDateFrom = dateFrom;
      let queryDateTo = dateTo;

      const now = new Date();
      if (period === 'today') {
        queryDateFrom = now.toISOString().split('T')[0];
        queryDateTo = now.toISOString().split('T')[0]; // backend filter expects simple date or datetime? 
        // get_filtered_bookings conditions: datetime >= %s
        // If I pass '2025-01-12', it matches >= 2025-01-12 00:00:00.
        // But <= '2025-01-12' matches <= 2025-01-12 00:00:00.
        // So for "Today" we need to handle full day range.
        // Ideally backend handles 'YYYY-MM-DD' as full day.
        // But current backend 'datetime >= %s' is strict string comparison if string passed, or datetime type.
        // Let's rely on standard ISO string for now or use 23:59:59.

        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        queryDateTo = tomorrow.toISOString().split('T')[0]; // < Tomorrow
      } else if (period === '7') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        queryDateFrom = d.toISOString().split('T')[0];
      } else if (period === '30') {
        const d = new Date(); d.setDate(d.getDate() - 30);
        queryDateFrom = d.toISOString().split('T')[0];
      }

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter,
        master: masterFilter,
        dateFrom: queryDateFrom,
        dateTo: queryDateTo,
        sort: sortField,
        order: sortDirection
      };

      // Параллельная загрузка
      const [bookingsData, clientsData, servicesData, usersData] = await Promise.all([
        api.getBookings(params).catch(err => {
          console.error('❌ [Bookings] Ошибка загрузки bookings:', err);
          throw new Error(`getBookings() failed: ${err.message}`);
        }),
        api.getClients().catch(_ => {
          // Keep creating errors
          return { clients: [] };
        }),
        api.getServices().catch(_ => []),
        (async () => {
          try { return await api.getUsers(); } catch { return { users: [] }; }
        })()
      ]);

      console.log('✅ [Bookings] Данные загружены!');

      setBookings(bookingsData.bookings || []);
      setTotalItems(bookingsData.total || 0);
      setTotalPages(Math.ceil((bookingsData.total || 0) / itemsPerPage));
      if (bookingsData.stats) {
        setStats(bookingsData.stats);
      }

      setClients(clientsData.clients || []);
      setServices(servicesData.services || []);
      const allUsers = Array.isArray(usersData) ? usersData : (usersData.users || []);
      setMasters(allUsers.filter((u: any) =>
        ['employee', 'manager', 'admin', 'director'].includes(u.role)
      ) || []);

    } catch (err: any) {
      console.error('❌ [Bookings] Критическая ошибка:', err);
      setError(err.message);
      toast.error(`${t('common:error_loading_data')}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.updateBookingStatus(id, newStatus);
      setBookings((prevBookings: any[]) =>
        prevBookings.map((b: any) => b.id === id ? { ...b, status: newStatus } : b)
      );
      toast.success(t('bookings:status_updated'));
    } catch (err) {
      toast.error(t('bookings:error_updating_status'));
    }
  };

  const handleSourceChange = async (id: number, newSource: string) => {
    // 1. Optimistic Update
    setBookings((prevBookings: any[]) =>
      prevBookings.map((b: any) => b.id === id ? { ...b, source: newSource } : b)
    );

    try {
      await api.updateBooking(id, { source: newSource });
      toast.success(t('bookings:source_updated', 'Источник обновлен'));
    } catch (err) {
      // Refresh to sync if failed
      await loadData();
      toast.error(t('bookings:error_updating_source', 'Ошибка обновления источника'));
    }
  };

  const handleAddBooking = async () => {
    if (!selectedClient || !selectedService || !addForm.date || !addForm.time) {
      toast.error(t('bookings:fill_all_required_fields'));
      return;
    }

    try {
      setAddingBooking(true);

      const bookingData = {
        instagram_id: selectedClient.instagram_id,
        name: selectedClient.display_name,
        phone: addForm.phone || selectedClient.phone || '',
        service: selectedService.name || selectedService.name_ru, // Store base name
        date: addForm.date,
        time: addForm.time,
        revenue: addForm.revenue || selectedService.price,
        master: addForm.master,
        source: addForm.source,
      };

      if (editingBooking) {
        // Редактируем существующую запись
        await api.updateBooking(editingBooking.id, bookingData);
        toast.success(t('bookings:booking_updated'));
      } else {
        // Создаем новую запись
        await api.createBooking(bookingData);
        toast.success(t('bookings:booking_created'));
      }

      setShowAddDialog(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      toast.error(`❌ ${t('bookings:error')}: ${err.message}`);
    } finally {
      setAddingBooking(false);
    }
  };

  const handleDeleteBooking = async (id: number, name: string) => {
    if (!window.confirm(t('bookings:delete_booking_confirm', { name }))) {
      return;
    }

    try {
      await api.deleteBooking(id);
      toast.success(t('bookings:booking_deleted'));
      loadData(); // Refresh the list
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.message || t('bookings:delete_booking_error'));
    }
  };

  const handleEditBooking = (booking: any) => {
    // Находим клиента и сервис
    const client = clients.find(c => c.instagram_id === booking.client_id);
    const service = services.find(s => s.name_ru === booking.service || s.name === booking.service);

    // Устанавливаем состояние редактирования
    setEditingBooking(booking);
    setSelectedClient(client);
    setSelectedService(service);

    // Парсим дату и время из datetime
    const datetime = new Date(booking.datetime);
    const date = datetime.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = datetime.toTimeString().slice(0, 5); // HH:MM

    // Заполняем форму
    setAddForm({
      phone: booking.phone || '',
      date: date,
      time: time,
      revenue: booking.revenue || 0,
      master: booking.master || '',
      status: booking.status || 'confirmed',
      source: booking.source || 'manual'
    });

    // Открываем диалог
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setClientSearch('');
    setServiceSearch('');
    setSelectedClient(null);
    setSelectedService(null);
    setAddForm({ phone: '', date: '', time: '', revenue: 0, master: '', status: 'confirmed', source: 'manual' });
    setEditingBooking(null);
  };

  const filteredClients = clients.filter((c: any) =>
    (c.display_name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone || '').includes(clientSearch)
  );

  const filteredServices = services.filter((s: any) =>
    (s.name_ru || '').toLowerCase().includes(serviceSearch.toLowerCase()) ||
    (s.name || '').toLowerCase().includes(serviceSearch.toLowerCase())
  );


  // ===== EXPORT HANDLERS =====
  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      setExporting(true);
      const blob = await api.exportBookings(format, exportDateFrom, exportDateTo);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const ext = format === 'excel' ? 'xlsx' : format;
      const dateRange = exportDateFrom && exportDateTo ? `_${exportDateFrom}_${exportDateTo}` : '';
      link.download = `bookings${dateRange}.${ext}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t('bookings:file_downloaded', { format: format.toUpperCase() }));
      setShowExportDialog(false);
    } catch (err) {
      toast.error(t('bookings:error_exporting'));
    } finally {
      setExporting(false);
    }
  };

  // ===== IMPORT HANDLERS =====
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
        toast.error(t('bookings:only_csv_and_excel_files_supported'));
        return;
      }
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error(t('bookings:select_file_for_import'));
      return;
    }

    try {
      setImporting(true);
      const result = await api.importBookings(importFile);

      setImportResult(result);

      if (result.imported > 0) {
        toast.success(t('bookings:imported_bookings', { count: result.imported }));
        await loadData();
      }

      if (result.skipped > 0) {
        toast.warning(t('bookings:skipped_bookings', { count: result.skipped }));
      }
    } catch (err: any) {
      toast.error(t('bookings:import_error', { message: err.message }));
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async (format: 'csv' | 'excel') => {
    try {
      const blob = await api.downloadImportTemplate(format);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bookings_template.${format === 'excel' ? 'xlsx' : 'csv'}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t('bookings:template_downloaded'));
    } catch (err) {
      toast.error(t('bookings:error_downloading_template'));
    }
  };

  // Stats are now loaded from server
  // const stats = ... (removed client-side calculation)

  if (loading) {
    return (
      <div className="modal-overlay">
        <Loader className="bookings-refresh-icon animate-spin loader-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bookings-container">
        <div className="info-box bg-error">
          <AlertCircle className="icon-error" />
          <p className="text-error mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bookings-container">
      <div className="bookings-header">
        <div className="bookings-title-group">
          <h1 className="bookings-title">
            <div className="bookings-title-icon-wrapper">
              <Calendar className="bookings-title-icon" />
            </div>
            {t('bookings:title')}
          </h1>
          <p className="bookings-count-label">
            <span className="bookings-count-dot" />
            {totalItems} {t('bookings:records_count')}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bookings-refresh-button"
        >
          <RefreshCw className={`bookings-refresh-icon ${refreshing ? 'animate-spin' : ''}`} />
          {t('bookings:refresh')}
        </button>
      </div>

      {/* Stats */}
      <div className="bookings-stats-grid">
        <div className="bookings-stat-card">
          <div className="bookings-stat-main">
            <div className="bookings-stat-info">
              <p className="bookings-stat-label">{t('bookings:pending')}</p>
              <h3 className="bookings-stat-value">{stats.pending}</h3>
              <p className="bookings-stat-period">
                {period === 'all' ? t('common:all_time') :
                  period === 'today' ? t('common:for_today') :
                    period === 'custom' ? `${dateFrom} - ${dateTo}` :
                      t('common:for_period', { days: period })}
              </p>
            </div>
            <div className="bookings-stat-icon-wrapper stat-yellow">
              <Clock className="bookings-stat-icon" />
            </div>
          </div>
        </div>
        <div className="bookings-stat-card">
          <div className="bookings-stat-main">
            <div className="bookings-stat-info">
              <p className="bookings-stat-label">{t('bookings:completed')}</p>
              <h3 className="bookings-stat-value">{stats.completed}</h3>
              <p className="bookings-stat-period">
                {period === 'all' ? t('common:all_time') :
                  period === 'today' ? t('common:for_today') :
                    period === 'custom' ? `${dateFrom} - ${dateTo}` :
                      t('common:for_period', { days: period })}
              </p>
            </div>
            <div className="bookings-stat-icon-wrapper stat-green">
              <CheckCircle2 className="bookings-stat-icon" />
            </div>
          </div>
        </div>
        <div className="bookings-stat-card">
          <div className="bookings-stat-main">
            <div className="bookings-stat-info">
              <p className="bookings-stat-label">{t('bookings:total')}</p>
              <h3 className="bookings-stat-value">{stats.total}</h3>
              <p className="bookings-stat-period">
                {period === 'all' ? t('common:all_time') :
                  period === 'today' ? t('common:for_today') :
                    period === 'custom' ? `${dateFrom} - ${dateTo}` :
                      t('common:for_period', { days: period })}
              </p>
            </div>
            <div className="bookings-stat-icon-wrapper stat-blue">
              <CalendarDays className="bookings-stat-icon" />
            </div>
          </div>
        </div>
        <div className="bookings-stat-card">
          <div className="bookings-stat-main">
            <div className="bookings-stat-info">
              <p className="bookings-stat-label">{t('bookings:revenue')}</p>
              <h3 className="bookings-stat-value">{stats.revenue} {t('bookings:currency')}</h3>
              <p className="bookings-stat-period">
                {period === 'all' ? t('common:all_time') :
                  period === 'today' ? t('common:for_today') :
                    period === 'custom' ? `${dateFrom} - ${dateTo}` :
                      t('common:for_period', { days: period })}
              </p>
            </div>
            <div className="bookings-stat-icon-wrapper stat-emerald">
              <DollarSign className="bookings-stat-icon" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="bookings-filter-bar">
        <div className="bookings-filter-row">
          {/* Row 1: Search */}
          <div className="bookings-search-wrapper">
            <Search className="bookings-search-icon" />
            <input
              type="text"
              placeholder={t('bookings:search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bookings-search-input"
            />
          </div>

          {/* Row 2: Control Bar */}
          <div className="bookings-controls">
            {!isEmployee && (
              <button
                onClick={() => setShowAddDialog(true)}
                className="bookings-control-button bookings-add-button"
              >
                <Plus className="w-4 h-4" />
                <span>{t('bookings:add')}</span>
              </button>
            )}

            <button
              onClick={() => {
                setShowFilters(!showFilters);
                if (!showFilters) setShowActions(false);
              }}
              className={`bookings-control-button bookings-outline-button ${showFilters ? 'bookings-outline-button-active-pink' : ''}`}
            >
              <Users className={`w-4 h-4 ${showFilters ? 'text-pink-500' : 'text-gray-400'}`} />
              <span className="truncate">{t('bookings:filters')}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {!isEmployee && (
              <button
                onClick={() => {
                  setShowActions(!showActions);
                  if (!showActions) setShowFilters(false);
                }}
                className={`bookings-control-button bookings-outline-button ${showActions ? 'bookings-outline-button-active-blue' : ''}`}
              >
                <Upload className={`w-4 h-4 ${showActions ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="truncate">{t('bookings:options')}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showActions ? 'rotate-180' : ''}`} />
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bookings-refresh-button btn-square"
            >
              <RefreshCw className={`bookings-refresh-icon ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Expandable Section: Actions (Import/Export) */}
          {showActions && !isEmployee && (
            <div className="pt-4 border-t border-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowImportDialog(true)}
                  disabled={importing}
                  className="bookings-control-button bookings-outline-button"
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span>{t('bookings:import')}</span>
                </button>

                <div className="w-full">
                  <ExportDropdown
                    onExport={handleExport}
                    loading={exporting}
                    disabled={exporting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Expandable Section: ONLY Filters */}
          {showFilters && (
            <div className="pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Status Filter */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('bookings:status')}</span>
                  <StatusSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusConfig}
                    allowAdd={false}
                    showAllOption={true}
                    variant="filter"
                  />
                </div>

                {/* Master Filter - Hidden for employees */}
                {!isEmployee && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('bookings:master')}</span>
                    <div className="relative">
                      <select
                        value={masterFilter}
                        onChange={(e) => setMasterFilter(e.target.value)}
                        className="w-full h-[42px] px-4 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500/10 transition-all bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2716%27%20height=%2716%27%20viewBox=%270%200%2016%2016%27%3E%3Cpath%20fill=%27%239ca3af%27%20d=%27M4%206l4%204%204-4z%27/%3E%3C/svg%3E')] bg-[length:14px_14px] bg-[right_0.75rem_center] bg-no-repeat pr-10 shadow-sm text-gray-700 hover:bg-gray-50"
                      >
                        <option value="all">{t('bookings:all_masters')}</option>
                        {masters.map((m: any) => (
                          <option key={m.id} value={m.full_name || m.username}>{m.full_name || m.username}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Period Filter */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('bookings:period')}</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-[42px] justify-between border-gray-200 rounded-xl font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <CalendarDays className="w-4 h-4 text-pink-500 shrink-0" />
                          <span className="truncate">
                            {period === 'all' ? t('common:all_time') :
                              period === 'today' ? t('common:today') :
                                period === '7' ? t('common:last_7_days') :
                                  period === '14' ? t('common:last_14_days') :
                                    period === '30' ? t('common:last_month') :
                                      period === '90' ? t('common:last_3_months') :
                                        period === 'custom' ? (dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : t('common:custom_period')) :
                                          `За ${period} дней`}
                          </span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3 rounded-2xl shadow-xl border-gray-100" align="start">
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-1.5">
                          {[
                            { id: 'all', label: t('common:all_time') },
                            { id: 'today', label: t('common:today') },
                            { id: '7', label: t('common:last_7_days') },
                            { id: '14', label: t('common:last_14_days') },
                            { id: '30', label: t('common:last_month') },
                            { id: '90', label: t('common:last_3_months') }
                          ].map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => setPeriod(opt.id)}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${period === opt.id ? 'bg-pink-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                            >
                              <span>{opt.label}</span>
                              {period === opt.id && <CalendarDays className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>

                        <div className="border-t border-gray-100 pt-3">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{t('common:custom_period')}</p>
                          <div className="grid grid-cols-1 gap-2">
                            <input
                              type="date"
                              value={dateFrom}
                              onChange={e => {
                                setDateFrom(e.target.value);
                                setPeriod('custom');
                              }}
                              className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all"
                            />
                            <input
                              type="date"
                              value={dateTo}
                              onChange={e => {
                                setDateTo(e.target.value);
                                setPeriod('custom');
                              }}
                              className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
        </div>


      </div>

      {/* Table */}
      <div className="bookings-table-container">
        {filteredBookings.length > 0 ? (
          <div className="bookings-table-wrapper">
            <table className="bookings-table">
              <thead className="bookings-thead">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="bookings-th"
                  >
                    {t('bookings:client')} {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('service_name')}
                    className="bookings-th"
                  >
                    {t('bookings:service')} {sortField === 'service_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('datetime')}
                    className="bookings-th"
                  >
                    {t('bookings:date')} {sortField === 'datetime' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="bookings-th">
                    {t('bookings:master')}
                  </th>
                  <th
                    onClick={() => handleSort('source')}
                    className="bookings-th"
                  >
                    {t('bookings:source.title')} {sortField === 'source' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('revenue')}
                    className="bookings-th"
                  >
                    {t('bookings:amount')} {sortField === 'revenue' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="bookings-th">{t('bookings:phone')}</th>
                  <th className="bookings-th">{t('bookings:status')}</th>
                  <th className="bookings-th">{t('bookings:actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((booking: any) => (
                    <tr key={booking.id} className="bookings-tr">
                      <td className="bookings-td">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const client = clients.find(c => c.id === booking.client_id);
                            const profilePic = client?.profile_pic;
                            const clientName = booking.name || 'N';

                            return (
                              <>
                                {profilePic && profilePic.trim() !== '' ? (
                                  <img
                                    src={`/api/proxy/image?url=${encodeURIComponent(profilePic)}`}
                                    alt={clientName}
                                    className="avatar-circle"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'block';
                                    }}
                                  />
                                ) : null}
                                <img
                                  src={getDynamicAvatar(clientName, 'cold', client?.gender)}
                                  alt={clientName}
                                  className={`avatar-circle ${profilePic && profilePic.trim() !== '' ? 'hidden' : 'avatar-fallback'}`}
                                  style={{ display: profilePic && profilePic.trim() !== '' ? 'none' : 'block' }}
                                />
                              </>
                            );
                          })()}
                          <div className="flex flex-col gap-1 text-left">
                            <span className="font-medium text-gray-900">{booking.name || t('bookings:no_name')}</span>
                            {booking.messengers && booking.messengers.length > 0 && (
                              <div className="flex gap-1">
                                {booking.messengers.map((messenger: string) => (
                                  <div
                                    key={messenger}
                                    className={`messenger-icon-wrapper ${messenger === 'instagram' ? 'messenger-instagram' :
                                      messenger === 'telegram' ? 'messenger-telegram' :
                                        messenger === 'whatsapp' ? 'messenger-whatsapp' :
                                          'messenger-default'
                                      }`}
                                    title={messenger}
                                  >
                                    {messenger === 'instagram' && <Instagram size={12} color="white" />}
                                    {messenger === 'telegram' && <Send size={12} color="white" />}
                                    {messenger === 'whatsapp' && <MessageSquare size={12} color="white" />}
                                    {!['instagram', 'telegram', 'whatsapp'].includes(messenger) && <MessageSquare size={12} color="white" />}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="bookings-td">
                        {(() => {
                          const serviceName = booking.service_name || '-';
                          const service = services.find(s => s.name === serviceName || s.service_key === serviceName || s.name_ru === serviceName);
                          if (service) {
                            return (i18n.language.startsWith('ru') && service.name_ru) ? service.name_ru : service.name;
                          }
                          const translated = t(`admin/services:${serviceName}`, '');
                          if (translated && translated !== serviceName) return translated;
                          return serviceName;
                        })()}
                      </td>
                      <td className="bookings-td whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span className="font-medium">{new Date(booking.datetime).toLocaleDateString('ru-RU')}</span>
                          <span className="text-xs text-gray-500">{new Date(booking.datetime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="bookings-td">
                        {(() => {
                          const m = masters.find(m =>
                            (m.username && booking.master && m.username.toLowerCase() === booking.master.toLowerCase()) ||
                            (m.full_name && booking.master && m.full_name.toLowerCase() === booking.master.toLowerCase()) ||
                            (m.full_name_ru && booking.master && m.full_name_ru.toLowerCase() === booking.master.toLowerCase())
                          );
                          const name = (i18n.language.startsWith('ru') && m?.full_name_ru) ? m.full_name_ru : (m?.full_name || booking.master || '-');
                          return (
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{name}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="bookings-td">
                        {canEdit ? (
                          <SourceSelect
                            value={booking.source}
                            onChange={(newSource) => handleSourceChange(booking.id, newSource)}
                          />
                        ) : (
                          <span className="text-gray-700">{t(`bookings:source.${booking.source}`) || booking.source || '-'}</span>
                        )}
                      </td>
                      <td className="bookings-td font-semibold whitespace-nowrap">
                        {(() => {
                          if (booking.revenue) {
                            return `${booking.revenue} ${currency}`;
                          }
                          const service = services.find(s => s.name === booking.service || s.name_ru === booking.service);
                          return service?.price ? `${service.price} ${currency}` : '-';
                        })()}
                      </td>
                      <td className="bookings-td whitespace-nowrap">{booking.phone || '-'}</td>
                      <td className="bookings-td">
                        {canEdit ? (
                          <StatusSelect
                            value={booking.status}
                            onChange={(newStatus) => handleStatusChange(booking.id, newStatus)}
                            options={statusConfig}
                          />
                        ) : (
                          <span className="bookings-badge" style={{
                            '--badge-bg': statusConfigArray.find((s: any) => s.value === booking.status)?.bgColor || '#f3f4f6',
                            '--badge-color': statusConfigArray.find((s: any) => s.value === booking.status)?.textColor || '#374151'
                          } as React.CSSProperties}>
                            {statusConfigArray.find((s: any) => s.value === booking.status)?.label || booking.status}
                          </span>
                        )}
                      </td>
                      <td className="bookings-td">
                        <div className="action-button-group">
                          <button
                            onClick={() => navigate(`/crm/bookings/${booking.id}`)}
                            className="action-button"
                            title={t('bookings:view')}
                          >
                            <Eye className="icon-16 icon-gray" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleEditBooking(booking)}
                              className="action-button"
                              title={t('bookings:edit')}
                            >
                              <Edit className="icon-16 icon-blue" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const messenger = booking.messengers && booking.messengers.length > 0
                                ? booking.messengers[0]
                                : 'instagram';
                              navigate(`/crm/chat?client_id=${booking.client_id}&messenger=${messenger}`);
                            }}
                            className="action-button"
                            title={t('bookings:chat')}
                          >
                            <MessageSquare className="icon-16 icon-emerald" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteBooking(booking.id, booking.name)}
                              className="action-button action-button-red"
                              title={t('bookings:delete')}
                            >
                              <Trash2 className="icon-16 icon-red" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Pagination */}
            {filteredBookings.length > 0 && (
              <div className="border-t border-gray-200 bg-white">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(newSize) => {
                    setItemsPerPage(newSize);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <Calendar className="empty-state-icon" />
            <p className="no-bookings-text">{t('bookings:no_bookings')}</p>
          </div>
        )}
      </div>

      {/* Add Booking Dialog - (existing code remains the same) */}

      {/* ===== IMPORT DIALOG ===== */}
      {showImportDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{t('bookings:import_title')}</h3>
              <button className="modal-close" onClick={() => { setShowImportDialog(false); setImportFile(null); setImportResult(null); }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Info Alert */}
              <div className="info-box">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-800 shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-bold mb-2">{t('bookings:file_format')}:</p>
                    <ul className="ml-4 list-disc space-y-1">
                      <li>{t('bookings:columns')}: {t('bookings:columns_description')}</li>
                      <li>{t('bookings:date_format')}: YYYY-MM-DD HH:MM ({t('bookings:example')}: 2026-01-15 14:00)</li>
                      <li>{t('bookings:supported_formats')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Template Download */}
              <div className="mb-6">
                <p className="input-label">{t('bookings:download_template')}:</p>
                <div className="flex gap-2">
                  <button onClick={() => handleDownloadTemplate('csv')} className="btn-secondary text-sm flex items-center gap-2">
                    <FileText size={16} /> {t('bookings:csv_template')}
                  </button>
                  <button onClick={() => handleDownloadTemplate('excel')} className="btn-secondary text-sm flex items-center gap-2">
                    <BarChart3 size={16} /> {t('bookings:excel_template')}
                  </button>
                </div>
              </div>

              {/* File Input */}
              <div className="mb-6">
                <label className="input-label">{t('bookings:select_file')} *</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImportFileSelect}
                  className="input-field file-input-dashed"
                />
                {importFile && (
                  <p className="text-xs text-green-600 mt-2">✓ {t('bookings:selected_file', { name: importFile.name })}</p>
                )}
              </div>

              {/* Import Result */}
              {importResult && (
                <div className={`info-box ${importResult.imported > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="font-bold mb-2">{t('bookings:import_results')}:</p>
                  <ul className="text-sm ml-4 space-y-1">
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600" /> {t('bookings:imported')}: {importResult.imported}
                    </li>
                    <li className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      {t('bookings:skipped')}: {importResult.skipped}
                    </li>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <li className="text-red-800 mt-2">
                        {t('bookings:errors')}: {importResult.errors.slice(0, 3).join('; ')}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => { setShowImportDialog(false); setImportFile(null); setImportResult(null); }}
                disabled={importing}
              >
                {importResult ? t('bookings:close') : t('bookings:cancel')}
              </button>
              {!importResult && (
                <button
                  className="btn-primary"
                  onClick={handleImport}
                  disabled={importing || !importFile}
                >
                  {importing ? t('bookings:importing') : t('bookings:import')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== EXPORT DIALOG ===== */}
      {showExportDialog && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm">
            <div className="modal-header">
              <h3 className="modal-title">{t('bookings:export_title')}</h3>
              <button className="modal-close" onClick={() => setShowExportDialog(false)}>×</button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="input-label">{t('bookings:export_period')}</label>
                <p className="text-xs text-gray-500 mb-2">{t('bookings:export_period_description')}</p>
              </div>
              <div>
                <label className="input-label">{t('bookings:export_date_from')}</label>
                <input
                  type="date"
                  value={exportDateFrom}
                  onChange={(e) => setExportDateFrom(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">{t('bookings:export_date_to')}</label>
                <input
                  type="date"
                  value={exportDateTo}
                  onChange={(e) => setExportDateTo(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="pt-4 border-t border-gray-100">
                <label className="input-label mb-3">{t('bookings:export_file_format')}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={exporting}
                    className="btn-primary btn-export"
                  >
                    {t('bookings:csv')}
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={exporting}
                    className="btn-primary btn-export"
                  >
                    {t('bookings:pdf')}
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    disabled={exporting}
                    className="btn-primary btn-export"
                  >
                    {t('bookings:excel')}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer justify-end">
              <button
                className="btn-secondary btn-footer-narrow"
                onClick={() => setShowExportDialog(false)}
                disabled={exporting}
              >
                {t('bookings:cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Booking Dialog */}
      {showAddDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {t('bookings:add_booking')}
              </h3>
              <button className="modal-close" onClick={() => { setShowAddDialog(false); resetForm(); }}>×</button>
            </div>

            <div className="modal-body">
              <div className="space-y-4">
                {/* Client Search */}
                <div className="relative-wrapper">
                  <label className="input-label">{t('bookings:client')} *</label>
                  <input
                    type="text"
                    placeholder={t('bookings:search_client')}
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="input-field"
                  />
                  {selectedClient && (
                    <div className="selected-item-pill">
                      <span>{selectedClient.display_name} {selectedClient.phone && `(${selectedClient.phone})`}</span>
                      <button className="modal-close" onClick={() => { setSelectedClient(null); setClientSearch(''); }}>×</button>
                    </div>
                  )}
                  {showClientDropdown && clientSearch && !selectedClient && (
                    <div className="search-dropdown">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((c: any) => (
                          <div
                            key={c.instagram_id}
                            onClick={() => {
                              setSelectedClient(c);
                              setClientSearch('');
                              setShowClientDropdown(false);
                              setAddForm({ ...addForm, phone: c.phone || '' });
                            }}
                            className="search-dropdown-item"
                          >
                            {c.display_name} {c.phone && `(${c.phone})`}
                          </div>
                        ))
                      ) : (
                        <div className="search-dropdown-empty">
                          {t('bookings:clients_not_found')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Service Search */}
                <div className="relative-wrapper">
                  <label className="input-label">{t('bookings:service')} *</label>
                  <input
                    type="text"
                    placeholder={t('bookings:search_service')}
                    value={serviceSearch}
                    onChange={(e) => { setServiceSearch(e.target.value); setShowServiceDropdown(true); }}
                    onFocus={() => setShowServiceDropdown(true)}
                    className="input-field"
                  />
                  {selectedService && (
                    <div className="selected-item-pill">
                      <span>{selectedService.name_ru} ({selectedService.price} {t('bookings:currency')})</span>
                      <button className="modal-close" onClick={() => { setSelectedService(null); setServiceSearch(''); }}>×</button>
                    </div>
                  )}
                  {showServiceDropdown && serviceSearch && !selectedService && (
                    <div className="search-dropdown">
                      {filteredServices.length > 0 ? (
                        filteredServices.map((s: any) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedService(s);
                              setServiceSearch('');
                              setShowServiceDropdown(false);
                              setAddForm({ ...addForm, revenue: s.price });
                            }}
                            className="search-dropdown-item"
                          >
                            {s.name_ru} - {s.price} {t('bookings:currency')}
                          </div>
                        ))
                      ) : (
                        <div className="search-dropdown-empty">
                          {t('bookings:services_not_found')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Price/Revenue - Editable */}
                <div>
                  <label className="input-label">
                    {t('bookings:price')} ({t('bookings:currency')})
                    {selectedService && (
                      <span className="ml-2 text-gray-500 font-normal">
                        ({t('bookings:base_price')}: {selectedService.price} {t('bookings:currency')})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={addForm.revenue || ''}
                    onChange={(e) => setAddForm({ ...addForm, revenue: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                  <p className="helper-text">
                    {t('bookings:can_change_price_hint')}
                  </p>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">{t('bookings:date')} *</label>
                    <input
                      type="date"
                      value={addForm.date}
                      onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="input-label">{t('bookings:time')} *</label>
                    <input
                      type="time"
                      value={addForm.time}
                      onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Master Selection */}
                <div>
                  <label className="input-label">
                    {t('bookings:master')}
                    {loadingMasters && <span className="ml-2 text-gray-500">({t('bookings:loading')}...)</span>}
                  </label>
                  <select
                    value={addForm.master}
                    onChange={(e) => setAddForm({ ...addForm, master: e.target.value })}
                    className="input-field"
                    disabled={loadingMasters}
                  >
                    <option value="">{t('bookings:select_master')}</option>
                    {filteredMasters.map((m: any) => {
                      const displayName = (i18n.language === 'ru' && m.full_name_ru) ? m.full_name_ru : (m.full_name || m.username);
                      return (
                        <option key={m.id} value={m.full_name || m.username}>
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                  {selectedService && filteredMasters.length === 0 && !loadingMasters && (
                    <div className="info-box bg-yellow-50 border-yellow-200 text-yellow-800 mt-2">
                      {t('bookings:no_masters_for_service')}
                    </div>
                  )}
                  {busySlots.length > 0 && addForm.time && (
                    <div className="info-box bg-yellow-50 border-yellow-200 mt-2">
                      <div className="font-bold text-yellow-800 mb-1">
                        {t('bookings:master_busy')}
                      </div>
                      <div className="text-yellow-700 text-sm">
                        {t('bookings:busy_slots')}:
                        {busySlots.map((slot: any, idx: number) => (
                          <div key={idx} className="mt-1">
                            • {slot.start_time} - {slot.end_time} ({slot.service_name})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="input-label">{t('bookings:phone')}</label>
                  <input
                    type="tel"
                    placeholder={t('bookings:phone_placeholder')}
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="input-field"
                  />
                </div>

                {/* Source */}
                <div>
                  <label className="input-label">{t('bookings:source.title')}</label>
                  <select
                    value={addForm.source}
                    onChange={(e) => setAddForm({ ...addForm, source: e.target.value })}
                    className="input-field bg-white"
                  >
                    <option value="manual">{t('bookings:source.manual')}</option>
                    <option value="account">{t('bookings:source.account')}</option>
                    <option value="guest_link">{t('bookings:source.guest_link')}</option>
                    <option value="instagram">{t('bookings:source.instagram')}</option>
                    <option value="telegram">{t('bookings:source.telegram')}</option>
                    <option value="whatsapp">{t('bookings:source.whatsapp')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => { setShowAddDialog(false); resetForm(); }}
                disabled={addingBooking}
              >
                {t('bookings:cancel')}
              </button>
              <button
                className="btn-primary"
                onClick={handleAddBooking}
                disabled={addingBooking}
              >
                {addingBooking ? t('bookings:creating') : t('bookings:create_booking')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}