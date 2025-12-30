// /frontend/src/components/layouts/AdminPanelLayout.tsx
import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Gift,
  Award,
  Target,
  Bell,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface AdminPanelLayoutProps {
  user: any;
  onLogout: () => void;
}

export default function AdminPanelLayout({ user, onLogout }: AdminPanelLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin/dashboard',
    },
    {
      label: 'User Management',
      icon: Users,
      path: '/admin/users',
    },
    {
      label: 'Loyalty Management',
      icon: Gift,
      path: '/admin/loyalty',
    },
    {
      label: 'Referral Program',
      icon: Award,
      path: '/admin/referrals',
    },
    {
      label: 'Challenges',
      icon: Target,
      path: '/admin/challenges',
    },
    {
      label: 'Notifications',
      icon: Bell,
      path: '/admin/notifications',
    },
  ];

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-purple-600">Admin Panel</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:sticky top-0 left-0 z-30 h-screen w-64 bg-white border-r transition-transform lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="hidden lg:flex items-center gap-2 px-6 py-5 border-b">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            </div>

            {/* User info */}
            <div className="px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.full_name?.[0] || user?.username?.[0] || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {user?.full_name || user?.username}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
              <div className="space-y-1 px-3">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-purple-50 text-purple-700"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* CRM Link */}
            <div className="px-3 py-4 border-t">
              <Link
                to="/crm/dashboard"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Go to CRM</span>
              </Link>
            </div>

            {/* Logout */}
            <div className="px-3 py-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
