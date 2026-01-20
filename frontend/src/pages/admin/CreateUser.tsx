import React, { useState, useEffect } from 'react';
import { UserPlus, ArrowLeft, Loader, Check, ChevronsUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { cn } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';

export default function CreateUser() {
  const navigate = useNavigate();
  const { t } = useTranslation(['admin/CreateUser', 'common']);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'employee',
    position: '' // String for backend
  });
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [openCombobox, setOpenCombobox] = useState(false);

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

  const togglePosition = (positionName: string) => {
    setSelectedPositions(prev => {
      if (prev.includes(positionName)) {
        return prev.filter(p => p !== positionName);
      } else {
        return [...prev, positionName];
      }
    });
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

      // Prepare data with combined positions
      const submitData = {
        ...formData,
        position: selectedPositions.join(' / ')
      };

      const baseUrl = (window as any).VITE_API_URL || import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? `${window.location.protocol}//${window.location.hostname}:8000` : window.location.origin);
      const response = await fetch(
        `${baseUrl}/api/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(submitData)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('error_creating'));
      }

      toast.success(t('user_created'));

      // Redirect to the new user's detail page, Services tab
      if (result.user_id) {
        navigate(`/crm/users/${result.user_id}?tab=services`);
      } else {
        navigate('/crm/users');
      }

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
        onClick={() => navigate('/crm/users')}
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
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between"
                  >
                    {selectedPositions.length > 0
                      ? selectedPositions.join(", ")
                      : t('position_placeholder')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder={t('search_position')} />
                    <CommandList>
                      <CommandEmpty>{t('no_position_found')}</CommandEmpty>
                      <CommandGroup>
                        {positions.map((position) => (
                          <CommandItem
                            key={position.id}
                            value={position.name}
                            onSelect={() => {
                              togglePosition(position.name);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedPositions.includes(position.name) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {position.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedPositions.map(pos => (
                  <Badge key={pos} variant="secondary" className="text-xs">
                    {pos}
                    <button
                      type="button"
                      className="ml-1 hover:text-red-500"
                      onClick={() => togglePosition(pos)}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
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
                  {t('create_and_assign_services')}
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
