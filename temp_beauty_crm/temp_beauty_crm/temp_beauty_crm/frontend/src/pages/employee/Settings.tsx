// /frontend/src/pages/employee/Settings.tsx
import { useState, useEffect } from 'react';
import { User, Mail, Save, Loader, Lightbulb } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

export default function EmployeeSettings() {
  const { t } = useTranslation(['employee/settings', 'common']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const data = await api.getUserProfile(currentUser.id);
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        username: data.username || '',
        email: data.email || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err: any) {
      console.error('Error loading profile:', err);
      toast.error(t('common:error_loading_profile'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.full_name.length < 2) {
      toast.error(t('settings:full_name_validation', { count: 2 }));
      return;
    }

    try {
      setSaving(true);
      await api.updateUserProfile(profile.id, {
        full_name: formData.full_name,
        email: formData.email
      });
      toast.success(t('common:profile_updated_successfully'));
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message || t('common:error_updating_profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.current_password || !formData.new_password) {
      toast.error(t('settings:fill_all_password_fields'));
      return;
    }

    if (formData.new_password.length < 6) {
      toast.error(t('settings:password_min_length', { count: 6 }));
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      toast.error(t('settings:passwords_do_not_match'));
      return;
    }

    try {
      setSaving(true);
      await api.changePassword(profile.id, {
        old_password: formData.current_password,
        new_password: formData.new_password
      });
      toast.success(t('common:password_changed_successfully'));
      setFormData({ ...formData, current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      toast.error(err.message || t('common:error_changing_password'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <User className="w-8 h-8 text-pink-600" />
            {t('settings:my_settings')}
          </h1>
          <p className="text-gray-600">{t('settings:manage_account_settings')}</p>
        </div>

        {/* Personal Information */}
        <form onSubmit={handleUpdateProfile}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            <h2 className="text-xl text-gray-900 mb-6 font-semibold">{t('settings:personal_information')}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="full_name">{t('settings:full_name')} *</Label>
                <Input
                  id="full_name"
                  required
                  disabled={saving}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder={t('settings:full_name_placeholder')}
                  minLength={2}
                />
              </div>

              <div>
                <Label htmlFor="username">{t('settings:username')}</Label>
                <Input
                  id="username"
                  disabled
                  value={formData.username}
                  className="bg-gray-50"
                />
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="email">{t('settings:email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  disabled={saving}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('settings:email_placeholder')}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {t('common:saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('common:save_changes')}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Change Password */}
        <form onSubmit={handleChangePassword}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            <h2 className="text-xl text-gray-900 mb-6 font-semibold">{t('settings:change_password')}</h2>

            <div className="space-y-4 mb-6">
              <div>
                <Label htmlFor="current_password">{t('settings:current_password')} *</Label>
                <Input
                  id="current_password"
                  type="password"
                  disabled={saving}
                  value={formData.current_password}
                  onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                  placeholder={t('settings:enter_current_password')}
                />
              </div>

              <div>
                <Label htmlFor="new_password">{t('settings:new_password')} *</Label>
                <Input
                  id="new_password"
                  type="password"
                  disabled={saving}
                  value={formData.new_password}
                  onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                  placeholder={t('settings:enter_new_password', { count: 6 })}
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirm_password">{t('settings:confirm_password')} *</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  disabled={saving}
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  placeholder={t('settings:confirm_new_password')}
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {t('common:saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('settings:update_password')}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 flex items-center">
            <Lightbulb className="w-4 h-4 mr-2 text-blue-600" />
            <strong className="mr-1">{t('common:tip')}:</strong> {t('settings:security_tip')}
          </p>
        </div>
      </div>
    </div>
  );
}
