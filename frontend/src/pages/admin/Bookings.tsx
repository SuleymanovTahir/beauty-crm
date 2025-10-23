// ========================================
// ПАТЧ 2-3: Улучшенный Bookings.tsx с импортом/экспортом
// Сохраните как: frontend/src/pages/admin/Bookings.tsx
// ========================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, MessageSquare, Eye, Loader, RefreshCw, AlertCircle, Plus, Trash2, X, Check, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

const api = {
  baseURL: 'http://localhost:8000',
  
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

  async exportBookings(format: string, dateFrom?: string, dateTo?: string) {
    let url = `${this.baseURL}/api/export/bookings?format=${format}`;
    if (dateFrom && dateTo) {
      url += `&date_from=${dateFrom}&date_to=${dateTo}`;
    }
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Export failed');
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
    
    if (!res.ok) throw new Error('Import failed');
    return res.json();
  },

  async downloadImportTemplate(format: 'csv' | 'excel') {
    const res = await fetch(`${this.baseURL}/api/import/bookings/template?format=${format}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Template download failed');
    return res.blob();
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};

const statusConfig = {
  pending: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Подтверждена', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Завершена', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-800' },
  new: { label: 'Новая', color: 'bg-purple-100 text-purple-800' },
};

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingBooking, setAddingBooking] = useState(false);
  
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  
  const [addForm, setAddForm] = useState({
    phone: '',
    date: '',
    time: '',
    revenue: 0,
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

  // User role
  const currentUser = api.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = bookings.filter((booking: any) => {
      const matchesSearch = 
        (booking.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.service_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    setFilteredBookings(filtered);
  }, [searchTerm, statusFilter, bookings]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bookingsData, clientsData, servicesData] = await Promise.all([
        api.getBookings(),
        api.getClients(),
        api.getServices()
      ]);
      
      setBookings(bookingsData.bookings || []);
      setClients(clientsData.clients || []);
      setServices(servicesData.services || []);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Ошибка: ${err.message}`);
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
      setBookings(bookings.map((b: any) => b.id === id ? { ...b, status: newStatus } : b));
      toast.success('Статус обновлён');
    } catch (err) {
      toast.error('Ошибка обновления статуса');
    }
  };

  const handleAddBooking = async () => {
    if (!selectedClient || !selectedService || !addForm.date || !addForm.time) {
      toast.error('Заполните все обязательные поля (клиент, услуга, дата, время)');
      return;
    }

    try {
      setAddingBooking(true);
      await api.createBooking({
        instagram_id: selectedClient.instagram_id,
        name: selectedClient.display_name,
        phone: addForm.phone || selectedClient.phone || '',
        service: selectedService.name_ru,
        date: addForm.date,
        time: addForm.time,
        revenue: addForm.revenue || selectedService.price,
      });

      toast.success('Запись создана ✅');
      setShowAddDialog(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      toast.error(`❌ Ошибка: ${err.message}`);
    } finally {
      setAddingBooking(false);
    }
  };

  const resetForm = () => {
    setClientSearch('');
    setServiceSearch('');
    setSelectedClient(null);
    setSelectedService(null);
    setAddForm({ phone: '', date: '', time: '', revenue: 0 });
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
      
      toast.success(`Файл ${format.toUpperCase()} успешно скачан`);
      setShowExportDialog(false);
    } catch (err) {
      toast.error('Ошибка при экспорте');
    } finally {
      setExporting(false);
    }
  };

  // ===== IMPORT HANDLERS =====
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
        toast.error('Поддерживаются только CSV и Excel файлы');
        return;
      }
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Выберите файл для импорта');
      return;
    }

    try {
      setImporting(true);
      const result = await api.importBookings(importFile);
      
      setImportResult(result);
      
      if (result.imported > 0) {
        toast.success(`✅ Импортировано ${result.imported} записей`);
        await loadData();
      }
      
      if (result.skipped > 0) {
        toast.warning(`⚠️ Пропущено ${result.skipped} записей`);
      }
    } catch (err: any) {
      toast.error(`❌ Ошибка импорта: ${err.message}`);
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
      
      toast.success('Шаблон скачан');
    } catch (err) {
      toast.error('Ошибка при скачивании шаблона');
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
            Управление записями
          </h1>
          <p style={{ color: '#666' }}>{filteredBookings.length} записей</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} style={{
          padding: '0.5rem 1rem', backgroundColor: '#fff', border: '1px solid #ddd',
          borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <RefreshCw style={{ width: '16px', height: '16px', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Обновить
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Ожидают</p>
          <h3 style={{ fontSize: '1.875rem', color: '#eab308', fontWeight: 'bold' }}>{stats.pending}</h3>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Завершённых</p>
          <h3 style={{ fontSize: '1.875rem', color: '#3b82f6', fontWeight: 'bold' }}>{stats.completed}</h3>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Всего</p>
          <h3 style={{ fontSize: '1.875rem', color: '#111', fontWeight: 'bold' }}>{stats.total}</h3>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Доход</p>
          <h3 style={{ fontSize: '1.875rem', color: '#10b981', fontWeight: 'bold' }}>{stats.revenue} AED</h3>
        </div>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                border: '1px solid #d1d5db', borderRadius: '0.5rem',
                fontSize: '0.875rem', boxSizing: 'border-box'
              }}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{
            padding: '0.625rem 2.5rem 0.625rem 0.75rem', border: '1px solid #d1d5db',
            borderRadius: '0.5rem', fontSize: '0.875rem', cursor: 'pointer',
            backgroundColor: '#fff', minWidth: '150px'
          }}>
            <option value="all">Все статусы</option>
            <option value="new">Новая</option>
            <option value="pending">Ожидает</option>
            <option value="confirmed">Подтверждена</option>
            <option value="completed">Завершена</option>
            <option value="cancelled">Отменена</option>
          </select>
          <button onClick={() => setShowAddDialog(true)} style={{
            padding: '0.625rem 1.25rem', backgroundColor: '#ec4899', color: '#fff',
            border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
            fontWeight: '500', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '0.5rem'
          }}>
            <Plus style={{ width: '16px', height: '16px' }} />
            Добавить
          </button>
          
          {/* ===== КНОПКИ ИМПОРТА/ЭКСПОРТА (ТОЛЬКО ДЛЯ АДМИНА) ===== */}
          {isAdmin && (
            <>
              <button 
                onClick={() => setShowImportDialog(true)} 
                disabled={importing} 
                style={{
                  padding: '0.625rem 1.25rem', backgroundColor: '#10b981', color: '#fff',
                  border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
                  fontWeight: '500', cursor: importing ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  opacity: importing ? 0.5 : 1
                }}
              >
                <Upload style={{ width: '16px', height: '16px' }} />
                {importing ? 'Импорт...' : 'Импорт'}
              </button>
              
              <button 
                onClick={() => setShowExportDialog(true)} 
                disabled={exporting} 
                style={{
                  padding: '0.625rem 1.25rem', backgroundColor: '#2563eb', color: '#fff',
                  border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
                  fontWeight: '500', cursor: exporting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  opacity: exporting ? 0.5 : 1
                }}
              >
                <Download style={{ width: '16px', height: '16px' }} />
                {exporting ? 'Экспорт...' : 'Экспорт'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {filteredBookings.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>ID</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Клиент</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Услуга</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Дата</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Телефон</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Статус</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking: any, idx: number) => (
                  <tr key={booking.id} style={{ borderBottom: idx !== filteredBookings.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111', fontWeight: '500' }}>#{booking.id}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px', height: '40px', backgroundColor: '#fce7f3',
                          borderRadius: '50%', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#ec4899', fontWeight: '500', fontSize: '0.875rem'
                        }}>
                          {(booking.name || 'N').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.875rem', color: '#111' }}>{booking.name || 'Без имени'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111' }}>{booking.service_name || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111' }}>{formatDateTime(booking.datetime)}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>{booking.phone || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <select
                        value={booking.status}
                        onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.8125rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          ...(statusConfig[booking.status] ? {
                            backgroundColor: statusConfig[booking.status].color.split(' ')[0].replace('bg-', '').includes('yellow') ? '#fef3c7' :
                                             statusConfig[booking.status].color.split(' ')[0].replace('bg-', '').includes('green') ? '#d1fae5' :
                                             statusConfig[booking.status].color.split(' ')[0].replace('bg-', '').includes('blue') ? '#dbeafe' :
                                             statusConfig[booking.status].color.split(' ')[0].replace('bg-', '').includes('red') ? '#fee2e2' : '#f3e8ff',
                            color: statusConfig[booking.status].color.split(' ')[1].replace('text-', '').includes('yellow') ? '#92400e' :
                                   statusConfig[booking.status].color.split(' ')[1].replace('text-', '').includes('green') ? '#065f46' :
                                   statusConfig[booking.status].color.split(' ')[1].replace('text-', '').includes('blue') ? '#1e40af' :
                                   statusConfig[booking.status].color.split(' ')[1].replace('text-', '').includes('red') ? '#991b1b' : '#5b21b6'
                          } : {})
                        }}
                      >
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => navigate(`/admin/bookings/${booking.id}`)}
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
                        >
                          <Eye style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/chat?client_id=${booking.client_id}`)}
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
                        >
                          <MessageSquare style={{ width: '16px', height: '16px', color: '#10b981' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '5rem 2rem', textAlign: 'center', color: '#9ca3af' }}>
            <Calendar style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '1.125rem' }}>Записи не найдены</p>
          </div>
        )}
      </div>

      {/* Add Booking Dialog - (existing code remains the same) */}

      {/* ===== IMPORT DIALOG ===== */}
      {showImportDialog && (
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
                Импорт записей
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
                    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Формат файла:</p>
                    <ul style={{ marginLeft: '1rem', listStyle: 'disc' }}>
                      <li>Колонки: instagram_id, name, phone, service, datetime, status, revenue</li>
                      <li>Формат даты: YYYY-MM-DD HH:MM (например: 2025-01-15 14:00)</li>
                      <li>Поддерживаются CSV и Excel файлы</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Template Download */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Скачать шаблон:
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
                    📄 CSV Шаблон
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate('excel')}
                    style={{
                      flex: 1, padding: '0.5rem', backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.875rem', cursor: 'pointer'
                    }}
                  >
                    📊 Excel Шаблон
                  </button>
                </div>
              </div>

              {/* File Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Выберите файл *
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
                    ✓ {importFile.name}
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
                  <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Результаты импорта:</p>
                  <ul style={{ fontSize: '0.875rem', marginLeft: '1rem' }}>
                    <li>✅ Импортировано: {importResult.imported}</li>
                    <li>⚠️ Пропущено: {importResult.skipped}</li>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <li style={{ color: '#991b1b', marginTop: '0.5rem' }}>
                        Ошибки: {importResult.errors.slice(0, 3).join('; ')}
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
                {importResult ? 'Закрыть' : 'Отмена'}
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
                  {importing ? 'Импортирование...' : 'Импортировать'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== EXPORT DIALOG ===== */}
      {showExportDialog && (
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
                Экспорт записей
              </h3>
              <button onClick={() => setShowExportDialog(false)} style={{
                backgroundColor: 'transparent', border: 'none',
                cursor: 'pointer', color: '#6b7280', fontSize: '1.5rem'
              }}>×</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Период экспорта
                </label>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                  Оставьте пустым для экспорта всех записей
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Дата с
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
                  Дата по
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
                  Формат файла
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
                    CSV
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
                    PDF
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
                    Excel
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
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}