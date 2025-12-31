// /frontend/src/pages/admin/Clients.tsx
// frontend/src/pages/admin/Clients.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Users,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  X,
  MessageSquare,
  Eye,
  Plus,
  Loader,
  RefreshCw,
  AlertCircle,
  Trash2,
  Pin,
  Upload
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { ExportDropdown } from '../../components/shared/ExportDropdown';
import { usePeriodFilter } from '../../hooks/usePeriodFilter';
import { StatusSelect } from '../../components/shared/StatusSelect';
import { TemperatureSelect } from '../../components/shared/TemperatureSelect';
import { TemperatureFilter } from '../../components/shared/TemperatureFilter';
import { useClientStatuses } from '../../hooks/useStatuses';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import { Pagination } from '../../components/shared/Pagination';

interface Client {
  id: string;
  instagram_id: string;
  username: string;
  phone: string;
  name: string;
  display_name: string;
  first_contact: string;
  last_contact: string;
  total_messages: number;
  status: string;
  lifetime_value: number;
  profile_pic: string | null;
  notes: string;
  is_pinned: number;
  temperature?: string;
  gender?: string;
  age?: number;
}



export default function Clients() {
  const navigate = useNavigate();
  const { statuses: statusConfig } = useClientStatuses()

  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation(['admin/Clients', 'common']);
  const [statusFilter, setStatusFilter] = useState(() => {
    return localStorage.getItem('clients_status_filter') || 'all';
  });
  const [temperatureFilter, setTemperatureFilter] = useState(() => {
    return localStorage.getItem('clients_temperature_filter') || 'all';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [period, setPeriod] = useState(() => {
    return localStorage.getItem('clients_period_filter') || 'all';
  });
  const [dateFrom, setDateFrom] = useState(() => {
    return localStorage.getItem('clients_date_from') || '';
  });
  const [dateTo, setDateTo] = useState(() => {
    return localStorage.getItem('clients_date_to') || '';
  });

  // ✅ НОВОЕ: Состояния для редактирования
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    notes: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // СОСТОЯНИЯ ДЛЯ ДИАЛОГОВ
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    instagram_id: '',
    notes: ''
  });
  const [creatingClient, setCreatingClient] = useState(false);

  // СОСТОЯНИЯ ДЛЯ УДАЛЕНИЯ
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);

  // ✅ НОВОЕ: СОСТОЯНИЯ ДЛЯ ИМПОРТА
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ НОВОЕ: Состояния для массовых действий и пагинации
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting states
  const [sortField, setSortField] = useState<'name' | 'phone' | 'status' | 'lifetime_value' | 'last_contact' | 'first_contact'>('last_contact');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadClients();
  }, []);

  // Helper for period filter - defined outside or memoized to prevent infinite loops
  const getItemDate = useCallback((client: Client) => client.last_contact, []);

  const filteredByPeriod = usePeriodFilter({
    items: clients,
    period,
    dateFrom,
    dateTo,
    getItemDate
  });

  useEffect(() => {
    const filtered = filteredByPeriod.filter(client => {
      const matchesSearch =
        (client.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.phone || '').includes(searchTerm) ||
        (client.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      const matchesTemperature = temperatureFilter === 'all' || client.temperature === temperatureFilter;

      return matchesSearch && matchesStatus && matchesTemperature;
    });

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'name':
          aValue = (a.name || a.display_name || '').toLowerCase();
          bValue = (b.name || b.display_name || '').toLowerCase();
          break;
        case 'phone':
          aValue = (a.phone || '').toLowerCase();
          bValue = (b.phone || '').toLowerCase();
          break;
        case 'status':
          aValue = (a.status || '').toLowerCase();
          bValue = (b.status || '').toLowerCase();
          break;
        case 'lifetime_value':
          aValue = parseFloat(String(a.lifetime_value || 0));
          bValue = parseFloat(String(b.lifetime_value || 0));
          break;
        case 'last_contact':
          aValue = new Date(a.last_contact || 0).getTime();
          bValue = new Date(b.last_contact || 0).getTime();
          break;
        case 'first_contact':
          aValue = new Date(a.first_contact || 0).getTime();
          bValue = new Date(b.first_contact || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredClients(sorted);
    setCurrentPage(1); // Reset page on filter change
    setSelectedClients(new Set()); // Reset selection on filter change
  }, [searchTerm, statusFilter, temperatureFilter, filteredByPeriod, sortField, sortDirection]);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('clients_status_filter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('clients_temperature_filter', temperatureFilter);
  }, [temperatureFilter]);

  useEffect(() => {
    localStorage.setItem('clients_period_filter', period);
  }, [period]);

  useEffect(() => {
    if (dateFrom) localStorage.setItem('clients_date_from', dateFrom);
  }, [dateFrom]);

  useEffect(() => {
    if (dateTo) localStorage.setItem('clients_date_to', dateTo);
  }, [dateTo]);


  // Handle sorting
  const handleSort = (field: 'name' | 'phone' | 'status' | 'lifetime_value' | 'last_contact' | 'first_contact') => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection Logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(new Set(filteredClients.map(c => c.id)));
    } else {
      setSelectedClients(new Set());
    }
  };

  const handleSelectOne = (clientId: string, checked: boolean) => {
    const newSelected = new Set(selectedClients);
    if (checked) {
      newSelected.add(clientId);
    } else {
      newSelected.delete(clientId);
    }
    setSelectedClients(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedClients.size === 0) return;

    if (!window.confirm(t('clients:confirm_bulk_delete', { count: selectedClients.size, defaultValue: `Delete ${selectedClients.size} clients?` }))) {
      return;
    }

    try {
      setLoading(true);
      await api.bulkAction('delete', Array.from(selectedClients));

      toast.success(t('clients:bulk_delete_success', { defaultValue: 'Selected clients deleted' }));
      setSelectedClients(new Set());
      await loadClients();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting clients';
      toast.error(`${t('clients:error')}: ${message}`);
    } finally {
      setLoading(false);
    }
  };



  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getClients();

      const clientsArray = data.clients || (Array.isArray(data) ? data : []);
      setClients(clientsArray);

      if (clientsArray.length === 0) {
        toast.info(t('clients:no_clients_found'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('clients:error_loading_clients');
      setError(message);
      toast.error(`${t('clients:error')}: ${message}`);
      console.error("Error loading clients:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
    toast.success(t('clients:data_updated'));
  };

  // ✅ НОВОЕ: Сохранение редактирования
  const handleSaveEdit = async () => {
    if (!editingClient) return;

    try {
      setSavingEdit(true);

      await api.updateClient(editingClient.id, {
        name: editForm.name.trim() || null,
        phone: editForm.phone.trim() || null,
        notes: editForm.notes.trim() || null
      });

      // Обновляем локальное состояние
      setClients(clients.map(c =>
        c.id === editingClient.id
          ? {
            ...c,
            name: editForm.name.trim() || '',
            phone: editForm.phone.trim() || '',
            notes: editForm.notes.trim() || '',
            display_name: editForm.name.trim() || c.username || c.id.substring(0, 15) + '...'
          }
          : c
      ));

      toast.success(t('clients:client_updated'));
      setShowEditDialog(false);
      setEditingClient(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('clients:error_updating_client');
      toast.error(`❌ Ошибка: ${message}`);
      console.error("Error:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateClient = async () => {
    if (!createForm.name.trim()) {
      toast.error(t('clients:fill_client_name'));
      return;
    }

    try {
      setCreatingClient(true);

      const instagram_id = createForm.instagram_id.trim() || `manual_${Date.now()}`;

      await api.createClient({
        instagram_id,
        name: createForm.name,
        phone: createForm.phone || '',
        notes: createForm.notes,
      });

      toast.success(t('clients:client_created'));
      setShowCreateDialog(false);
      setCreateForm({ name: "", phone: "", instagram_id: "", notes: "" });
      await loadClients();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('clients:error_creating_client');
      toast.error(`${t('clients:error')}: ${message}`);
      console.error("Error:", err);
    } finally {
      setCreatingClient(false);
    }
  };

  const handleTemperatureChange = async (clientId: string, newTemperature: string) => {
    try {
      await api.updateClientTemperature(clientId, newTemperature);

      setClients(prev => prev.map(client =>
        client.id === clientId
          ? { ...client, temperature: newTemperature }
          : client
      ));

      toast.success(t('clients:temperature_updated'));
    } catch (error) {
      console.error('Error updating temperature:', error);
      toast.error(t('common:error_updating_status'));
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    setClientToDelete({ id: clientId, name: clientName });
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      setDeletingId(clientToDelete.id);
      await api.deleteClient(clientToDelete.id);
      setClients(clients.filter(c => c.id !== clientToDelete.id));
      toast.success(t('clients:client_deleted'));
      setShowDeleteDialog(false);
      setClientToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('clients:error_deleting_client');
      toast.error(`${t('clients:error')}: ${message}`);
      console.error("Error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePinClient = async (clientId: string) => {
    try {
      await api.pinClient(clientId);
      await loadClients();
      toast.success(t('clients:changed'));
    } catch (err) {
      toast.error(t('clients:error'));
    }
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      setExporting(true);
      const blob = await api.exportClients(format);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const ext = format === 'excel' ? 'xlsx' : format;
      link.download = `clients_${new Date().toISOString().split('T')[0]}.${ext}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${t('clients:file_downloaded')} ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(t('clients:error_exporting'));
    } finally {
      setExporting(false);
    }
  };

  // ДОБАВИТЬ:



  const handleConfirmExport = async (format: 'csv' | 'excel') => {
    try {
      setExporting(true);
      const blob = await api.exportFullData(format);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const ext = format === 'excel' ? 'xlsx' : format;
      link.download = `full_data_${new Date().toISOString().split('T')[0]}.${ext}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${t('clients:full_export')} ${format.toUpperCase()}`);
      setShowExportDialog(false);
    } catch (err) {
      toast.error(t('clients:error_exporting'));
    } finally {
      setExporting(false);
    }
  };

  // ✅ НОВОЕ: Обработчик импорта
  const handleImport = async () => {
    if (!importFile) {
      toast.error('Пожалуйста, выберите файл');
      return;
    }

    try {
      setImporting(true);
      setImportResults(null);

      const response = await api.importClients(importFile);

      setImportResults(response.results);

      if (response.results.success > 0) {
        toast.success(`✅ Импортировано ${response.results.success} клиентов`);
        await loadClients(); // Обновляем список
      }

      if (response.results.errors.length > 0) {
        toast.warning(`⚠️ Ошибок: ${response.results.errors.length}`);
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка импорта';
      toast.error(`❌ ${message}`);
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleCloseImportDialog = () => {
    setShowImportDialog(false);
    setImportFile(null); // Сброс файла при закрытии
    setImportResults(null);
  };

  const handleRemoveFile = () => {
    setImportFile(null); // Открепление файла без закрытия диалога
  };

  const stats = {
    total: clients.length,
    vip: clients.filter((c) => c.status === "vip").length,
    new: clients.filter((c) => c.status === "new").length,
    active: clients.filter((c) => c.total_messages > 0).length,
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">{t('clients:loading_clients')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">{t('clients:error_loading_clients')}</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadClients} className="mt-4 bg-red-600 hover:bg-red-700">
                {t('clients:try_again')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-pink-600" />
            {t('clients:title')}
          </h1>
          <p className="text-gray-600">{filteredClients.length} {t('clients:total_clients')}</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {t('clients:refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{t('clients:total_clients')}</p>
          <h3 className="text-3xl text-gray-900">{stats.total}</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {period === 'all' ? t('common:all_time') :
              period === 'today' ? t('common:for_today') :
                period === 'custom' ? `${dateFrom} - ${dateTo}` :
                  t('common:for_period', { days: period })}
          </p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{t('clients:vip_clients')}</p>
          <h3 className="text-3xl text-purple-600">{stats.vip}</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {period === 'all' ? t('common:all_time') :
              period === 'today' ? t('common:for_today') :
                period === 'custom' ? `${dateFrom} - ${dateTo}` :
                  t('common:for_period', { days: period })}
          </p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{t('clients:new_clients')}</p>
          <h3 className="text-3xl text-green-600">{stats.new}</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {period === 'all' ? t('common:all_time') :
              period === 'today' ? t('common:for_today') :
                period === 'custom' ? `${dateFrom} - ${dateTo}` :
                  t('common:for_period', { days: period })}
          </p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{t('clients:active_clients')}</p>
          <h3 className="text-3xl text-blue-600">{stats.active}</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {period === 'all' ? t('common:all_time') :
              period === 'today' ? t('common:for_today') :
                period === 'custom' ? `${dateFrom} - ${dateTo}` :
                  t('common:for_period', { days: period })}
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <div className="flex flex-col gap-4">
          {/* Row 1: Search */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder={t('clients:search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                border: '1px solid #d1d5db', borderRadius: '0.5rem',
                fontSize: '0.875rem', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Row 2: Filters and Actions */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
            {/* Filters Group */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Status Filter */}
              <StatusSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusConfig}
                allowAdd={false}
                showAllOption={true}
                variant="filter"
              />

              {/* Temperature Filter */}
              <TemperatureFilter
                value={temperatureFilter}
                onChange={setTemperatureFilter}
              />

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
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              )}
            </div>

            {/* Actions Group */}
            <div className="flex items-center gap-2">
              {selectedClients.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#dc2626',
                    border: '1px solid #dc2626', borderRadius: '0.5rem', fontSize: '0.875rem',
                    fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    opacity: loading ? 0.5 : 1, whiteSpace: 'nowrap'
                  }}
                >
                  <Trash2 style={{ width: '16px', height: '16px' }} />
                  {t('clients:delete_selected')} ({selectedClients.size})
                </button>
              )}

              <button
                onClick={() => setShowCreateDialog(true)}
                style={{
                  padding: '0.5rem 1rem', backgroundColor: '#ec4899', color: '#fff',
                  border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
                  fontWeight: '500', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap'
                }}
              >
                <Plus style={{ width: '16px', height: '16px' }} />
                {t('clients:add_client')}
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
                {importing ? t('clients:importing') : t('clients:import')}
              </button>

              <ExportDropdown
                onExport={handleExport}
                loading={exporting}
                disabled={exporting}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredClients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <Checkbox
                      checked={selectedClients.size === paginatedClients.length && paginatedClients.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    {t('clients:client')} {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('phone')}
                  >
                    {t('clients:contacts')} {sortField === 'phone' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">{t('clients:messages')}</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">{t('clients:bookings')}</th>
                  <th
                    className="px-6 py-4 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('lifetime_value')}
                  >
                    {t('clients:ltv')} {sortField === 'lifetime_value' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">{t('clients:temperature')}</th>
                  <th
                    className="px-6 py-4 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('last_contact')}
                  >
                    {t('clients:last_contact')} {sortField === 'last_contact' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    {t('clients:status')} {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">{t('clients:actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedClients.map((client) => (
                  <tr
                    key={client.id}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedClients.has(client.id) ? 'bg-pink-50' : ''}`}
                    onClick={() => navigate(`/crm/clients/${encodeURIComponent(client.id)}`)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={(checked) => handleSelectOne(client.id, checked as boolean)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {client.is_pinned === 1 && (
                          <Pin className="w-4 h-4 text-pink-600 fill-pink-600" />
                        )}
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {client.profile_pic && client.profile_pic !== 'null' ? (
                              <img className="h-10 w-10 rounded-full object-cover" src={client.profile_pic} alt="" />
                            ) : (
                              <img
                                className="h-10 w-10 rounded-full"
                                src={getDynamicAvatar(client.name || client.username || 'Client', client.temperature, client.gender)}
                                alt=""
                              />
                            )}
                          </div>
                          <div className="ml-4">
                            <p className="text-sm text-gray-900 font-medium">{client.display_name}</p>
                            {client.username && (
                              <p className="text-xs text-gray-500">@{client.username}</p>
                            )}
                          </div>
                        </div>
                        {/* ✅ #21 - Температура клиента */}

                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        let displayPhone = "-";
                        let rawPhone = "";
                        try {
                          if (client.phone) {
                            let phoneStr = client.phone;
                            if (phoneStr.startsWith('[')) {
                              const phones = JSON.parse(phoneStr);
                              if (Array.isArray(phones) && phones.length > 0) {
                                phoneStr = phones[0];
                              }
                            }
                            displayPhone = phoneStr;
                            rawPhone = phoneStr;
                          }
                        } catch (e) {
                          displayPhone = client.phone || "-";
                          rawPhone = client.phone || "";
                        }

                        return rawPhone ? (
                          <a
                            href={`tel:${rawPhone}`}
                            className="text-sm text-blue-600 hover:underline hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {displayPhone}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{client.total_messages}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{client.total_bookings || 0}</td>

                    <td className="px-6 py-4 text-sm text-green-600 font-medium">
                      {client.lifetime_value} AED
                    </td>
                    <td className="px-6 py-4">
                      <TemperatureSelect
                        value={client.temperature || 'cold'}
                        onChange={(value) => handleTemperatureChange(client.id, value)}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(client.last_contact).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-6 py-4">
                      <StatusSelect
                        value={client.status}
                        onChange={async (newStatus) => {
                          try {
                            await api.updateClientStatus(client.id, newStatus);
                            setClients(clients.map(c =>
                              c.id === client.id ? { ...c, status: newStatus } : c
                            ));
                            toast.success(t('clients:status_updated'));
                          } catch (err) {
                            toast.error(t('clients:error_updating_status'));
                          }
                        }}
                        options={statusConfig}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/crm/clients/${encodeURIComponent(client.id)}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/crm/chat?client_id=${client.id}`);
                          }}
                          title={t('clients:write_message')}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinClient(client.id);
                          }}
                          title={t('clients:pin_client')}
                        >
                          <Pin className={`w-4 h-4 ${client.is_pinned ? 'fill-pink-600 text-pink-600' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(client.id, client.display_name);
                          }}
                          disabled={deletingId === client.id}
                          title={t('clients:delete_client')}
                        >
                          {deletingId === client.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-gray-500">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>{t('clients:no_clients_found')}</p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {
        filteredClients.length > 0 && (
          <div className="border-t border-gray-200 bg-white rounded-b-xl shadow-sm">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredClients.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newSize) => {
                setItemsPerPage(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        )}

      {/* ✅ НОВОЕ: Edit Client Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('clients:edit_client')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_name">{t('clients:name')}</Label>
              <Input
                id="edit_name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={t('clients:name_placeholder')}
              />
            </div>

            <div>
              <Label htmlFor="edit_phone">{t('clients:phone')}</Label>
              <Input
                id="edit_phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder={t('clients:phone_placeholder')}
              />
            </div>

            <div>
              <Label htmlFor="edit_notes">{t('clients:notes')}</Label>
              <Textarea
                id="edit_notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder={t('clients:notes_placeholder')}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingClient(null);
              }}
              disabled={savingEdit}
            >
              {t('clients:cancel')}
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={savingEdit}
            >
              {savingEdit ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {t('clients:saving')}
                </>
              ) : (
                t('clients:save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Client Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('clients:add_client')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t('clients:name')} *</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder={t('clients:name_placeholder')}
              />
            </div>

            <div>
              <Label htmlFor="phone">{t('clients:phone')}</Label>
              <Input
                id="phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder={t('clients:phone_placeholder')}
              />
              <p className="text-xs text-gray-500 mt-1">{t('clients:optional')}</p>
            </div>

            <div>
              <Label htmlFor="instagram">{t('clients:instagram_id')}</Label>
              <Input
                id="instagram"
                value={createForm.instagram_id}
                onChange={(e) => setCreateForm({ ...createForm, instagram_id: e.target.value })}
                placeholder={t('clients:instagram_id_placeholder')}
              />
              <p className="text-xs text-gray-500 mt-1">{t('clients:optional')}</p>
            </div>

            <div>
              <Label htmlFor="notes">{t('clients:notes')}</Label>
              <Textarea
                id="notes"
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder={t('clients:notes_placeholder')}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creatingClient}>
              {t('clients:cancel')}
            </Button>
            <Button onClick={handleCreateClient} className="bg-pink-600 hover:bg-pink-700" disabled={creatingClient}>
              {creatingClient ? t('clients:creating') : t('clients:create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {
        showDeleteDialog && clientToDelete && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem'
          }}>
            <div style={{
              backgroundColor: '#fff', borderRadius: '1rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              width: '100%', maxWidth: '420px', overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#fef2f2', borderBottom: '2px solid #fecaca',
                padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    backgroundColor: '#fee2e2', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <AlertCircle style={{ width: '24px', height: '24px', color: '#dc2626' }} />
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#7f1d1d' }}>
                    {t('clients:delete_client')}
                  </h3>
                </div>
              </div>

              <div style={{ backgroundColor: '#fff', padding: '1.5rem' }}>
                <p style={{ color: '#1f2937', marginBottom: '1rem', fontSize: '0.95rem' }}>
                  {t('clients:you_are_deleting_client')} <strong>"{clientToDelete.name}"</strong>
                </p>

                <div style={{
                  backgroundColor: '#fefce8', borderLeft: '4px solid #facc15',
                  padding: '1rem', marginBottom: '1rem', borderRadius: '0.5rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <AlertCircle style={{ width: '20px', height: '20px', color: '#b45309', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#92400e', marginBottom: '0.5rem' }}>
                        ⚠️ {t('clients:this_action_is_irreversible')}!
                      </p>
                      <ul style={{ fontSize: '0.875rem', color: '#92400e', marginLeft: '1rem' }}>
                        <li>✗ {t('clients:all_messages_will_be_deleted')}</li>
                        <li>✗ {t('clients:all_records_will_be_deleted')}</li>
                        <li>✗ {t('clients:history_will_not_be_restored')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb',
                padding: '1rem 1.5rem', display: 'flex',
                justifyContent: 'flex-end', gap: '0.75rem'
              }}>
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setClientToDelete(null);
                  }}
                  disabled={deletingId !== null}
                  style={{
                    padding: '0.625rem 1.25rem', fontSize: '0.95rem',
                    fontWeight: '500', color: '#374151', backgroundColor: '#fff',
                    border: '1px solid #d1d5db', borderRadius: '0.5rem',
                    cursor: deletingId !== null ? 'not-allowed' : 'pointer',
                    opacity: deletingId !== null ? 0.5 : 1
                  }}
                >
                  {t('clients:cancel')}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deletingId !== null}
                  style={{
                    padding: '0.625rem 1.25rem', fontSize: '0.95rem',
                    fontWeight: '500', color: '#fff', backgroundColor: '#dc2626',
                    border: '1px solid #dc2626', borderRadius: '0.5rem',
                    cursor: deletingId !== null ? 'not-allowed' : 'pointer',
                    opacity: deletingId !== null ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  {deletingId ? (
                    <>
                      <Loader style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                      {t('clients:deleting')}...
                    </>
                  ) : (
                    t('clients:delete')
                  )}
                </button>
              </div>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )
      }

      {/* Export Dialog */}
      {
        showExportDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-600" />
                  {t('clients:full_export_data')}
                </h3>
                <button
                  onClick={() => setShowExportDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>{t('clients:export_includes')}:</strong>
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>✓ {t('clients:all_client_data')}</li>
                  <li>✓ {t('clients:all_messages_with_client_links')}</li>
                  <li>✓ {t('clients:all_records_with_client_links')}</li>
                </ul>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {t('clients:select_export_format')}:
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleConfirmExport('csv')}
                  disabled={exporting}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  CSV ({t('clients:universal_format')})
                </button>

                <button
                  onClick={() => handleConfirmExport('excel')}
                  disabled={exporting}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  Excel ({t('clients:separate_sheets')})
                </button>
              </div>

              {exporting && (
                <div className="mt-4 flex items-center justify-center gap-2 text-gray-600">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t('clients:preparing_file')}</span>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* ✅ НОВОЕ: Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={handleCloseImportDialog}>
        <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              {t('clients:import_clients')}
            </DialogTitle>
          </DialogHeader>

          {!importResults ? (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {/* Поддерживаемые форматы */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 font-medium mb-2">
                    📋 {t('clients:import_supported_formats')}:
                  </p>
                  <p className="text-sm text-blue-800">
                    • {t('clients:import_csv')}
                  </p>
                </div>

                {/* Названия колонок */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-900 font-medium mb-2">
                    📊 {t('clients:import_column_names')}:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
                    <div>• <strong>{t('clients:import_column_name')}</strong></div>
                    <div>• {t('clients:import_column_phone')}</div>
                    <div>• {t('clients:import_column_email')}</div>
                    <div>• {t('clients:import_column_category')}</div>
                    <div>• {t('clients:import_column_instagram')}</div>
                    <div>• {t('clients:import_column_notes')}</div>
                  </div>
                </div>

                {/* Важная информация */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-900 font-medium mb-2">
                    ⚡ {t('clients:import_important_info')}:
                  </p>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>✓ {t('clients:import_column_order')}</li>
                    <li>✓ {t('clients:import_not_all_columns')}</li>
                    <li>✓ {t('clients:import_empty_fields')}</li>
                    <li>✓ {t('clients:import_duplicates')}</li>
                  </ul>
                </div>

                {/* Пример структуры */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-900 font-medium mb-2">
                    💡 {t('clients:import_example_structure')}:
                  </p>
                  <div className="bg-white p-2 rounded border border-gray-300 font-mono text-xs">
                    <div className="text-gray-600">Имя, Телефон, Email</div>
                    <div className="text-gray-800">Анна, +971501234567, anna@example.com</div>
                    <div className="text-gray-800">Елена, +971507654321,</div>
                  </div>
                </div>


                {/* Выбор файла */}
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImportFile(file);
                      }
                    }}
                    style={{ display: 'none' }}
                  />

                  {!importFile ? (
                    <div className="text-center">
                      <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-4">
                        {t('clients:import_select_file')}
                      </p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="bg-white"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {t('clients:choose_file')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 flex-1">
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{importFile.name}</p>
                          <p className="text-xs text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleRemoveFile}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Кнопки действий */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button
                    onClick={handleCloseImportDialog}
                    variant="outline"
                  >
                    {t('clients:cancel')}
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={!importFile || importing}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
                    style={{ minWidth: '150px' }}
                  >
                    {importing ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        {t('clients:import_importing')}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Загрузить
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-lg font-bold text-green-900 mb-2">
                    ✅ {t('clients:import_completed')}
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {importResults.created || 0}
                      </p>
                      <p className="text-sm text-gray-600">{t('clients:import_created')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {importResults.updated || 0}
                      </p>
                      <p className="text-sm text-gray-600">{t('clients:import_updated')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-600">
                        {importResults.unchanged || 0}
                      </p>
                      <p className="text-sm text-gray-600">{t('clients:import_unchanged')}</p>
                    </div>
                  </div>
                </div>

                {importResults.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <p className="text-sm font-medium text-red-900 mb-2">
                      ⚠️ {t('clients:import_error_list')}:
                    </p>
                    <ul className="text-sm text-red-800 space-y-1">
                      {importResults.errors.map((err: any, idx: number) => (
                        <li key={idx}>
                          <span className="font-medium">{t('clients:import_row')} {err.row}:</span>{' '}
                          {err.reason || err.error}
                          {err.name && <span className="text-gray-600"> ({err.name})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Кнопка закрытия после импорта */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleCloseImportDialog}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {t('clients:import_close')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
}