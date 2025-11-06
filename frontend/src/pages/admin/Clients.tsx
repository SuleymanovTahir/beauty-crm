// frontend/src/pages/admin/Clients.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect } from "react";
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
  Edit2
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { PeriodFilter } from '../../components/shared/PeriodFilter';
import { ExportDropdown } from '../../components/shared/ExportDropdown';
import { usePeriodFilter } from '../../hooks/usePeriodFilter';
import { StatusSelect } from '../../components/shared/StatusSelect';
import { useClientStatuses } from '../../hooks/useStatuses';

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
}



export default function Clients() {
  const navigate = useNavigate();
  const { statuses: statusConfig, addStatus: handleAddStatus } = useClientStatuses()
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [period, setPeriod] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  // Export Menu
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const filteredByPeriod = usePeriodFilter({
    items: clients,
    period,
    dateFrom,
    dateTo,
    getItemDate: (client: Client) => client.last_contact
  });

  useEffect(() => {
    const filtered = filteredByPeriod.filter(client => {
      const matchesSearch =
        (client.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.phone || '').includes(searchTerm) ||
        (client.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
    setFilteredClients(filtered);
  }, [searchTerm, statusFilter, filteredByPeriod]);



  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getClients();

      const clientsArray = data.clients || (Array.isArray(data) ? data : []);
      setClients(clientsArray);

      if (clientsArray.length === 0) {
        toast.info("Клиентов не найдено");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка загрузки клиентов";
      setError(message);
      toast.error(`Ошибка: ${message}`);
      console.error("Error loading clients:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
    toast.success("Данные обновлены");
  };

  // ✅ НОВОЕ: Открытие диалога редактирования
  const handleOpenEditDialog = (client: Client) => {
    setEditingClient(client);
    setEditForm({
      name: client.name || '',
      phone: client.phone || '',
      notes: client.notes || ''
    });
    setShowEditDialog(true);
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

      toast.success("✅ Клиент обновлён");
      setShowEditDialog(false);
      setEditingClient(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка обновления";
      toast.error(`❌ Ошибка: ${message}`);
      console.error("Error:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateClient = async () => {
    if (!createForm.name.trim()) {
      toast.error("Заполните имя клиента");
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

      toast.success("Клиент создан ✅");
      setShowCreateDialog(false);
      setCreateForm({ name: "", phone: "", instagram_id: "", notes: "" });
      await loadClients();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка создания";
      toast.error(`❌ Ошибка: ${message}`);
      console.error("Error:", err);
    } finally {
      setCreatingClient(false);
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
      toast.success("✅ Клиент удалён");
      setShowDeleteDialog(false);
      setClientToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка удаления";
      toast.error(`❌ Ошибка: ${message}`);
      console.error("Error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePinClient = async (clientId: string) => {
    try {
      await api.pinClient(clientId);
      await loadClients();
      toast.success('Изменено');
    } catch (err) {
      toast.error('Ошибка');
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

      toast.success(`Файл ${format.toUpperCase()} успешно скачан`);
      setShowExportMenu(false);
    } catch (err) {
      toast.error('Ошибка при экспорте');
    } finally {
      setExporting(false);
    }
  };

  // ДОБАВИТЬ:

  const handleExportFullData = () => {
    setShowExportDialog(true);
  };

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

      toast.success(`Полный экспорт ${format.toUpperCase()} завершен`);
      setShowExportDialog(false);
    } catch (err) {
      toast.error('Ошибка при экспорте');
    } finally {
      setExporting(false);
    }
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
          <p className="text-gray-600">Загрузка клиентов...</p>
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
              <p className="text-red-800 font-medium">Ошибка загрузки</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadClients} className="mt-4 bg-red-600 hover:bg-red-700">
                Попробовать еще раз
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
            База клиентов
          </h1>
          <p className="text-gray-600">{filteredClients.length} клиентов</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Всего клиентов</p>
          <h3 className="text-3xl text-gray-900">{stats.total}</h3>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>VIP клиентов</p>
          <h3 className="text-3xl text-purple-600">{stats.vip}</h3>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Новых клиентов</p>
          <h3 className="text-3xl text-green-600">{stats.new}</h3>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Активных</p>
          <h3 className="text-3xl text-blue-600">{stats.active}</h3>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col gap-3">
          {/* Поиск - всегда на всю ширину */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Поиск по имени, телефону, Instagram..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Вторая строка - фильтры */}
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
              style={{
                paddingRight: '2.5rem',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%236b7280' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '16px 16px',
                appearance: 'none',
              }}
            >
              <option value="all">Все статусы</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <div className="flex-1 min-w-[140px]">
              <PeriodFilter
                period={period}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onPeriodChange={setPeriod}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                showAllOption={true}
              />
            </div>
          </div>

          {/* Третья строка - кнопки действий */}
          <div className="flex flex-wrap gap-2">
            {period === 'custom' && (
              <>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 min-w-[140px]"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 min-w-[140px]"
                />
              </>
            )}

            <Button
              className="bg-pink-600 hover:bg-pink-700 flex-1 sm:flex-initial min-w-[140px]"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Добавить клиента</span>
              <span className="sm:hidden">Клиент</span>
            </Button>

            <div className="flex gap-2 flex-1 sm:flex-initial">
              <ExportDropdown
                onExport={handleExport}
                loading={exporting}
                disabled={exporting}
              />
              <Button
                variant="outline"
                onClick={() => setShowExportDialog(true)}
                disabled={exporting}
                className="border-green-600 text-green-600 hover:bg-green-50 flex-1 sm:flex-initial"
              >
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Полный экспорт</span>
              </Button>
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
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Клиент</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Контакты</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Сообщений</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">LTV</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Последний контакт</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Статус</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {client.is_pinned === 1 && (
                          <Pin className="w-4 h-4 text-pink-600 fill-pink-600" />
                        )}
                        {client.profile_pic && client.profile_pic.trim() !== '' ? (
                          <img
                            src={client.profile_pic}
                            alt={client.display_name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium ${client.profile_pic && client.profile_pic.trim() !== '' ? 'hidden' : ''
                            }`}
                          style={{ display: client.profile_pic && client.profile_pic.trim() !== '' ? 'none' : 'flex' }}
                        >
                          {client.name ? client.name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium">{client.display_name}</p>
                          {client.username && (
                            <p className="text-xs text-gray-500">@{client.username}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{client.phone || "-"}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{client.total_messages}</td>
                    <td className="px-6 py-4 text-sm text-green-600 font-medium">
                      {client.lifetime_value} AED
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
                            toast.success('Статус обновлён');
                          } catch (err) {
                            toast.error('Ошибка обновления статуса');
                          }
                        }}
                        options={statusConfig}
                        allowAdd={true}
                        onAddStatus={handleAddStatus}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/clients/${client.id}`)}
                          title="Просмотр информации о клиенте"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {/* ✅ ДОБАВЛЕНО: Кнопка редактирования */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:bg-blue-50"
                          onClick={() => handleOpenEditDialog(client)}
                          title="Редактировать клиента"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => navigate(`/admin/chat?client_id=${client.id}`)}
                          title="Написать сообщение"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePinClient(client.id)}
                          title="Закрепить клиента"
                        >
                          <Pin className={`w-4 h-4 ${client.is_pinned ? 'fill-pink-600 text-pink-600' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleDeleteClient(client.id, client.display_name)}
                          disabled={deletingId === client.id}
                          title="Удалить клиента"
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
            <p>Клиенты не найдены</p>
          </div>
        )}
      </div>

      {/* ✅ НОВОЕ: Edit Client Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать клиента</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Имя</Label>
              <Input
                id="edit_name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Анна Петрова"
              />
            </div>

            <div>
              <Label htmlFor="edit_phone">Телефон</Label>
              <Input
                id="edit_phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+971 50 123 4567"
              />
            </div>

            <div>
              <Label htmlFor="edit_notes">Заметки</Label>
              <Textarea
                id="edit_notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Добавьте любые заметки о клиенте..."
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
              Отмена
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={savingEdit}
            >
              {savingEdit ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Client Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить нового клиента</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Имя *</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Анна Петрова"
              />
            </div>

            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+971 50 123 4567"
              />
              <p className="text-xs text-gray-500 mt-1">Необязательно</p>
            </div>

            <div>
              <Label htmlFor="instagram">Instagram ID</Label>
              <Input
                id="instagram"
                value={createForm.instagram_id}
                onChange={(e) => setCreateForm({ ...createForm, instagram_id: e.target.value })}
                placeholder="123456789 или @username"
              />
              <p className="text-xs text-gray-500 mt-1">Необязательно, автоматически сгенерируется</p>
            </div>

            <div>
              <Label htmlFor="notes">Заметки</Label>
              <Textarea
                id="notes"
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Добавьте любые заметки о клиенте..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creatingClient}>
              Отмена
            </Button>
            <Button onClick={handleCreateClient} className="bg-pink-600 hover:bg-pink-700" disabled={creatingClient}>
              {creatingClient ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && clientToDelete && (
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
                  Удалить клиента?
                </h3>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '1.5rem' }}>
              <p style={{ color: '#1f2937', marginBottom: '1rem', fontSize: '0.95rem' }}>
                Вы удаляете клиента <strong>"{clientToDelete.name}"</strong>
              </p>

              <div style={{
                backgroundColor: '#fefce8', borderLeft: '4px solid #facc15',
                padding: '1rem', marginBottom: '1rem', borderRadius: '0.5rem'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <AlertCircle style={{ width: '20px', height: '20px', color: '#b45309', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#92400e', marginBottom: '0.5rem' }}>
                      ⚠️ Это действие необратимо!
                    </p>
                    <ul style={{ fontSize: '0.875rem', color: '#92400e', marginLeft: '1rem' }}>
                      <li>✗ Все сообщения будут удалены</li>
                      <li>✗ Все записи будут удалены</li>
                      <li>✗ История не восстановится</li>
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
                Отмена
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
                    Удаляю...
                  </>
                ) : (
                  "Удалить"
                )}
              </button>
            </div>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-green-600" />
                Полный экспорт данных
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
                <strong>Экспорт включает:</strong>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>✓ Все данные клиентов</li>
                <li>✓ Все сообщения с привязкой к клиентам</li>
                <li>✓ Все записи с привязкой к клиентам</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Выберите формат экспорта:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleConfirmExport('csv')}
                disabled={exporting}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                CSV (универсальный формат)
              </button>

              <button
                onClick={() => handleConfirmExport('excel')}
                disabled={exporting}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Excel (с отдельными листами)
              </button>
            </div>

            {exporting && (
              <div className="mt-4 flex items-center justify-center gap-2 text-gray-600">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">Подготовка файла...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}