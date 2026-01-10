// /frontend/src/pages/admin/Broadcasts.tsx
import { useState, useEffect } from 'react';
import { Send, Mail, MessageCircle, Instagram, Loader, Users, AlertCircle, History, Eye, Shield, Bell, Settings, Plus, Trash2, Edit, X } from 'lucide-react';
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

interface BroadcastForm {
  subscription_type: string;
  channels: string[];
  subject: string;
  message: string;
  target_role?: string;
  user_ids?: number[];
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

export default function Broadcasts() {
  const { t } = useTranslation(['admin/broadcasts', 'common']);
  const { user: currentUser } = useAuth();

  // Используем централизованную систему прав
  const userPermissions = usePermissions(currentUser?.role || 'employee');

  const [form, setForm] = useState<BroadcastForm>({
    subscription_type: '',
    channels: [],
    subject: '',
    message: '',
    target_role: '',
    user_ids: [],
  });

  const [availableSubscriptions, setAvailableSubscriptions] = useState<Record<string, { name: string; description: string }>>({});
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [users, setUsers] = useState<Array<{ id: number; username: string; full_name: string; role: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(true);
  const [showManageTypes, setShowManageTypes] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSubscriptions();
    loadHistory();
    loadUsers();
  }, []);

  const loadSubscriptions = async () => {
    try {
      // For admins on the broadcast page, we want ALL types, not just their own role types
      const types = await api.getSubscriptionTypes();
      console.log('📋 Available subscriptions from DB:', types);

      const formatted: Record<string, { name: string; description: string }> = {};
      types.forEach((t: any) => {
        if (t.is_active) {
          formatted[t.key] = {
            name: t.name_ru || t.name_en || t.key,
            description: t.description_ru || t.description_en || ''
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
    try {
      setLoadingUsers(true);
      console.log('🔍 Loading users for broadcast selection...');
      const response = await api.getUsers();
      console.log('✅ Users response:', response);
      const usersArray = Array.isArray(response) ? response : (response?.users || []);
      console.log('✅ Users array:', usersArray);
      setUsers(usersArray);
    } catch (err) {
      console.error('❌ Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Filter users by target role and auto-select them
  useEffect(() => {
    if (form.target_role && form.target_role !== 'all') {
      const filteredUserIds = users
        .filter(u => u.role === form.target_role)
        .map(u => u.id);
      setForm(prev => ({ ...prev, user_ids: filteredUserIds }));
    } else if (form.target_role === '' || form.target_role === 'all') {
      // Clear selection when "all users" selected
      setForm(prev => ({ ...prev, user_ids: [] }));
    }
  }, [form.target_role, users]);

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
    const visibleUsers = users.filter(u => !form.target_role || form.target_role === 'all' || u.role === form.target_role);
    const visibleUserIds = visibleUsers.map(u => u.id);
    const currentSelectedInVisible = (form.user_ids || []).filter(id => visibleUserIds.includes(id));

    if (currentSelectedInVisible.length === visibleUsers.length && visibleUsers.length > 0) {
      // If all visible are selected, deselect them
      setForm({ ...form, user_ids: (form.user_ids || []).filter(id => !visibleUserIds.includes(id)) });
    } else {
      // Otherwise, select all visible (keeping others that might be selected but hidden)
      const otherSelected = (form.user_ids || []).filter(id => !visibleUserIds.includes(id));
      setForm({ ...form, user_ids: [...otherSelected, ...visibleUserIds] });
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

  const handleSend = async () => {
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

    if (!window.confirm(t('confirm_send'))) {
      return;
    }

    try {
      setSending(true);
      const response = await api.sendBroadcast(form);
      toast.success(response.message);

      // Reset form
      setForm({
        subscription_type: '',
        channels: [],
        subject: '',
        message: '',
        target_role: '',
        user_ids: [],
      });
      setPreview(null);

      // Reload history
      await loadHistory();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка отправки');
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

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList>
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            {t('create_broadcast')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            {t('history')}
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
                      Email
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
                      Telegram
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChannelToggle('instagram')}
                      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 font-medium transition-all ${form.channels.includes('instagram')
                        ? 'border-purple-500 bg-white text-purple-600 shadow-sm'
                        : 'border-white bg-white text-gray-500 hover:border-gray-200 shadow-sm'
                        }`}
                    >
                      <Instagram className="w-5 h-5" />
                      Instagram
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
                        e.stopPropagation();
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
                      setForm({ ...form, subscription_type: value });
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
                              <span className="font-medium">{t(info.name, info.name)}</span>
                              <span className="text-xs text-gray-500">{t(info.description, info.description)}</span>
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
                      placeholder={t('placeholder_subject', 'Специальное предложение для вас!')}
                    />
                  </div>
                )}

                {/* Target Role */}
                <div>
                  <Label htmlFor="target_role" className="block mb-2.5 text-sm font-semibold text-gray-700">{t('target_role')}</Label>
                  <Select
                    value={form.target_role || 'all'}
                    onValueChange={(value) => setForm({ ...form, target_role: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('all_users')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_users')}</SelectItem>
                      <SelectItem value="admin">{t('common:role_admin', 'Администраторы')}</SelectItem>
                      <SelectItem value="manager">{t('common:role_manager', 'Менеджеры')}</SelectItem>
                      <SelectItem value="employee">{t('common:role_employee', 'Сотрудники')}</SelectItem>
                      <SelectItem value="client">{t('common:role_client', 'Клиенты')}</SelectItem>
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
                              (() => {
                                const visibleUsers = users.filter(u => !form.target_role || form.target_role === 'all' || u.role === form.target_role);
                                return visibleUsers.length > 0 && visibleUsers.every(u => (form.user_ids || []).includes(u.id));
                              })()
                            }
                            onChange={handleSelectAllUsers}
                            className="w-4 h-4 text-pink-600 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {t('select_all', { count: users.filter(u => !form.target_role || form.target_role === 'all' || u.role === form.target_role).length })}
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
                            .filter(u => !form.target_role || form.target_role === 'all' || u.role === form.target_role)
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
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {t('optional_recipients_hint')}
                  </p>
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
                    placeholder={t('placeholder_message', 'Введите текст рассылки...')}
                    className={`min-h-[180px] rounded-2xl p-4 text-base ${errors.message ? 'border-red-500 bg-red-50/30 ring-red-100' : 'bg-gray-50/50 border-gray-200 focus:bg-white transition-all'}`}
                  />
                  <div className="flex justify-between items-center mt-2 px-1">
                    <p className={`text-xs font-medium ${form.message.length > 500 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {form.message.length} {t('common:characters_count', 'символов')}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">{t('telegram_limit_hint', 'Рекомендуется до 4096 (Telegram)')}</p>
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
                    onClick={handleSend}
                    disabled={sending}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg hover:opacity-90 transition-all font-semibold text-white border-0"
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
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-4">
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
                          <span className="text-sm text-gray-700">Email</span>
                        </div>
                        <span className="font-bold text-blue-600">{preview.by_channel.email}</span>
                      </div>
                    )}

                    {preview.by_channel.telegram > 0 && (
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700">Telegram</span>
                        </div>
                        <span className="font-bold text-green-600">{preview.by_channel.telegram}</span>
                      </div>
                    )}

                    {preview.by_channel.instagram > 0 && (
                      <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                        <div className="flex items-center gap-2">
                          <Instagram className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-gray-700">Instagram</span>
                        </div>
                        <span className="font-bold text-purple-600">{preview.by_channel.instagram}</span>
                      </div>
                    )}

                    {preview.by_channel.notification > 0 && (
                      <div className="flex items-center justify-between p-2 bg-pink-50 rounded">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-pink-600" />
                          <span className="text-sm text-gray-700">Уведомления</span>
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
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('history_title')}</h2>

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
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-pink-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.subject}</h3>
                        <p className="text-sm text-gray-600">
                          {availableSubscriptions[item.subscription_type]?.name || item.subscription_type}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString('ru-RU')}
                      </span>
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
      </Tabs>
      {showManageTypes && (
        <ManageSubscriptionTypesDialog
          onClose={() => {
            setShowManageTypes(false);
            loadSubscriptions(); // Refresh after changes
          }}
        />
      )}
    </div>
  );
}

const ManageSubscriptionTypesDialog = ({ onClose }: { onClose: () => void }) => {
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

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{t('manage_types_title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {editingType ? (
          <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
            <div className="crm-form-content">
              <div className="grid grid-cols-2 gap-4">
                <div className="crm-form-group">
                  <Label>{t('key_label')}</Label>
                  <Input
                    value={editingType.key}
                    onChange={e => setEditingType({ ...editingType, key: e.target.value })}
                    required
                    placeholder="promotions"
                    disabled={!isNew}
                  />
                </div>
                <div className="crm-form-group">
                  <Label>{t('role_label')}</Label>
                  <select
                    className="crm-select"
                    value={editingType.target_role}
                    onChange={e => setEditingType({ ...editingType, target_role: e.target.value })}
                  >
                    <option value="all">{t('all_users')}</option>
                    <option value="client">{t('common:role_client', 'Клиенты')}</option>
                    <option value="employee">{t('common:role_employee', 'Сотрудники')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="crm-form-group">
                  <Label>{t('name_ru')}</Label>
                  <Input
                    value={editingType.name_ru || ''}
                    onChange={e => setEditingType({ ...editingType, name_ru: e.target.value })}
                    required
                  />
                </div>
                <div className="crm-form-group">
                  <Label>{t('name_en')}</Label>
                  <Input
                    value={editingType.name_en || ''}
                    onChange={e => setEditingType({ ...editingType, name_en: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="crm-form-group">
                  <Label>{t('desc_ru')}</Label>
                  <textarea
                    className="crm-textarea"
                    value={editingType.description_ru || ''}
                    onChange={e => setEditingType({ ...editingType, description_ru: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="crm-form-group">
                  <Label>{t('desc_en')}</Label>
                  <textarea
                    className="crm-textarea"
                    value={editingType.description_en || ''}
                    onChange={e => setEditingType({ ...editingType, description_en: e.target.value })}
                    rows={2}
                  />
                </div>
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
          <div className="flex flex-col h-full">
            <div className="crm-form-content">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setEditingType({ key: '', target_role: 'all', name_ru: '', name_en: '', description_ru: '', description_en: '', is_active: true });
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
                      <th>{t('common:key', 'Ключ')}</th>
                      <th>{t('role_label')}</th>
                      <th>{t('common:name', 'Название')}</th>
                      <th>{t('common:actions', 'Действия')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4} className="text-center py-4">{t('common:loading')}</td></tr>
                    ) : types.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-4 text-gray-500">{t('common:not_found', 'Типы подписок не найдены')}</td></tr>
                    ) : types.map(type => (
                      <tr key={type.id}>
                        <td className="font-mono text-sm">{type.key}</td>
                        <td>
                          <span className={`crm-badge ${type.target_role === 'client' ? 'paid' : type.target_role === 'employee' ? 'sent' : ''}`}>
                            {type.target_role === 'client' ? String(t('common:role_client', 'Клиент')) :
                              type.target_role === 'employee' ? String(t('common:role_employee', 'Сотрудник')) :
                                String(type.target_role)}
                          </span>
                        </td>
                        <td>{String(t(type.name_ru || type.key, type.name_ru || type.key))}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="crm-btn-icon"
                              onClick={() => { setEditingType(type); setIsNew(false); }}
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
    </div>
  );
};
