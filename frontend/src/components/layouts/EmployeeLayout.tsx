import { useState, useMemo, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  User,
  Settings,
  LogOut,
  Calendar,
  X,
  Menu
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { getPhotoUrl } from '../../utils/photoUtils';
import { getDynamicAvatar } from '../../utils/avatarUtils';

interface EmployeeLayoutProps {
  user: { id: number; role: string; full_name: string } | null;
  onLogout: () => void;
}

export default function EmployeeLayout({ user, onLogout }: EmployeeLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['layouts/employeelayout', 'common']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [salonSettings, setSalonSettings] = useState<{ name?: string; logo_url?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Используем централизованную систему прав

  useEffect(() => {
    loadSalonSettings();
    loadUserProfile();

    const handleProfileUpdate = () => {
      loadUserProfile();
    };

    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  const loadSalonSettings = async () => {
    try {
      const settings = await api.getSalonSettings();
      setSalonSettings(settings);
    } catch (err) {
      console.error('Failed to load salon settings:', err);
    }
  };

  const loadUserProfile = async () => {
    if (user?.id) {
      try {
        const profile = await api.getUserProfile(user.id);
        setUserProfile(profile);
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    }
  };

  // Сотрудник имеет доступ только к своим данным
  const menuItems = useMemo(() => {
    const allItems = [
      { icon: LayoutDashboard, label: t('menu.my_bookings'), path: '/employee/dashboard', requirePermission: () => true },
      { icon: Calendar, label: t('menu.calendar'), path: '/employee/calendar', requirePermission: () => true },
      { icon: User, label: t('menu.profile'), path: '/employee/profile', requirePermission: () => true },
      { icon: Settings, label: t('menu.settings'), path: '/employee/settings', requirePermission: () => true },
    ];

    return allItems.filter(item => item.requirePermission());
  }, [t]);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('session_token');
      localStorage.removeItem('user');
      onLogout();
      navigate('/login', { replace: true });
      toast.success(t('logout_success', 'Вы успешно вышли из системы'));
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {salonSettings?.logo_url ? (
                  <img
                    src={salonSettings.logo_url}
                    alt={salonSettings?.name || 'Logo'}
                    className="w-10 h-10 rounded-lg object-contain shadow-sm"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.src.includes('icons8.com')) {
                        img.src = 'https://img.icons8.com/color/96/diamond.png';
                      }
                    }}
                  />
                ) : (
                  <img
                    src="https://img.icons8.com/color/96/diamond.png"
                    alt="Diamond"
                    className="w-10 h-10 rounded-lg object-contain shadow-sm"
                  />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-sm text-gray-900 block font-semibold truncate leading-tight">
                  {salonSettings?.name || 'CRM Панель'}
                </span>
                <span className="text-xs text-gray-500">{t('employee_panel', 'Панель Мастера')}</span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {menuItems.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm
                      transition-all duration-200 relative
                      ${location.pathname.startsWith(item.path)
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              {userProfile?.photo ? (
                <img
                  src={getPhotoUrl(userProfile.photo) || ''}
                  alt={userProfile.full_name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-purple-100 shadow-sm"
                />
              ) : (
                <img
                  src={getDynamicAvatar(userProfile?.full_name || user?.full_name || 'Employee', 'warm', 'female')}
                  alt={userProfile?.full_name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-purple-100 shadow-sm"
                />
              )}
              <div className="flex-1 overflow-hidden">
                <span className="text-sm font-semibold text-gray-900 block truncate">{userProfile?.full_name || user?.full_name || 'Сотрудник'}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 capitalize leading-tight">{user?.role || 'employee'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>{t('logout', 'Выход')}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}