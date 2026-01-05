// /frontend/src/pages/admin/Settings.tsx
import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  AlertCircle,
  Bell,
  Globe,
  Camera,
  MessageCircle,
  Instagram,
  Mail,
  Smartphone,
  Calendar,
  Briefcase,
  Award,
  Star,
  FileText,
  Plus,
  Trash2,
  Edit,
  Save,
  Users,
  Send,
  Eye,
  History,
  Loader,
  Bot,
  BookOpen,
  Shield,
  User,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../utils/permissions';
import { languages } from '../../i18n';
import { InstagramIcon, WhatsAppIcon, TelegramIcon, TikTokIcon } from '../../components/icons/SocialIcons';
import './Settings.css';

export default function AdminSettings() {
  const { t } = useTranslation(['admin/settings', 'common']);
  const { user: currentUser } = useAuth();

  // Используем централизованную систему прав
  const userPermissions = usePermissions(currentUser?.role || 'employee');

  const [generalSettings, setGeneralSettings] = useState({
    salonName: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    instagram: '',
    language: '',
    telegram_manager_chat_id: '',
    currency: '',
    timezone_offset: '',
    birthday_discount: '',
    working_hours: {
      weekdays: '',
      weekends: ''
    },
    lunch_time: {
      start: '',
      end: ''
    }
  });
  const [loading, setLoading] = useState(true);

  // ✅ ДОБАВЬ СОСТОЯНИЕ:
  const [botGloballyEnabled, setBotGloballyEnabled] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    bookingNotifications: true,
    birthdayReminders: true,
    birthdayDaysAdvance: 7,
  });

  // Profile state
  const [profileForm, setProfileForm] = useState({
    username: '',
    full_name: '',
    email: '',
    phone_number: '',
    position: '',
    birth_date: '',
    instagram_link: '',
    whatsapp: '',
    telegram: '',
    about_me: '',
    specialization: '',
    years_of_experience: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
    photo: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<Record<string, {
    is_subscribed: boolean
    channels: {
      email: boolean
      telegram: boolean
      instagram: boolean
    }
  }>>({});
  const [availableSubscriptions, setAvailableSubscriptions] = useState<Record<string, { name: string; description: string }>>({});
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  // Account deletion state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Broadcasts state
  const [broadcastForm, setBroadcastForm] = useState({
    subscription_type: '',
    channels: [] as string[],
    subject: '',
    message: '',
    target_role: '',
    user_ids: [] as number[],
  });
  const [broadcastPreview, setBroadcastPreview] = useState<any>(null);
  const [loadingBroadcastPreview, setLoadingBroadcastPreview] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  const [loadingBroadcastHistory, setLoadingBroadcastHistory] = useState(false);
  const [broadcastUsers, setBroadcastUsers] = useState<Array<{ id: number; username: string; full_name: string; role: string }>>([]);
  const [loadingBroadcastUsers, setLoadingBroadcastUsers] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Roles state
  const [roles, setRoles] = useState<Array<{ key: string; name: string; level: number }>>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showCreateRoleDialog, setShowCreateRoleDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [savingRole, setSavingRole] = useState(false);

  // Booking reminder settings state
  const [bookingReminderSettings, setBookingReminderSettings] = useState<Array<{
    id: number
    name: string
    days_before: number
    hours_before: number
    notification_type: string
    is_enabled: boolean
  }>>([]);
  const [loadingReminderSettings, setLoadingReminderSettings] = useState(false);
  const [showCreateReminderDialog, setShowCreateReminderDialog] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    name: '',
    days_before: 0,
    hours_before: 2,
    notification_type: 'email',
  });

  const [createRoleForm, setCreateRoleForm] = useState({
    role_key: '',
    role_name: '',
    role_description: ''
  });

  // Messenger settings state
  const [messengerSettings, setMessengerSettings] = useState<Array<{
    id: number
    messenger_type: string
    is_enabled: boolean
    display_name: string
    has_token: boolean
    api_token?: string
    webhook_url?: string
  }>>([]);
  const [loadingMessengers, setLoadingMessengers] = useState(false);
  const [editingMessenger, setEditingMessenger] = useState<string | null>(null);
  const [messengerForm, setMessengerForm] = useState({
    api_token: '',
    webhook_url: ''
  });

  // Holidays state
  const [holidays, setHolidays] = useState<Array<{ id: number; date: string; name: string; is_closed: boolean; master_exceptions?: number[]; created_at: string }>>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [showCreateHolidayDialog, setShowCreateHolidayDialog] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    is_closed: true,
    master_exceptions: [] as number[]
  });

  useEffect(() => {
    loadRoles();
    loadSalonSettings();
    loadProfile();
    loadNotificationSettings();
    loadSubscriptions();
    loadBroadcastHistory();
    loadBookingReminderSettings();
    loadMessengerSettings();
    loadBroadcastUsers();
    loadHolidays();
  }, []);

  // ДОБАВИТЬ эту функцию:
  const loadSalonSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSalonSettings();
      setGeneralSettings({
        salonName: data.name || '',
        city: data.city || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        instagram: data.instagram || '',
        language: data.language || 'ru',
        telegram_manager_chat_id: data.telegram_manager_chat_id || '',
        currency: data.currency || 'AED',
        timezone_offset: data.timezone_offset || 'UTC+4',
        birthday_discount: data.birthday_discount || '15%',
        working_hours: {
          weekdays: data.hours_weekdays || '',
          weekends: data.hours_weekends || ''
        },
        lunch_time: {
          start: data.lunch_start || '13:00',
          end: data.lunch_end || '14:00'
        }
      });
      setBotGloballyEnabled(data.bot_globally_enabled ?? true);
    } catch (err) {
      console.error(t('settings:error_loading_salon_settings'), err);
      toast.error(t('settings:error_loading_settings'));
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      console.log('🔍 [Profile] Загрузка профиля...');
      const response = await api.getMyProfile();
      console.log('✅ [Profile] Ответ получен:', response);

      if (response.success && response.profile) {
        setProfileForm({
          username: response.profile.username || '',
          full_name: response.profile.full_name || '',
          email: response.profile.email || '',
          phone_number: response.profile.phone || response.profile.phone_number || '',
          position: response.profile.position || '',
          birth_date: response.profile.birthday || response.profile.birth_date || '',
          instagram_link: response.profile.instagram_link || '',
          whatsapp: response.profile.whatsapp || '',
          telegram: response.profile.telegram || '',
          about_me: response.profile.about_me || response.profile.bio || '',
          specialization: response.profile.specialization || '',
          years_of_experience: String(response.profile.years_of_experience || ''),
          current_password: '',
          new_password: '',
          confirm_password: '',
          photo: response.profile.photo || '',
        });
        console.log('✅ [Profile] Профиль успешно загружен');
      } else {
        console.warn('⚠️ [Profile] Неожиданный формат ответа:', response);
      }
    } catch (err: any) {
      console.error('❌ [Profile] Ошибка загрузки профиля:');
      console.error('  - Сообщение:', err.message);
      console.error('  - Статус:', err.status);
      console.error('  - Полная ошибка:', err);

      // Show error toast for debugging
      if (err.message === 'User is not linked to an employee') {
        console.warn('⚠️ [Profile] Пользователь не привязан к сотруднику (employee_id отсутствует)');
        toast.error(t('profile_not_available_not_linked'));
      } else {
        toast.error(`${t('error_loading_profile')}: ${err.message || t('unknown_error')} `);
      }
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setNotificationSettings({
          emailNotifications: data.emailNotifications ?? true,
          smsNotifications: data.smsNotifications ?? false,
          bookingNotifications: data.bookingNotifications ?? true,
          birthdayReminders: data.birthdayReminders ?? true,
          birthdayDaysAdvance: data.birthdayDaysAdvance ?? 7,
        });
      }
    } catch (err) {
      console.error('Error loading notification settings:', err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('file_too_large'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(t('images_only'));
      return;
    }

    try {
      setUploadingPhoto(true);
      const uploadResponse = await api.uploadFile(file);
      if (uploadResponse.url) {
        const response = await api.updateMyProfile({ photo_url: uploadResponse.url });
        if (response.success) {
          toast.success(t('photo_updated'));
        }
      }
    } catch (err: any) {
      toast.error(err.message || t('error_photo_upload'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (profileForm.username.length < 3) {
      toast.error(t('error_username_too_short'));
      return;
    }

    if (profileForm.full_name.length < 2) {
      toast.error(t('error_name_too_short'));
      return;
    }

    if (profileForm.email && !profileForm.email.includes('@')) {
      toast.error(t('error_invalid_email'));
      return;
    }

    if (profileForm.new_password) {
      if (!profileForm.current_password) {
        toast.error(t('error_enter_current_password'));
        return;
      }

      if (profileForm.new_password.length < 6) {
        toast.error(t('error_password_too_short'));
        return;
      }

      if (profileForm.new_password !== profileForm.confirm_password) {
        toast.error(t('error_passwords_dont_match'));
        return;
      }
    }

    try {
      setSavingProfile(true);

      const updateData: any = {
        username: profileForm.username,
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone_number: profileForm.phone_number,
        position: profileForm.position,
        birth_date: profileForm.birth_date,
        instagram_link: profileForm.instagram_link,
        whatsapp: profileForm.whatsapp,
        telegram: profileForm.telegram,
        about_me: profileForm.about_me,
        specialization: profileForm.specialization,
        years_of_experience: profileForm.years_of_experience,
        photo: profileForm.photo,
      };

      if (profileForm.new_password) {
        updateData.current_password = profileForm.current_password;
        updateData.new_password = profileForm.new_password;
      }

      const response = await api.updateMyProfile(updateData);

      if (response.success) {
        toast.success(t('profile_updated'));
        setProfileForm({
          ...profileForm,
          current_password: '',
          new_password: '',
          confirm_password: '',
        });

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.username = response.profile.username;
          user.full_name = response.profile.full_name;
          user.email = response.profile.email;
          localStorage.setItem('user', JSON.stringify(user));
        }
      } else {
        toast.error(response.error || t('error_update_profile'));
      }
    } catch (err: any) {
      toast.error(err.message || t('error_update_profile'));
    } finally {
      setSavingProfile(false);
    }
  };


  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const data = await api.getRoles();
      setRoles(data.roles || []);
    } catch (err) {
      console.error(t('settings:error_loading_roles'), err);
    } finally {
      setLoadingRoles(false);
    }
  }

  const handleSaveGeneral = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await api.updateSalonSettings({
        name: generalSettings.salonName,
        city: generalSettings.city,
        address: generalSettings.address,
        phone: generalSettings.phone,
        email: generalSettings.email,
        instagram: generalSettings.instagram,
        language: generalSettings.language,
        telegram_manager_chat_id: generalSettings.telegram_manager_chat_id,
        currency: generalSettings.currency,
        timezone_offset: generalSettings.timezone_offset,
        birthday_discount: generalSettings.birthday_discount,
        hours_weekdays: generalSettings.working_hours.weekdays,
        hours_weekends: generalSettings.working_hours.weekends,
        lunch_start: generalSettings.lunch_time.start,
        lunch_end: generalSettings.lunch_time.end
      });

      toast.success(t('settings:general_settings_saved'));
    } catch (err) {
      console.error(t('settings:error_saving_general_settings'), err);
      toast.error(t('settings:server_error'));
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings)
      });

      if (response.ok) {
        toast.success(t('settings:notifications_configured'));
      } else {
        toast.error(t('settings:error_saving_notifications'));
      }
    } catch (err) {
      console.error(t('settings:error_saving_notification_settings'), err);
      toast.error(t('settings:server_error'));
    }
  };

  // Roles handlers
  const handleCreateRole = async () => {
    if (!createRoleForm.role_key || !createRoleForm.role_name) {
      toast.error(t('settings:fill_required_fields'));
      return;
    }

    try {
      setSavingRole(true);
      await api.createRole(createRoleForm);
      toast.success(t('settings:role_created'));
      setShowCreateRoleDialog(false);
      setCreateRoleForm({ role_key: '', role_name: '', role_description: '' });
      await loadRoles();
    } catch (err) {
      let message = t('settings:error');
      if (err instanceof Error) {
        message += err.message;
      } else if (typeof err === 'string') {
        message += err;
      } else {
        message += t('settings:unknown_error');
      }
      toast.error(message);
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleKey: string, roleName: string) => {
    if (!confirm(t('settings:delete_role') + roleName)) return;

    try {
      await api.deleteRole(roleKey);
      toast.success(t('settings:role_deleted'));
      await loadRoles();
    } catch (err) {
      let errorMessage = t('settings:error');
      if (err instanceof Error) {
        errorMessage += err.message;
      } else if (typeof err === 'string') {
        errorMessage += err;
      } else {
        errorMessage += t('settings:unknown_error');
      }
      toast.error(errorMessage);
    }
  };

  const handleOpenPermissions = async (role: any) => {
    try {
      setSelectedRole(role);
      setShowPermissionsDialog(true);
      const data = await api.getRolePermissions(role.key);
      setPermissions(data.permissions || {});
      setAvailablePermissions(data.available_permissions || {});
    } catch (err) {
      toast.error(t('settings:error') + (err instanceof Error ? err.message : t('settings:unknown_error')));
    }
  };

  const handleTogglePermission = (permKey: string, action: string) => {
    setPermissions(prev => {
      const typedPrev = prev as Record<string, Record<string, boolean>>;
      return {
        ...prev,
        [permKey]: {
          ...(typedPrev[permKey] || {}),
          [action]: !(typedPrev[permKey]?.[action])
        }
      };
    });
  };

  const handleSavePermissions = async () => {
    try {
      setSavingRole(true);
      if (!selectedRole) {
        toast.error(t('settings:error') + t('settings:no_role_selected'));
        return;
      }
      if (!('key' in selectedRole)) {
        toast.error(t('settings:error') + t('settings:no_role_selected'));
        return;
      }
      await api.updateRolePermissions((selectedRole as { key: string }).key, permissions);
      toast.success(t('settings:permissions_updated'));
      setShowPermissionsDialog(false);
    } catch (err) {
      toast.error(t('settings:error') + (err instanceof Error ? err.message : t('settings:unknown_error')));
    } finally {
      setSavingRole(false);
    }
  };
  const handleUpdateBotEnabled = async (enabled: boolean) => {
    try {
      await api.updateBotGloballyEnabled(enabled);
      setBotGloballyEnabled(enabled);
      toast.success(enabled ? t('settings:bot_enabled_globally') : t('settings:bot_disabled_globally'));
    } catch (err) {
      toast.error(t('settings:error_updating'));
    }
  };

  // Subscriptions functions
  const loadSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      const response = await api.getUserSubscriptions();
      setSubscriptions(response.subscriptions);
      setAvailableSubscriptions(response.available_types);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const handleToggleSubscription = async (type: string, isSubscribed: boolean) => {
    try {
      await api.updateSubscription(type, isSubscribed);
      setSubscriptions({
        ...subscriptions,
        [type]: {
          ...subscriptions[type],
          is_subscribed: isSubscribed
        }
      });
      toast.success(t('subscription_updated'));
    } catch (err) {
      toast.error(t('error_updating_subscription'));
    }
  };

  const handleToggleChannel = async (type: string, channel: 'email' | 'telegram' | 'instagram', enabled: boolean) => {
    try {
      await api.updateSubscription(type, subscriptions[type]?.is_subscribed || false, {
        [channel]: enabled
      });
      setSubscriptions({
        ...subscriptions,
        [type]: {
          ...subscriptions[type],
          channels: {
            ...subscriptions[type].channels,
            [channel]: enabled
          }
        }
      });
      toast.success(t('channel_updated'));
    } catch (err) {
      toast.error(t('error_updating_channel'));
    }
  };

  // Account deletion function
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error(t('enter_password_to_delete'));
      return;
    }

    if (deleteConfirmText !== 'DELETE') {
      toast.error(t('type_delete_to_confirm'));
      return;
    }

    if (!window.confirm(t('are_you_absolutely_sure'))) {
      return;
    }

    try {
      setDeletingAccount(true);
      await api.deleteAccount(deletePassword, true);
      toast.success(t('account_deleted_successfully'));
      setTimeout(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('session_token');
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || t('error_deleting_account'));
    } finally {
      setDeletingAccount(false);
    }
  };

  // Broadcasts functions
  const loadBroadcastHistory = async () => {
    try {
      setLoadingBroadcastHistory(true);
      const response = await api.getBroadcastHistory();
      setBroadcastHistory(response.history);
    } catch (err) {
      console.error('Error loading broadcast history:', err);
    } finally {
      setLoadingBroadcastHistory(false);
    }
  };

  const loadBroadcastUsers = async () => {
    try {
      setLoadingBroadcastUsers(true);
      console.log('🔍 Loading users for broadcast selection...');
      const response = await api.getUsers();
      console.log('✅ Users response:', response);
      const usersArray = Array.isArray(response) ? response : (response?.users || []);
      console.log('✅ Users array:', usersArray);
      setBroadcastUsers(usersArray);
    } catch (err) {
      console.error('❌ Error loading broadcast users:', err);
    } finally {
      setLoadingBroadcastUsers(false);
    }
  };

  const loadBookingReminderSettings = async () => {
    try {
      setLoadingReminderSettings(true);
      const response = await api.getBookingReminderSettings();
      setBookingReminderSettings(response.settings);
    } catch (err) {
      console.error('Error loading booking reminder settings:', err);
    } finally {
      setLoadingReminderSettings(false);
    }
  };

  const handleCreateReminderSetting = async () => {
    if (!reminderForm.name) {
      toast.error(t('settings:enter_reminder_name'));
      return;
    }
    if (reminderForm.days_before === 0 && reminderForm.hours_before === 0) {
      toast.error(t('settings:specify_reminder_time'));
      return;
    }

    try {
      await api.createBookingReminderSetting(reminderForm);
      toast.success(t('settings:reminder_setting_created'));
      setShowCreateReminderDialog(false);
      setReminderForm({ name: '', days_before: 0, hours_before: 2, notification_type: 'email' });
      loadBookingReminderSettings();
    } catch (err) {
      console.error('Error creating reminder setting:', err);
      toast.error(t('settings:error_creating_setting'));
    }
  };

  const handleToggleReminderSetting = async (id: number) => {
    try {
      await api.toggleBookingReminderSetting(id);
      loadBookingReminderSettings();
    } catch (err) {
      console.error('Error toggling reminder setting:', err);
      toast.error(t('settings:error_changing_setting'));
    }
  };

  const handleDeleteReminderSetting = async (id: number) => {
    if (!confirm(t('settings:delete_reminder_setting'))) {
      return;
    }

    try {
      await api.deleteBookingReminderSetting(id);
      toast.success(t('settings:setting_deleted'));
      loadBookingReminderSettings();
    } catch (err) {
      console.error('Error deleting reminder setting:', err);
      toast.error(t('settings:error_deleting_setting'));
    }
  };

  // Messenger functions
  const loadMessengerSettings = async () => {
    try {
      setLoadingMessengers(true);
      const response = await api.getMessengerSettings();
      setMessengerSettings(response.settings);
    } catch (err) {
      console.error('Error loading messenger settings:', err);
    } finally {
      setLoadingMessengers(false);
    }
  };

  const handleToggleMessenger = async (messengerType: string, currentState: boolean) => {
    try {
      await api.updateMessengerSetting(messengerType, { is_enabled: !currentState });
      toast.success(`${messengerType} ${!currentState ? t('settings:enabled') : t('settings:disabled')} `);
      loadMessengerSettings();
      // Отправляем событие для обновления меню мессенджеров
      window.dispatchEvent(new Event('messengers-updated'));
    } catch (err) {
      console.error('Error toggling messenger:', err);
      toast.error(t('settings:error_changing_setting'));
    }
  };

  const handleSaveMessengerConfig = async (messengerType: string) => {
    try {
      await api.updateMessengerSetting(messengerType, messengerForm);
      toast.success(t('settings:settings_saved'));
      setEditingMessenger(null);
      setMessengerForm({ api_token: '', webhook_url: '' });
      loadMessengerSettings();
      // Отправляем событие для обновления меню мессенджеров
      window.dispatchEvent(new Event('messengers-updated'));
    } catch (err) {
      console.error('Error saving messenger config:', err);
      toast.error(t('settings:error_saving_settings'));
    }
  };

  const handleStartEditMessenger = (messengerType: string) => {
    const messenger = messengerSettings.find(m => m.messenger_type === messengerType);
    if (messenger) {
      setMessengerForm({
        api_token: messenger.api_token || '',
        webhook_url: messenger.webhook_url || ''
      });
      setEditingMessenger(messengerType);
    }
  };

  const handleBroadcastUserToggle = (userId: number) => {
    const currentIds = broadcastForm.user_ids || [];
    if (currentIds.includes(userId)) {
      setBroadcastForm({ ...broadcastForm, user_ids: currentIds.filter(id => id !== userId) });
    } else {
      setBroadcastForm({ ...broadcastForm, user_ids: [...currentIds, userId] });
    }
  };


  const handleBroadcastChannelToggle = (channel: string) => {
    if (broadcastForm.channels.includes(channel)) {
      setBroadcastForm({ ...broadcastForm, channels: broadcastForm.channels.filter(c => c !== channel) });
    } else {
      setBroadcastForm({ ...broadcastForm, channels: [...broadcastForm.channels, channel] });
    }
  };

  const handleBroadcastPreview = async () => {
    if (!broadcastForm.subscription_type) {
      toast.error(t('settings:select_subscription_type'));
      return;
    }

    if (broadcastForm.channels.length === 0) {
      toast.error(t('settings:select_at_least_one_channel'));
      return;
    }

    try {
      setLoadingBroadcastPreview(true);
      const data = await api.previewBroadcast(broadcastForm);
      setBroadcastPreview(data);
      toast.success(`${t('common:found')} ${data.total_users} ${t('common:recipients')} `);
    } catch (err: any) {
      toast.error(err.message || t('settings:preview_error'));
    } finally {
      setLoadingBroadcastPreview(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastForm.subscription_type || !broadcastForm.subject || !broadcastForm.message) {
      toast.error(t('settings:fill_all_required_fields'));
      return;
    }

    if (broadcastForm.channels.length === 0) {
      toast.error(t('settings:select_at_least_one_channel'));
      return;
    }

    if (!window.confirm(t('settings:confirm_send_broadcast'))) {
      return;
    }

    try {
      setSendingBroadcast(true);
      const response = await api.sendBroadcast(broadcastForm);
      toast.success(response.message);

      // Reset form
      setBroadcastForm({
        subscription_type: '',
        channels: [],
        subject: '',
        message: '',
        target_role: '',
        user_ids: [],
      });
      setBroadcastPreview(null);

      // Reload history
      await loadBroadcastHistory();
    } catch (err: any) {
      toast.error(err.message || t('settings:send_error'));
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Holidays functions
  const loadHolidays = async () => {
    try {
      setLoadingHolidays(true);
      const data = await api.getHolidays();
      setHolidays(data);
    } catch (err) {
      console.error('Error loading holidays:', err);
    } finally {
      setLoadingHolidays(false);
    }
  };

  const handleCreateHoliday = async () => {
    if (!holidayForm.date || !holidayForm.name) {
      toast.error(t('settings:enter_holiday_details', 'Please enter holiday date and name'));
      return;
    }

    try {
      await api.createHoliday(holidayForm);
      toast.success(t('settings:holiday_created', 'Holiday created successfully'));
      setShowCreateHolidayDialog(false);
      setHolidayForm({ date: '', name: '', is_closed: true, master_exceptions: [] });
      loadHolidays();
    } catch (err) {
      console.error('Error creating holiday:', err);
      toast.error(t('settings:error_creating_holiday', 'Error creating holiday'));
    }
  };

  const handleDeleteHoliday = async (date: string) => {
    if (!confirm(t('settings:delete_holiday_confirm', 'Are you sure you want to delete this holiday?'))) {
      return;
    }

    try {
      await api.deleteHoliday(date);
      toast.success(t('settings:holiday_deleted', 'Holiday deleted successfully'));
      loadHolidays();
    } catch (err) {
      console.error('Error deleting holiday:', err);
      toast.error(t('settings:error_deleting_holiday', 'Error deleting holiday'));
    }
  };

  // Проверка доступа к настройкам
  if (!userPermissions.canViewSettings) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 max-w-md text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('settings:access_denied')}</h2>
          <p className="text-gray-600">
            {t('settings:access_denied_message')}
          </p>
        </div>
      </div>
    );
  }

  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const activeTab = tab || 'general';

  const handleTabChange = (value: string) => {
    navigate(`/crm/settings/${value}`);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 md:w-8 md:h-8 settings-icon-primary" />
          {t('settings:system_settings')}
        </h1>
        <p className="text-sm md:text-base text-gray-600">{t('settings:manage_crm_parameters')}</p>
      </div>

      {/* Информация о правах доступа */}
      {!userPermissions.canEditSettings && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">{t('settings:view_mode')}</p>
              <p className="text-yellow-700 text-sm mt-1">
                {t('settings:view_mode_message')}
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex flex-nowrap overflow-x-auto w-full lg:w-auto gap-1 pb-1 hide-scrollbar">

          <TabsTrigger key="profile" value="profile" className="flex items-center gap-2 whitespace-nowrap settings-tab-trigger-active">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:profile', 'Profile')}</span>
          </TabsTrigger>

          <TabsTrigger key="general" value="general" className="flex items-center gap-2 settings-tab-trigger-active">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:general')}</span>
          </TabsTrigger>

          <TabsTrigger key="notifications" value="notifications" className="flex items-center gap-2 settings-tab-trigger-active">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:notifications')}</span>
          </TabsTrigger>
          <TabsTrigger key="security" value="security" className="flex items-center gap-2 settings-tab-trigger-active">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:security')}</span>
          </TabsTrigger>
          <TabsTrigger key="diagnostics" value="diagnostics" className="flex items-center gap-2 settings-tab-trigger-active">
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:diagnostics')}</span>
          </TabsTrigger>
          <TabsTrigger key="subscriptions" value="subscriptions" className="flex items-center gap-2 settings-tab-trigger-active">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">{t('subscriptions')}</span>
          </TabsTrigger>
          <TabsTrigger key="broadcasts" value="broadcasts" className="flex items-center gap-2 settings-tab-trigger-active">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:broadcasts')}</span>
          </TabsTrigger>
          <TabsTrigger key="messengers" value="messengers" className="flex items-center gap-2 settings-tab-trigger-active">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:messengers')}</span>
          </TabsTrigger>
          <TabsTrigger key="holidays" value="holidays" className="flex items-center gap-2 settings-tab-trigger-active">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:holidays', 'Holidays')}</span>
          </TabsTrigger>
          <TabsTrigger key="danger" value="danger" className="flex items-center gap-2 settings-tab-trigger-active">
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t('danger_zone')}</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="profile">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl text-[var(--heading)] flex items-center gap-3">
                <User className="w-6 h-6 settings-text-primary" />
                {t('settings:personal_information', 'Личная информация')}
              </h2>
              <Button
                onClick={() => handleSaveProfile()}
                disabled={savingProfile}
                className="settings-bg-primary settings-bg-primary-hover settings-text-primary-foreground"
              >
                {savingProfile ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('common:saving', 'Сохранение...')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t('common:save', 'Сохранить')}
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center p-6 bg-muted/30 rounded-xl border border-border/50 h-fit">
                <div className="relative group mb-4">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-lg">
                    {profileForm.photo ? (
                      <img
                        src={profileForm.photo}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full settings-bg-primary-light flex items-center justify-center">
                        <User className="w-16 h-16 settings-text-primary-muted" />
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-1 right-1 p-2 settings-bg-primary settings-text-primary-foreground rounded-full cursor-pointer shadow-lg settings-bg-primary-hover transition-all scale-90 hover:scale-100">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">{profileForm.full_name || 'User'}</h4>
                <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">{profileForm.position || t('settings:no_position', 'Сотрудник')}</p>
                {uploadingPhoto && (
                  <div className="flex items-center gap-2 text-xs settings-text-primary animate-pulse">
                    <Loader className="w-3 h-3 animate-spin" />
                    {t('common:uploading', 'Загрузка...')}
                  </div>
                )}
              </div>

              {/* Main Info Form */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      {t('settings:full_name', 'Полное имя')} *
                    </Label>
                    <Input
                      id="full_name"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      placeholder={t('settings:placeholder_full_name', 'Имя Фамилия')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                      {t('settings:username', 'Логин')} *
                    </Label>
                    <Input
                      id="username"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      placeholder="username"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="email@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_number" className="flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                      {t('settings:phone_number', 'Номер телефона')}
                    </Label>
                    <Input
                      id="phone_number"
                      value={profileForm.phone_number}
                      onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                      placeholder="+7 (___) ___-__-__"
                    />
                  </div>
                </div>

                <div className="border-t border-border/50 pt-6">
                  <h3 className="text-lg font-medium text-[var(--heading)] mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 settings-text-primary" />
                    {t('settings:professional_profile', 'Профессиональный профиль')}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="position" className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-muted-foreground" />
                        {t('settings:position', 'Должность')}
                      </Label>
                      <Input
                        id="position"
                        value={profileForm.position}
                        onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })}
                        placeholder={t('settings:placeholder_position', 'Например: Топ-стилист')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="years_of_experience" className="flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-muted-foreground" />
                        {t('settings:years_of_experience', 'Стаж (лет)')}
                      </Label>
                      <Input
                        id="years_of_experience"
                        type="number"
                        min="0"
                        value={profileForm.years_of_experience}
                        onChange={(e) => setProfileForm({ ...profileForm, years_of_experience: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="specialization" className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                        {t('settings:specialization', 'Специализация')}
                      </Label>
                      <Input
                        id="specialization"
                        value={profileForm.specialization}
                        onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                        placeholder={t('settings:placeholder_specialization', 'Перечислите основные направления через запятую')}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="about_me" className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        {t('settings:about_me', 'О себе')}
                      </Label>
                      <Textarea
                        id="about_me"
                        rows={4}
                        value={profileForm.about_me}
                        onChange={(e) => setProfileForm({ ...profileForm, about_me: e.target.value })}
                        placeholder={t('settings:placeholder_about_me', 'Расскажите о своем опыте и подходе к работе...')}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-6">
                  <h3 className="text-lg font-medium text-[var(--heading)] mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 settings-text-primary" />
                    {t('settings:social_links', 'Социальные сети')}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="instagram" className="flex items-center gap-2">
                        <InstagramIcon className="w-4 h-4" colorful={true} />
                        Instagram
                      </Label>
                      <Input
                        id="instagram"
                        value={profileForm.instagram_link}
                        onChange={(e) => setProfileForm({ ...profileForm, instagram_link: e.target.value })}
                        placeholder="@username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp" className="flex items-center gap-2">
                        <WhatsAppIcon className="w-4 h-4" colorful={true} />
                        WhatsApp
                      </Label>
                      <Input
                        id="whatsapp"
                        value={profileForm.whatsapp}
                        onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                        placeholder="+7..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telegram" className="flex items-center gap-2">
                        <TelegramIcon className="w-3.5 h-3.5" colorful={true} />
                        Telegram
                      </Label>
                      <Input
                        id="telegram"
                        value={profileForm.telegram}
                        onChange={(e) => setProfileForm({ ...profileForm, telegram: e.target.value })}
                        placeholder="@username"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">{t('settings:general_settings')}</h2>
            <div className="mb-8 p-6 settings-card-gradient border-2 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Bot className="w-6 h-6 settings-bot-icon" />
                <h3 className="text-lg font-bold text-gray-900">{t('settings:bot_management')}</h3>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {t('settings:bot_enabled_for_all_clients')}
                  </p>
                  <p className="text-xs text-gray-600">
                    {t('settings:disable_to_stop_auto_replies')}
                  </p>
                </div>
                <Switch
                  checked={botGloballyEnabled}
                  onCheckedChange={handleUpdateBotEnabled}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 settings-loader animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSaveGeneral} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="salonName">{t('settings:salon_name')} *</Label>
                    <Input
                      id="salonName"
                      value={generalSettings.salonName}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, salonName: e.target.value })}
                      required
                      className="px-3"
                    />
                  </div>

                  <div>
                    <Label htmlFor="language">{t('settings:system_language')}</Label>
                    <Select
                      value={generalSettings.language}
                      onValueChange={(value: string) =>
                        setGeneralSettings({ ...generalSettings, language: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {t(`settings:${lang}`, lang.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="city">{t('settings:city')}</Label>
                    <Input
                      id="city"
                      value={generalSettings.city}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, city: e.target.value })}
                      className="px-3"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">{t('settings:phone')}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={generalSettings.phone}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, phone: e.target.value })}
                      className="px-3"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">{t('settings:address')}</Label>
                  <Input
                    id="address"
                    value={generalSettings.address}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
                    className="px-3"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email">{t('settings:email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={generalSettings.email}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, email: e.target.value })}
                      className="px-3"
                    />
                  </div>

                  <div>
                    <Label htmlFor="instagram">{t('settings:instagram')}</Label>
                    <Input
                      id="instagram"
                      value={generalSettings.instagram}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, instagram: e.target.value })}
                      placeholder="@username"
                      className="px-3"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telegram_chat_id">{t('settings:telegram_manager_chat_id', 'Telegram Manager Chat ID')}</Label>
                    <Input
                      id="telegram_chat_id"
                      value={generalSettings.telegram_manager_chat_id}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, telegram_manager_chat_id: e.target.value })}
                      placeholder="-1001234567890"
                      className="px-3"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('settings:telegram_chat_id_hint', 'ID чата для получения уведомлений о негативных отзывах')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="weekdays">{t('settings:weekdays_hours')}</Label>
                    <Input
                      id="weekdays"
                      value={generalSettings.working_hours.weekdays}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        working_hours: { ...generalSettings.working_hours, weekdays: e.target.value }
                      })}
                      placeholder="9:00 - 21:30"
                      className="px-3"
                    />
                  </div>

                  <div>
                    <Label htmlFor="weekends">{t('settings:weekends_hours')}</Label>
                    <Input
                      id="weekends"
                      value={generalSettings.working_hours.weekends}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        working_hours: { ...generalSettings.working_hours, weekends: e.target.value }
                      })}
                      placeholder="10:30 - 21:30"
                      className="px-3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <Label htmlFor="lunch_start">{t('settings:lunch_start', 'Начало обеда')}</Label>
                    <Input
                      id="lunch_start"
                      type="time"
                      value={generalSettings.lunch_time.start}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        lunch_time: { ...generalSettings.lunch_time, start: e.target.value }
                      })}
                      className="px-3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lunch_end">{t('settings:lunch_end', 'Конец обеда')}</Label>
                    <Input
                      id="lunch_end"
                      type="time"
                      value={generalSettings.lunch_time.end}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        lunch_time: { ...generalSettings.lunch_time, end: e.target.value }
                      })}
                      className="px-3"
                    />
                  </div>
                </div>

                {/* Universal Settings Section */}
                <div className="space-y-4 border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('settings:universal_settings', 'Универсальные настройки')}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="city">{t('settings:city', 'Город')}</Label>
                      <Input
                        id="city"
                        value={generalSettings.city}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, city: e.target.value })}
                        placeholder="Dubai"
                      />
                    </div>

                    <div>
                      <Label htmlFor="currency">{t('settings:currency', 'Валюта')}</Label>
                      <Select
                        value={generalSettings.currency}
                        onValueChange={(value) => setGeneralSettings({ ...generalSettings, currency: value })}
                      >
                        <SelectTrigger id="currency">
                          <SelectValue placeholder={t('settings:select_currency', 'Выберите валюту')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AED">AED (Dirham)</SelectItem>
                          <SelectItem value="USD">USD (Dollar)</SelectItem>
                          <SelectItem value="EUR">EUR (Euro)</SelectItem>
                          <SelectItem value="RUB">RUB (Ruble)</SelectItem>
                          <SelectItem value="KZT">KZT (Tenge)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="timezone_offset">{t('settings:timezone_offset', 'Часовой пояс')}</Label>
                      <Select
                        value={generalSettings.timezone_offset}
                        onValueChange={(value) => setGeneralSettings({ ...generalSettings, timezone_offset: value })}
                      >
                        <SelectTrigger id="timezone_offset">
                          <SelectValue placeholder={t('settings:select_timezone', 'Выберите часовой пояс')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC+0">UTC+0 (London)</SelectItem>
                          <SelectItem value="UTC+1">UTC+1 (Paris)</SelectItem>
                          <SelectItem value="UTC+2">UTC+2 (Cairo)</SelectItem>
                          <SelectItem value="UTC+3">UTC+3 (Moscow)</SelectItem>
                          <SelectItem value="UTC+4">UTC+4 (Dubai)</SelectItem>
                          <SelectItem value="UTC+5">UTC+5 (Karachi)</SelectItem>
                          <SelectItem value="UTC+6">UTC+6 (Almaty)</SelectItem>
                          <SelectItem value="UTC+8">UTC+8 (Singapore)</SelectItem>
                          <SelectItem value="UTC-5">UTC-5 (New York)</SelectItem>
                          <SelectItem value="UTC-8">UTC-8 (Los Angeles)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="birthday_discount">{t('settings:birthday_discount', 'Скидка на день рождения')}</Label>
                      <Input
                        id="birthday_discount"
                        value={generalSettings.birthday_discount}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, birthday_discount: e.target.value })}
                        placeholder="15%"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t('settings:birthday_discount_hint', 'Например: 15%, 20%, 500 {{currency}}', { currency: generalSettings.currency })}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="settings-button-gradient"
                  disabled={!userPermissions.canEditSettings}
                >
                  {t('settings:save_changes')}
                </Button>
              </form>
            )}
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">{t('settings:notification_settings')}</h2>

            <form onSubmit={handleSaveNotifications} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg text-gray-900 mb-4">{t('settings:notification_channels')}</h3>

                <div key="email-notifications" className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-900">{t('settings:email_notifications')}</p>
                      <p className="text-xs text-gray-600">{t('settings:receive_by_email')}</p>
                    </div>
                  </div>
                  <Switch
                    checked={!!notificationSettings.emailNotifications}
                    onCheckedChange={(checked: boolean) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked })}
                  />
                </div>

                <div key="sms-notifications" className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-900">{t('settings:sms_notifications')}</p>
                      <p className="text-xs text-gray-600">{t('settings:receive_by_phone')}</p>
                    </div>
                  </div>
                  <Switch
                    checked={!!notificationSettings.smsNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings({ ...notificationSettings, smsNotifications: checked })
                    }
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 space-y-4">
                <h3 className="text-lg text-gray-900 mb-4">{t('settings:notification_types')}</h3>

                <div key="booking-notif" className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-900">{t('settings:booking_notifications')}</p>
                    <p className="text-xs text-gray-600">{t('settings:new_bookings_changes_cancellations')}</p>
                  </div>
                  <Switch
                    checked={notificationSettings.bookingNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings({ ...notificationSettings, bookingNotifications: checked })
                    }
                  />
                </div>

                <div key="birthday-notif" className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">{t('settings:birthday_reminders')}</p>
                      <p className="text-xs text-gray-600">{t('settings:notifications_about_birthdays')}</p>
                    </div>
                    <Switch
                      checked={!!notificationSettings.birthdayReminders}
                      onCheckedChange={(checked: boolean) =>
                        setNotificationSettings({ ...notificationSettings, birthdayReminders: checked })
                      }
                    />
                  </div>

                  {notificationSettings.birthdayReminders && (
                    <div>
                      <Label htmlFor="birthdayDays">{t('settings:notify_days')}</Label>
                      <Select
                        value={notificationSettings.birthdayDaysAdvance.toString()}
                        onValueChange={(value: string) =>
                          setNotificationSettings({ ...notificationSettings, birthdayDaysAdvance: parseInt(value, 10) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">{t('settings:3_days')}</SelectItem>
                          <SelectItem value="7">{t('settings:7_days')}</SelectItem>
                          <SelectItem value="14">{t('settings:14_days')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg text-gray-900">{t('settings:booking_reminders')}</h3>
                  <Button
                    type="button"
                    onClick={() => setShowCreateReminderDialog(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('settings:add_reminder')}
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {t('settings:configure_auto_reminders')}
                </p>

                {loadingReminderSettings ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-6 h-6 settings-loader animate-spin" />
                  </div>
                ) : bookingReminderSettings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>{t('settings:no_reminders_configured')}</p>
                    <p className="text-sm mt-1">{t('settings:add_reminder_hint')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookingReminderSettings.map((setting) => (
                      <div
                        key={setting.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Bell className={`w - 5 h - 5 ${setting.is_enabled ? 'settings-text-pink' : 'text-gray-400'} `} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {t('settings:reminder_label')} {setting.days_before > 0 && `${setting.days_before} ${t('settings:days')} `}{setting.days_before > 0 && setting.hours_before > 0 && ' '}{setting.hours_before > 0 && `${setting.hours_before} ${t('settings:hours')} `}
                            </p>
                            <p className="text-xs text-gray-600">
                              {t('settings:before_booking')} · {setting.notification_type === 'email' ? 'Email' : 'SMS'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={setting.is_enabled}
                            onCheckedChange={() => handleToggleReminderSetting(setting.id)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReminderSetting(setting.id)}
                            className="settings-text-red settings-text-red-hover settings-bg-red-light-hover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Create Reminder Dialog */}
                {showCreateReminderDialog && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">{t('settings:new_reminder')}</h3>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="reminder-name">{t('settings:name')} *</Label>
                          <Input
                            id="reminder-name"
                            value={reminderForm.name}
                            onChange={(e) => setReminderForm({ ...reminderForm, name: e.target.value })}
                            placeholder={t('settings:placeholder_reminder_example')}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="days-before">{t('settings:days_before_booking')}</Label>
                            <Input
                              id="days-before"
                              type="number"
                              min="0"
                              value={reminderForm.days_before}
                              onChange={(e) => setReminderForm({ ...reminderForm, days_before: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="hours-before">{t('settings:hours_before_booking')}</Label>
                            <Input
                              id="hours-before"
                              type="number"
                              min="0"
                              value={reminderForm.hours_before}
                              onChange={(e) => setReminderForm({ ...reminderForm, hours_before: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="notification-type">{t('settings:notification_type')}</Label>
                          <Select
                            value={reminderForm.notification_type}
                            onValueChange={(value) => setReminderForm({ ...reminderForm, notification_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="sms">SMS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowCreateReminderDialog(false);
                            setReminderForm({ name: '', days_before: 0, hours_before: 2, notification_type: 'email' });
                          }}
                          className="flex-1"
                        >
                          {t('settings:cancel')}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCreateReminderSetting}
                          className="flex-1 settings-button-gradient"
                        >
                          {t('settings:create')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="settings-button-gradient"
                disabled={!userPermissions.canEditSettings}
              >
                {t('settings:save_notification_settings')}
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl text-gray-900 mb-2">{t('settings:manage_roles')}</h2>
                <p className="text-gray-600">{t('settings:create_roles_and_assign_permissions')}</p>
              </div>
              <Button onClick={() => setShowCreateRoleDialog(true)} className="settings-danger-button">
                <Plus className="w-4 h-4 mr-2" />
                {t('settings:create_role')}
              </Button>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-800 font-medium text-sm mb-2">{t('settings:about_roles_system')}:</p>
                  <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                    <li>{t('settings:create_custom_roles_for_your_business')}</li>
                    <li>{t('settings:assign_detailed_permissions')}: {t('permission_details')}</li>
                    <li>{t('settings:builtin_roles_cannot_be_deleted')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Roles Grid */}
            {loadingRoles ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 settings-loader animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role: any) => (
                  <div key={role.key} className="relative bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    {!role.is_custom && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-100 border border-yellow-200 rounded-full text-xs font-semibold text-yellow-800">
                        {t('settings:builtin')}
                      </div>
                    )}

                    <div className="mb-4">
                      <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                        <Shield className="w-6 h-6 settings-text-pink" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{role.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{role.description}</p>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPermissions(role)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {t('settings:permissions')}
                      </Button>
                      {role.is_custom && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteRole(role.key, role.name)}
                          className="settings-text-red settings-text-red-hover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">{t('settings:security_and_access')}</h2>

            <div className="space-y-6">
              <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-sm text-gray-900 mb-2 font-semibold">{t('settings:security_recommendations')}</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>• {t('settings:use_strong_passwords')}</li>
                      <li>• {t('settings:regularly_change_passwords')}</li>
                      <li>• {t('settings:do_not_share_credentials')}</li>
                      <li>• {t('settings:check_active_sessions')}</li>
                      <li>• {t('settings:regularly_backup_data')}</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg text-gray-900 mb-4">{t('settings:backup')}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('settings:download_backup_for_security')}
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/settings/download-backup', {
                        method: 'GET',
                        credentials: 'include',
                      });

                      if (!response.ok) {
                        throw new Error('Failed to download backup');
                      }

                      // Получаем blob и создаем ссылку для скачивания
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `salon_bot_backup_${new Date().toISOString().slice(0, 10)}.db`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);

                      toast.success(t('settings:backup_downloaded'));
                    } catch (error) {
                      console.error('Error downloading backup:', error);
                      toast.error(t('settings:error_downloading_backup'));
                    }
                  }}
                >
                  📥 {t('settings:download_backup')}
                </Button>
              </div>
            </div>

          </div>
        </TabsContent>
        {/* Diagnostics */}
        <TabsContent value="diagnostics">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6 flex items-center gap-3">
              {t('settings:system_diagnostics')}
            </h2>

            <div className="space-y-6">
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium mb-2">{t('settings:what_is_checked')}:</p>
                <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                  <li>{t('settings:check_database')}</li>
                  <li>{t('settings:check_bot_settings')}</li>
                  <li>{t('settings:check_masters_services')}</li>
                  <li>{t('settings:check_relations')}</li>
                </ul>
              </div>

              <Button
                size="lg"
                className="settings-button-gradient"
                onClick={async () => {
                  const loadingToast = toast.loading(t('settings:starting_diagnostics'));

                  try {
                    const response = await fetch('/api/diagnostics/full', {
                      credentials: 'include'
                    });
                    const data = await response.json();

                    console.log('🔍 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ:', data);

                    toast.dismiss(loadingToast);

                    const issues = data.issues || [];
                    if (issues.length === 0) {
                      toast.success(t('settings:diagnostics_success'));
                    } else {
                      toast.warning(
                        `${t('settings:issues_found')}: ${issues.length}. 
                        ${t('settings:check_console')} `
                      );
                    }

                    // Дополнительно выводим проблемы
                    if (issues.length > 0) {
                      console.error('❌ ПРОБЛЕМЫ:', issues);
                    }
                  } catch (error) {
                    toast.dismiss(loadingToast);
                    console.error('Ошибка диагностики:', error);
                    toast.error(t('settings:error_starting_diagnostics'));
                  }
                }}
              >
                {t('settings:run_full_diagnostics')}
              </Button>

              <div className="text-sm text-gray-600">
                {t('settings:results_in_console')}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Subscriptions */}
        <TabsContent value="subscriptions">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl text-gray-900 mb-2 flex items-center gap-3">
                <Mail className="w-6 h-6 settings-text-pink" />
                {t('email_subscriptions')}
              </h2>
              <p className="text-gray-600">{t('manage_email_subscriptions')}</p>
            </div>

            {loadingSubscriptions ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 settings-loader animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(availableSubscriptions).map(([type, info]) => {
                  const sub = subscriptions[type] || { is_subscribed: false, channels: { email: true, telegram: true, instagram: true } };

                  return (
                    <div key={type} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Main Subscription Toggle */}
                      <div className="flex items-start justify-between p-4 bg-gray-50">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{t(`settings:${info.name} `)}</h3>
                          <p className="text-sm text-gray-600 mt-1">{t(`settings:${info.description} `)}</p>
                        </div>
                        <Switch
                          checked={sub.is_subscribed}
                          onCheckedChange={(checked) => handleToggleSubscription(type, checked)}
                        />
                      </div>

                      {/* Channel Toggles - Only shown if subscribed */}
                      {sub.is_subscribed && (
                        <div className="p-4 space-y-3 bg-white border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-500 uppercase">{t('settings:notification_channels_label')}</p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-gray-700">Email</span>
                            </div>
                            <Switch
                              checked={sub.channels.email}
                              onCheckedChange={(checked) => handleToggleChannel(type, 'email', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-gray-700">Telegram</span>
                            </div>
                            <Switch
                              checked={sub.channels.telegram}
                              onCheckedChange={(checked) => handleToggleChannel(type, 'telegram', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Camera className="w-4 h-4 text-purple-600" />
                              <span className="text-sm text-gray-700">Instagram</span>
                            </div>
                            <Switch
                              checked={sub.channels.instagram}
                              onCheckedChange={(checked) => handleToggleChannel(type, 'instagram', checked)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {Object.keys(availableSubscriptions).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    {t('no_subscriptions_available')}
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Broadcasts */}
        <TabsContent value="broadcasts">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6 flex items-center gap-3">
              <Send className="w-6 h-6 settings-text-pink" />
              {t('settings:mass_broadcasts')}
            </h2>
            <p className="text-gray-600 mb-6">{t('settings:broadcast_description')}</p>

            <Tabs defaultValue="compose" className="space-y-6">
              <TabsList>
                <TabsTrigger value="compose" className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {t('settings:create_broadcast')}
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  {t('settings:history')}
                </TabsTrigger>
              </TabsList>

              {/* Compose Tab */}
              <TabsContent value="compose">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Form */}
                  <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">{t('settings:broadcast_parameters')}</h2>

                    <div className="space-y-6">
                      {/* Subscription Type */}
                      <div>
                        <Label htmlFor="subscription_type">{t('settings:subscription_type')} *</Label>
                        <Select
                          value={broadcastForm.subscription_type}
                          onValueChange={(value) => setBroadcastForm({ ...broadcastForm, subscription_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('settings:placeholder_select_type')} />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(availableSubscriptions).map(([key, info]) => (
                              <SelectItem key={key} value={key}>
                                {info.name} - {info.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Channels */}
                      <div>
                        <Label>{t('settings:sending_channels')} *</Label>
                        <div className="flex gap-4 mt-2">
                          <button
                            type="button"
                            onClick={() => handleBroadcastChannelToggle('email')}
                            className={`flex items - center gap - 2 px - 4 py - 2 rounded - lg border - 2 transition - all ${broadcastForm.channels.includes('email')
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                              } `}
                          >
                            <Mail className="w-5 h-5" />
                            Email
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBroadcastChannelToggle('telegram')}
                            className={`flex items - center gap - 2 px - 4 py - 2 rounded - lg border - 2 transition - all ${broadcastForm.channels.includes('telegram')
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                              } `}
                          >
                            <MessageCircle className="w-5 h-5" />
                            Telegram
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBroadcastChannelToggle('instagram')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${broadcastForm.channels.includes('instagram')
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                              }`}
                          >
                            <Instagram className="w-5 h-5" />
                            Instagram
                          </button>
                        </div>
                      </div>

                      {/* Target Role (optional) */}
                      <div>
                        <Label htmlFor="target_role">{t('settings:target_role_optional')}</Label>
                        <Select
                          value={broadcastForm.target_role}
                          onValueChange={(value) => {
                            setBroadcastForm({ ...broadcastForm, target_role: value, user_ids: [] });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('settings:placeholder_all_users')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('settings:all_users')}</SelectItem>
                            <SelectItem value="admin">{t('settings:admins')}</SelectItem>
                            <SelectItem value="manager">{t('settings:managers')}</SelectItem>
                            <SelectItem value="employee">{t('settings:employees')}</SelectItem>
                            <SelectItem value="client">{t('settings:clients')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* User Selection */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          {t('settings:select_recipients')}
                        </Label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                          >
                            {(() => {
                              const filteredUsers = broadcastUsers.filter(u =>
                                !broadcastForm.target_role || broadcastForm.target_role === 'all' || u.role === broadcastForm.target_role
                              );
                              return (
                                <span className="text-sm text-gray-700">
                                  {(broadcastForm.user_ids || []).length === 0
                                    ? t('settings:all_subscribed_users')
                                    : `${t('settings:selected')}: ${(broadcastForm.user_ids || []).length} из ${filteredUsers.length} `}
                                </span>
                              );
                            })()}
                            <Users className="w-4 h-4 text-gray-500" />
                          </button>

                          {userDropdownOpen && (() => {
                            const filteredUsers = broadcastUsers.filter(u =>
                              !broadcastForm.target_role || broadcastForm.target_role === 'all' || u.role === broadcastForm.target_role
                            );
                            return (
                              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                                <div className="p-3 border-b border-gray-200">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={(broadcastForm.user_ids || []).length === filteredUsers.length && filteredUsers.length > 0}
                                      onChange={() => {
                                        if ((broadcastForm.user_ids || []).length === filteredUsers.length) {
                                          setBroadcastForm({ ...broadcastForm, user_ids: [] });
                                        } else {
                                          setBroadcastForm({ ...broadcastForm, user_ids: filteredUsers.map(u => u.id) });
                                        }
                                      }}
                                      className="w-4 h-4 settings-accent-pink rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                      {t('settings:select_all')} ({filteredUsers.length})
                                    </span>
                                  </label>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                  {loadingBroadcastUsers ? (
                                    <div className="flex justify-center py-8">
                                      <Loader className="w-5 h-5 animate-spin settings-loader" />
                                    </div>
                                  ) : filteredUsers.length === 0 ? (
                                    <div className="flex justify-center py-8 text-gray-500 text-sm">
                                      {t('settings:no_users_for_role')}
                                    </div>
                                  ) : (
                                    <div className="p-2">
                                      {filteredUsers.map((user) => (
                                        <label
                                          key={user.id}
                                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={(broadcastForm.user_ids || []).includes(user.id)}
                                            onChange={() => handleBroadcastUserToggle(user.id)}
                                            className="w-4 h-4 settings-accent-pink rounded"
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
                                <div className="p-3 border-t border-gray-200 bg-gray-50">
                                  <button
                                    type="button"
                                    onClick={() => setUserDropdownOpen(false)}
                                    className="w-full px-4 py-2 text-sm font-medium text-white settings-danger-button rounded-lg transition-colors"
                                  >
                                    {t('settings:done')}
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {t('settings:recipients_hint')}
                        </p>
                      </div>

                      {/* Subject */}
                      <div>
                        <Label htmlFor="subject">{t('settings:subject_email')} *</Label>
                        <Input
                          id="subject"
                          value={broadcastForm.subject}
                          onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })}
                          placeholder={t('settings:placeholder_special_offer')}
                          className="px-3"
                        />
                      </div>

                      {/* Message */}
                      <div>
                        <Label htmlFor="message">{t('settings:message')} *</Label>
                        <Textarea
                          id="message"
                          value={broadcastForm.message}
                          onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                          rows={8}
                          placeholder={t('settings:placeholder_enter_message')}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {broadcastForm.message.length} {t('settings:chars')}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <Button
                          onClick={handleBroadcastPreview}
                          disabled={loadingBroadcastPreview}
                          variant="outline"
                          className="flex-1"
                        >
                          {loadingBroadcastPreview ? (
                            <>
                              <Loader className="w-4 h-4 mr-2 animate-spin" />
                              {t('settings:loading')}...
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              {t('settings:preview')}
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={handleSendBroadcast}
                          disabled={sendingBroadcast || !broadcastPreview}
                          className="flex-1 settings-button-gradient"
                        >
                          {sendingBroadcast ? (
                            <>
                              <Loader className="w-4 h-4 mr-2 animate-spin" />
                              {t('settings:sending')}...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              {t('settings:send')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Preview Panel */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 settings-text-pink" />
                      {t('settings:recipients')}
                    </h2>

                    {!broadcastPreview ? (
                      <div className="text-center py-12">
                        <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">
                          {t('settings:click_preview_to_see_recipients')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Total */}
                        <div className="settings-card-gradient border rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">{t('settings:total_recipients')}</p>
                          <p className="text-3xl font-bold settings-text-pink">{broadcastPreview.total_users}</p>
                        </div>

                        {/* By Channel */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">{t('settings:by_channels')}:</p>

                          {broadcastPreview.by_channel.email > 0 && (
                            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-gray-700">{t('settings:channel_email')}</span>
                              </div>
                              <span className="font-bold text-blue-600">{broadcastPreview.by_channel.email}</span>
                            </div>
                          )}

                          {broadcastPreview.by_channel.telegram > 0 && (
                            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                              <div className="flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-gray-700">{t('settings:channel_telegram')}</span>
                              </div>
                              <span className="font-bold text-green-600">{broadcastPreview.by_channel.telegram}</span>
                            </div>
                          )}

                          {broadcastPreview.by_channel.instagram > 0 && (
                            <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                              <div className="flex items-center gap-2">
                                <Camera className="w-4 h-4 text-purple-600" />
                                <span className="text-sm text-gray-700">{t('settings:channel_instagram')}</span>
                              </div>
                              <span className="font-bold text-purple-600">{broadcastPreview.by_channel.instagram}</span>
                            </div>
                          )}
                        </div>

                        {/* Sample Users */}
                        {broadcastPreview.users_sample.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">{t('settings:sample_recipients')}:</p>
                            <div className="space-y-2">
                              {broadcastPreview.users_sample.map((user: any, idx: number) => (
                                <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
                                  <p className="font-medium text-gray-900">{user.full_name}</p>
                                  <p className="text-gray-600">{user.channel}: {user.contact}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Warning */}
                        {broadcastPreview.total_users === 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-yellow-800">
                                {t('settings:no_recipients_found')}
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
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{t('settings:broadcast_history')}</h2>

                  {loadingBroadcastHistory ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader className="w-8 h-8 settings-loader animate-spin" />
                    </div>
                  ) : broadcastHistory.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>{t('settings:no_broadcasts_yet')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {broadcastHistory.map((item) => (
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
                              <span className="text-gray-600">{t('settings:sent')}: {item.total_sent}</span>
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
        </TabsContent>

        {/* Messengers Settings */}
        <TabsContent value="messengers">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6 flex items-center gap-3">
              <MessageCircle className="w-6 h-6 settings-text-pink" />
              {t('settings:messengers_settings')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('settings:manage_messengers')}
            </p>

            {loadingMessengers ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 settings-loader animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {messengerSettings.map((messenger) => (
                  <div
                    key={messenger.messenger_type}
                    className={`border-2 rounded-xl p-6 transition-all ${messenger.is_enabled
                      ? 'settings-border-pink-light settings-bg-pink-light'
                      : 'border-gray-200 bg-white'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 group/icon-card ${messenger.is_enabled ? 'bg-white' : 'bg-gray-100'}`}>
                          {messenger.messenger_type === 'instagram' ? (
                            <InstagramIcon className="w-9 h-9" colorful={true} />
                          ) : messenger.messenger_type === 'whatsapp' ? (
                            <WhatsAppIcon className="w-9 h-9" colorful={true} />
                          ) : messenger.messenger_type === 'telegram' ? (
                            <TelegramIcon className="w-9 h-9" colorful={true} />
                          ) : messenger.messenger_type === 'tiktok' ? (
                            <TikTokIcon className="w-9 h-9" colorful={true} />
                          ) : (
                            <MessageCircle className="w-9 h-9 text-purple-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {messenger.display_name}
                          </h3>
                          <p className="text-xs text-gray-600">
                            {messenger.has_token ? t('settings:configured') : t('settings:needs_configuration')}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={messenger.is_enabled}
                        onCheckedChange={() =>
                          handleToggleMessenger(messenger.messenger_type, messenger.is_enabled)
                        }
                      />
                    </div>

                    {messenger.is_enabled && (
                      <div className="space-y-4 pt-4 border-t border-gray-200">
                        {editingMessenger === messenger.messenger_type ? (
                          <div className="space-y-3">
                            {messenger.messenger_type !== 'instagram' && (
                              <div>
                                <Label htmlFor={`${messenger.messenger_type} -token`}>
                                  API Token {messenger.messenger_type === 'telegram' ? t('settings:telegram_bot_token_hint') : ''}
                                </Label>
                                <Input
                                  id={`${messenger.messenger_type} -token`}
                                  type="password"
                                  value={messengerForm.api_token}
                                  onChange={(e) =>
                                    setMessengerForm({ ...messengerForm, api_token: e.target.value })
                                  }
                                  placeholder={
                                    messenger.messenger_type === 'telegram'
                                      ? '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz'
                                      : t('settings:placeholder_enter_api_token')
                                  }
                                />
                              </div>
                            )}

                            {messenger.messenger_type === 'telegram' && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-800 mb-2">
                                  <strong>{t('settings:how_to_get_telegram_token')}:</strong>
                                </p>
                                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                                  <li>{t('settings:telegram_step_1')}</li>
                                  <li>{t('settings:telegram_step_2')}</li>
                                  <li>{t('settings:telegram_step_3')}</li>
                                  <li>{t('settings:telegram_step_4')}</li>
                                </ol>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={() => handleSaveMessengerConfig(messenger.messenger_type)}
                                className="settings-button-gradient"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                {t('settings:save')}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setEditingMessenger(null);
                                  setMessengerForm({ api_token: '', webhook_url: '' });
                                }}
                              >
                                {t('settings:cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {messenger.messenger_type === 'instagram' ? (
                              <p className="text-sm text-gray-600">
                                {t('settings:instagram_integration_note')}
                              </p>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEditMessenger(messenger.messenger_type)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                {messenger.has_token ? t('settings:change_settings') : t('settings:configure')}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Holidays Management */}
        <TabsContent value="holidays">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl text-gray-900 mb-2">{t('settings:holidays', 'Salon Holidays')}</h2>
                <p className="text-gray-600">{t('settings:manage_holidays_desc', 'Manage salon holidays and closures')}</p>
              </div>
              <Button
                onClick={() => setShowCreateHolidayDialog(true)}
                className="settings-button-gradient"
                disabled={!userPermissions.canEditSettings}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('settings:add_holiday', 'Add Holiday')}
              </Button>
            </div>

            {loadingHolidays ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 settings-loader animate-spin" />
              </div>
            ) : holidays.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('settings:no_holidays', 'No holidays configured')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <Calendar className="w-5 h-5 settings-text-pink flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900">{holiday.name}</p>
                          {holiday.is_closed && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                              {t('settings:closed', 'Closed')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{holiday.date}</p>
                        {holiday.is_closed && holiday.master_exceptions && holiday.master_exceptions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">
                              {t('settings:working_masters', 'Working masters')}:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {holiday.master_exceptions.map((masterId: number) => {
                                const master = users.find(u => u.id === masterId);
                                return master ? (
                                  <span
                                    key={masterId}
                                    className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full"
                                  >
                                    {master.full_name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteHoliday(holiday.date)}
                      disabled={!userPermissions.canEditSettings}
                      className="settings-text-red settings-text-red-hover settings-bg-red-light-hover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Holiday Dialog */}
          {showCreateHolidayDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">{t('settings:add_holiday', 'Add Holiday')}</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="holidayDate">{t('settings:date', 'Date')} *</Label>
                    <Input
                      id="holidayDate"
                      type="date"
                      value={holidayForm.date}
                      onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="holidayName">{t('settings:holiday_name', 'Holiday Name')} *</Label>
                    <Input
                      id="holidayName"
                      value={holidayForm.name}
                      onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                      placeholder={t('settings:holiday_name_placeholder', 'e.g., New Year')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t('settings:salon_closed', 'Salon Closed')}</Label>
                      <p className="text-xs text-gray-500">{t('settings:block_all_bookings', 'Block all bookings on this day')}</p>
                    </div>
                    <Switch
                      checked={holidayForm.is_closed}
                      onCheckedChange={(checked) => setHolidayForm({ ...holidayForm, is_closed: checked })}
                    />
                  </div>

                  {/* Master Exceptions Selector */}
                  {holidayForm.is_closed && (
                    <div className="border-t pt-4">
                      <Label className="mb-2 block">
                        {t('settings:master_exceptions', 'Masters who will work')}
                      </Label>
                      <p className="text-xs text-gray-500 mb-3">
                        {t('settings:master_exceptions_hint', 'Select masters who will be available despite the salon being closed')}
                      </p>
                      <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-2">
                        {users
                          .filter(u => u.is_service_provider || u.role === 'employee')
                          .map((user) => (
                            <label
                              key={user.id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={holidayForm.master_exceptions.includes(user.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setHolidayForm({
                                      ...holidayForm,
                                      master_exceptions: [...holidayForm.master_exceptions, user.id]
                                    });
                                  } else {
                                    setHolidayForm({
                                      ...holidayForm,
                                      master_exceptions: holidayForm.master_exceptions.filter(id => id !== user.id)
                                    });
                                  }
                                }}
                                className="w-4 h-4 settings-accent-pink rounded"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                <p className="text-xs text-gray-500">@{user.username}</p>
                              </div>
                            </label>
                          ))}
                      </div>
                      {holidayForm.master_exceptions.length > 0 && (
                        <p className="text-xs text-green-600 mt-2">
                          ✓ {holidayForm.master_exceptions.length} {t('settings:masters_selected', 'master(s) selected')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateHolidayDialog(false);
                      setHolidayForm({ date: '', name: '', is_closed: true, master_exceptions: [] });
                    }}
                    className="flex-1"
                  >
                    {t('common:cancel', 'Cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateHoliday}
                    className="flex-1 settings-button-gradient"
                  >
                    {t('common:create', 'Create')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Danger Zone */}
        <TabsContent value="danger">
          <div className="bg-white rounded-xl shadow-sm border settings-danger-zone p-8">
            <div className="mb-6">
              <h2 className="text-2xl text-gray-900 mb-2 flex items-center gap-3">
                <Trash2 className="w-6 h-6 settings-text-red" />
                {t('danger_zone')}
              </h2>
              <p className="text-gray-600">{t('irreversible_actions')}</p>
            </div>

            <div className="settings-bg-red-light border-2 settings-border-red rounded-lg p-6">
              <h3 className="text-lg font-bold settings-text-red-dark mb-2">{t('delete_account')}</h3>
              <p className="text-sm settings-text-red-dark opacity-90 mb-6">
                {t('delete_account_warning')}
              </p>

              <div className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="deletePassword">{t('your_password')} *</Label>
                  <Input
                    id="deletePassword"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder={t('enter_password')}
                    className="px-3"
                  />
                </div>

                <div>
                  <Label htmlFor="deleteConfirm">
                    {t('type_delete_to_confirm_label')}
                  </Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="px-3"
                  />
                </div>

                <Button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount || !deletePassword || deleteConfirmText !== 'DELETE'}
                  className="w-full settings-danger-button text-white"
                >
                  {deletingAccount ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      {t('deleting')}...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('delete_my_account')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Role Dialog */}
      {
        showCreateRoleDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">{t('settings:create_role')}</h3>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <Label htmlFor="roleKey">{t('settings:role_key')} *</Label>
                  <Input
                    id="roleKey"
                    placeholder="senior_master"
                    value={createRoleForm.role_key}
                    onChange={(e) => setCreateRoleForm({ ...createRoleForm, role_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  />
                </div>

                <div>
                  <Label htmlFor="roleName">{t('settings:role_name')} *</Label>
                  <Input
                    id="roleName"
                    placeholder={t('settings:senior_master')}
                    value={createRoleForm.role_name}
                    onChange={(e) => setCreateRoleForm({ ...createRoleForm, role_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="roleDesc">{t('settings:role_description')}</Label>
                  <Textarea
                    id="roleDesc"
                    placeholder={t('settings:role_description_placeholder')}
                    value={createRoleForm.role_description}
                    onChange={(e) => setCreateRoleForm({ ...createRoleForm, role_description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <Button variant="outline" onClick={() => setShowCreateRoleDialog(false)} className="flex-1">
                  {t('settings:cancel')}
                </Button>
                <Button onClick={handleCreateRole} disabled={savingRole} className="flex-1 settings-danger-button">
                  {savingRole ? t('settings:creating') + '...' : t('settings:create')}
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Permissions Dialog */}
      {
        showPermissionsDialog && selectedRole && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
            <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-auto">
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                <h3 className="text-xl font-bold text-gray-900">
                  {t('settings:role_permissions')}:&nbsp;
                  {selectedRole &&
                    (
                      // Try both fields but fallback to displaying the whole object as JSON if neither present
                      (selectedRole as any).role_name ||
                      (selectedRole as any).name ||
                      JSON.stringify(selectedRole)
                    )
                  }
                </h3>
                <p className="text-sm text-gray-600 mt-1">{t('settings:configure_detailed_access_permissions')}</p>
              </div>

              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-left text-sm font-semibold text-gray-600 border-b">{t('settings:resource')}</th>
                        <th className="p-3 text-center text-sm font-semibold text-gray-600 border-b">{t('settings:view')}</th>
                        <th className="p-3 text-center text-sm font-semibold text-gray-600 border-b">{t('settings:create')}</th>
                        <th className="p-3 text-center text-sm font-semibold text-gray-600 border-b">{t('settings:edit')}</th>
                        <th className="p-3 text-center text-sm font-semibold text-gray-600 border-b">{t('settings:delete')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(availablePermissions).map(([key, name]) => (
                        <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 text-sm font-medium text-gray-900">{name as string}</td>
                          {['can_view', 'can_create', 'can_edit', 'can_delete'].map(action => (
                            <td key={`${key} -${action} `} className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={
                                  Boolean(
                                    permissions &&
                                    typeof permissions === 'object' &&
                                    (permissions as Record<string, any>)[key] &&
                                    typeof (permissions as Record<string, any>)[key] === 'object' &&
                                    ((permissions as Record<string, any>)[key] as Record<string, any>)[action]
                                  )
                                }
                                onChange={() => handleTogglePermission(key, action)}
                                className="w-5 h-5 cursor-pointer settings-accent-pink"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
                <Button variant="outline" onClick={() => setShowPermissionsDialog(false)} className="flex-1">
                  {t('settings:cancel')}
                </Button>
                <Button onClick={handleSavePermissions} disabled={savingRole} className="flex-1 settings-danger-button">
                  {savingRole ? t('settings:saving') + '...' : t('settings:save_permissions')}
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
