// /frontend/src/pages/admin/CreateUser.tsx
import React, { useState, useEffect } from 'react';
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
    role: 'employee',
    position_id: null as number | null
  });
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      const data = await api.getPositions();
      setPositions(data.positions || []);
    } catch (err) {
      console.error('Error loading positions:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Валидация
    if (!formData.full_name.trim()) {
      toast.error(t('full_name_required'));
      return;
    }

    if (!formData.username.trim()) {
      toast.error(t('username_required'));
      return;
    }

    if (formData.username.length < 3) {
      toast.error(t('username_min_length'));
      return;
    }

    if (!formData.password) {
      toast.error(t('password_required'));
      return;
    }

    if (formData.password.length < 6) {
      toast.error(t('password_min_length'));
      return;
    }

    try {
      setLoading(true);

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
        throw new Error(result.error || t('error_creating'));
      }

      toast.success(t('user_created'));
      navigate('/admin/users');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_creating');
      toast.error(`${t('error')}: ${message}`);
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
        {t('back_to_users')}
      </Button>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-pink-600" />
            {t('title')}
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="full_name">{t('full_name_label')}</Label>
              <Input
                id="full_name"
                required
                disabled={loading}
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t('full_name_placeholder')}
              />
            </div>

            <div>
              <Label htmlFor="username">{t('username_label')}</Label>
              <Input
                id="username"
                required
                disabled={loading}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder={t('username_placeholder')}
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('username_hint')}
              </p>
            </div>

            <div>
              <Label htmlFor="email">{t('email_label')}</Label>
              <Input
                id="email"
                type="email"
                disabled={loading}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('email_placeholder')}
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('email_hint')}
              </p>
            </div>

            <div>
              <Label htmlFor="password">{t('password_label')}</Label>
              <Input
                id="password"
                type="password"
                required
                disabled={loading}
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('password_placeholder')}
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('password_hint')}
              </p>
            </div>

            <div>
              <Label htmlFor="role">{t('role_label')}</Label>
              <Select
                value={formData.role}
                onValueChange={(value: string) => setFormData({ ...formData, role: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="director">{t('role_director')}</SelectItem>
                  <SelectItem value="admin">{t('role_admin')}</SelectItem>
                  <SelectItem value="manager">{t('role_manager')}</SelectItem>
                  <SelectItem value="sales">{t('role_sales')}</SelectItem>
                  <SelectItem value="marketer">{t('role_marketer')}</SelectItem>
                  <SelectItem value="employee">{t('role_employee')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-1">
                <p><strong>{t('role_director')}:</strong> {t('role_director_desc')}</p>
                <p><strong>{t('role_admin')}:</strong> {t('role_admin_desc')}</p>
                <p><strong>{t('role_manager')}:</strong> {t('role_manager_desc')}</p>
                <p><strong>{t('role_employee')}:</strong> {t('role_employee_desc')}</p>
              </div>
            </div>

            <div>
              <Label htmlFor="position">{t('position_label')}</Label>
              <Select
                value={formData.position_id?.toString() || ""}
                onValueChange={(value: string) => setFormData({ ...formData, position_id: value ? parseInt(value) : null })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('position_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('position_none')}</SelectItem>
                  {positions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id.toString()}>
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                {t('position_hint')}
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {t('creating')}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('create_user')}
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
