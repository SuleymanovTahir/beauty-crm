// /frontend/src/pages/admin/Clients.tsx
// frontend/src/pages/admin/Clients.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Upload,
  Crown,
  UserPlus,
  UserCheck,
  ChevronDown
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
import { PeriodFilterSelect } from '../../components/shared/PeriodFilterSelect';
import { useClientStatuses } from '../../hooks/useStatuses';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import { Pagination } from '../../components/shared/Pagination';
import { useCurrency } from '../../hooks/useSalonSettings';

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
  total_bookings: number;
  total_spend: number;
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
  const { t, i18n } = useTranslation(['admin/clients', 'common']);
  const { formatCurrency } = useCurrency();
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
  const [showFilters, setShowFilters] = useState(false);
  const [showActions, setShowActions] = useState(false);
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
  const currentUser = useMemo(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }, []);
  const isSales = currentUser?.role === 'sales';

  // Sorting states
  const [sortField, setSortField] = useState<'name' | 'phone' | 'status' | 'lifetime_value' | 'last_contact' | 'first_contact' | 'total_messages' | 'total_bookings' | 'temperature'>('last_contact');
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
          aValue = parseFloat(String(a.total_spend || a.lifetime_value || 0));
          bValue = parseFloat(String(b.total_spend || b.lifetime_value || 0));
          break;
        case 'total_messages':
          aValue = parseInt(String(a.total_messages || 0));
          bValue = parseInt(String(b.total_messages || 0));
          break;
        case 'total_bookings':
          aValue = parseInt(String(a.total_bookings || 0));
          bValue = parseInt(String(b.total_bookings || 0));
          break;
        case 'last_contact':
          aValue = new Date(a.last_contact || 0).getTime();
          bValue = new Date(b.last_contact || 0).getTime();
          break;
        case 'temperature':
          aValue = (a.temperature || '').toLowerCase();
          bValue = (b.temperature || '').toLowerCase();
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
  const handleSort = (field: 'name' | 'phone' | 'status' | 'lifetime_value' | 'last_contact' | 'first_contact' | 'total_messages' | 'total_bookings' | 'temperature') => {
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

    if (!window.confirm(t('confirm_bulk_delete', { count: selectedClients.size, defaultValue: `Delete ${selectedClients.size} clients?` }))) {
      return;
    }

    try {
      setLoading(true);
      await api.bulkAction('delete', Array.from(selectedClients));

      toast.success(t('bulk_delete_success', { defaultValue: 'Selected clients deleted' }));
      setSelectedClients(new Set());
      await loadClients();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting clients';
      toast.error(`${t('error')}: ${message}`);
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
        toast.info(t('no_clients_found'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_loading_clients');
      setError(message);
      toast.error(`${t('error')}: ${message}`);
      console.error("Error loading clients:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
    toast.success(t('data_updated'));
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

      toast.success(t('client_updated'));
      setShowEditDialog(false);
      setEditingClient(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_updating_client');
      toast.error(`❌ Ошибка: ${message}`);
      console.error("Error:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateClient = async () => {
    if (!createForm.name.trim()) {
      toast.error(t('fill_client_name'));
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
        temperature: 'warm',
      });

      toast.success(t('client_created'));
      setShowCreateDialog(false);
      setCreateForm({ name: "", phone: "", instagram_id: "", notes: "" });
      await loadClients();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_creating_client');
      toast.error(`${t('error')}: ${message}`);
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

      toast.success(t('temperature_updated'));
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
      toast.success(t('client_deleted'));
      setShowDeleteDialog(false);
      setClientToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_deleting_client');
      toast.error(`${t('error')}: ${message}`);
      console.error("Error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePinClient = async (clientId: string) => {
    try {
      await api.pinClient(clientId);
      await loadClients();
      toast.success(t('changed'));
    } catch (err) {
      toast.error(t('error'));
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

      toast.success(`${t('file_downloaded')} ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(t('error_exporting'));
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

      toast.success(`${t('full_export')} ${format.toUpperCase()}`);
      setShowExportDialog(false);
    } catch (err) {
      toast.error(t('error_exporting'));
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
          <p className="text-gray-600">{t('loading_clients')}</p>
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
              <p className="text-red-800 font-medium">{t('error_loading_clients')}</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadClients} className="mt-4 bg-red-600 hover:bg-red-700">
                {t('try_again')}
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
            {t('title')}
          </h1>
          <p className="text-gray-600">{filteredClients.length} {t('total_clients')}</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {t('refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8">
        <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1 md:mb-2">{t('total_clients')}</p>
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-0.5 md:mb-1">{stats.total}</h3>
              <p className="text-[10px] md:text-xs text-gray-500">
                {period === 'all' ? t('common:all_time') :
                  period === 'today' ? t('common:for_today') :
                    period === 'custom' ? `${dateFrom} - ${dateTo}` :
                      t('common:for_period', { days: period })}
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1 md:mb-2">{t('vip_clients')}</p>
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-0.5 md:mb-1">{stats.vip}</h3>
              <p className="text-[10px] md:text-xs text-gray-500">
                {period === 'all' ? t('common:all_time') :
                  period === 'today' ? t('common:for_today') :
                    period === 'custom' ? `${dateFrom} - ${dateTo}` :
                      t('common:for_period', { days: period })}
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-yellow-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1 md:mb-2">{t('new_clients')}</p>
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-0.5 md:mb-1">{stats.new}</h3>
              <p className="text-[10px] md:text-xs text-gray-500">
                {period === 'all' ? t('common:all_time') :
                  period === 'today' ? t('common:for_today') :
                    period === 'custom' ? `${dateFrom} - ${dateTo}` :
                      t('common:for_period', { days: period })}
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1 md:mb-2">{t('active_clients')}</p>
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-0.5 md:mb-1">{stats.active}</h3>
              <p className="text-[10px] md:text-xs text-gray-500">
                {period === 'all' ? t('common:all_time') :
                  period === 'today' ? t('common:for_today') :
                    period === 'custom' ? `${dateFrom} - ${dateTo}` :
                      t('common:for_period', { days: period })}
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 backdrop-blur-xl bg-white/80">
        <div className="flex flex-col gap-4">
          {/* Row 1: Search */}
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[42px] pl-10 pr-4 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all placeholder:text-gray-400 font-bold"
            />
          </div>

          {/* Row 2: Control Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex-[2] min-w-[100px] h-[42px] px-3 bg-[#1e293b] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#334155] active:scale-95 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-gray-200"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить</span>
            </button>

            <button
              onClick={() => {
                setShowFilters(!showFilters);
                if (!showFilters) setShowActions(false);
              }}
              className={`flex-1 h-[42px] px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-all border shadow-sm ${showFilters
                ? 'bg-pink-50 border-pink-200 text-pink-600'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Users className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showFilters ? 'text-pink-500' : 'text-gray-400'}`} />
              <span className="truncate">Фильтры</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {!isSales && (
              <button
                onClick={() => {
                  setShowActions(!showActions);
                  if (!showActions) setShowFilters(false);
                }}
                className={`flex-1 h-[42px] px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-all border shadow-sm ${showActions
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Upload className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showActions ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="truncate">Опции</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showActions ? 'rotate-180' : ''}`} />
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="w-[42px] h-[42px] bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 active:scale-95 disabled:opacity-50 flex items-center justify-center transition-all shadow-sm shrink-0"
              title="Обновить"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Expandable Section: Actions (Import/Export) */}
          {showActions && (
            <div className="pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowImportDialog(true)}
                  disabled={importing}
                  className="h-[42px] w-full bg-white text-gray-700 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-gray-50 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span>Импорт</span>
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
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Статус</span>
                  <StatusSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusConfig}
                    allowAdd={false}
                    showAllOption={true}
                    variant="filter"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Температура</span>
                  <TemperatureFilter
                    value={temperatureFilter}
                    onChange={setTemperatureFilter}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Период</span>
                  <PeriodFilterSelect
                    value={period}
                    onChange={setPeriod}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 mt-4 lg:mt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            {period === 'custom' && (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-1/2 sm:w-40 px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all font-medium"
                />
                <span className="text-gray-400 font-medium">→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-1/2 sm:w-40 px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all font-medium"
                />
              </div>
            )}
          </div>

          {selectedClients.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={loading}
              className="w-full lg:w-auto px-5 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              {t('delete_selected')} ({selectedClients.size})
            </button>
          )}
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
                    className="px-6 py-4 text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    {t('client')} {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('phone')}
                  >
                    {t('contacts')} {sortField === 'phone' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    title={t('total_messages_desc', 'Total messages exchanged')}
                    onClick={() => handleSort('total_messages')}
                  >
                    {t('messages')} {sortField === 'total_messages' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    title={t('total_bookings_desc', 'Total number of bookings')}
                    onClick={() => handleSort('total_bookings')}
                  >
                    {t('bookings')} {sortField === 'total_bookings' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('lifetime_value')}
                  >
                    {t('ltv')} {sortField === 'lifetime_value' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('temperature')}
                  >
                    {t('temperature')} {sortField === 'temperature' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('last_contact')}
                  >
                    {t('last_contact')} {sortField === 'last_contact' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    {t('status')} {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-center text-sm text-gray-600">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedClients.map((client) => (
                  <tr
                    key={client.id}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedClients.has(client.id) ? 'bg-pink-50' : ''}`}
                    onClick={() => navigate(`/crm/clients/${encodeURIComponent(client.username || client.instagram_id)}`)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={(checked) => handleSelectOne(client.id, checked as boolean)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
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
                    <td className="px-6 py-4 text-center">
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
                    <td className="px-6 py-4 text-sm text-gray-900 text-center">{client.total_messages}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-center">{client.total_bookings || 0}</td>

                    <td className="px-6 py-4 text-sm text-green-600 font-medium text-center">
                      {formatCurrency(client.total_spend || client.lifetime_value || 0)}
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <TemperatureSelect
                        value={client.temperature || 'cold'}
                        onChange={(value) => handleTemperatureChange(client.id, value)}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-center">
                      {new Date(client.last_contact).toLocaleDateString(i18n.language)}
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <StatusSelect
                        value={client.status}
                        onChange={async (newStatus) => {
                          try {
                            await api.updateClientStatus(client.id, newStatus);
                            setClients(clients.map(c =>
                              c.id === client.id ? { ...c, status: newStatus } : c
                            ));
                            toast.success(t('status_updated'));
                          } catch (err) {
                            toast.error(t('error_updating_status'));
                          }
                        }}
                        options={statusConfig}
                        allowAdd={false}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/crm/clients/${encodeURIComponent(client.id)}`);
                          }}
                          title={t('view_client_info')}
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
                          title={t('write_message')}
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
                          title={t('pin_client')}
                        >
                          <Pin className={`w-4 h-4 ${client.is_pinned ? 'fill-pink-600 text-pink-600' : ''}`} />
                        </Button>
                        {JSON.parse(localStorage.getItem('user') || '{}').role === 'director' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClient(client.id, client.display_name);
                            }}
                            disabled={deletingId === client.id}
                            title={t('delete_client')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
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
            <p>{t('no_clients_found')}</p>
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
            <DialogTitle>{t('edit_client')}</DialogTitle>
          </DialogHeader>

          <div className="crm-form-content">
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_name">{t('name')}</Label>
                <Input
                  id="edit_name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder={t('name_placeholder')}
                />
              </div>

              <div>
                <Label htmlFor="edit_phone">{t('phone')}</Label>
                <Input
                  id="edit_phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder={t('phone_placeholder')}
                />
              </div>

              <div>
                <Label htmlFor="edit_notes">{t('notes')}</Label>
                <Textarea
                  id="edit_notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder={t('notes_placeholder')}
                  className="min-h-[80px]"
                />
              </div>
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
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={savingEdit}
            >
              {savingEdit ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Client Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('add_client')}</DialogTitle>
          </DialogHeader>

          <div className="crm-form-content">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('name')} *</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder={t('name_placeholder')}
                />
              </div>

              <div>
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder={t('phone_placeholder')}
                />
                <p className="text-xs text-gray-500 mt-1">{t('optional')}</p>
              </div>

              <div>
                <Label htmlFor="instagram">{t('instagram_id')}</Label>
                <Input
                  id="instagram"
                  value={createForm.instagram_id}
                  onChange={(e) => setCreateForm({ ...createForm, instagram_id: e.target.value })}
                  placeholder={t('instagram_id_placeholder')}
                />
                <p className="text-xs text-gray-500 mt-1">{t('optional')}</p>
              </div>

              <div>
                <Label htmlFor="notes">{t('notes')}</Label>
                <Textarea
                  id="notes"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder={t('notes_placeholder')}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creatingClient}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateClient} className="bg-pink-600 hover:bg-pink-700" disabled={creatingClient}>
              {creatingClient ? t('creating') : t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && clientToDelete && (
        <div className="crm-modal-overlay" onClick={() => setShowDeleteDialog(false)}>
          <div className="crm-modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-50 border-b-2 border-red-100 p-6 -m-6 mb-6 rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-red-900">
                  {t('delete_client')}
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-900 font-medium">
                {t('you_are_deleting_client')} <strong className="text-red-600">"{clientToDelete.name}"</strong>
              </p>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900 mb-1">
                      ⚠️ {t('this_action_is_irreversible')}!
                    </p>
                    <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                      <li>{t('all_messages_will_be_deleted')}</li>
                      <li>{t('all_records_will_be_deleted')}</li>
                      <li>{t('history_will_not_be_restored')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="crm-modal-footer mt-8">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setClientToDelete(null);
                }}
                disabled={deletingId !== null}
                className="crm-btn-secondary"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="crm-btn-primary bg-red-600 hover:bg-red-700 border-red-600 flex items-center gap-2"
              >
                {deletingId ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {t('deleting')}...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {t('delete')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {
        showExportDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-600" />
                  {t('full_export_data')}
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
                  <strong>{t('export_includes')}:</strong>
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>✓ {t('all_client_data')}</li>
                  <li>✓ {t('all_messages_with_client_links')}</li>
                  <li>✓ {t('all_records_with_client_links')}</li>
                </ul>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {t('select_export_format')}:
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleConfirmExport('csv')}
                  disabled={exporting}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  CSV ({t('universal_format')})
                </button>

                <button
                  onClick={() => handleConfirmExport('excel')}
                  disabled={exporting}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  Excel ({t('separate_sheets')})
                </button>
              </div>

              {exporting && (
                <div className="mt-4 flex items-center justify-center gap-2 text-gray-600">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t('preparing_file')}</span>
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
              {t('import_clients')}
            </DialogTitle>
          </DialogHeader>

          {!importResults ? (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {/* Поддерживаемые форматы */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 font-medium mb-2">
                    📋 {t('import_supported_formats')}:
                  </p>
                  <p className="text-sm text-blue-800">
                    • {t('import_csv')}
                  </p>
                </div>

                {/* Названия колонок */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-900 font-medium mb-2">
                    📊 {t('import_column_names')}:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
                    <div>• <strong>{t('import_column_name')}</strong></div>
                    <div>• {t('import_column_phone')}</div>
                    <div>• {t('import_column_email')}</div>
                    <div>• {t('import_column_category')}</div>
                    <div>• {t('import_column_instagram')}</div>
                    <div>• {t('import_column_notes')}</div>
                  </div>
                </div>

                {/* Важная информация */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-900 font-medium mb-2">
                    ⚡ {t('import_important_info')}:
                  </p>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>✓ {t('import_column_order')}</li>
                    <li>✓ {t('import_not_all_columns')}</li>
                    <li>✓ {t('import_empty_fields')}</li>
                    <li>✓ {t('import_duplicates')}</li>
                  </ul>
                </div>

                {/* Пример структуры */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-900 font-medium mb-2">
                    💡 {t('import_example_structure')}:
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
                        {t('import_select_file')}
                      </p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="bg-white"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {t('choose_file')}
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
                    {t('cancel')}
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
                        {t('import_importing')}
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
                    ✅ {t('import_completed')}
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {importResults.created || 0}
                      </p>
                      <p className="text-sm text-gray-600">{t('import_created')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {importResults.updated || 0}
                      </p>
                      <p className="text-sm text-gray-600">{t('import_updated')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-600">
                        {importResults.unchanged || 0}
                      </p>
                      <p className="text-sm text-gray-600">{t('import_unchanged')}</p>
                    </div>
                  </div>
                </div>

                {importResults.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <p className="text-sm font-medium text-red-900 mb-2">
                      ⚠️ {t('import_error_list')}:
                    </p>
                    <ul className="text-sm text-red-800 space-y-1">
                      {importResults.errors.map((err: any, idx: number) => (
                        <li key={idx}>
                          <span className="font-medium">{t('import_row')} {err.row}:</span>{' '}
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
                    {t('import_close')}
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