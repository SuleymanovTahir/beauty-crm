// /frontend/src/pages/admin/Broadcasts.tsx
import { useState, useEffect } from 'react';
import { Send, Mail, MessageCircle, Instagram, Loader, Users, AlertCircle, History, Eye, Shield, Bell } from 'lucide-react';
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

  useEffect(() => {
    loadSubscriptions();
    loadHistory();
    loadUsers();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const response = await api.getUserSubscriptions();
      console.log('📋 Available subscriptions:', response.available_types);
      setAvailableSubscriptions(response.available_types);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
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
    if ((form.user_ids || []).length === users.length) {
      setForm({ ...form, user_ids: [] });
    } else {
      setForm({ ...form, user_ids: users.map(u => u.id) });
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
      toast.success(t('preview_found', { count: data.total_users }).replace('{count}', data.total_users.toString()));
    } catch (err: any) {
      toast.error(err.message || t('error_preview'));
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSend = async () => {
    if (!form.subscription_type || !form.subject || !form.message) {
      toast.error(t('fill_required_fields'));
      return;
    }

    if (form.channels.length === 0) {
      toast.error(t('select_channel_error'));
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Доступ запрещен</h2>
          <p className="text-gray-600">
            Функция массовых рассылок доступна только для директора, администратора и продажника.
            Обратитесь к администратору для получения доступа.
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
          Массовые рассылки
        </h1>
        <p className="text-gray-600">Отправка уведомлений пользователям по разным каналам</p>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList>
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Создать рассылку
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            История
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Параметры рассылки</h2>

              <div className="space-y-6">
                {/* Channels - FIRST */}
                <div>
                  <Label>Каналы отправки *</Label>
                  <div className="flex gap-4 mt-2">
                    <button
                      type="button"
                      onClick={() => handleChannelToggle('email')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${form.channels.includes('email')
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      <Mail className="w-5 h-5" />
                      Email
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChannelToggle('telegram')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${form.channels.includes('telegram')
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      Telegram
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChannelToggle('instagram')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${form.channels.includes('instagram')
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      <Instagram className="w-5 h-5" />
                      Instagram
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChannelToggle('notification')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${form.channels.includes('notification')
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      <Bell className="w-5 h-5" />
                      Уведомления
                    </button>
                  </div>
                </div>

                {/* Subscription Type */}
                <div>
                  <Label htmlFor="subscription_type">Тип подписки *</Label>
                  <Select
                    value={form.subscription_type}
                    onValueChange={(value) => setForm({ ...form, subscription_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_type', 'Выберите тип')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(availableSubscriptions)
                        .filter(([key]) => key && key.trim() !== '')
                        .map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          {t(info.name, info.name)} - {t(info.description, info.description)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject - Only show when email is selected */}
                {form.channels.includes('email') && (
                  <div>
                    <Label htmlFor="subject">Тема (для Email) *</Label>
                    <Input
                      id="subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder={t('placeholder_subject', 'Специальное предложение для вас!')}
                    />
                  </div>
                )}

                {/* Target Role */}
                <div>
                  <Label htmlFor="target_role">Целевая роль *</Label>
                  <Select
                    value={form.target_role || 'all'}
                    onValueChange={(value) => setForm({ ...form, target_role: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('placeholder_all_users', 'Все пользователи')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все пользователи</SelectItem>
                      <SelectItem value="admin">Администраторы</SelectItem>
                      <SelectItem value="manager">Менеджеры</SelectItem>
                      <SelectItem value="employee">Сотрудники</SelectItem>
                      <SelectItem value="client">Клиенты</SelectItem>
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
                    <span>Выбор получателей (опционально)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Выбрано: {(form.user_ids || []).length}</span>
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
                            checked={(form.user_ids || []).length === users.filter(u => !form.target_role || form.target_role === 'all' || u.role === form.target_role).length && users.length > 0}
                            onChange={handleSelectAllUsers}
                            className="w-4 h-4 text-pink-600 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Выбрать всех ({users.filter(u => !form.target_role || form.target_role === 'all' || u.role === form.target_role).length})
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
                    Выберите конкретных получателей или оставьте пустым для отправки всем подписчикам
                  </p>
                </div>

                {/* Message */}
                <div>
                  <Label htmlFor="message">Сообщение *</Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={8}
                    placeholder={t('placeholder_message', 'Введите текст вашего сообщения...')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {form.message.length} символов
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={handlePreview}
                    disabled={loadingPreview}
                    variant="outline"
                    className="flex-1"
                  >
                    {loadingPreview ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Предпросмотр
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleSend}
                    disabled={sending}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600"
                  >
                    {sending ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Отправить
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
                Получатели
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
                    <p className="text-sm text-gray-600 mb-1">Всего получателей</p>
                    <p className="text-3xl font-bold text-pink-600">{preview.total_users}</p>
                  </div>

                  {/* By Channel */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">По каналам:</p>

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
                      <p className="text-sm font-medium text-gray-700 mb-2">Примеры получателей:</p>
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
                          Нет подписанных пользователей для выбранных параметров
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
            <h2 className="text-xl font-bold text-gray-900 mb-6">История рассылок</h2>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-pink-600 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>Рассылок еще не было</p>
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
                        <span className="text-gray-600">Отправлено: {item.total_sent}</span>
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
    </div>
  );
}
