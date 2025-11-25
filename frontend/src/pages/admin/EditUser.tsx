// frontend/src/pages/admin/EditUser.tsx
import React, { useState, useEffect } from 'react';
import { UserCog, ArrowLeft, Loader, Key, User as UserIcon, Shield } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { PermissionsTab } from '../../components/admin/PermissionsTab';

export default function EditUser() {
  const navigate = useNavigate();
  const { t } = useTranslation(['admin/EditUser', 'common']);
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id || '0');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    email: ''
  });

  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getUserProfile(userId);
      setProfileData({
        username: data.username,
        full_name: data.full_name,
        email: data.email || ''
      });
    } catch (err) {
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
        onClick={() => navigate('/admin/users')}
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

              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ {t('users:important')}:</strong> {t('users:admin_can_change_password_without_knowing_current')}
                  {t('users:after_changing_user_must_login_with_new_password')}
                </p>
              </div>

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