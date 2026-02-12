// /frontend/src/pages/admin/Broadcasts.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Send, Mail, MessageCircle, Instagram, Loader, Users, AlertCircle, History, Eye, Shield, Bell, Settings, Plus, Trash2, Edit, X, UserCheck, UserX, Newspaper, UserMinus, LayoutTemplate } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../utils/permissions';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog';
import '../../styles/crm-pages.css';

interface BroadcastForm {
  subscription_type: string;
  channels: string[];
  subject: string;
  message: string;
  target_role?: string;
  user_ids?: (number | string)[]; // Can be number (staff) or string (client instagram_id)
  attachment_urls?: string[];
  additional_emails?: string[];
}

interface PreviewData {
  total_users: number;
  by_channel: Record<string, number>;
  users_sample: Array<{
    id: number;
    username: string;
    full_name: string;
    role: string;
    contact: string;
    channel: string;
  }>;
}

interface NotificationTemplate {
  id: number;
  name: string;
  category?: string;
  subject?: string;
  body?: string;
  variables?: string[];
  is_system?: boolean;
}

const getRoleLabel = (
  t: TFunction,
  roleKey: string,
  fallback?: string
) => {
  const defaultValue = fallback ?? roleKey;
  if (roleKey === 'sales') {
    return String(t('common:role_saler', { defaultValue }));
  }
  return String(t(`common:role_${roleKey}`, { defaultValue }));
};

