// /frontend/src/pages/admin/EditUser.tsx
import React, { useState, useEffect } from 'react';
import { UserCog, ArrowLeft, Loader, Key, User as UserIcon, Shield, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { PermissionsTab } from '../../components/admin/PermissionsTab';
import { getPhotoUrl } from '../../utils/photoUtils';

export default function EditUser() {
  const navigate = useNavigate();
  const { t } = useTranslation(['admin/EditUser', 'common']);
  const { identifier } = useParams<{ identifier: string }>();
  const [userId, setUserId] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    email: '',
    photo: '',
    position: '',
    years_of_experience: '',
    specialization: '',
    about_me: '',
    phone_number: '',
    birth_date: ''
  });

  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (identifier) {
      loadUserProfile();
    }
  }, [identifier]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      let data;

      // Check if identifier is numeric
      const isNumeric = /^\d+$/.test(identifier || '');

      if (isNumeric) {
        data = await api.getUserProfile(parseInt(identifier!));
      } else {
        data = await api.getUserProfileByUsername(identifier!);
      }

      setUserId(data.id);

      // Fix photo URL - add API URL if it's a relative path
      const photoUrl = getPhotoUrl(data.photo);

      setProfileData({
        username: data.username,
        full_name: data.full_name,
        email: data.email || '',
        photo: photoUrl || '',
        position: data.position || '',
        years_of_experience: String(data.years_of_experience || ''),
        specialization: data.specialization || '',
        about_me: data.bio || data.about_me || '',
        phone_number: data.phone || data.phone_number || '',
        birth_date: data.birthday || data.birth_date || ''
      });
    } catch (err: any) {
      toast.error(t('users:error_loading_profile'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileData.username || profileData.username.length < 3) {
      toast.error(t('users:username_must_be_at_least_3_characters'));
      return;
    }

    if (!profileData.full_name || profileData.full_name.length < 2) {
      toast.error(t('users:name_must_be_at_least_2_characters'));
      return;
    }

    try {
      setSaving(true);
      await api.updateUserProfile(userId, profileData);
      toast.success(t('users:profile_updated'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('users:error_updating_profile');
      toast.error(`❌ ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.new_password || passwordData.new_password.length < 6) {
      toast.error(t('users:password_must_be_at_least_6_characters'));
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error(t('users:passwords_do_not_match'));
      return;
    }

    try {
      setSaving(true);
      await api.changePassword(userId, {
        new_password: passwordData.new_password
      });
      toast.success(t('users:password_changed'));
      setPasswordData({ new_password: '', confirm_password: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('users:error_changing_password');
      toast.error(`❌ ${message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 text-pink-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/crm/users')}
        disabled={saving}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('users:back_to_users')}
      </Button>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <UserCog className="w-8 h-8 text-pink-600" />
            {t('users:edit_user')}
          </h1>
          <p className="text-gray-600">{profileData.full_name}</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <UserIcon className="w-4 h-4 mr-2" />
              {t('users:profile')}
            </TabsTrigger>
            <TabsTrigger value="password">
              <Key className="w-4 h-4 mr-2" />
              {t('users:password')}
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Shield className="w-4 h-4 mr-2" />
              {t('edituser:permissions_label')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl text-gray-900 mb-6 font-semibold">{t('users:basic_information')}</h2>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <Label htmlFor="username">{t('users:username')} *</Label>
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
                    {t('users:username_must_be_at_least_3_characters')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="full_name">{t('users:full_name')} *</Label>
                  <Input
                    id="full_name"
                    required
                    disabled={saving}
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    placeholder={t('users:full_name_placeholder')}
                    minLength={2}
                  />
                </div>

                <div>
                  <Label htmlFor="email">{t('users:email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    disabled={saving}
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder={t('users:email_placeholder')}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {t('users:email_for_password_recovery')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="phone_number">{t('users:phone_number', 'Телефон')}</Label>
                    <Input
                      id="phone_number"
                      disabled={saving}
                      value={profileData.phone_number}
                      onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                      placeholder="+971..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="birth_date">{t('users:birth_date', 'Дата рождения')}</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      disabled={saving}
                      value={profileData.birth_date}
                      onChange={(e) => setProfileData({ ...profileData, birth_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="position">{t('users:position', 'Должность')}</Label>
                    <Input
                      id="position"
                      disabled={saving}
                      value={profileData.position}
                      onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                      placeholder="Stylist"
                    />
                  </div>

                  <div>
                    <Label htmlFor="years_of_experience">{t('users:years_of_experience', 'Опыт (лет)')}</Label>
                    <Input
                      id="years_of_experience"
                      type="number"
                      min="0"
                      disabled={saving}
                      value={profileData.years_of_experience}
                      onChange={(e) => setProfileData({ ...profileData, years_of_experience: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="specialization">{t('users:specialization', 'Специализация')}</Label>
                  <Input
                    id="specialization"
                    disabled={saving}
                    value={profileData.specialization}
                    onChange={(e) => setProfileData({ ...profileData, specialization: e.target.value })}
                    placeholder="Hair, Nails..."
                  />
                </div>

                <div>
                  <Label htmlFor="about_me">{t('users:about_me', 'О себе')}</Label>
                  <textarea
                    id="about_me"
                    rows={4}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={saving}
                    value={profileData.about_me}
                    onChange={(e) => setProfileData({ ...profileData, about_me: e.target.value })}
                    placeholder="..."
                  />
                </div>

                <div>
                  <Label htmlFor="photo">{t('users:photo')}</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {profileData.photo && (
                      <img
                        src={profileData.photo}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover border border-gray-200"
                      />
                    )}
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      disabled={saving}
                      onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                          setSaving(true);
                          const formData = new FormData();
                          formData.append('file', file);

                          // Upload file
                          const response = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                          });

                          if (!response.ok) throw new Error('Upload failed');

                          const data = await response.json();

                          // Extract path from full URL (remove http://localhost:8000 part)
                          const photoPath = data.file_url.replace(/^https?:\/\/[^\/]+/, '');

                          // Update local state
                          setProfileData(prev => ({ ...prev, photo: photoPath }));

                          // Auto-save to database
                          await api.updateUserProfile(userId, {
                            ...profileData,
                            photo: photoPath
                          });

                          toast.success(t('users:photo_uploaded'));
                        } catch (err: any) {
                          console.error(err);
                          toast.error(t('users:error_uploading_photo'));
                        } finally {
                          setSaving(false);
                        }
                      }}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-pink-600 hover:bg-pink-700"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      {t('users:saving')}...
                    </>
                  ) : (
                    t('users:save_changes')
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="password">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl text-gray-900 mb-6 font-semibold">{t('users:change_password')}</h2>

              <p className="text-sm text-yellow-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <strong>{t('users:important')}:</strong> {t('users:admin_can_change_password_without_knowing_current')}
                {t('users:after_changing_user_must_login_with_new_password')}
              </p>

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <Label htmlFor="new_password">{t('users:new_password')} *</Label>
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
                    {t('users:password_must_be_at_least_6_characters')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirm_password">{t('users:confirm_password')} *</Label>
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
                  className="w-full bg-pink-600 hover:bg-pink-700"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      {t('users:changing')}...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      {t('users:change_password')}
                    </>
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsTab userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}