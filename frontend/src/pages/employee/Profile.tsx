// /frontend/src/pages/employee/Profile.tsx
// frontend/src/pages/employee/Profile.tsx
// ПОЛНАЯ ВЕРСИЯ С ВСЕМИ УЛУЧШЕНИЯМИ

import React, { useState, useEffect } from 'react';
import { User, Mail, Save, AlertCircle, Key, Loader, Calendar, UserIcon, Camera, Instagram, Phone, Briefcase, Lightbulb } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { getPhotoUrl } from '../../utils/photoUtils';

interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  photo?: string | null;
  created_at?: string;
  last_login?: string;
  employee_id?: number;
}

interface EmployeeProfileData {
  id: number;
  full_name: string;
  position: string;
  experience?: string;
  photo?: string;
  bio?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  is_active: boolean;
}

export default function EmployeeProfile() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = currentUser.id;
  const { t } = useTranslation(['employee/profile', 'common']);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Данные для редактирования user account
  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: ''
  });

  // Данные для редактирования employee profile
  const [employeeData, setEmployeeData] = useState({
    full_name: '',
    position: '',
    experience: '',
    photo: '',
    bio: '',
    phone: '',
    email: '',
    instagram: ''
  });

  const [photoPreview, setPhotoPreview] = useState<string>('');

  // Данные для смены пароля
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Load user account data
      const userData = await api.getUserProfile(userId);

      setUser(userData);
      setProfileData({
        username: userData.username || '',
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: ''
      });

      // Set photo from userData first
      if (userData.photo) {
        setPhotoPreview(userData.photo);
      }

      // Load employee profile data if user has employee_id
      if (userData.employee_id || currentUser.role === 'employee') {
        try {
          const empData = await api.getMyEmployeeProfile();
          setEmployeeProfile(empData);
          setEmployeeData({
            full_name: empData.full_name || '',
            position: empData.position || '',
            experience: empData.experience || '',
            photo: empData.photo || userData.photo || '',
            bio: empData.bio || '',
            phone: empData.phone || '',
            email: empData.email || '',
            instagram: empData.instagram || ''
          });
          // Override with empData.photo if available
          if (empData.photo) {
            setPhotoPreview(empData.photo);
          }
        } catch (empErr) {
          console.log('Employee profile not available:', empErr);
          // It's OK if employee profile doesn't exist
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      toast.error(t('error_loading_profile'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!profileData.username || profileData.username.length < 3) {
      toast.error(t('username_must_be_at_least_3_characters'));
      return;
    }

    if (!profileData.full_name || profileData.full_name.length < 2) {
      toast.error(t('full_name_must_be_at_least_2_characters'));
      return;
    }

    try {
      setSaving(true);

      // Обновляем профиль через API
      await api.updateUserProfile(userId, {
        username: profileData.username,
        full_name: profileData.full_name,
        email: profileData.email
      });

      // Обновляем локальное хранилище
      const updatedUser = {
        ...currentUser,
        username: profileData.username,
        full_name: profileData.full_name,
        email: profileData.email
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Перезагружаем профиль
      await loadProfile();

      toast.success(t('profile_successfully_updated'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_updating_profile');
      toast.error(`${message}`);
      console.error(t('error_updating_profile'), err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!passwordData.old_password) {
      toast.error(t('enter_current_password'));
      return;
    }

    if (!passwordData.new_password || passwordData.new_password.length < 6) {
      toast.error(t('new_password_must_be_at_least_6_characters'));
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error(t('passwords_do_not_match'));
      return;
    }

    try {
      setSaving(true);

      // Меняем пароль через API
      await api.changePassword(userId, {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      });

      toast.success(t('password_successfully_changed'));

      // Очищаем поля
      setPasswordData({
        old_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_changing_password');
      toast.error(`${message}`);
      console.error(t('error_changing_password'), err);
    } finally {
      setSaving(false);
    }
  };

  // НОВОЕ: Обработчик загрузки фото
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const result = await api.uploadFile(file);

      setEmployeeData({ ...employeeData, photo: result.file_url });
      toast.success('Фото загружено успешно');
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      toast.error(err.message || 'Ошибка загрузки фото');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // НОВОЕ: Обработчик обновления employee профиля
  const handleUpdateEmployeeProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!employeeData.full_name || employeeData.full_name.length < 2) {
      toast.error('Имя должно содержать минимум 2 символа');
      return;
    }

    if (!employeeData.position || employeeData.position.length < 2) {
      toast.error('Должность должна содержать минимум 2 символа');
      return;
    }

    try {
      setSaving(true);

      await api.updateMyEmployeeProfile(employeeData);

      // Reload profile
      await loadProfile();

      toast.success('Профиль сотрудника успешно обновлен');
    } catch (err: any) {
      const message = err.message || 'Ошибка обновления профиля';
      toast.error(`${message}`);
      console.error('Error updating employee profile:', err);
    } finally {
      setSaving(false);
    }
  };

  // Роли с красивыми метками
  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: t('admin'), color: 'bg-blue-100 text-blue-800' },
    manager: { label: t('manager'), color: 'bg-blue-100 text-blue-800' },
    employee: { label: t('employee'), color: 'bg-green-100 text-green-800' }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">{t('loading_profile')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-red-800 font-medium">{t('error_loading_profile')}</p>
            <p className="text-red-700 text-sm mt-1">{t('try_reloading_page')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <User className="w-8 h-8 text-pink-600" />
            {t('my_profile')}
          </h1>
          <p className="text-gray-600">{t('manage_personal_data_and_security_settings')}</p>
        </div>

        {/* НОВОЕ: Карточка профиля с расширенной информацией */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 overflow-hidden relative">
              {user.photo ? (
                <img
                  src={getPhotoUrl(user.photo) || undefined}
                  alt={user.full_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    img.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <span className={`${user.photo ? 'hidden' : 'flex'} w-full h-full items-center justify-center absolute top-0 left-0 bg-gradient-to-br from-pink-500 to-blue-600`}>
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl text-gray-900 font-bold mb-2">{user.full_name}</h2>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge className={roleLabels[user.role]?.color || 'bg-gray-100 text-gray-800'}>
                  {roleLabels[user.role]?.label || user.role}
                </Badge>
                <span className="text-sm text-gray-600">@{user.username}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                {user.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    {user.email}
                  </div>
                )}
                {user.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    {t('in_system_since')} {new Date(user.created_at).toLocaleDateString('ru-RU')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* НОВОЕ: Вкладки для разделения функционала */}
        <Tabs defaultValue={employeeProfile ? "employee" : "profile"} className="space-y-6">
          <TabsList className={`grid w-full ${employeeProfile ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {employeeProfile && (
              <TabsTrigger value="employee">
                <Briefcase className="w-4 h-4 mr-2" />
                {t('employee_profile')}
              </TabsTrigger>
            )}
            <TabsTrigger value="profile">
              <UserIcon className="w-4 h-4 mr-2" />
              {t('account')}
            </TabsTrigger>
            <TabsTrigger value="password">
              <Key className="w-4 h-4 mr-2" />
              {t('change_password')}
            </TabsTrigger>
          </TabsList>

          {/* Вкладка: Редактирование профиля (учетная запись) */}
          <TabsContent value="profile">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl text-gray-900 mb-6 font-semibold">{t('account')}</h2>

              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{t('info')}:</strong> {t('account_info_hint')}
                </p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <Label htmlFor="username">{t('username')} *</Label>
                  <Input
                    id="username"
                    required
                    disabled={saving}
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    placeholder="username"
                    minLength={3}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {t('username_must_be_at_least_3_characters')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="email">{t('email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      disabled={saving}
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      placeholder={t('email_placeholder')}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('for_password_recovery')}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      {t('saving_changes')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('save_changes')}
                    </>
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* НОВАЯ Вкладка: Смена пароля */}
          <TabsContent value="password">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl text-gray-900 mb-6 font-semibold">{t('change_password')}</h2>

              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2 text-blue-600" />
                  <strong className="mr-1">{t('tip')}:</strong> {t('use_complex_password_at_least_6_characters')}
                </p>
                <p className="text-sm text-blue-800 ml-6 mt-1">
                  {t('combine_letters_numbers_and_special_characters_for_maximum_security')}
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <Label htmlFor="old_password">{t('current_password')} *</Label>
                  <Input
                    id="old_password"
                    type="password"
                    required
                    disabled={saving}
                    value={passwordData.old_password}
                    onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                    placeholder="••••••"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {t('enter_current_password_for_confirmation')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="new_password">{t('new_password')} *</Label>
                  <Input
                    id="new_password"
                    type="password"
                    required
                    disabled={saving}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    placeholder="••••••"
                    minLength={6}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {t('new_password_must_be_at_least_6_characters')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirm_password">{t('confirm_new_password')} *</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    required
                    disabled={saving}
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    placeholder="••••••"
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      {t('changing_password')}
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      {t('change_password')}
                    </>
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* НОВАЯ Вкладка: Профиль сотрудника */}
          {employeeProfile && (
            <TabsContent value="employee">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <form onSubmit={handleUpdateEmployeeProfile}>
                  <div className="flex flex-col md:flex-row gap-8 mb-8">
                    {/* Photo Section - Left Column */}
                    <div className="flex-shrink-0 flex flex-col items-center md:items-start space-y-4">
                      <Label className="text-lg font-semibold">{t('profile_photo')}</Label>

                      <div className="relative group">
                        <div className="w-40 h-40 rounded-xl overflow-hidden shadow-md bg-gray-100 flex items-center justify-center relative">
                          {photoPreview ? (
                            <img
                              src={getPhotoUrl(photoPreview) || photoPreview}
                              alt="Profile"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.style.display = 'none';
                                img.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`${photoPreview ? 'hidden' : 'flex'} w-full h-full absolute top-0 left-0 bg-gradient-to-br from-pink-500 to-blue-600 items-center justify-center text-white text-5xl font-bold`}>
                            {employeeData.full_name.charAt(0).toUpperCase()}
                          </div>
                        </div>

                        <label
                          htmlFor="photo-upload"
                          className="absolute bottom-2 right-2 bg-pink-600 text-white p-2 rounded-full cursor-pointer hover:bg-pink-700 transition-colors shadow-lg"
                        >
                          {uploadingPhoto ? (
                            <Loader className="w-5 h-5 animate-spin" />
                          ) : (
                            <Camera className="w-5 h-5" />
                          )}
                          <input
                            id="photo-upload"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            disabled={uploadingPhoto}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 text-center md:text-left max-w-[200px]">
                        {t('photo_recommendation')}
                      </p>
                    </div>

                    {/* Right Column - Inputs */}
                    <div className="flex-1 space-y-6">
                      {/* Basic Info */}
                      <div className="space-y-4">
                        <h2 className="text-xl text-gray-900 font-semibold">{t('basic_info')}</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="emp_full_name">{t('full_name')} *</Label>
                            <Input
                              id="emp_full_name"
                              required
                              disabled={saving}
                              value={employeeData.full_name}
                              onChange={(e) => setEmployeeData({ ...employeeData, full_name: e.target.value })}
                              placeholder={t('full_name_placeholder')}
                              minLength={2}
                            />
                          </div>

                          <div>
                            <Label htmlFor="position">{t('position')} *</Label>
                            <Input
                              id="position"
                              required
                              disabled={saving}
                              value={employeeData.position}
                              onChange={(e) => setEmployeeData({ ...employeeData, position: e.target.value })}
                              placeholder={t('position_placeholder')}
                              minLength={2}
                            />
                          </div>
                        </div>

                        <div className="mb-6">
                          <Label htmlFor="experience">{t('experience')}</Label>
                          <Input
                            id="experience"
                            disabled={saving}
                            value={employeeData.experience}
                            onChange={(e) => setEmployeeData({ ...employeeData, experience: e.target.value })}
                            placeholder={t('experience_placeholder')}
                          />
                        </div>

                        {/* Contact Info */}
                        <h2 className="text-xl text-gray-900 mb-6 font-semibold mt-8">{t('contact_info')}</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <Label htmlFor="emp_phone">{t('phone')}</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                id="emp_phone"
                                type="tel"
                                disabled={saving}
                                value={employeeData.phone}
                                onChange={(e) => setEmployeeData({ ...employeeData, phone: e.target.value })}
                                placeholder={t('phone_placeholder')}
                                className="pl-10"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="emp_email">{t('email')}</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                id="emp_email"
                                type="email"
                                disabled={saving}
                                value={employeeData.email}
                                onChange={(e) => setEmployeeData({ ...employeeData, email: e.target.value })}
                                placeholder={t('email_placeholder')}
                                className="pl-10"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mb-6">
                          <Label htmlFor="instagram">{t('instagram')}</Label>
                          <div className="relative">
                            <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="instagram"
                              disabled={saving}
                              value={employeeData.instagram}
                              onChange={(e) => setEmployeeData({ ...employeeData, instagram: e.target.value })}
                              placeholder={t('instagram_placeholder')}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        {/* Bio */}
                        <h2 className="text-xl text-gray-900 mb-6 font-semibold mt-8">{t('about_me')}</h2>

                        <div className="mb-6">
                          <Label htmlFor="bio">{t('bio')}</Label>
                          <Textarea
                            id="bio"
                            disabled={saving}
                            value={employeeData.bio}
                            onChange={(e) => setEmployeeData({ ...employeeData, bio: e.target.value })}
                            placeholder={t('bio_placeholder')}
                            rows={6}
                            className="resize-none"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            {t('bio_hint')}
                          </p>
                        </div>

                        <Button
                          type="submit"
                          disabled={saving}
                          className="w-full bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700"
                        >
                          {saving ? (
                            <>
                              <Loader className="w-4 h-4 mr-2 animate-spin" />
                              {t('saving')}
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              {t('save_changes')}
                            </>
                          )}
                        </Button>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                          <p className="text-sm text-blue-800 flex items-center">
                            <Lightbulb className="w-4 h-4 mr-2 text-blue-600" />
                            <strong className="mr-1">{t('tip')}:</strong> {t('tip_message')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}