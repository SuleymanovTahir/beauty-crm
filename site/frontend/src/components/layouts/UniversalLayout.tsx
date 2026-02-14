import { useMemo, useState, type ComponentType } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Gift,
  Bell,
  SlidersHorizontal,
  Image as ImageIcon,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@site/components/LanguageSwitcher';
import { Button } from '@site/components/ui/button';
import { cn } from '@site/lib/utils';

interface MainLayoutProps {
  user: {
    id: number;
    role: string;
    secondary_role?: string;
    full_name: string;
    username?: string;
  } | null;
  onLogout: () => void;
}

type MenuItem = {
  id: string;
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

function buildSiteAdminMenu(t: (key: string, options?: unknown) => string): MenuItem[] {
  return [
    {
      id: 'dashboard',
      path: '/admin/dashboard',
      label: t('layouts/adminpanellayout:menu.dashboard', { defaultValue: 'Dashboard' }),
      icon: LayoutDashboard,
    },
    {
      id: 'loyalty',
      path: '/admin/loyalty',
      label: t('adminpanel/loyaltymanagement:title', { defaultValue: 'Loyalty' }),
      icon: Gift,
    },
    {
      id: 'notifications',
      path: '/admin/notifications',
      label: t('layouts/adminpanellayout:menu.notifications', { defaultValue: 'Notifications' }),
      icon: Bell,
    },
    {
      id: 'features',
      path: '/admin/features',
      label: t('adminpanel/featuremanagement:title', { defaultValue: 'Features' }),
      icon: SlidersHorizontal,
    },
    {
      id: 'gallery',
      path: '/admin/gallery',
      label: t('layouts/adminpanellayout:menu.photo_gallery', { defaultValue: 'Gallery' }),
      icon: ImageIcon,
    },
  ];
}

export default function UniversalLayout({ user, onLogout }: MainLayoutProps) {
  const { t } = useTranslation([
    'common',
    'layouts/adminpanellayout',
    'adminpanel/loyaltymanagement',
    'adminpanel/featuremanagement',
  ]);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = useMemo(() => buildSiteAdminMenu(t), [t]);

  const handleLogout = () => {
    onLogout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border lg:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={t('common:menu', { defaultValue: 'Menu' })}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              {t('layouts/adminpanellayout:title', { defaultValue: 'Site Admin' })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="hidden text-sm text-slate-600 sm:inline">{user?.full_name ?? user?.username ?? 'Admin'}</span>
            <Button type="button" variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              {t('common:logout', { defaultValue: 'Logout' })}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside
          className={cn(
            'fixed inset-y-14 left-0 z-20 w-72 border-r bg-white p-4 transition-transform duration-200 lg:static lg:inset-auto lg:w-64 lg:translate-x-0',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
