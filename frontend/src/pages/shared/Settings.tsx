// /frontend/src/pages/admin/Settings.tsx
import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  AlertCircle,
  Bell,
  Globe,
  Camera,
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
  Menu,
  Loader,
  Bot,
  BookOpen,
  Shield,
  User,
  Download,
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
import { InstagramIcon, TelegramIcon } from '../../components/icons/SocialIcons';
import { ManageCurrenciesDialog } from '../../components/admin/ManageCurrenciesDialog';
import './Settings.css';

export default function AdminSettings() {
  const { t, i18n } = useTranslation(['admin/settings', 'common']);
  const { user: currentUser } = useAuth();

  // Используем централизованную систему прав
  const userPermissions = usePermissions(currentUser?.role || 'employee', currentUser?.secondary_role);

  const [generalSettings, setGeneralSettings] = useState({
    salonName: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    instagram: '',
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

  // Currencies state
  const [currencies, setCurrencies] = useState<Array<{ code: string, name: string, symbol: string }>>([]);
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);

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

  const [users, setUsers] = useState<any[]>([]);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers(i18n.language);
      setUsers(data?.users || data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  useEffect(() => {
    loadRoles();
    loadSalonSettings();
    loadProfile();
    loadNotificationSettings();
    loadSubscriptions();
    loadBookingReminderSettings();
    loadHolidays();
    loadCurrencies();
    loadUsers();
  }, []);




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
        telegram_manager_chat_id: data.telegram_manager_chat_id || '',
        currency: data.currency,
        timezone_offset: data.timezone_offset || '',
        birthday_discount: data.birthday_discount || '',
        working_hours: {
          weekdays: data.hours_weekdays || '',
          weekends: data.hours_weekends || ''
        },
        lunch_time: {
          start: data.lunch_start || '',
          end: data.lunch_end || ''
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
      console.log('🔍 [Profile] ' + t('settings:loading'));
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
        toast.error(`${t('settings:error_loading_profile')}: ${err.message || t('common:unknown_error')}`);
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
      toast.error(t('file_too_large', { max: 5 }));
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(t('images_only'));
      return;
    }

    try {
      setUploadingPhoto(true);
      const uploadResponse = await api.uploadFile(file);
      if (uploadResponse.file_url) {
        const response = await api.updateMyProfile({ photo: uploadResponse.file_url });
        if (response.success) {
          toast.success(t('photo_updated'));
          setProfileForm(prev => ({ ...prev, photo: uploadResponse.file_url }));
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
      toast.error(t('error_username_too_short', { count: 3 }));
      return;
    }

    if (profileForm.full_name.length < 2) {
      toast.error(t('error_name_too_short', { count: 2 }));
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
        toast.error(t('error_password_too_short', { count: 6 }));
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
        toast.error(response.error || t('settings:error_update_profile'));
      }
    } catch (err: any) {
      toast.error(err.message || t('settings:error_update_profile'));
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

  const loadCurrencies = async () => {
    try {
      const response = await api.get('/api/settings/currencies');
      setCurrencies(response.currencies || []);
    } catch (err) {
      console.error('Error loading currencies:', err);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation
    if (!generalSettings.salonName.trim()) {
      toast.error(t('settings:error_salon_name_required'));
      return;
    }
    if (!generalSettings.phone.trim()) {
      toast.error(t('settings:error_phone_required'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (generalSettings.email && !emailRegex.test(generalSettings.email)) {
      toast.error(t('settings:error_invalid_email'));
      return;
    }

    if (generalSettings.lunch_time.start && generalSettings.lunch_time.end) {
      if (generalSettings.lunch_time.start >= generalSettings.lunch_time.end) {
        toast.error(t('settings:error_invalid_lunch_time'));
        return;
      }
    }
    try {
      await api.updateSalonSettings({
        name: generalSettings.salonName,
        city: generalSettings.city,
        address: generalSettings.address,
        phone: generalSettings.phone,
        email: generalSettings.email,
        instagram: generalSettings.instagram,
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
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || t('error_deleting_account'));
    } finally {
      setDeletingAccount(false);
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
      toast.error(t('settings:enter_holiday_details'));
      return;
    }

    try {
      await api.createHoliday(holidayForm);
      toast.success(t('settings:holiday_created'));
      setShowCreateHolidayDialog(false);
      setHolidayForm({ date: '', name: '', is_closed: true, master_exceptions: [] });
      loadHolidays();
    } catch (err) {
      console.error('Error creating holiday:', err);
      toast.error(t('settings:error_creating_holiday'));
    }
  };

  const handleDeleteHoliday = async (date: string) => {
    if (!confirm(t('settings:delete_holiday_confirm'))) {
      return;
    }

    try {
      await api.deleteHoliday(date);
      toast.success(t('settings:holiday_deleted'));
      loadHolidays();
    } catch (err) {
      console.error('Error deleting holiday:', err);
      toast.error(t('settings:error_deleting_holiday'));
    }
  };

  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = tab || 'profile';

  // Проверка доступа к настройкам
  // Если у пользователя нет прав на общие настройки, мы все равно позволяем видеть профиль
  if (!userPermissions.canViewSettings && activeTab !== 'profile' && activeTab !== 'notifications') {
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

  // Определяем префикс путей
  const rolePrefix = useMemo(() => {
    if (location.pathname.startsWith('/crm')) return '/crm';
    if (location.pathname.startsWith('/manager')) return '/manager';
    if (location.pathname.startsWith('/sales')) return '/sales';
    if (location.pathname.startsWith('/marketer')) return '/marketer';
    if (location.pathname.startsWith('/employee')) return '/employee';
    return '/crm';
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    navigate(`${rolePrefix}/settings/${value}`);
  };

  // Список всех вкладок с условиями отображения
  const allTabs = useMemo(() => [
    { id: 'profile', icon: User, label: t('settings:profile'), show: true },
    { id: 'general', icon: Globe, label: t('settings:general'), show: userPermissions.canEditSettings || userPermissions.canEditBranding || userPermissions.canEditFinancialSettings || userPermissions.canEditSchedule || userPermissions.canEditLoyalty },
    { id: 'notifications', icon: Bell, label: t('settings:notifications'), show: true },
    { id: 'subscriptions', icon: Mail, label: t('subscriptions'), show: userPermissions.canEditIntegrations || userPermissions.canEditSettings },
    { id: 'holidays', icon: Calendar, label: t('settings:holidays'), show: userPermissions.canEditSchedule || userPermissions.canEditSettings },
    { id: 'roles', icon: Shield, label: t('settings:manage_roles'), show: userPermissions.canViewRoles || userPermissions.canEditRoles },
    { id: 'security', icon: Shield, label: t('settings:security'), show: userPermissions.roleLevel >= 80 || userPermissions.canEditSettings },
    { id: 'danger', icon: Trash2, label: t('danger_zone'), show: userPermissions.role === 'director' || userPermissions.secondaryRole === 'director' },
  ], [userPermissions, t]);

  const visibleTabs = useMemo(() => allTabs.filter(t => t.show), [allTabs]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 md:w-8 md:h-8 settings-icon-primary" />
          {t('settings:system_settings')}
        </h1>
        <p className="text-sm md:text-base text-gray-600">{t('settings:manage_crm_parameters')}</p>
      </div>

      {userPermissions.roleLevel >= 80 && (
        <div className="mb-6 flex justify-end">
          <Button
            onClick={() => navigate(`${rolePrefix}/menu-customization`)}
            variant="outline"
            className="bg-white"
          >
            <Menu className="w-4 h-4 mr-2" />
            {t('settings:customize_menu')}
          </Button>
        </div>
      )}

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
        <TabsList className="flex flex-nowrap overflow-x-auto w-full gap-1 pb-2 mb-2 hide-scrollbar border-b border-gray-100 bg-transparent h-auto justify-start items-center">
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2 whitespace-nowrap settings-tab-trigger-active shrink-0 border border-gray-200 rounded-lg px-4 py-2">
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>


        {/* General Settings */}
        <TabsContent value="profile">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl text-[var(--heading)] flex items-center gap-3">
                <User className="w-6 h-6 settings-text-primary" />
                {t('settings:personal_information')}
              </h2>
              <Button
                onClick={() => handleSaveProfile()}
                disabled={savingProfile}
                className="settings-bg-primary settings-bg-primary-hover settings-text-primary-foreground"
              >
                {savingProfile ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('common:saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t('common:save')}
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
                <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">{profileForm.position || t('settings:no_position')}</p>
                {uploadingPhoto && (
                  <div className="flex items-center gap-2 text-xs settings-text-primary animate-pulse">
                    <Loader className="w-3 h-3 animate-spin" />
                    {t('common:uploading')}
                  </div>
                )}
              </div>

              {/* Main Info Form */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="flex items-center gap-2 settings-label-spacing">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      {t('settings:full_name')}*
                    </Label>
                    <Input
                      id="full_name"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      placeholder={t('settings:placeholder_full_name')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center gap-2 settings-label-spacing">
                      <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                      {t('settings:username')}*
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
                    <Label htmlFor="email" className="flex items-center gap-2 settings-label-spacing">
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
                    <Label htmlFor="phone_number" className="flex items-center gap-2 settings-label-spacing">
                      <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                      {t('settings:phone_number')}
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
                    {t('settings:professional_profile')}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="position" className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-muted-foreground" />
                        {t('settings:position')}
                      </Label>
                      <Input
                        id="position"
                        value={profileForm.position}
                        onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })}
                        placeholder={t('settings:placeholder_position')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="years_of_experience" className="flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-muted-foreground" />
                        {t('settings:years_of_experience')}
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
                        {t('settings:specialization')}
                      </Label>
                      <Input
                        id="specialization"
                        value={profileForm.specialization}
                        onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                        placeholder={t('settings:placeholder_specialization')}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="about_me" className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        {t('settings:about_me')}
                      </Label>
                      <Textarea
                        id="about_me"
                        rows={4}
                        value={profileForm.about_me}
                        onChange={(e) => setProfileForm({ ...profileForm, about_me: e.target.value })}
                        placeholder={t('settings:placeholder_about_me')}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-6">
                  <h3 className="text-lg font-medium text-[var(--heading)] mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 settings-text-primary" />
                    {t('settings:social_links')}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  disabled={!userPermissions.canViewBotSettings && !userPermissions.canEditSettings}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 settings-loader animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSaveGeneral} className="settings-general-form space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="salonName" className="settings-label-spacing">{t('settings:salon_name')}*</Label>
                    <Input
                      id="salonName"
                      value={generalSettings.salonName}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, salonName: e.target.value })}
                      required
                      className="px-3"
                      disabled={!userPermissions.canEditBranding && !userPermissions.canEditSettings}
                    />
                  </div>


                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="city" className="settings-label-spacing">{t('settings:city')}</Label>
                    <Input
                      id="city"
                      value={generalSettings.city}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, city: e.target.value })}
                      className="px-3"
                      disabled={!userPermissions.canEditBranding && !userPermissions.canEditSettings}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="phone" className="settings-label-spacing">{t('settings:phone')}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={generalSettings.phone}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, phone: e.target.value })}
                      className="px-3"
                      required
                      disabled={!userPermissions.canEditBranding && !userPermissions.canEditSettings}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="address" className="settings-label-spacing">{t('settings:address')}</Label>
                  <Input
                    id="address"
                    value={generalSettings.address}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
                    className="px-3"
                    disabled={!userPermissions.canEditBranding && !userPermissions.canEditSettings}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="settings-label-spacing">{t('settings:email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={generalSettings.email}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, email: e.target.value })}
                      className="px-3"
                      disabled={!userPermissions.canEditBranding && !userPermissions.canEditSettings}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="instagram" className="settings-label-spacing">{t('settings:instagram')}</Label>
                    <Input
                      id="instagram"
                      value={generalSettings.instagram}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, instagram: e.target.value })}
                      placeholder="@username"
                      className="px-3"
                      disabled={!userPermissions.canEditBranding && !userPermissions.canEditSettings}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="telegram_chat_id" className="settings-label-spacing">{t('settings:telegram_manager_chat_id')}</Label>
                    <Input
                      id="telegram_chat_id"
                      value={generalSettings.telegram_manager_chat_id}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, telegram_manager_chat_id: e.target.value })}
                      placeholder="-1001234567890"
                      className="px-3"
                      disabled={!userPermissions.canEditBranding && !userPermissions.canEditSettings}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('settings:telegram_chat_id_hint')}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2 flex items-center gap-2">
                    <Calendar className="w-5 h-5 settings-text-primary" />
                    {t('settings:working_schedule')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="weekdays" className="settings-label-spacing">{t('settings:weekdays_hours')}</Label>
                      <Input
                        id="weekdays"
                        value={generalSettings.working_hours.weekdays}
                        onChange={(e) => setGeneralSettings({
                          ...generalSettings,
                          working_hours: { ...generalSettings.working_hours, weekdays: e.target.value }
                        })}
                        placeholder={t('settings:placeholder_working_hours')}
                        className="px-3"
                        disabled={!userPermissions.canEditSchedule && !userPermissions.canEditSettings}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="weekends" className="settings-label-spacing">{t('settings:weekends_hours')}</Label>
                      <Input
                        id="weekends"
                        value={generalSettings.working_hours.weekends}
                        onChange={(e) => setGeneralSettings({
                          ...generalSettings,
                          working_hours: { ...generalSettings.working_hours, weekends: e.target.value }
                        })}
                        placeholder={t('settings:placeholder_working_hours')}
                        className="px-3"
                        disabled={!userPermissions.canEditSchedule && !userPermissions.canEditSettings}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-3">
                      <Label htmlFor="lunch_start" className="settings-label-spacing">{t('settings:lunch_start')}</Label>
                      <Input
                        id="lunch_start"
                        type="time"
                        value={generalSettings.lunch_time.start}
                        onChange={(e) => setGeneralSettings({
                          ...generalSettings,
                          lunch_time: { ...generalSettings.lunch_time, start: e.target.value }
                        })}
                        className="px-3"
                        disabled={!userPermissions.canEditSchedule && !userPermissions.canEditSettings}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="lunch_end" className="settings-label-spacing">{t('settings:lunch_end')}</Label>
                      <Input
                        id="lunch_end"
                        type="time"
                        value={generalSettings.lunch_time.end}
                        onChange={(e) => setGeneralSettings({
                          ...generalSettings,
                          lunch_time: { ...generalSettings.lunch_time, end: e.target.value }
                        })}
                        className="px-3"
                        disabled={!userPermissions.canEditSchedule && !userPermissions.canEditSettings}
                      />
                    </div>
                  </div>

                </div>

                {/* Universal Settings Section */}
                <div className="space-y-4 border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('settings:universal_settings')}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="city" className="settings-label-spacing">{t('settings:city')}</Label>
                      <Input
                        id="city"
                        value={generalSettings.city}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, city: e.target.value })}
                        placeholder={t('settings:placeholder_city')}
                      />
                    </div>

                    <div>
                      <Label htmlFor="currency" className="settings-label-spacing">{t('settings:currency')}</Label>
                      <div className="flex gap-2">
                        <Select
                          value={generalSettings.currency}
                          onValueChange={(value) => setGeneralSettings({ ...generalSettings, currency: value })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('settings:select_currency')} />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((curr) => (
                              <SelectItem key={curr.code} value={curr.code}>
                                {curr.code}-{curr.name}({curr.symbol})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowCurrencyDialog(true)}
                          title={t('settings:manage_currencies')}
                          disabled={!userPermissions.canEditFinancialSettings && !userPermissions.canEditSettings}
                        >
                          <SettingsIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="timezone_offset" className="settings-label-spacing">{t('settings:timezone_offset')}</Label>
                      <Select
                        value={generalSettings.timezone_offset}
                        onValueChange={(value) => setGeneralSettings({ ...generalSettings, timezone_offset: value })}
                        disabled={!userPermissions.canEditFinancialSettings && !userPermissions.canEditSettings}
                      >
                        <SelectTrigger id="timezone_offset">
                          <SelectValue placeholder={t('settings:select_timezone')} />
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
                      <Label htmlFor="birthday_discount" className="settings-label-spacing">{t('settings:birthday_discount')}</Label>
                      <Input
                        id="birthday_discount"
                        value={generalSettings.birthday_discount}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, birthday_discount: e.target.value })}
                        placeholder="15%"
                        disabled={!userPermissions.canEditLoyalty && !userPermissions.canEditFinancialSettings && !userPermissions.canEditSettings}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t('settings:birthday_discount_hint', { currency: generalSettings.currency })}
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

              {userPermissions.roleLevel >= 80 && (
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
                            <Bell className={`w-5 h-5 ${setting.is_enabled ? 'settings-text-pink' : 'text-gray-400'}`} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {t('settings:reminder_label')}
                                {setting.days_before > 0 && ` ${setting.days_before}${t('settings:days')}`}
                                {setting.days_before > 0 && setting.hours_before > 0 && ' '}
                                {setting.hours_before > 0 && ` ${setting.hours_before}${t('settings:hours')}`}
                              </p>
                              <p className="text-xs text-gray-600">
                                {t('settings:before_booking')}·{setting.notification_type === 'email' ? 'Email' : 'SMS'}
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
                </div>
              )}

              {/* Create Reminder Dialog */}
              {showCreateReminderDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{t('settings:new_reminder')}</h3>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="reminder-name">{t('settings:name')}*</Label>
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
                    <li>{t('settings:assign_detailed_permissions')}:{t('permission_details')}</li>
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
              <div className="settings-alert-box">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 settings-text-yellow flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-sm text-gray-900 mb-2 font-semibold">{t('settings:security_recommendations')}</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>•{t('settings:use_strong_passwords')}</li>
                      <li>•{t('settings:regularly_change_passwords')}</li>
                      <li>•{t('settings:do_not_share_credentials')}</li>
                      <li>•{t('settings:check_active_sessions')}</li>
                      <li>•{t('settings:regularly_backup_data')}</li>
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
                  <Download className="w-4 h-4 mr-2" />{t('settings:download_backup')}
                </Button>
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
                          <h3 className="font-medium text-gray-900">{t(`settings:${info.name}`)}</h3>
                          <p className="text-sm text-gray-600 mt-1">{t(`settings:${info.description}`)}</p>
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
                              <Mail className="w-4 h-4 settings-icon-email" />
                              <span className="text-sm text-gray-700">Email</span>
                            </div>
                            <Switch
                              checked={sub.channels.email}
                              onCheckedChange={(checked) => handleToggleChannel(type, 'email', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Smartphone className="w-4 h-4 settings-icon-telegram" />
                              <span className="text-sm text-gray-700">Telegram</span>
                            </div>
                            <Switch
                              checked={sub.channels.telegram}
                              onCheckedChange={(checked) => handleToggleChannel(type, 'telegram', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Camera className="w-4 h-4 settings-icon-instagram" />
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




        {/* Holidays Management */}
        <TabsContent value="holidays">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl text-gray-900 mb-2">{t('settings:holidays')}</h2>
                <p className="text-gray-600">{t('settings:manage_holidays_desc')}</p>
              </div>
              <Button
                onClick={() => setShowCreateHolidayDialog(true)}
                className="settings-button-gradient"
                disabled={!userPermissions.canEditSettings}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('add_holiday')}
              </Button>
            </div>

            {loadingHolidays ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 settings-loader animate-spin" />
              </div>
            ) : holidays.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('settings:no_holidays')}</p>
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
                              {t('settings:closed')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{holiday.date}</p>
                        {holiday.is_closed && holiday.master_exceptions && holiday.master_exceptions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">
                              {t('settings:working_masters')}:
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
          {
            showCreateHolidayDialog && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4">{t('add_holiday')}</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="holidayDate">{t('settings:date')}*</Label>
                      <Input
                        id="holidayDate"
                        type="date"
                        value={holidayForm.date}
                        onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="holidayName">{t('settings:holiday_name')}*</Label>
                      <Input
                        id="holidayName"
                        value={holidayForm.name}
                        onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                        placeholder={t('settings:holiday_name_placeholder')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{t('settings:salon_closed')}</Label>
                        <p className="text-xs text-gray-500">{t('settings:block_all_bookings')}</p>
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
                          {t('settings:master_exceptions')}
                        </Label>
                        <p className="text-xs text-gray-500 mb-3">
                          {t('settings:master_exceptions_hint')}
                        </p>
                        <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-2">
                          {Array.isArray(users) && users
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
                            ✓{holidayForm.master_exceptions.length}{t('settings:masters_selected')}
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
                      {t('common:cancel')}
                    </Button>
                    <Button
                      onClick={handleCreateHoliday}
                      className="flex-1 settings-button-gradient"
                    >
                      {t('common:create')}
                    </Button>
                  </div>
                </div>
              </div>
            )
          }
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
                  <Label htmlFor="deletePassword">{t('your_password')}*</Label>
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
                  <Label htmlFor="roleKey">{t('settings:role_key')}*</Label>
                  <Input
                    id="roleKey"
                    placeholder="senior_master"
                    value={createRoleForm.role_key}
                    onChange={(e) => setCreateRoleForm({ ...createRoleForm, role_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  />
                </div>

                <div>
                  <Label htmlFor="roleName">{t('settings:role_name')}*</Label>
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
                            <td key={`${key}-${action}`} className="p-3 text-center">
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
      <ManageCurrenciesDialog
        open={showCurrencyDialog}
        onOpenChange={setShowCurrencyDialog}
        onSuccess={() => {
          loadCurrencies();
          loadSalonSettings();
        }}
      />
    </div>
  );
}