export default function Broadcasts() {
  const { t, i18n } = useTranslation(['admin/broadcasts', 'common']);
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Получаем активную вкладку из URL или используем 'compose' по умолчанию
  const activeTab = searchParams.get('tab') || 'compose';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Используем централизованную систему прав
  const userPermissions = usePermissions(currentUser?.role || 'employee');

  const [showManageTypes, setShowManageTypes] = useState(false);
  const [editingBroadcastUser, setEditingBroadcastUser] = useState<any>(null);

  const [form, setForm] = useState<BroadcastForm>({
    subscription_type: '',
    channels: [],
    subject: '',
    message: '',
    target_role: '',
    user_ids: [],
    attachment_urls: [],
    additional_emails: [],
  });

  const [manualEmailsText] = useState("");

  const [uploadingFile, setUploadingFile] = useState(false);

  const [availableSubscriptions, setAvailableSubscriptions] = useState<Record<string, { name: string; description: string }>>({});
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [users, setUsers] = useState<Array<{ id: number; username: string; full_name: string; role: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [roles, setRoles] = useState<Array<{ key: string; name: string }>>([]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateEditorMode, setTemplateEditorMode] = useState<'create' | 'edit'>('create');
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplateName, setDeletingTemplateName] = useState('');
  const [templateForm, setTemplateForm] = useState<{
    name: string;
    category: string;
    subject: string;
    body: string;
  }>({
    name: '',
    category: 'transactional',
    subject: '',
    body: '',
  });

  // Новые состояния для добавления контактов вручную
  const [showAddManualContacts, setShowAddManualContacts] = useState(false);
  const [manualContacts, setManualContacts] = useState<Array<{ name?: string; email?: string; telegram?: string; instagram?: string; whatsapp?: string }>>([]);
  const [manualContactForm, setManualContactForm] = useState<{ name?: string; email?: string; telegram?: string; instagram?: string; whatsapp?: string }>({});
  const [showImportContactsFile, setShowImportContactsFile] = useState(false);
  const [importFileText, setImportFileText] = useState("");

  // Newsletter subscribers state
  const [subscribers, setSubscribers] = useState<Array<{ id: number; email: string; name?: string; is_active: boolean; created_at: string }>>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [subscribersCount, setSubscribersCount] = useState({ total: 0, active: 0 });
  const [showInactive, setShowInactive] = useState(false);

  // Unsubscribed users state
  const [unsubscribed, setUnsubscribed] = useState<any[]>([]);
  const [loadingUnsubscribed, setLoadingUnsubscribed] = useState(false);
  const [clearPeriod, setClearPeriod] = useState('all');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<number[]>([]);
  const [deletingHistory, setDeletingHistory] = useState(false);

  const [showAddSubscriber, setShowAddSubscriber] = useState(false);
  const [showImportSubscribers, setShowImportSubscribers] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<any | null>(null);
  const [importText, setImportText] = useState("");
  const [subscriberForm, setSubscriberForm] = useState({ email: '', name: '' });

  useEffect(() => {
    // Параллельная загрузка для ускорения
    Promise.all([
      loadSubscriptions(),
      loadHistory(),
      loadRoles(),
      loadNotificationTemplates(),
      loadUnsubscribed()
    ]).catch(error => {
      console.error('Error loading broadcasts data:', error);
    });
  }, []);

  // Загружаем подписчиков при переходе на вкладку
  useEffect(() => {
    if (activeTab === 'subscribers' && subscribers.length === 0) {
      loadSubscribers();
    }
    if (activeTab === 'unsubscribed' && unsubscribed.length === 0) {
      loadUnsubscribed();
    }
  }, [activeTab]);

  useEffect(() => {
    setSelectedHistoryIds((previousState) => previousState.filter((historyId) => history.some((item) => item.id === historyId)));
  }, [history]);

  const loadUnsubscribed = async () => {
    try {
      setLoadingUnsubscribed(true);
      const response = await api.getUnsubscribedUsers();
      setUnsubscribed(response.unsubscribed || []);
    } catch (err) {
      console.error('Error loading unsubscribed users:', err);
    } finally {
      setLoadingUnsubscribed(false);
    }
  };

  // Перезагружаем пользователей при смене языка
  useEffect(() => {
    loadUsers();
  }, [i18n.language]);

  const loadRoles = async () => {
    try {
      const response = await api.getRoles();
      setRoles(response.roles);
    } catch (err) {
      console.error('Error loading roles:', err);
    }
  };

  const loadNotificationTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await api.getNotificationTemplates();
      if (Array.isArray(response?.templates)) {
        setNotificationTemplates(response.templates);
      } else {
        setNotificationTemplates([]);
      }
    } catch (err) {
      setNotificationTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleApplyTemplate = (templateName: string) => {
    const template = notificationTemplates.find((item) => item.name === templateName);
    if (template === undefined) {
      return;
    }

    setForm((previousState) => ({
      ...previousState,
      subject: previousState.channels.includes('email') ? (template.subject ?? previousState.subject) : previousState.subject,
      message: template.body ?? previousState.message,
    }));
    toast.success(t('template_applied', { defaultValue: 'Шаблон вставлен' }));
  };

  const openCreateTemplateEditor = () => {
    setTemplateEditorMode('create');
    setEditingTemplateId(null);
    setTemplateForm({
      name: '',
      category: 'transactional',
      subject: '',
      body: '',
    });
    setShowTemplateEditor(true);
  };

  const openEditTemplateEditor = (template: NotificationTemplate) => {
    setTemplateEditorMode('edit');
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      category: template.category ?? 'transactional',
      subject: template.subject ?? '',
      body: template.body ?? '',
    });
    setShowTemplateEditor(true);
  };

  const handleSaveTemplate = async () => {
    const normalizedName = templateForm.name.trim();
    const normalizedBody = templateForm.body.trim();

    if (normalizedName.length === 0) {
      toast.error(t('template_name_required', { defaultValue: 'Введите название шаблона' }));
      return;
    }
    if (normalizedBody.length === 0) {
      toast.error(t('template_body_required', { defaultValue: 'Введите текст шаблона' }));
      return;
    }

    try {
      setSavingTemplate(true);
      const payload = {
        name: normalizedName,
        category: templateForm.category.trim().length > 0 ? templateForm.category : 'transactional',
        subject: templateForm.subject,
        body: normalizedBody,
      };

      if (templateEditorMode === 'edit' && editingTemplateId !== null) {
        await api.updateNotificationTemplate(editingTemplateId, payload);
      } else {
        await api.saveNotificationTemplate(payload);
      }

      toast.success(t('template_saved', { defaultValue: 'Шаблон сохранен' }));
      setShowTemplateEditor(false);
      await loadNotificationTemplates();
    } catch (err: any) {
      toast.error(err.message ?? t('common:error_saving', { defaultValue: 'Ошибка сохранения' }));
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (template: NotificationTemplate) => {
    if (template.is_system === true) {
      toast.error(t('template_system_cannot_delete', { defaultValue: 'Системный шаблон нельзя удалить' }));
      return;
    }

    if (!confirm(t('template_delete_confirm', { defaultValue: 'Удалить этот шаблон?' }))) {
      return;
    }

    try {
      setDeletingTemplateName(template.name);
      await api.deleteNotificationTemplate(template.name);
      toast.success(t('template_deleted', { defaultValue: 'Шаблон удален' }));
      await loadNotificationTemplates();
    } catch (err: any) {
      toast.error(err.message ?? t('common:error_deleting', { defaultValue: 'Ошибка удаления' }));
    } finally {
      setDeletingTemplateName('');
    }
  };

  const toggleHistorySelection = (historyId: number) => {
    setSelectedHistoryIds((previousState) => {
      if (previousState.includes(historyId)) {
        return previousState.filter((itemId) => itemId !== historyId);
      }
      return [...previousState, historyId];
    });
  };

  const toggleSelectAllHistory = () => {
    const historyIds = history.map((item) => item.id).filter((id) => Number.isFinite(id));
    if (historyIds.length === 0) {
      return;
    }
    const allSelected = historyIds.every((id) => selectedHistoryIds.includes(id));
    if (allSelected) {
      setSelectedHistoryIds([]);
      return;
    }
    setSelectedHistoryIds(historyIds);
  };

  const handleDeleteHistoryEntries = async (ids: number[]) => {
    if (ids.length === 0) {
      return;
    }
    if (!confirm(t('confirm_delete_history_selected', { defaultValue: 'Удалить выбранные записи истории?' }))) {
      return;
    }

    try {
      setDeletingHistory(true);
      const response = await api.deleteBroadcastHistoryEntries(ids);
      const deletedCount = typeof response.count === 'number' ? response.count : ids.length;
      toast.success(t('history_selected_deleted', {
        defaultValue: 'Удалено записей: {{count}}',
        count: deletedCount,
      }));
      setSelectedHistoryIds([]);
      await loadHistory();
    } catch (err: any) {
      toast.error(err.message ?? t('error_clearing_history', { defaultValue: 'Ошибка очистки истории' }));
    } finally {
      setDeletingHistory(false);
    }
  };

  const loadSubscribers = async (includeInactive: boolean = showInactive) => {
    try {
      setLoadingSubscribers(true);
      const response = await api.getNewsletterSubscribers(includeInactive);
      setSubscribers(response.subscribers);
      setSubscribersCount({ total: response.total, active: response.active });
    } catch (err) {
      console.error('Error loading subscribers:', err);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const handleToggleSubscriber = async (subscriberId: number, isActive: boolean) => {
    try {
      await api.updateNewsletterSubscriber(subscriberId, !isActive);
      toast.success(isActive ? t('subscriber_deactivated', 'Подписчик отключен') : t('subscriber_activated', 'Подписчик активирован'));
      loadSubscribers();
    } catch (err) {
      toast.error(t('error_updating_subscriber', 'Ошибка обновления подписчика'));
    }
  };

  const handleDeleteSubscriber = async (subscriberId: number) => {
    if (!confirm(t('confirm_delete_subscriber', 'Удалить подписчика?'))) return;
    try {
      await api.deleteNewsletterSubscriber(subscriberId);
      toast.success(t('subscriber_deleted', 'Подписчик удален'));
      loadSubscribers();
    } catch (err) {
      toast.error(t('error_deleting_subscriber', 'Ошибка удаления подписчика'));
    }
  };

  const handleAddSubscriber = async () => {
    if (!subscriberForm.email) return toast.error(t('error_fill_all_fields'));
    try {
      setSending(true);
      await api.addNewsletterSubscriber({
        email: subscriberForm.email,
        name: subscriberForm.name,
        source: 'admin_manual'
      });
      toast.success(t('subscriber_added', 'Подписчик добавлен'));
      setShowAddSubscriber(false);
      setSubscriberForm({ email: '', name: '' });
      loadSubscribers();
    } catch (err: any) {
      toast.error(err.message || t('error_adding_subscriber'));
    } finally {
      setSending(false);
    }
  };

  const handleUpdateSubscriberData = async () => {
    if (!subscriberForm.email || !editingSubscriber) return;
    try {
      setSending(true);
      await api.updateNewsletterSubscriberData(editingSubscriber.id, {
        email: subscriberForm.email,
        name: subscriberForm.name
      });
      toast.success(t('subscriber_updated', 'Данные обновлены'));
      setEditingSubscriber(null);
      setSubscriberForm({ email: '', name: '' });
      loadSubscribers();
    } catch (err: any) {
      toast.error(err.message || t('error_updating_subscriber'));
    } finally {
      setSending(false);
    }
  };

  const handleImportSubscribers = async () => {
    if (!importText.trim()) return;
    try {
      setSending(true);
      const lines = importText.split('\n').filter(l => l.trim());
      const subs = lines.map(line => {
        // Support formats: "Email", "Email, Name", "Name, Email"
        const parts = line.split(/[,\t]/).map(p => p.trim());
        if (parts.length >= 2) {
          // Check which part is email
          if (parts[0].includes('@')) return { email: parts[0], name: parts[1] };
          if (parts[1].includes('@')) return { email: parts[1], name: parts[0] };
          return { email: parts[0], name: parts[1] }; // Fallback
        }
        return { email: parts[0] };
      }).filter(s => s.email && s.email.includes('@'));

      if (subs.length === 0) return toast.error(t('no_valid_emails', 'Не найдено корректных email'));

      const result = await api.importNewsletterSubscribers(subs) as any;
      toast.success(t('imported_count', 'Импортировано {{count}} подписчиков', { count: result.count }));
      setShowImportSubscribers(false);
      setImportText("");
      loadSubscribers();
    } catch (err: any) {
      toast.error(err.message || t('error_importing'));
    } finally {
      setSending(false);
    }
  };

  const loadSubscriptions = async () => {
    try {
      // For admins on the broadcast page, we want ALL types, not just their own role types
      const types = await api.getSubscriptionTypes();
      console.log('Available subscriptions from DB:', types);

      const formatted: Record<string, { name: string; description: string }> = {};
      types.forEach((t: any) => {
        if (t.is_active) {
          formatted[t.key] = {
            name: t.name || t.name || t.key,
            description: t.description || t.description || ''
          };
        }
      });

      setAvailableSubscriptions(formatted);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      // Fallback to personal subscriptions if DB fetch fails
      try {
        const response = await api.getUserSubscriptions();
        setAvailableSubscriptions(response.available_types);
      } catch (e) {
        console.error('Final fallback failed:', e);
      }
    }
  };

  const handleClearHistory = async (period: string) => {
    if (!confirm(t('confirm_clear_history', 'Вы уверены, что хотите очистить историю за выбранный период?'))) return;
    try {
      await api.delete(`/api/broadcasts/history/clear?period=${period}`);
      toast.success(t('history_cleared', 'История очищена'));
      setSelectedHistoryIds([]);
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || t('error_clearing_history', 'Ошибка при очистке истории'));
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.getBroadcastHistory();
      setHistory(response.history);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadUsers = async () => {
    // We need subscription type ONLY if we are targeting 'client' or 'all' to check unsubscriptions.
    // However, backend now handles optional subscription_type for staff.
    // But for clarity, let's allow fetching if target_role is set (even without sub type) OR if sub type is set.

    // If target is 'client' or 'all', we really should have a subscription type for accurate filtering, 
    // but let's allow "raw" listing if user insists (backend handles it).
    // if (!form.subscription_type && !form.target_role) {
    //   // If nothing selected, don't load everyone immediately to avoid spam/load
    //   setUsers([]);
    //   return;
    // }

    try {
      setLoadingUsers(true);
      console.log('Loading users for broadcast selection:', form.subscription_type, form.target_role);

      const response = await api.getBroadcastUsers(form.subscription_type || '', form.target_role || undefined, i18n.language);
      console.log('Broadcast users response:', response);

      const usersArray = response.users || [];
      setUsers(usersArray);
    } catch (err) {
      console.error('Error loading users:', err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Reload users when subscription type or role changes
  useEffect(() => {
    loadUsers();
  }, [form.subscription_type, form.target_role]);

  // Filter users by target role (do NOT auto-select - let user manually choose)
  // This effect is disabled to prevent overriding manual user selection
  // useEffect(() => {
  //   if (form.target_role && form.target_role !== 'all') {
  //     const filteredUserIds = users
  //       .filter(u => u.role === form.target_role)
  //       .map(u => u.id);
  //     setForm(prev => ({ ...prev, user_ids: filteredUserIds }));
  //   } else if (form.target_role === '' || form.target_role === 'all') {
  //     // Clear selection when "all users" selected
  //     setForm(prev => ({ ...prev, user_ids: [] }));
  //   }
  // }, [form.target_role, users]);

  const handleChannelToggle = (channel: string) => {
    if (form.channels.includes(channel)) {
      setForm({ ...form, channels: form.channels.filter(c => c !== channel) });
    } else {
      setForm({ ...form, channels: [...form.channels, channel] });
    }
  };

  const handleUserToggle = (userId: number) => {
    const currentIds = form.user_ids || [];
    if (currentIds.includes(userId)) {
      setForm({ ...form, user_ids: currentIds.filter(id => id !== userId) });
    } else {
      setForm({ ...form, user_ids: [...currentIds, userId] });
    }
  };

  const handleSelectAllUsers = () => {
    const allUserIds = users.map(u => u.id);
    const areAllSelected = allUserIds.length > 0 && allUserIds.every(id => (form.user_ids || []).includes(id));

    if (areAllSelected) {
      setForm({ ...form, user_ids: [] });
    } else {
      setForm({ ...form, user_ids: allUserIds });
    }
  };

  const handlePreview = async () => {
    if (!form.subscription_type) {
      toast.error(t('select_subscription_type'));
      return;
    }

    if (form.channels.length === 0) {
      toast.error(t('select_channel_error'));
      return;
    }

    try {
      setLoadingPreview(true);
      const data = await api.previewBroadcast(form);
      setPreview(data);
      toast.success(t('preview_found', { count: data.total_users }));
    } catch (err: any) {
      toast.error(err.message || t('error_preview'));
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSendClick = async () => {
    // Process manual emails
    const emailsList = manualEmailsText
      .split(/[\n,]/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    setForm(prev => ({ ...prev, additional_emails: emailsList }));

    const newErrors: Record<string, boolean> = {};
    if (!form.subscription_type) newErrors.subscription_type = true;
    if (!form.message) newErrors.message = true;
    if (form.channels.includes('email') && !form.subject) newErrors.subject = true;
    if (form.channels.length === 0) newErrors.channels = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(t('fill_required_fields'));
      if (newErrors.channels) toast.error(t('select_channel_error'));
      return;
    }

    // Ensure we have preview data before confirming
    if (!preview) {
      try {
        setLoadingPreview(true);
        const data = await api.previewBroadcast(form);
        setPreview(data);
      } catch (err: any) {
        toast.error(err.message || t('error_preview'));
        return;
      } finally {
        setLoadingPreview(false);
      }
    }

    setShowConfirmDialog(true);
  };

  const performSend = async () => {
    try {
      setSending(true);

      // Добавляем ручные контакты в форму перед отправкой
      const formWithManualContacts = {
        ...form,
        manual_contacts: manualContacts
      };

      const response = await api.sendBroadcast(formWithManualContacts);
      toast.success(response.message);

      // Триггерим событие для обновления уведомлений у всех пользователей
      window.dispatchEvent(new CustomEvent('notifications-updated'));

      // Reset form
      setForm({
        subscription_type: '',
        channels: [],
        subject: '',
        message: '',
        target_role: '',
        user_ids: [],
        attachment_urls: [],
      });
      setManualContacts([]); // Очищаем ручные контакты
      setPreview(null);
      setShowConfirmDialog(false);
      await loadHistory();
    } catch (err: any) {
      toast.error(err.message || t('common:error_sending_message', 'Ошибка отправки'));
    } finally {
      setSending(false);
    }
  };

  // Проверка доступа к рассылкам
  if (!userPermissions.canSendBroadcasts) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 max-w-md text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('access_denied_title')}</h2>
          <p className="text-gray-600">
            {t('access_denied_message')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <Send className="w-8 h-8 text-pink-600" />
          {t('title')}
        </h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            {t('create_broadcast')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            {t('history')}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            {t('templates_tab', { defaultValue: 'Шаблоны' })}
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="flex items-center gap-2" onClick={() => loadSubscribers()}>
            <Newspaper className="w-4 h-4" />
            {t('subscribers')}
          </TabsTrigger>
          <TabsTrigger value="unsubscribed" className="flex items-center gap-2" onClick={() => loadUnsubscribed()}>
            <UserMinus className="w-4 h-4" />
            {t('unsubscribed_tab', 'Отписавшиеся')}
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b pb-4">{t('broadcast_params')}</h2>

              <div className="space-y-8">
                {/* Channels - FIRST */}
                <div>
                  <Label className={`mb-3.5 block text-sm font-semibold ${errors.channels ? 'text-red-500' : 'text-gray-700'}`}>{t('channels')}</Label>
                  <div className={`flex flex-wrap gap-4 p-5 rounded-2xl border-2 transition-all ${errors.channels ? 'border-red-200 bg-red-50' : 'border-gray-50 bg-gray-50/50'}`}>
                    <button
                      type="button"
                      onClick={() => handleChannelToggle('email')}
                      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 font-medium transition-all ${form.channels.includes('email')
                        ? 'border-pink-500 bg-white text-pink-600 shadow-sm'
                        : 'border-white bg-white text-gray-500 hover:border-gray-200 shadow-sm'
                        }`}
                    >
                      <Mail className="w-5 h-5" />
                      {t('channel_email', 'Email')}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChannelToggle('telegram')}
                      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 font-medium transition-all ${form.channels.includes('telegram')
                        ? 'border-green-500 bg-white text-green-600 shadow-sm'
                        : 'border-white bg-white text-gray-500 hover:border-gray-200 shadow-sm'
                        }`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      {t('channel_telegram', 'Telegram')}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChannelToggle('instagram')}
                      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 font-medium transition-all ${form.channels.includes('instagram')
                        ? 'border-blue-500 bg-white text-blue-600 shadow-sm'
                        : 'border-white bg-white text-gray-500 hover:border-gray-200 shadow-sm'
                        }`}
                    >
                      <Instagram className="w-5 h-5" />
                      {t('channel_instagram', 'Instagram')}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChannelToggle('notification')}
                      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 font-medium transition-all ${form.channels.includes('notification')
                        ? 'border-pink-500 bg-white text-pink-600 shadow-sm'
                        : 'border-white bg-white text-gray-500 hover:border-gray-200 shadow-sm'
                        }`}
                    >
                      <Bell className="w-5 h-5" />
                      {t('channels_notification', 'Уведомления')}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <Label htmlFor="subscription_type" className={`text-sm font-semibold ${errors.subscription_type ? 'text-red-500' : 'text-gray-700'}`}>{t('subscription_type')}</Label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowManageTypes(true);
                      }}
                      className="text-pink-600 hover:text-pink-700 flex items-center gap-1 text-sm font-medium relative z-10"
                    >
                      <Settings className="w-4 h-4" />
                      {t('configure_types')}
                    </button>
                  </div>
                  <Select
                    value={form.subscription_type}
                    onValueChange={(value) => {
                      setForm({ ...form, subscription_type: value, user_ids: [] }); // this triggers useEffect([form.subscription_type])
                      if (errors.subscription_type) setErrors({ ...errors, subscription_type: false });
                    }}
                  >
                    <SelectTrigger id="subscription_type" className={errors.subscription_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder={t('select_type')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(availableSubscriptions)
                        .filter(([key]) => key && key.trim() !== '')
                        .map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex flex-col">
                              <span className="font-medium">{t(info.name)}</span>
                              <span className="text-xs text-gray-500">{t(info.description)}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject - Only show when email is selected */}
                {form.channels.includes('email') && (
                  <div>
                    <Label htmlFor="subject" className={`block mb-2.5 text-sm font-semibold ${errors.subject ? 'text-red-500' : 'text-gray-700'}`}>{t('subject')}</Label>
                    <Input
                      id="subject"
                      className={`rounded-xl h-12 ${errors.subject ? 'border-red-500 bg-red-50/30' : 'bg-gray-50/30 border-gray-200 focus:bg-white transiton-all'}`}
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder={t('placeholder_subject')}
                    />
                  </div>
                )}

                {/* Target Role */}
                <div>
                  <Label htmlFor="target_role" className="block mb-2.5 text-sm font-semibold text-gray-700">{t('target_role')}</Label>
                  <Select
                    value={form.target_role || 'all'}
                    onValueChange={(value) => {
                      setForm({ ...form, target_role: value === 'all' ? '' : value, user_ids: [] });
                      // Trigger reload of users is handled by useEffect dependency on form.target_role
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('all_users')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_users')}</SelectItem>
                      <SelectItem value="client" className="font-semibold text-pink-600">{t('role_client', 'Клиент')}</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.key} value={role.key}>
                          {getRoleLabel(t, role.key, role.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* User Selection */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowUserSelection(!showUserSelection)}
                    className="w-full flex items-center justify-between text-sm font-medium text-gray-700 mb-3 hover:text-gray-900 transition-colors"
                  >
                    <span>{t('optional_recipients')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{t('recipients_selected', { count: (form.user_ids || []).length })}</span>
                      <svg className={`w-5 h-5 transition-transform ${showUserSelection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {showUserSelection && (
                    <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              users.length > 0 && users.every(u => (form.user_ids || []).includes(u.id))
                            }
                            onChange={handleSelectAllUsers}
                            className="w-4 h-4 text-pink-600 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {t('select_all', { count: users.length })}
                          </span>
                        </label>
                      </div>
                      {loadingUsers ? (
                        <div className="flex justify-center py-4">
                          <Loader className="w-5 h-5 animate-spin text-pink-600" />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {users
                            .filter(user => {
                              // Фильтруем по выбранной роли
                              if (!form.target_role || form.target_role === 'all') return true;
                              return user.role === form.target_role;
                            })
                            .map((user) => (
                              <label
                                key={user.id}
                                className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={(form.user_ids || []).includes(user.id)}
                                  onChange={() => handleUserToggle(user.id)}
                                  className="w-4 h-4 text-pink-600 rounded"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                  <p className="text-xs text-gray-500">@{user.username} · {user.role}</p>
                                </div>
                              </label>
                            ))}
                          {/* Показываем добавленные вручную контакты */}
                          {manualContacts.map((contact, idx) => (
                            <label
                              key={`manual-${idx}`}
                              className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors bg-blue-50 border border-blue-200"
                            >
                              <input
                                type="checkbox"
                                checked={true}
                                className="w-4 h-4 text-pink-600 rounded"
                                readOnly
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{contact.name || t('manual_contact', 'Ручной контакт')}</p>
                                <p className="text-xs text-gray-500">
                                  {contact.email && `Email: ${contact.email}`}
                                  {contact.telegram && ` · Telegram: ${contact.telegram}`}
                                  {contact.instagram && ` · Instagram: ${contact.instagram}`}
                                  {contact.whatsapp && ` · WhatsApp: ${contact.whatsapp}`}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setManualContacts(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-red-500 hover:text-red-700 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {t('optional_recipients_hint')}
                  </p>
                </div>

                {/* Добавление контактов вручную */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold text-gray-700">
                      {t('manual_contacts', 'Добавить контакты вручную')}
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowImportContactsFile(true)}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {t('import_file', 'Загрузить файл')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddManualContacts(true)}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {t('add_contact', 'Добавить контакт')}
                      </Button>
                    </div>
                  </div>
                  {manualContacts.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-700 font-medium mb-2">
                        {t('manual_contacts_added', 'Добавлено контактов: {{count}}', { count: manualContacts.length })}
                      </p>
                      <div className="space-y-1">
                        {manualContacts.slice(0, 3).map((contact, idx) => (
                          <p key={idx} className="text-xs text-blue-600">
                            {contact.name || t('no_name', 'Без имени')} -
                            {contact.email && ` ${contact.email}`}
                            {contact.telegram && ` · @${contact.telegram}`}
                            {contact.instagram && ` · IG: ${contact.instagram}`}
                          </p>
                        ))}
                        {manualContacts.length > 3 && (
                          <p className="text-xs text-blue-500 italic">
                            {t('and_more', '...и еще {{count}}', { count: manualContacts.length - 3 })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div>
                  <Label htmlFor="message" className={`block mb-2.5 text-sm font-semibold ${errors.message ? 'text-red-500' : 'text-gray-700'}`}>{t('message')}</Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => {
                      setForm({ ...form, message: e.target.value });
                      if (errors.message) setErrors({ ...errors, message: false });
                    }}
                    placeholder={t('placeholder_message')}
                    className={`min-h-[180px] rounded-2xl p-4 text-base ${errors.message ? 'border-red-500 bg-red-50/30 ring-red-100' : 'bg-gray-50/50 border-gray-200 focus:bg-white transition-all'}`}
                  />
                  <div className="flex justify-between items-center mt-2 px-1">
                    <p className={`text-xs font-medium ${form.message.length > 500 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {t('common:characters_count', { count: form.message.length })}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">{t('telegram_limit_hint', { count: 4096 })}</p>
                  </div>
                </div>

                {/* File Attachments */}
                <div>
                  <Label className="block mb-2.5 text-sm font-semibold text-gray-700">
                    {t('attachments', 'Прикрепленные файлы')} <span className="text-gray-400 font-normal text-xs">(опционально)</span>
                  </Label>
                  <div className="space-y-2">
                    {form.attachment_urls && form.attachment_urls.length > 0 && (
                      <div className="space-y-2">
                        {form.attachment_urls.map((url, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <span className="flex-1 text-sm text-gray-700 truncate">{url.split('/').pop()}</span>
                            <button
                              onClick={() => {
                                const newUrls = form.attachment_urls?.filter((_, i) => i !== index);
                                setForm({ ...form, attachment_urls: newUrls });
                              }}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          // Проверка размера файла (макс 10MB)
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error(t('file_too_large', { max: 10 }));
                            return;
                          }

                          setUploadingFile(true);
                          try {
                            const formData = new FormData();
                            formData.append('file', file);

                            const response = await fetch('/api/upload', {
                              method: 'POST',
                              body: formData,
                              credentials: 'include'
                            });

                            if (!response.ok) throw new Error('Upload failed');

                            const data = await response.json();
                            const fileUrl = data.file_url || data.url;

                            setForm({
                              ...form,
                              attachment_urls: [...(form.attachment_urls || []), fileUrl]
                            });

                            toast.success(t('file_uploaded'));
                          } catch (error) {
                            console.error('Upload error:', error);
                            toast.error(t('error_uploading_file'));
                          } finally {
                            setUploadingFile(false);
                            e.target.value = '';
                          }
                        }}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      >
                        {uploadingFile ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            {t('common:loading')}
                          </>
                        ) : (
                          <>
                            <Plus size={16} />
                            {t('attach_file')}
                          </>
                        )}
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10"
                        onClick={() => setShowTemplatePicker(true)}
                      >
                        <LayoutTemplate className="w-4 h-4 mr-2" />
                        {t('template_selector_label', { defaultValue: 'Готовый шаблон' })}
                      </Button>
                      <p className="text-xs text-gray-500 flex items-center">
                        {t('file_formats_hint', { max: 10 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    onClick={handlePreview}
                    disabled={loadingPreview}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border-2 border-gray-200 hover:border-pink-500 transition-all font-semibold"
                  >
                    {loadingPreview ? (
                      <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        {t('common:loading')}
                      </>
                    ) : (
                      <>
                        <Eye className="w-5 h-5 mr-2" />
                        {t('preview')}
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleSendClick}
                    disabled={sending}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-blue-600 hover:shadow-lg hover:opacity-90 transition-all font-semibold text-white border-0"
                  >
                    {sending ? (
                      <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        {t('sending', 'Отправка...')}
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        {t('send')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-600" />
                {t('recipients')}
              </h2>

              {!preview ? (
                <div className="text-center py-12">
                  <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    {t('click_preview_to_see', 'Нажмите "Предпросмотр" чтобы увидеть получателей')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Total */}
                  <div className="bg-gradient-to-r from-pink-50 to-blue-50 border border-pink-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">{t('total_recipients')}</p>
                    <p className="text-3xl font-bold text-pink-600">{preview.total_users}</p>
                  </div>

                  {/* By Channel */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">{t('by_channel')}</p>

                    {preview.by_channel.email > 0 && (
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">{t('channel_email', 'Email')}</span>
                        </div>
                        <span className="font-bold text-blue-600">{preview.by_channel.email}</span>
                      </div>
                    )}

                    {preview.by_channel.telegram > 0 && (
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700">{t('channel_telegram', 'Telegram')}</span>
                        </div>
                        <span className="font-bold text-green-600">{preview.by_channel.telegram}</span>
                      </div>
                    )}

                    {preview.by_channel.instagram > 0 && (
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <div className="flex items-center gap-2">
                          <Instagram className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">{t('channel_instagram', 'Instagram')}</span>
                        </div>
                        <span className="font-bold text-blue-600">{preview.by_channel.instagram}</span>
                      </div>
                    )}

                    {preview.by_channel.notification > 0 && (
                      <div className="flex items-center justify-between p-2 bg-pink-50 rounded">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-pink-600" />
                          <span className="text-sm text-gray-700">{t('channels_notification', 'Уведомления')}</span>
                        </div>
                        <span className="font-bold text-pink-600">{preview.by_channel.notification}</span>
                      </div>
                    )}
                  </div>

                  {/* Sample Users */}
                  {preview.users_sample.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">{t('sample_recipients')}</p>
                      <div className="space-y-2">
                        {preview.users_sample.map((user, idx) => (
                          <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
                            <p className="font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-gray-600">{user.channel}: {user.contact}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warning */}
                  {preview.total_users === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-800">
                          {t('no_users')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('history_title')}</h2>

              <div className="flex flex-wrap items-center gap-2">
                {history.length > 0 && (
                  <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={history.length > 0 && history.every((item) => selectedHistoryIds.includes(item.id))}
                      onChange={toggleSelectAllHistory}
                      className="w-4 h-4 text-pink-600 rounded"
                    />
                    <span>{t('history_select_all', { defaultValue: 'Выбрать все' })}</span>
                  </label>
                )}
                {selectedHistoryIds.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteHistoryEntries(selectedHistoryIds)}
                    disabled={deletingHistory}
                    className="h-9 text-red-600 border-red-100 hover:bg-red-50"
                  >
                    {deletingHistory ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    {t('delete_selected_history', { defaultValue: 'Удалить выбранные ({{count}})', count: selectedHistoryIds.length })}
                  </Button>
                )}
                <Select value={clearPeriod} onValueChange={setClearPeriod}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder={t('select_period', 'Период')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_hour">{t('period_last_hour', 'Последний час')}</SelectItem>
                    <SelectItem value="today">{t('period_today', 'Сегодня')}</SelectItem>
                    <SelectItem value="3_days">{t('period_3_days', '3 дня')}</SelectItem>
                    <SelectItem value="week">{t('period_week', 'Неделя')}</SelectItem>
                    <SelectItem value="month">{t('period_month', 'Месяц')}</SelectItem>
                    <SelectItem value="all">{t('period_all', 'Все время')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClearHistory(clearPeriod)}
                  className="h-9 text-red-600 border-red-100 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('clear_history', 'Очистить')}
                </Button>
              </div>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-pink-600 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>{t('no_history')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selectedHistoryIds.includes(item.id)
                        ? 'border-pink-300 bg-pink-50/40'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <label className="pt-1 shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedHistoryIds.includes(item.id)}
                            onChange={() => toggleHistorySelection(item.id)}
                            className="w-4 h-4 text-pink-600 rounded"
                          />
                        </label>
                        <div className="min-w-0">
                          <h3 className="font-medium text-gray-900">{item.subject}</h3>
                          <p className="text-sm text-gray-600">
                            {availableSubscriptions[item.subscription_type]?.name || item.subscription_type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleString('ru-RU')}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteHistoryEntries([item.id])}
                          className="h-8 text-red-600 border-red-100 hover:bg-red-50"
                          title={t('delete_history_item', { defaultValue: 'Удалить запись' })}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {t('common:delete', { defaultValue: 'Удалить' })}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{t('sent', { count: item.total_sent })}</span>
                      </div>

                      <div className="flex gap-2">
                        {item.channels.map((channel: string) => (
                          <span
                            key={channel}
                            className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                          >
                            {channel}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('templates_title', { defaultValue: 'Шаблоны рассылок' })}</h2>
                <p className="text-sm text-gray-500">{t('templates_subtitle', { defaultValue: 'Создание, изменение и удаление шаблонов для быстрых рассылок' })}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadNotificationTemplates} disabled={loadingTemplates}>
                  {loadingTemplates ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <History className="w-4 h-4 mr-2" />}
                  {t('refresh', { defaultValue: 'Обновить' })}
                </Button>
                <Button size="sm" className="bg-pink-600 hover:bg-pink-700 text-white" onClick={openCreateTemplateEditor}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('create_template', { defaultValue: 'Создать шаблон' })}
                </Button>
              </div>
            </div>

            {loadingTemplates ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-pink-600 animate-spin" />
              </div>
            ) : notificationTemplates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <LayoutTemplate className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>{t('no_templates', { defaultValue: 'Шаблоны пока не созданы' })}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notificationTemplates.map((template) => (
                  <div key={template.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          {template.is_system === true && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {t('template_system', { defaultValue: 'Системный' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{template.category ?? 'transactional'}</p>
                        {(template.subject ?? '').trim().length > 0 && (
                          <p className="text-sm text-gray-700">{template.subject}</p>
                        )}
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{template.body ?? ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleApplyTemplate(template.name);
                            handleTabChange('compose');
                          }}
                        >
                          <LayoutTemplate className="w-4 h-4 mr-2" />
                          {t('template_insert_button', { defaultValue: 'Вставить' })}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditTemplateEditor(template)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {t('common:edit', { defaultValue: 'Изменить' })}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={template.is_system === true || deletingTemplateName === template.name}
                          onClick={() => handleDeleteTemplate(template)}
                          className="text-red-600 border-red-100 hover:bg-red-50"
                        >
                          {deletingTemplateName === template.name ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                          {t('common:delete', { defaultValue: 'Удалить' })}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-pink-600" />
                  {t('newsletter_subscribers', 'Подписчики рассылки')}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t('subscribers_stats', 'Активных: {{active}} из {{total}}', { active: subscribersCount.active, total: subscribersCount.total })}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer border-r pr-4 border-gray-100">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => {
                      setShowInactive(e.target.checked);
                      loadSubscribers(e.target.checked);
                    }}
                    className="w-4 h-4 text-pink-600 rounded"
                  />
                  {t('show_inactive', 'Показать неактивных')}
                </label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowImportSubscribers(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('import', 'Импорт')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAddSubscriber(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('add', 'Добавить')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadSubscribers()} disabled={loadingSubscribers}>
                    {loadingSubscribers ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <History className="w-4 h-4 mr-2" />}
                    {t('refresh', 'Обновить')}
                  </Button>
                </div>
              </div>
            </div>

            {loadingSubscribers ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-pink-600 animate-spin" />
              </div>
            ) : subscribers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>{t('no_subscribers', 'Подписчиков пока нет')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="py-3 px-4 text-sm font-semibold text-gray-700">{t('common:name', 'Имя')}</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-700">{t('common:email', 'Email')}</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-700">{t('common:status', 'Статус')}</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-700">{t('subscribed_at', 'Дата подписки')}</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-700 text-right">{t('common:actions', 'Действия')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((subscriber) => (
                      <tr key={subscriber.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{subscriber.name || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{subscriber.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {subscriber.is_active ? (
                            <span
                              onClick={() => handleToggleSubscriber(subscriber.id, subscriber.is_active)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 cursor-pointer hover:bg-green-200 transition-colors"
                            >
                              <UserCheck className="w-3 h-3" />
                              {t('active', 'Активен')}
                            </span>
                          ) : (
                            <span
                              onClick={() => handleToggleSubscriber(subscriber.id, subscriber.is_active)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors"
                            >
                              <UserX className="w-3 h-3" />
                              {t('inactive', 'Неактивен')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {subscriber.created_at ? new Date(subscriber.created_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingSubscriber(subscriber);
                                setSubscriberForm({ email: subscriber.email, name: subscriber.name || '' });
                              }}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                              title={t('common:edit', 'Изменить')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubscriber(subscriber.id)}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              title={t('common:delete', 'Удалить')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Unsubscribed Tab */}
        <TabsContent value="unsubscribed">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('unsubscribed_title', 'Отписавшиеся пользователи')}</h2>
                <p className="text-gray-500 text-sm mt-1">{t('unsubscribed_subtitle', 'Список тех, кто отказался от получения рассылок')}</p>
              </div>
              <Button variant="outline" onClick={loadUnsubscribed} disabled={loadingUnsubscribed}>
                {loadingUnsubscribed ? <Loader className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4 mr-2" />}
                {t('refresh', 'Обновить')}
              </Button>
            </div>

            {loadingUnsubscribed ? (
              <div className="flex justify-center py-20">
                <Loader className="w-10 h-10 animate-spin text-pink-600" />
              </div>
            ) : unsubscribed.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl">
                <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('no_unsubscribed', 'Отписавшихся пользователей пока нет. Все ваши клиенты довольны! 😊')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="py-4 px-4 font-semibold text-sm text-gray-700">{t('user', 'Пользователь')}</th>
                      <th className="py-4 px-4 font-semibold text-sm text-gray-700">{t('mailing_type', 'Тип рассылки')}</th>
                      <th className="py-4 px-4 font-semibold text-sm text-gray-700">{t('unsubscribed_at', 'Дата отписки')}</th>
                      <th className="py-4 px-4 font-semibold text-sm text-gray-700">{t('reason', 'Причина')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {unsubscribed.map((unsub) => (
                      <tr key={unsub.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 font-bold text-xs">
                              {unsub.full_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {unsub.full_name === 'Newsletter Subscriber' ? t('newsletter_subscriber', 'Подписчик рассылки') : unsub.full_name}
                              </p>
                              <p className="text-xs text-gray-500">@{unsub.username || unsub.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {t(unsub.mailing_type) || unsub.mailing_type}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {unsub.unsubscribed_at ? new Date(unsub.unsubscribed_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-500 italic">
                          {unsub.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      {showManageTypes && (
        <ManageSubscriptionTypesDialog
          roles={roles}
          onClose={() => {
            setShowManageTypes(false);
            loadSubscriptions(); // Refresh after changes
          }}
        />
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('confirm_broadcast_title', 'Подтверждение отправки')}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-1">{t('check_recipients')}</h4>
                <p className="text-sm text-yellow-700">
                  {t('check_recipients_desc')}
                </p>
              </div>
            </div>

            {preview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>{t('total_recipients')}: <span className="font-bold text-gray-900">{preview.total_users}</span></span>
                  {preview.total_users > 10 && (
                    <span className="text-xs">{t('showing_first_10', 'Показаны первые 10')}</span>
                  )}
                </div>

                <div className="border rounded-lg divide-y">
                  {preview.users_sample.slice(0, 10).map((user, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-gray-50 group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-xs">
                          {user.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name || t('no_name', 'No Name')}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="capitalize">{user.role}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <p className={`text-sm font-medium ${!user.contact || user.contact === '-' ? 'text-red-500' : 'text-blue-600'}`}>
                            {user.contact || t('no_contact', 'Нет данных')}
                          </p>
                          <button
                            onClick={() => setEditingBroadcastUser(user)}
                            className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t('edit_contact', 'Изменить контакт')}
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-400">{user.channel}</p>
                      </div>
                    </div>
                  ))}
                  {preview.total_users > 10 && (
                    <div className="p-3 text-center text-sm text-gray-500 italic">
                      {t('and_more_users', { count: preview.total_users - 10 })}
                    </div>
                  )}
                </div>

                {preview.total_users === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    {t('no_recipients_found', 'Получатели не найдены')}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-4 sm:gap-4 pt-4">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={performSend}
              disabled={sending || (preview?.total_users === 0)}
              className="bg-gradient-to-r from-pink-500 to-blue-600 text-white border-0"
            >
              {sending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {t('sending')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('confirm_and_send', 'Подтвердить и отправить')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showTemplatePicker}
        onOpenChange={(open) => {
          setShowTemplatePicker(open);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('template_selector_label', { defaultValue: 'Готовый шаблон' })}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 text-pink-600 animate-spin" />
              </div>
            ) : notificationTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <LayoutTemplate className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p>{t('no_templates', { defaultValue: 'Шаблоны пока не созданы' })}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {notificationTemplates.map((template) => (
                  <div key={template.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{template.name}</p>
                          <p className="text-xs text-gray-500">{template.category ?? 'transactional'}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleApplyTemplate(template.name);
                            setShowTemplatePicker(false);
                          }}
                        >
                          <LayoutTemplate className="w-4 h-4 mr-2" />
                          {t('template_insert_button', { defaultValue: 'Вставить' })}
                        </Button>
                      </div>
                      {(template.subject ?? '').trim().length > 0 && (
                        <p className="text-sm text-gray-700">{template.subject}</p>
                      )}
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{template.body ?? ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTemplatePicker(false);
                handleTabChange('templates');
              }}
            >
              {t('manage_templates', { defaultValue: 'Управление шаблонами' })}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowTemplatePicker(false);
                openCreateTemplateEditor();
              }}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('create_template', { defaultValue: 'Создать шаблон' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showTemplateEditor}
        onOpenChange={(open) => {
          if (!open) {
            setShowTemplateEditor(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {templateEditorMode === 'create'
                ? t('create_template', { defaultValue: 'Создать шаблон' })
                : t('edit_template', { defaultValue: 'Изменить шаблон' })}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">{t('template_name', { defaultValue: 'Название шаблона' })}</Label>
              <Input
                id="template-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm((previousState) => ({ ...previousState, name: e.target.value }))}
                placeholder={t('template_name_placeholder', { defaultValue: 'welcome_campaign' })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-category">{t('template_category', { defaultValue: 'Категория' })}</Label>
              <Input
                id="template-category"
                value={templateForm.category}
                onChange={(e) => setTemplateForm((previousState) => ({ ...previousState, category: e.target.value }))}
                placeholder="transactional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-subject">{t('subject', { defaultValue: 'Тема (для Email) *' })}</Label>
              <Input
                id="template-subject"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm((previousState) => ({ ...previousState, subject: e.target.value }))}
                placeholder={t('placeholder_subject', { defaultValue: 'Специальное предложение для вас!' })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-body">{t('message', { defaultValue: 'Сообщение *' })}</Label>
              <Textarea
                id="template-body"
                value={templateForm.body}
                onChange={(e) => setTemplateForm((previousState) => ({ ...previousState, body: e.target.value }))}
                className="min-h-[180px]"
                placeholder={t('placeholder_message', { defaultValue: 'Введите текст вашего сообщения...' })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTemplateEditor(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              {savingTemplate ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {t('save_template', { defaultValue: 'Сохранить шаблон' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for editing user contact */}
      <Dialog open={!!editingBroadcastUser} onOpenChange={(open) => !open && setEditingBroadcastUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('edit_contact_details', 'Редактировать контактные данные')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <p className="font-medium text-sm">{editingBroadcastUser?.full_name}</p>
              <p className="text-xs text-gray-500">{editingBroadcastUser?.role}</p>
            </div>

            {editingBroadcastUser?.channel === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  defaultValue={editingBroadcastUser?.contact && editingBroadcastUser.contact !== '-' ? editingBroadcastUser.contact : ''}
                  placeholder="user@example.com"
                />
              </div>
            )}

            {editingBroadcastUser?.channel === 'telegram' && (
              <div className="space-y-2">
                <Label htmlFor="edit-telegram">Telegram ID</Label>
                <Input
                  id="edit-telegram"
                  defaultValue={editingBroadcastUser?.contact && editingBroadcastUser.contact !== '-' ? editingBroadcastUser.contact : ''}
                  placeholder="12345678"
                />
                <p className="text-xs text-gray-500">
                  {t('telegram_id_hint', 'Можно узнать у @userinfobot')}
                </p>
              </div>
            )}

            {editingBroadcastUser?.channel === 'instagram' && (
              <div className="space-y-2">
                <Label htmlFor="edit-instagram">Instagram Username</Label>
                <Input
                  id="edit-instagram"
                  defaultValue={editingBroadcastUser?.contact && editingBroadcastUser.contact !== '-' ? editingBroadcastUser.contact : ''}
                  placeholder="username"
                />
              </div>
            )}

            {editingBroadcastUser?.channel === 'notification' && (
              <div className="text-amber-600 text-sm p-3 bg-amber-50 rounded border border-amber-200">
                {t('cannot_edit_notification', 'Внутренние уведомления не требуют настройки контактов')}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBroadcastUser(null)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (!editingBroadcastUser) return;

                try {
                  let data: any = {};
                  if (editingBroadcastUser.channel === 'email') {
                    const val = (document.getElementById('edit-email') as HTMLInputElement).value;
                    if (!val) return toast.error('Email required');
                    data.email = val;
                  } else if (editingBroadcastUser.channel === 'telegram') {
                    const val = (document.getElementById('edit-telegram') as HTMLInputElement).value;
                    if (!val) return toast.error('Telegram ID required');
                    data.telegram_id = val;
                  } else if (editingBroadcastUser.channel === 'instagram') {
                    const val = (document.getElementById('edit-instagram') as HTMLInputElement).value;
                    if (!val) return toast.error('Instagram username required');
                    data.instagram_username = val;
                  } else {
                    setEditingBroadcastUser(null);
                    return;
                  }

                  await api.updateUserContact(editingBroadcastUser.id, data);
                  toast.success(t('contact_updated', 'Контакт обновлен'));
                  setEditingBroadcastUser(null);

                  // Обновляем превью
                  handlePreview();
                } catch (e) {
                  toast.error(t('error_updating_contact', 'Ошибка обновления контакта'));
                }
              }}
            >
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subscriber Dialog */}
      <Dialog open={showAddSubscriber || !!editingSubscriber} onOpenChange={(open) => {
        if (!open) {
          setShowAddSubscriber(false);
          setEditingSubscriber(null);
          setSubscriberForm({ email: '', name: '' });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubscriber ? t('edit_subscriber', 'Редактировать подписчика') : t('add_subscriber', 'Добавить подписчика')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sub-name">{t('common:name', 'Имя')}</Label>
              <Input
                id="sub-name"
                value={subscriberForm.name}
                onChange={(e) => setSubscriberForm({ ...subscriberForm, name: e.target.value })}
                placeholder={t('name_placeholder', 'Иван Иванов')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-email">{t('common:email', 'Email')}</Label>
              <Input
                id="sub-email"
                type="email"
                value={subscriberForm.email}
                onChange={(e) => setSubscriberForm({ ...subscriberForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddSubscriber(false);
              setEditingSubscriber(null);
            }}>
              {t('cancel')}
            </Button>
            <Button
              onClick={editingSubscriber ? handleUpdateSubscriberData : handleAddSubscriber}
              disabled={sending}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              {sending ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {editingSubscriber ? t('save') : t('add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Subscribers Dialog */}
      <Dialog open={showImportSubscribers} onOpenChange={setShowImportSubscribers}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('import_subscribers', 'Импорт подписчиков')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-1">{t('import_format_title', 'Формат данных:')}</p>
              <p className="text-xs text-blue-600">
                {t('import_format_desc', 'Введите список email или "Имя, email" (по одному на строку). Можно вставить из Excel.')}
              </p>
            </div>
            <Textarea
              className="min-h-[200px] font-mono text-sm"
              placeholder="ivan@example.com&#10;Maria, marya@test.ru&#10;john.doe@gmail.com, John"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportSubscribers(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleImportSubscribers}
              disabled={sending || !importText.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sending ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
              {t('import', 'Импорт')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manual Contact Dialog */}
      <Dialog open={showAddManualContacts} onOpenChange={setShowAddManualContacts}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('add_manual_contact', 'Добавить контакт вручную')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
              <p className="text-xs text-blue-700">
                {t('manual_contact_hint', 'Заполните поля в зависимости от выбранных каналов рассылки')}
              </p>
            </div>

            {/* Имя (всегда показываем) */}
            <div className="space-y-2">
              <Label htmlFor="manual-name">{t('common:name', 'Имя')} <span className="text-gray-400 text-xs">({t('optional', 'опционально')})</span></Label>
              <Input
                id="manual-name"
                value={manualContactForm.name || ''}
                onChange={(e) => setManualContactForm({ ...manualContactForm, name: e.target.value })}
                placeholder={t('name_placeholder', 'Иван Иванов')}
              />
            </div>

            {/* Email - показываем если выбран канал email */}
            {form.channels.includes('email') && (
              <div className="space-y-2">
                <Label htmlFor="manual-email">Email</Label>
                <Input
                  id="manual-email"
                  type="email"
                  value={manualContactForm.email || ''}
                  onChange={(e) => setManualContactForm({ ...manualContactForm, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
            )}

            {/* Telegram - показываем если выбран канал telegram */}
            {form.channels.includes('telegram') && (
              <div className="space-y-2">
                <Label htmlFor="manual-telegram">{t('telegram_username', 'Telegram username')}</Label>
                <Input
                  id="manual-telegram"
                  value={manualContactForm.telegram || ''}
                  onChange={(e) => setManualContactForm({ ...manualContactForm, telegram: e.target.value })}
                  placeholder="@username"
                />
                <p className="text-xs text-gray-500">
                  {t('telegram_hint', 'Введите username без @ или Telegram ID')}
                </p>
              </div>
            )}

            {/* Instagram - показываем если выбран канал instagram */}
            {form.channels.includes('instagram') && (
              <div className="space-y-2">
                <Label htmlFor="manual-instagram">{t('instagram_username', 'Instagram username')}</Label>
                <Input
                  id="manual-instagram"
                  value={manualContactForm.instagram || ''}
                  onChange={(e) => setManualContactForm({ ...manualContactForm, instagram: e.target.value })}
                  placeholder="username"
                />
              </div>
            )}

            {form.channels.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <p className="text-xs text-yellow-700">
                  {t('select_channels_first', 'Сначала выберите каналы рассылки')}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddManualContacts(false);
              setManualContactForm({});
            }}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() => {
                // Проверяем что хотя бы одно поле заполнено
                const hasData = manualContactForm.email || manualContactForm.telegram || manualContactForm.instagram;
                if (!hasData) {
                  toast.error(t('fill_at_least_one_field', 'Заполните хотя бы одно поле контакта'));
                  return;
                }

                setManualContacts(prev => [...prev, { ...manualContactForm }]);
                setManualContactForm({});
                setShowAddManualContacts(false);
                toast.success(t('contact_added', 'Контакт добавлен'));
              }}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Contacts File Dialog */}
      <Dialog open={showImportContactsFile} onOpenChange={setShowImportContactsFile}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('import_contacts_file', 'Импорт контактов из файла')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Инструкция с таблицей столбцов */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg space-y-3">
              <p className="text-sm text-blue-800 font-medium">{t('file_format_title', 'Формат файла:')}</p>

              {/* Таблица с названиями столбцов */}
              <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="px-3 py-2 text-left font-semibold text-blue-900 border-r border-blue-200">
                        {t('column', 'Столбец')} 1
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-blue-900 border-r border-blue-200">
                        {t('column', 'Столбец')} 2
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-blue-900 border-r border-blue-200">
                        {t('column', 'Столбец')} 3
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-blue-900 border-r border-blue-200">
                        {t('column', 'Столбец')} 4
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-blue-900">
                        {t('column', 'Столбец')} 5
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="px-3 py-2 font-mono text-gray-700 border-r border-blue-100">
                        {t('common:name', 'Имя')}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-700 border-r border-blue-100">
                        Email
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-700 border-r border-blue-100">
                        Telegram
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-700 border-r border-blue-100">
                        Instagram
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-700">
                        WhatsApp
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-3 py-2 text-gray-500 italic text-xs border-r border-blue-100">
                        {t('optional', 'опционально')}
                      </td>
                      <td className="px-3 py-2 text-gray-500 italic text-xs border-r border-blue-100">
                        {t('optional', 'опционально')}
                      </td>
                      <td className="px-3 py-2 text-gray-500 italic text-xs border-r border-blue-100">
                        {t('optional', 'опционально')}
                      </td>
                      <td className="px-3 py-2 text-gray-500 italic text-xs border-r border-blue-100">
                        {t('optional', 'опционально')}
                      </td>
                      <td className="px-3 py-2 text-gray-500 italic text-xs">
                        {t('optional', 'опционально')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Пример данных */}
              <div className="bg-white p-3 rounded border border-blue-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">{t('example', 'Пример')}:</p>
                <div className="space-y-1">
                  <p className="text-xs font-mono text-gray-600">Иван Иванов, ivan@mail.ru, @ivanov, ivanov_insta, +79991234567</p>
                  <p className="text-xs font-mono text-gray-600">Мария,, @maria_tg,, +79997654321</p>
                  <p className="text-xs font-mono text-gray-600">, john@test.com, @john_tg, john_ig,</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-blue-700">
                  • {t('file_format_note', 'Поля разделяются запятой. Пустые поля можно оставить пустыми (две запятые подряд).')}
                </p>
                <p className="text-xs text-blue-700">
                  • {t('file_format_note2', 'Имя опционально. Если имени нет - оставьте первое поле пустым или начните с запятой.')}
                </p>
                <p className="text-xs text-blue-700">
                  • {t('file_format_note3', 'Можно скопировать данные прямо из Excel или Google Sheets')}
                </p>
              </div>
            </div>

            {/* Кнопка загрузки файла */}
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="import-contacts-file"
                className="hidden"
                accept=".csv,.txt,.xls,.xlsx"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  try {
                    const text = await file.text();
                    setImportFileText(text);
                    toast.success(t('file_loaded', 'Файл загружен'));
                  } catch (error) {
                    console.error('File read error:', error);
                    toast.error(t('error_reading_file', 'Ошибка чтения файла'));
                  }
                  e.target.value = '';
                }}
              />
              <label
                htmlFor="import-contacts-file"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-blue-200"
              >
                <Plus className="w-4 h-4" />
                {t('upload_file', 'Загрузить файл CSV/Excel')}
              </label>
              <span className="text-xs text-gray-500">{t('or', 'или')}</span>
              <span className="text-xs text-gray-600">{t('paste_below', 'вставьте данные ниже')}</span>
            </div>

            {/* Текстовое поле для вставки */}
            <Textarea
              className="min-h-[200px] font-mono text-sm"
              placeholder="Имя, Email, Telegram, Instagram, WhatsApp&#10;Иван, ivan@mail.ru, @ivanov, ivanov_ig, +79991234567&#10;, maria@test.ru, @maria,,"
              value={importFileText}
              onChange={(e) => setImportFileText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportContactsFile(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() => {
                if (!importFileText.trim()) {
                  toast.error(t('no_data', 'Нет данных для импорта'));
                  return;
                }

                try {
                  const lines = importFileText.split('\n').filter(l => l.trim());
                  const contacts: Array<{ name?: string; email?: string; telegram?: string; instagram?: string; whatsapp?: string }> = [];

                  lines.forEach((line, idx) => {
                    // Пропускаем заголовок если он есть
                    if (idx === 0 && line.toLowerCase().includes('имя') && line.toLowerCase().includes('email')) {
                      return;
                    }

                    const parts = line.split(',').map(p => p.trim());
                    const contact: any = {};

                    // Формат: Имя, Email, Telegram, Instagram, WhatsApp
                    if (parts[0] && !parts[0].includes('@')) contact.name = parts[0];
                    if (parts[1] && parts[1].includes('@')) contact.email = parts[1];
                    if (parts[2]) contact.telegram = parts[2].replace('@', '');
                    if (parts[3]) contact.instagram = parts[3];
                    if (parts[4]) contact.whatsapp = parts[4];

                    // Добавляем только если есть хотя бы один контакт
                    if (contact.email || contact.telegram || contact.instagram || contact.whatsapp) {
                      contacts.push(contact);
                    }
                  });

                  if (contacts.length === 0) {
                    toast.error(t('no_valid_contacts', 'Не найдено корректных контактов'));
                    return;
                  }

                  setManualContacts(prev => [...prev, ...contacts]);
                  setImportFileText('');
                  setShowImportContactsFile(false);
                  toast.success(t('contacts_imported', 'Импортировано контактов: {{count}}', { count: contacts.length }));
                } catch (error) {
                  console.error('Import error:', error);
                  toast.error(t('import_error', 'Ошибка импорта данных'));
                }
              }}
              disabled={!importFileText.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              {t('import', 'Импорт')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ManageSubscriptionTypesDialog = ({ onClose, roles }: { onClose: () => void; roles: Array<{ key: string; name: string }> }) => {
  const { t } = useTranslation(['admin/broadcasts', 'common']);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const data = await api.getSubscriptionTypes();
      setTypes(data);
    } catch (error) {
      toast.error(t('error_loading_types', 'Ошибка загрузки типов подписок'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('delete_confirm'))) return;
    try {
      await api.deleteSubscriptionType(id);
      toast.success(t('type_deleted'));
      loadTypes();
    } catch (error) {
      toast.error(t('common:error_deleting', 'Ошибка удаления'));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isNew) {
        await api.createSubscriptionType(editingType);
        toast.success(t('type_created'));
      } else {
        await api.updateSubscriptionType(editingType.id, editingType);
        toast.success(t('type_updated'));
      }
      setEditingType(null);
      setIsNew(false);
      loadTypes();
    } catch (error) {
      toast.error(t('common:error_saving', 'Ошибка сохранения'));
    }
  };

  return createPortal(
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{t('manage_types_title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {editingType ? (
          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="crm-form-content crm-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                {isNew && (
                  <div className="crm-form-group">
                    <Label className="mb-3 block">{t('key_label')}</Label>
                    <Input
                      value={editingType.key}
                      onChange={e => setEditingType({ ...editingType, key: e.target.value })}
                      required
                      placeholder={t('placeholder_subscription_key', 'promotions')}
                    />
                  </div>
                )}
                <div className={`crm-form-group ${!isNew ? 'col-span-2' : ''}`}>
                  <Label className="mb-3 block">{t('role_label')}</Label>
                  <select
                    className="crm-select w-full"
                    value={editingType.target_role}
                    onChange={e => setEditingType({ ...editingType, target_role: e.target.value })}
                  >
                    <option value="all">{t('all_users')}</option>
                    {roles.map((role) => (
                      <option key={role.key} value={role.key}>
                        {getRoleLabel(t, role.key, role.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>



              <div className="crm-form-group mt-4">
                <Label className="mb-3 block">{t('name')}</Label>
                <Input
                  value={editingType.name || ''}
                  onChange={e => setEditingType({ ...editingType, name: e.target.value })}
                  required
                />
              </div>

              <div className="crm-form-group mt-4">
                <Label className="mb-3 block">{t('common:description')}</Label>
                <textarea
                  className="crm-textarea min-h-[100px]"
                  value={editingType.description || ''}
                  onChange={e => setEditingType({ ...editingType, description: e.target.value })}
                  rows={2}
                />
              </div>

            </div>

            <div className="crm-modal-footer">
              <button
                type="button"
                onClick={() => { setEditingType(null); setIsNew(false); }}
                className="crm-btn-secondary"
              >
                {t('cancel')}
              </button>
              <button type="submit" className="crm-btn-primary">
                {t('save')}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="crm-form-content crm-scrollbar">
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => {
                    setEditingType({ key: '', target_role: 'all', name: '', description: '', is_active: true });
                    setIsNew(true);
                  }}
                  className="crm-btn-primary flex items-center gap-2"
                >
                  <Plus size={20} />
                  {t('add_type')}
                </button>
              </div>

              <div className="crm-table-container">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>{t('role_label')}</th>
                      <th>{t('common:name', 'Название')}</th>
                      <th className="w-24 text-right">{t('common:actions', 'Действия')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={3} className="text-center py-4">{t('common:loading')}</td></tr>
                    ) : types.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-4 text-gray-500">{t('common:not_found', 'Типы подписок не найдены')}</td></tr>
                    ) : types.map(type => (
                      <tr key={type.id}>
                        <td>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${type.target_role === 'client' ? 'bg-green-100 text-green-800' :
                            type.target_role === 'all' ? 'bg-gray-100 text-gray-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                            {type.target_role === 'client' ? String(t('common:role_client', 'Клиент')) :
                              type.target_role === 'all' ? String(t('all_users')) :
                                String(getRoleLabel(t, type.target_role, type.target_role))}
                          </span>
                        </td>
                        <td className="font-medium">{t(type.name || type.key)}</td>
                        <td className="text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              className="crm-btn-icon"
                              onClick={() => {
                                setEditingType({
                                  ...type,
                                  name: t(type.name || type.key),
                                  description: t(type.description || `${type.key}_desc`),
                                });
                                setIsNew(false);
                              }}
                              title={t('edit_type')}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="crm-btn-icon text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(type.id)}
                              title={t('delete_type')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="crm-modal-footer">
              <button type="button" className="crm-btn-secondary" onClick={onClose}>
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div >,
    document.body
  );
};
