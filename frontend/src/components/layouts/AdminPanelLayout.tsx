import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  Gift,
  Award,
  Target,
  Bell,
  LogOut,
  X,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../../lib/utils';
import LanguageSwitcher from '../LanguageSwitcher';
import { api } from '../../services/api';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import './MainLayout.css';

interface AdminPanelLayoutProps {
  user: any;
  onLogout: () => void;
}

export default function AdminPanelLayout({ user, onLogout }: AdminPanelLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['layouts/adminpanellayout', 'common']);
  const [salonSettings, setSalonSettings] = useState<{ name?: string; logo_url?: string } | null>(null);
  const [showMoreModal, setShowMoreModal] = useState(false);

  useEffect(() => {
    loadSalonSettings();
  }, []);

  const loadSalonSettings = async () => {
    try {
      const settings = await api.getSalonSettings();
      setSalonSettings(settings);
    } catch (err) {
      console.error('Failed to load salon settings:', err);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const rolePrefix = '/admin';
  const unreadCount = 0;

  const mainTabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('menu.dashboard_short', 'Главная'), path: '/admin/dashboard' },
    { id: 'loyalty', icon: Gift, label: t('menu.loyalty_short', 'Лояльность'), path: '/admin/loyalty' },
    { id: 'referrals', icon: Award, label: t('menu.referrals_short', 'Рефералы'), path: '/admin/referrals' },
    { id: 'challenges', icon: Target, label: t('menu.challenges_short', 'Цели'), path: '/admin/challenges' },
    { id: 'more', icon: MoreHorizontal, label: t('menu.more', 'Ещё'), path: '#' },
  ];

  const menuItems = [
    {
      label: t('menu.dashboard'),
      icon: LayoutDashboard,
      path: '/admin/dashboard',
    },
    {
      label: t('menu.user_management'),
      icon: Users,
      path: '/admin/users',
    },
    {
      label: t('menu.loyalty_management'),
      icon: Gift,
      path: '/admin/loyalty',
    },
    {
      label: t('menu.referral_program'),
      icon: Award,
      path: '/admin/referrals',
    },
    {
      label: t('menu.challenges'),
      icon: Target,
      path: '/admin/challenges',
    },
    {
      label: t('menu.notifications'),
      icon: Bell,
      path: '/admin/notifications',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans">
      <div className="flex h-screen overflow-hidden">
        {/* Mobile Bottom Navigation */}
        <div className="mobile-bottom-nav lg:hidden">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'more') setShowMoreModal(true);
                else navigate(tab.path!);
              }}
              className={cn(
                "mobile-nav-btn",
                location.pathname === tab.path && "active"
              )}
            >
              <div className="mobile-nav-icon-container">
                <tab.icon size={24} />
                {(tab as any).badge !== undefined && (tab as any).badge > 0 && (
                  <span className="mobile-nav-badge">
                    {(tab as any).badge > 99 ? '99+' : (tab as any).badge}
                  </span>
                )}
              </div>
              <span className="mobile-nav-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* More Menu Modal */}
        {showMoreModal && (
          <div className="more-menu-modal animate-in fade-in" onClick={() => setShowMoreModal(false)}>
            <div className="more-menu-content animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
              <div className="more-menu-header">
                <span className="more-menu-title">{t('menu.more', 'Ещё')}</span>
                <button onClick={() => setShowMoreModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="more-menu-items">
                {menuItems.map((item: any) => {
                  if (mainTabs.some(t => t.path === item.path)) return null;

                  return (
                    <div key={item.path} className="menu-group">
                      <button
                        onClick={() => { navigate(item.path); setShowMoreModal(false); }}
                        className="menu-item-link"
                      >
                        <item.icon size={20} className="text-gray-700" />
                        <span className="font-medium text-gray-700">{item.label}</span>
                      </button>
                    </div>
                  );
                })}

                <div className="user-profile-section">
                  <div className="quick-actions-row">
                    <div className="quick-action-item justify-center">
                      <LanguageSwitcher variant="minimal" />
                    </div>
                    <button
                      onClick={() => { navigate(`${rolePrefix}/notifications`); setShowMoreModal(false); }}
                      className="quick-action-btn"
                    >
                      <div className="quick-action-text-part">
                        <span className="quick-action-label">{t('menu.notifications')}</span>
                      </div>
                      <div className="quick-action-icon-wrapper">
                        <Bell size={20} className="text-gray-700" />
                        {unreadCount > 0 && <span className="quick-action-badge">{unreadCount}</span>}
                      </div>
                    </button>
                  </div>

                  <div className="profile-logout-row">
                    <div className="user-card-premium flex-1">
                      <div className="user-card-content">
                        <div className="user-avatar-wrapper">
                          <img
                            src={getDynamicAvatar(user?.full_name || user?.username || 'Admin')}
                            alt="Avatar"
                            className="user-avatar-img"
                          />
                          <div className="user-status-indicator" />
                        </div>
                        <div className="user-info-text">
                          <div className="user-name-premium">{user?.full_name || user?.username}</div>
                          <div className="user-role-premium">{user?.role}</div>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => { handleLogout(); setShowMoreModal(false); }} className="logout-btn-minimal">
                      <LogOut size={22} />
                    </button>
                  </div>

                  <Link
                    to="/crm/dashboard"
                    onClick={() => setShowMoreModal(false)}
                    className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-blue-50 text-blue-700 font-bold transition-all hover:bg-blue-100 mt-2"
                  >
                    <LayoutDashboard size={20} />
                    <span>{t('go_to_crm')}</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Desktop */}
        <aside className="fixed lg:sticky top-0 left-0 z-30 h-screen w-64 desktop-sidebar sidebar-premium hidden lg:block">
          <div className="flex flex-col h-full overflow-hidden">
            {/* Logo Section */}
            <div className="sidebar-header-premium flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md p-1.5 shrink-0">
                <img
                  src={salonSettings?.logo_url || '/logo.webp'}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.endsWith('.webp')) {
                      target.src = '/logo.png';
                    }
                  }}
                />
              </div>
              <h1 className="text-lg font-bold text-gray-900 truncate">{salonSettings?.name || t('admin_panel')}</h1>
            </div>

            {/* User Profile Hook */}
            <div className="user-card-sidebar shadow-sm">
              <div className="flex items-center gap-3">
                <img
                  src={getDynamicAvatar(user?.full_name || user?.username || 'Admin')}
                  alt="Avatar"
                  className="w-10 h-10 rounded-xl shadow-sm border-2 border-white"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-gray-900 truncate">{user?.full_name || user?.username}</div>
                  <div className="text-[11px] font-semibold text-pink-600 uppercase tracking-wider">{user?.role}</div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <li key={item.path} className="list-none mb-1">
                    <Link
                      to={item.path}
                      className={cn(
                        "w-full flex items-center gap-3 menu-item-premium",
                        isActive && "active"
                      )}
                    >
                      <item.icon size={20} className="shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className="sidebar-footer-premium mt-auto">
              {/* CRM Link */}
              <Link
                to="/crm/dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-bold transition-all hover:bg-blue-100 mb-4"
              >
                <LayoutDashboard size={20} />
                <span>{t('go_to_crm')}</span>
              </Link>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 p-2 bg-gray-50 rounded-xl">
                  <LanguageSwitcher variant="minimal" />
                </div>
                <button
                  onClick={handleLogout}
                  className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                  title={t('logout')}
                >
                  <LogOut size={20} />
                </button>
              </div>
              <div className="text-[10px] text-center text-gray-400 font-medium">
                {salonSettings?.name || 'Beauty Panel'} v1.0.1
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-[70px] lg:pb-0">
          <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
