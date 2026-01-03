// /frontend/src/pages/admin/Bookings.tsx
// frontend/src/pages/admin/Bookings.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Search, MessageSquare, Eye, Loader, RefreshCw, AlertCircle, Plus, Upload, Edit, Instagram, Send, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { ExportDropdown } from '../../components/shared/ExportDropdown';
import { StatusSelect } from '../../components/shared/StatusSelect';
import { useBookingStatuses } from '../../hooks/useStatuses';

import { getDynamicAvatar } from '../../utils/avatarUtils';
import { Pagination } from '../../components/shared/Pagination';



const api = {
  baseURL: import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? `${window.location.protocol}//${window.location.hostname}:8000` : window.location.origin),

  async getBookings() {
    const res = await fetch(`${this.baseURL}/api/bookings`, { credentials: 'include' });
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
  const [bookings, setBookings] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const { t } = useTranslation(['admin/bookings', 'admin/services', 'common']);
  const [services, setServices] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    // Load saved filter from localStorage
    return localStorage.getItem('bookings_status_filter') || 'all';
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [masters, setMasters] = useState<any[]>([]);

  const [showAddDialog, setShowAddDialog] = useState(false);
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
    status: 'confirmed' // Default status
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
  }, []);



  useEffect(() => {
    const filtered = bookings.filter((booking: any) => {
      const matchesSearch =
        (booking.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.service_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

      // ✅ ДОБАВЛЕНА ФИЛЬТРАЦИЯ ПО ДАТЕ
      let matchesDate = true;
      if (period !== 'all') {
        const bookingDate = new Date(booking.datetime || booking.created_at);
        const now = new Date();

        if (period === 'today') {
          matchesDate = bookingDate.toDateString() === now.toDateString();
        } else if (period === '7') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          matchesDate = bookingDate >= weekAgo;
        } else if (period === '30') {
          const monthAgo = new Date();
          monthAgo.setDate(monthAgo.getDate() - 30);
          monthAgo.setHours(0, 0, 0, 0);
          matchesDate = bookingDate >= monthAgo;
        } else if (period === '90') {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
          threeMonthsAgo.setHours(0, 0, 0, 0);
          matchesDate = bookingDate >= threeMonthsAgo;
        } else if (period === 'custom' && dateFrom && dateTo) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);

          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999); // ✅ Include the entire end day

          matchesDate = bookingDate >= from && bookingDate <= to;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'service_name':
          aValue = (a.service_name || '').toLowerCase();
          bValue = (b.service_name || '').toLowerCase();
          break;
        case 'datetime':
          aValue = new Date(a.datetime || a.created_at).getTime();
          bValue = new Date(b.datetime || b.created_at).getTime();
          break;
        case 'revenue':
          aValue = parseFloat(a.revenue || 0);
          bValue = parseFloat(b.revenue || 0);
          break;
        case 'source':
          aValue = (a.source || 'manual').toLowerCase();
          bValue = (b.source || 'manual').toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredBookings(sorted);
  }, [searchTerm, statusFilter, bookings, period, dateFrom, dateTo, sortField, sortDirection]);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('bookings_status_filter', statusFilter);
  }, [statusFilter]);

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

      console.log('🔄 [Bookings] Загрузка данных...');

      let bookingsData, clientsData, servicesData, usersData;

      try {
        console.log('📋 [Bookings] Загрузка bookings...');
        bookingsData = await api.getBookings();
        console.log('✅ [Bookings] Bookings загружены:', bookingsData);
      } catch (err: any) {
        console.error('❌ [Bookings] Ошибка загрузки bookings:', err);
        throw new Error(`getBookings() failed: ${err.message}`);
      }

      try {
        console.log('👥 [Bookings] Загрузка clients...');
        clientsData = await api.getClients();
        console.log('✅ [Bookings] Clients загружены:', clientsData);
      } catch (err: any) {
        console.error('❌ [Bookings] Ошибка загрузки clients:', err);
        throw new Error(`getClients() failed: ${err.message}`);
      }

      try {
        console.log('💅 [Bookings] Загрузка services...');
        servicesData = await api.getServices();
        console.log('✅ [Bookings] Services загружены:', servicesData);
      } catch (err: any) {
        console.error('❌ [Bookings] Ошибка загрузки services:', err);
        throw new Error(`getServices() failed: ${err.message}`);
      }

      try {
        console.log('🧑‍💼 [Bookings] Загрузка users (masters)...');
        if (typeof api.getUsers !== 'function') {
          throw new Error(t('bookings:api_error_users'));
        }
        usersData = await api.getUsers();
        console.log('✅ [Bookings] Users загружены:', usersData);
      } catch (err: any) {
        console.error('❌ [Bookings] Ошибка загрузки users:', err);
        throw new Error(`getUsers() failed: ${err.message}`);
      }

      setBookings(bookingsData.bookings || []);
      setClients(clientsData.clients || []);
      setServices(servicesData.services || []);
      setMasters(usersData.users?.filter((u: any) =>
        u.role === 'employee' || u.role === 'manager' || u.role === 'admin'
      ) || []);

      console.log('✅ [Bookings] Все данные загружены успешно!');
    } catch (err: any) {
      console.error('❌ [Bookings] Критическая ошибка:', err);
      setError(err.message);
      toast.error(`Ошибка загрузки данных: ${err.message}`);
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
      status: booking.status || 'confirmed'
    });

    // Открываем диалог
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setClientSearch('');
    setServiceSearch('');
    setSelectedClient(null);
    setSelectedService(null);
    setAddForm({ phone: '', date: '', time: '', revenue: 0, master: '', status: 'confirmed' });
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

  const formatDateTime = (datetime: string) => {
    try {
      const date = new Date(datetime);
      return date.toLocaleDateString('ru-RU') + ' ' +
        date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return datetime;
    }
  };

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

  const stats = {
    pending: bookings.filter((b: any) => b.status === 'pending' || b.status === 'new').length,
    completed: bookings.filter((b: any) => b.status === 'completed').length,
    total: bookings.length,
    revenue: bookings.filter((b: any) => b.status === 'completed').reduce((sum: number, b: any) => sum + (b.revenue || 0), 0)
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader style={{ width: '32px', height: '32px', color: '#ec4899', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '0.5rem', padding: '1rem' }}>
          <AlertCircle style={{ color: '#c00' }} />
          <p style={{ color: '#800', marginTop: '0.5rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar style={{ width: '32px', height: '32px', color: '#ec4899' }} />
            {t('bookings:title')}
          </h1>
          <p style={{ color: '#666' }}>{filteredBookings.length} {t('bookings:records_count')}</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} style={{
          padding: '0.5rem 1rem', backgroundColor: '#fff', border: '1px solid #ddd',
          borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <RefreshCw style={{ width: '16px', height: '16px', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {t('bookings:refresh')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">{t('bookings:pending')}</p>
          <h3 className="text-3xl text-gray-900">{stats.pending}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">{t('bookings:completed')}</p>
          <h3 className="text-3xl text-gray-900">{stats.completed}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">{t('bookings:total')}</p>
          <h3 className="text-3xl text-gray-900">{stats.total}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">{t('bookings:revenue')}</p>
          <h3 className="text-3xl text-gray-900">{stats.revenue} {t('bookings:currency')}</h3>
        </div>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search - compact width */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder={t('bookings:search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                border: '1px solid #d1d5db', borderRadius: '0.5rem',
                fontSize: '0.875rem', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 2.5rem 0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              minWidth: '140px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%236b7280' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '16px 16px',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none'
            }}
          >
            <option value="all">{t('bookings:all_statuses')}</option>
            {Object.entries(statusConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {/* Period Filter */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '0.5rem 2.5rem 0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              minWidth: '140px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%236b7280' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '16px 16px',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none'
            }}
          >
            <option value="all">{t('common:all_periods')}</option>
            <option value="today">{t('common:today')}</option>
            <option value="7">{t('common:last_7_days')}</option>
            <option value="14">{t('common:last_14_days')}</option>
            <option value="30">{t('common:last_month')}</option>
            <option value="90">{t('common:last_3_months')}</option>
            <option value="custom">{t('common:custom_period')}</option>
          </select>

          {/* Custom Date Inputs */}
          {period === 'custom' && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  minWidth: '140px'
                }}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  minWidth: '140px'
                }}
              />
            </>
          )}

          {/* Spacer to push buttons to the right */}
          <div style={{ flex: 1 }} />

          {/* Action Buttons */}
          <button onClick={() => setShowAddDialog(true)} style={{
            padding: '0.5rem 1rem', backgroundColor: '#000', color: '#fff',
            border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
            fontWeight: '500', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap'
          }}>
            <Plus style={{ width: '16px', height: '16px' }} />
            {t('bookings:add')}
          </button>

          <button
            onClick={() => setShowImportDialog(true)}
            disabled={importing}
            style={{
              padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#111',
              border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem',
              fontWeight: '500', cursor: importing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              opacity: importing ? 0.5 : 1, whiteSpace: 'nowrap'
            }}
          >
            <Upload style={{ width: '16px', height: '16px' }} />
            {importing ? t('bookings:importing') : t('bookings:import')}
          </button>

          <ExportDropdown
            onExport={handleExport}
            loading={exporting}
            disabled={exporting}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {filteredBookings.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    {t('bookings:client')} {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('service_name')}
                    style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    {t('bookings:service')} {sortField === 'service_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('datetime')}
                    style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    {t('bookings:date')} {sortField === 'datetime' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('source')}
                    style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    {t('bookings:source.title', 'Соц.сеть')} {sortField === 'source' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('revenue')}
                    style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    {t('bookings:amount', 'Сумма')} {sortField === 'revenue' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('created_at')}
                    style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    {t('bookings:created', 'Создано')} {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>{t('bookings:phone')}</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>{t('bookings:status')}</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>{t('bookings:actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((booking: any) => (
                    <tr
                      key={booking.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {(() => {
                            // Find client data by client_id
                            const client = clients.find(c => c.id === booking.client_id);
                            const profilePic = client?.profile_pic;
                            const clientName = booking.name || 'N';

                            return (
                              <>
                                {profilePic && profilePic.trim() !== '' ? (
                                  <img
                                    src={`/api/proxy/image?url=${encodeURIComponent(profilePic)}`}
                                    alt={clientName}
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      border: '2px solid #fff',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <img
                                  src={getDynamicAvatar(clientName, 'cold', client?.gender)}
                                  alt={clientName}
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    display: profilePic && profilePic.trim() !== '' ? 'none' : 'block',
                                    backgroundColor: '#f3f4f6'
                                  }}
                                />
                              </>
                            );
                          })()}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#111' }}>{booking.name || t('bookings:no_name')}</span>
                            {booking.messengers && booking.messengers.length > 0 && (
                              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                {booking.messengers.map((messenger: string) => (
                                  <div
                                    key={messenger}
                                    style={{
                                      width: '18px',
                                      height: '18px',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      backgroundColor:
                                        messenger === 'instagram' ? '#E4405F' :
                                          messenger === 'telegram' ? '#0088cc' :
                                            messenger === 'whatsapp' ? '#25D366' :
                                              '#6b7280'
                                    }}
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
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111' }}>
                        {t(`admin/services:${booking.service_name}`, booking.service_name || '-')}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111' }}>{formatDateTime(booking.datetime)}</td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        {booking.source === 'instagram' ? '📷 Instagram' :
                          booking.source === 'telegram' ? '✈️ Telegram' :
                            booking.source === 'whatsapp' ? '📱 WhatsApp' :
                              t(`bookings:source.${booking.source || 'manual'}`, booking.source || 'Manual')}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111', fontWeight: '600' }}>
                        {booking.revenue ? `${booking.revenue} AED` : '-'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        {booking.created_at ? new Date(booking.created_at).toLocaleDateString('ru-RU') : '-'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>{booking.phone || '-'}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <StatusSelect
                          value={booking.status}
                          onChange={(newStatus) => handleStatusChange(booking.id, newStatus)}
                          options={statusConfig}
                        />
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button
                            onClick={() => navigate(`/crm/bookings/${booking.id}`)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#fff',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title={t('bookings:view')}
                          >
                            <Eye style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                          </button>
                          <button
                            onClick={() => handleEditBooking(booking)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#fff',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title={t('bookings:edit')}
                          >
                            <Edit style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
                          </button>
                          <button
                            onClick={() => {
                              const messenger = booking.messengers && booking.messengers.length > 0
                                ? booking.messengers[0]
                                : 'instagram';
                              navigate(`/crm/chat?client_id=${booking.client_id}&messenger=${messenger}`);
                            }}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#fff',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title={t('bookings:chat')}
                          >
                            <MessageSquare style={{ width: '16px', height: '16px', color: '#10b981' }} />
                          </button>
                          <button
                            onClick={() => handleDeleteBooking(booking.id, booking.name)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#fff',
                              border: '1px solid #ef4444',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title={t('bookings:delete')}
                          >
                            <Trash style={{ width: '16px', height: '16px', color: '#ef4444' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Pagination */}
            {filteredBookings.length > 0 && (
              <div className="border-t border-gray-200 bg-white rounded-b-xl shadow-sm">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredBookings.length / itemsPerPage)}
                  totalItems={filteredBookings.length}
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
          <div style={{ padding: '5rem 2rem', textAlign: 'center', color: '#9ca3af' }}>
            <Calendar style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '1.125rem' }}>{t('bookings:no_bookings')}</p>
          </div>
        )}
      </div>

      {/* Add Booking Dialog - (existing code remains the same) */}

      {/* ===== IMPORT DIALOG ===== */}
      {
        showImportDialog && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem'
          }}>
            <div style={{
              backgroundColor: '#fff', borderRadius: '1rem',
              width: '100%', maxWidth: '600px', overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                padding: '1.5rem', borderBottom: '1px solid #e5e7eb',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111' }}>
                  {t('bookings:import_title')}
                </h3>
                <button onClick={() => { setShowImportDialog(false); setImportFile(null); setImportResult(null); }} style={{
                  backgroundColor: 'transparent', border: 'none',
                  cursor: 'pointer', color: '#6b7280', fontSize: '1.5rem'
                }}>×</button>
              </div>

              <div style={{ padding: '1.5rem' }}>
                {/* Info Alert */}
                <div style={{
                  backgroundColor: '#dbeafe', border: '1px solid #93c5fd',
                  borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <AlertCircle style={{ width: '20px', height: '20px', color: '#1e40af', flexShrink: 0 }} />
                    <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                      <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{t('bookings:file_format')}:</p>
                      <ul style={{ marginLeft: '1rem', listStyle: 'disc' }}>
                        <li>{t('bookings:columns')}: {t('bookings:columns_description')}</li>
                        <li>{t('bookings:date_format')}: YYYY-MM-DD HH:MM ({t('bookings:example')}: 2026-01-15 14:00)</li>
                        <li>{t('bookings:supported_formats')}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Template Download */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    {t('bookings:download_template')}:
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleDownloadTemplate('csv')}
                      style={{
                        flex: 1, padding: '0.5rem', backgroundColor: '#f3f4f6',
                        border: '1px solid #d1d5db', borderRadius: '0.5rem',
                        fontSize: '0.875rem', cursor: 'pointer'
                      }}
                    >
                      📄 {t('bookings:csv_template')}
                    </button>
                    <button
                      onClick={() => handleDownloadTemplate('excel')}
                      style={{
                        flex: 1, padding: '0.5rem', backgroundColor: '#f3f4f6',
                        border: '1px solid #d1d5db', borderRadius: '0.5rem',
                        fontSize: '0.875rem', cursor: 'pointer'
                      }}
                    >
                      📊 {t('bookings:excel_template')}
                    </button>
                  </div>
                </div>

                {/* File Input */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    {t('bookings:select_file')} *
                  </label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleImportFileSelect}
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '2px dashed #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.875rem', cursor: 'pointer'
                    }}
                  />
                  {importFile && (
                    <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.5rem' }}>
                      ✓ {t('bookings:selected_file', { name: importFile.name })}
                    </p>
                  )}
                </div>

                {/* Import Result */}
                {importResult && (
                  <div style={{
                    backgroundColor: importResult.imported > 0 ? '#d1fae5' : '#fee2e2',
                    border: `1px solid ${importResult.imported > 0 ? '#6ee7b7' : '#fca5a5'}`,
                    borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem'
                  }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{t('bookings:import_results')}:</p>
                    <ul style={{ fontSize: '0.875rem', marginLeft: '1rem' }}>
                      <li>✅ {t('bookings:imported')}: {importResult.imported}</li>
                      <li>⚠️ {t('bookings:skipped')}: {importResult.skipped}</li>
                      {importResult.errors && importResult.errors.length > 0 && (
                        <li style={{ color: '#991b1b', marginTop: '0.5rem' }}>
                          {t('bookings:errors')}: {importResult.errors.slice(0, 3).join('; ')}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div style={{
                padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb',
                display: 'flex', gap: '0.75rem'
              }}>
                <button
                  onClick={() => { setShowImportDialog(false); setImportFile(null); setImportResult(null); }}
                  disabled={importing}
                  style={{
                    flex: 1, padding: '0.75rem', backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db', borderRadius: '0.5rem',
                    fontWeight: '500', color: '#374151', cursor: 'pointer'
                  }}
                >
                  {importResult ? t('bookings:close') : t('bookings:cancel')}
                </button>
                {!importResult && (
                  <button
                    onClick={handleImport}
                    disabled={importing || !importFile}
                    style={{
                      flex: 1, padding: '0.75rem', backgroundColor: '#10b981',
                      border: 'none', borderRadius: '0.5rem', color: '#fff',
                      fontWeight: '500', cursor: importing || !importFile ? 'not-allowed' : 'pointer',
                      opacity: importing || !importFile ? 0.5 : 1
                    }}
                  >
                    {importing ? t('bookings:importing') : t('bookings:import')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* ===== EXPORT DIALOG ===== */}
      {
        showExportDialog && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem'
          }}>
            <div style={{
              backgroundColor: '#fff', borderRadius: '1rem',
              width: '100%', maxWidth: '400px', overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                padding: '1.5rem', borderBottom: '1px solid #e5e7eb',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111' }}>
                  {t('bookings:export_title')}
                </h3>
                <button onClick={() => setShowExportDialog(false)} style={{
                  backgroundColor: 'transparent', border: 'none',
                  cursor: 'pointer', color: '#6b7280', fontSize: '1.5rem'
                }}>×</button>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    {t('bookings:export_period')}
                  </label>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                    {t('bookings:export_period_description')}
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    {t('bookings:export_date_from')}
                  </label>
                  <input
                    type="date"
                    value={exportDateFrom}
                    onChange={(e) => setExportDateFrom(e.target.value)}
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.95rem', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    {t('bookings:export_date_to')}
                  </label>
                  <input
                    type="date"
                    value={exportDateTo}
                    onChange={(e) => setExportDateTo(e.target.value)}
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.95rem', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                    {t('bookings:export_file_format')}
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleExport('csv')}
                      disabled={exporting}
                      style={{
                        flex: 1, padding: '0.75rem', backgroundColor: '#2563eb',
                        color: '#fff', border: 'none', borderRadius: '0.5rem',
                        fontWeight: '500', cursor: exporting ? 'not-allowed' : 'pointer',
                        opacity: exporting ? 0.5 : 1
                      }}
                    >
                      {t('bookings:csv')}
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      disabled={exporting}
                      style={{
                        flex: 1, padding: '0.75rem', backgroundColor: '#2563eb',
                        color: '#fff', border: 'none', borderRadius: '0.5rem',
                        fontWeight: '500', cursor: exporting ? 'not-allowed' : 'pointer',
                        opacity: exporting ? 0.5 : 1
                      }}
                    >
                      {t('bookings:pdf')}
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      disabled={exporting}
                      style={{
                        flex: 1, padding: '0.75rem', backgroundColor: '#2563eb',
                        color: '#fff', border: 'none', borderRadius: '0.5rem',
                        fontWeight: '500', cursor: exporting ? 'not-allowed' : 'pointer',
                        opacity: exporting ? 0.5 : 1
                      }}
                    >
                      {t('bookings:excel')}
                    </button>
                  </div>
                </div>
              </div>
              <div style={{
                padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb',
                display: 'flex', justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowExportDialog(false)}
                  disabled={exporting}
                  style={{
                    padding: '0.75rem 1.5rem', backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db', borderRadius: '0.5rem',
                    fontWeight: '500', color: '#374151', cursor: 'pointer'
                  }}
                >
                  {t('bookings:cancel')}
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Add Booking Dialog */}
      {
        showAddDialog && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem'
          }}>
            <div style={{
              backgroundColor: '#fff', borderRadius: '1rem',
              width: '100%', maxWidth: '600px', maxHeight: '90vh',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
              <div style={{
                padding: '1.5rem', borderBottom: '1px solid #e5e7eb',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexShrink: 0
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111' }}>
                  {t('bookings:add_booking')}
                </h3>
                <button onClick={() => { setShowAddDialog(false); resetForm(); }} style={{
                  backgroundColor: 'transparent', border: 'none',
                  cursor: 'pointer', color: '#6b7280', fontSize: '1.5rem'
                }}>×</button>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
                {/* Client Search */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    {t('bookings:client')} *
                  </label>
                  <input
                    type="text"
                    placeholder={t('bookings:search_client')}
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                    onFocus={() => setShowClientDropdown(true)}
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.875rem', boxSizing: 'border-box'
                    }}
                  />
                  {selectedClient && (
                    <div style={{
                      marginTop: '0.5rem', padding: '0.5rem',
                      backgroundColor: '#f3f4f6', borderRadius: '0.5rem',
                      fontSize: '0.875rem', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span>{selectedClient.display_name}</span>
                      <button
                        onClick={() => { setSelectedClient(null); setClientSearch(''); }}
                        style={{
                          backgroundColor: 'transparent', border: 'none',
                          cursor: 'pointer', color: '#6b7280'
                        }}
                      >×</button>
                    </div>
                  )}
                  {showClientDropdown && clientSearch && !selectedClient && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      backgroundColor: '#fff', border: '1px solid #d1d5db',
                      borderRadius: '0.5rem', marginTop: '0.25rem',
                      maxHeight: '200px', overflowY: 'auto', zIndex: 10,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
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
                            style={{
                              padding: '0.75rem', cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              fontSize: '0.875rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                          >
                            {c.display_name} {c.phone && `(${c.phone})`}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {t('bookings:clients_not_found')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Service Search */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    {t('bookings:service')} *
                  </label>
                  <input
                    type="text"
                    placeholder={t('bookings:search_service')}
                    value={serviceSearch}
                    onChange={(e) => { setServiceSearch(e.target.value); setShowServiceDropdown(true); }}
                    onFocus={() => setShowServiceDropdown(true)}
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.875rem', boxSizing: 'border-box'
                    }}
                  />
                  {selectedService && (
                    <div style={{
                      marginTop: '0.5rem', padding: '0.5rem',
                      backgroundColor: '#f3f4f6', borderRadius: '0.5rem',
                      fontSize: '0.875rem', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span>{selectedService.name_ru} ({selectedService.price} {t('bookings:currency')})</span>
                      <button
                        onClick={() => { setSelectedService(null); setServiceSearch(''); }}
                        style={{
                          backgroundColor: 'transparent', border: 'none',
                          cursor: 'pointer', color: '#6b7280'
                        }}
                      >×</button>
                    </div>
                  )}
                  {showServiceDropdown && serviceSearch && !selectedService && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      backgroundColor: '#fff', border: '1px solid #d1d5db',
                      borderRadius: '0.5rem', marginTop: '0.25rem',
                      maxHeight: '200px', overflowY: 'auto', zIndex: 10,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
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
                            style={{
                              padding: '0.75rem', cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              fontSize: '0.875rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                          >
                            {s.name_ru} - {s.price} {t('bookings:currency')}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {t('bookings:services_not_found')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Price/Revenue - Editable */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    {t('bookings:price')} ({t('bookings:currency')})
                    {selectedService && (
                      <span style={{ marginLeft: '0.5rem', color: '#6b7280', fontWeight: '400' }}>
                        ({t('bookings:base_price')}: {selectedService.price} {t('bookings:currency')})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={addForm.revenue || ''}
                    onChange={(e) => setAddForm({ ...addForm, revenue: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.875rem', boxSizing: 'border-box'
                    }}
                  />
                  <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    {t('bookings:can_change_price_hint')}
                  </p>
                </div>

                {/* Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      {t('bookings:date')} *
                    </label>
                    <input
                      type="date"
                      value={addForm.date}
                      onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                      style={{
                        width: '100%', padding: '0.75rem',
                        border: '1px solid #d1d5db', borderRadius: '0.5rem',
                        fontSize: '0.875rem', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      {t('bookings:time')} *
                    </label>
                    <input
                      type="time"
                      value={addForm.time}
                      onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
                      style={{
                        width: '100%', padding: '0.75rem',
                        border: '1px solid #d1d5db', borderRadius: '0.5rem',
                        fontSize: '0.875rem', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Master Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    {t('bookings:master')}
                    {loadingMasters && <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>({t('bookings:loading')}...)</span>}
                  </label>
                  <select
                    value={addForm.master}
                    onChange={(e) => setAddForm({ ...addForm, master: e.target.value })}
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.875rem', boxSizing: 'border-box'
                    }}
                    disabled={loadingMasters}
                  >
                    <option value="">{t('bookings:select_master')}</option>
                    {filteredMasters.map((m: any) => (
                      <option key={m.id} value={m.full_name}>
                        {m.full_name} - {m.position}
                      </option>
                    ))}
                  </select>
                  {selectedService && filteredMasters.length === 0 && !loadingMasters && (
                    <div style={{
                      marginTop: '0.5rem', padding: '0.5rem',
                      backgroundColor: '#fef3c7', borderLeft: '3px solid #f59e0b',
                      fontSize: '0.875rem', color: '#92400e'
                    }}>
                      {t('bookings:no_masters_for_service')}
                    </div>
                  )}
                  {busySlots.length > 0 && addForm.time && (
                    <div style={{
                      marginTop: '0.5rem', padding: '0.75rem',
                      backgroundColor: '#fef3c7', borderLeft: '3px solid #f59e0b',
                      borderRadius: '0.375rem', fontSize: '0.875rem'
                    }}>
                      <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '0.25rem' }}>
                        {t('bookings:master_busy')}
                      </div>
                      <div style={{ color: '#78350f' }}>
                        {t('bookings:busy_slots')}:
                        {busySlots.map((slot: any, idx: number) => (
                          <div key={idx} style={{ marginTop: '0.25rem' }}>
                            • {slot.start_time} - {slot.end_time} ({slot.service_name})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    {t('bookings:phone')}
                  </label>
                  <input
                    type="tel"
                    placeholder={t('bookings:phone_placeholder')}
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.875rem', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{
                padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb',
                display: 'flex', gap: '0.75rem', flexShrink: 0
              }}>
                <button
                  onClick={() => { setShowAddDialog(false); resetForm(); }}
                  disabled={addingBooking}
                  style={{
                    flex: 1, padding: '0.75rem', backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db', borderRadius: '0.5rem',
                    fontWeight: '500', color: '#374151', cursor: 'pointer'
                  }}
                >
                  {t('bookings:cancel')}
                </button>
                <button
                  onClick={handleAddBooking}
                  disabled={addingBooking}
                  style={{
                    flex: 1, padding: '0.75rem', backgroundColor: '#ec4899',
                    border: 'none', borderRadius: '0.5rem', color: '#fff',
                    fontWeight: '500', cursor: addingBooking ? 'not-allowed' : 'pointer',
                    opacity: addingBooking ? 0.5 : 1
                  }}
                >
                  {addingBooking ? t('bookings:creating') : t('bookings:create_booking')}
                </button>
              </div>
            </div>
          </div>
        )
      }
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div >
  );
}