import React, { useState } from 'react';
import { UserPlus, ArrowLeft, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { api } from '../../services/api';

export default function CreateUser() {
  const navigate = useNavigate();
  const { t } = useTranslation(['admin/CreateUser', 'common']);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'employee'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!formData.full_name.trim()) {
      toast.error(t('createuser:errors.full_name_required'));
      return;
    }

    if (!formData.username.trim()) {
      toast.error(t('createuser:errors.username_required'));
      return;
    }

    if (formData.username.length < 3) {
      toast.error(t('createuser:errors.username_min_length'));
      return;
    }

    if (!formData.password) {
      toast.error(t('createuser:errors.password_required'));
      return;
    }

    if (formData.password.length < 6) {
      toast.error(t('createuser:errors.password_min_length'));
      return;
    }

    try {
      setLoading(true);

      // Используем новый API endpoint для создания пользователя
      const response = await fetch(
        `${(window as any).VITE_API_URL || 'http://localhost:8000'}/api/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(formData)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('createuser:errors.create_failed'));
      }

      toast.success(t('createuser:success.created'));
      navigate('/admin/users');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('createuser:errors.create_failed');
      toast.error(`Ошибка: ${message}`);
      console.error('Error creating user:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/admin/users')}
        disabled={loading}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        t('common:back_to_users')
      </Button>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-pink-600" />
            {t('createuser:title')}
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="full_name">{t('createuser:full_name')} *</Label>
              <Input
                id="full_name"
                required
                disabled={loading}
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t('createuser:placeholders.name')}
              />
            </div>

            <div>
              <Label htmlFor="username">t('createuser:username') *</Label>
              <Input
                id="username"
                required
                disabled={loading}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder={t('createuser:placeholders.name')}
              />
              <p className="text-sm text-gray-500 mt-1">
                t('createuser:username_hint')
              </p>
            </div>

            <div>
              <Label htmlFor="email">t('createuser:email')</Label>
              <Input
                id="email"
                type="email"
                disabled={loading}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('createuser:placeholders.email')}
              />
              <p className="text-sm text-gray-500 mt-1">
                t('createuser:email_hint')
              </p>
            </div>

            <div>
              <Label htmlFor="password">t('createuser:password') *</Label>
              <Input
                id="password"
                type="password"
                required
                disabled={loading}
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••"
              />
              <p className="text-sm text-gray-500 mt-1">
                t('createuser:password_hint')
              </p>
            </div>

            <div>
              <Label htmlFor="role">t('createuser:role') *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: string) => setFormData({ ...formData, role: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">t('createuser:role_employee')</SelectItem>
                  <SelectItem value="manager">t('createuser:manager')</SelectItem>
                  <SelectItem value="admin">t('createuser:admin')</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-1">
                <p><strong>{t('createuser:role_employee')}:</strong> {t('createuser:role_employee_desc')}</p>
                <p><strong>{t('createuser:role_manager')}:</strong> {t('createuser:role_manager_desc')}</p>
                <p><strong>{t('createuser:role_admin')}:</strong> {t('createuser:role_admin_desc')}</p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  t('createuser:creating')
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  t('createuser:title')
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}