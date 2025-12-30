import { useState } from 'react';
import { Home, Calendar, Image, Award, Trophy, Users, Sparkles, Bell, Settings as SettingsIcon, Menu } from 'lucide-react';
import { Toaster } from '../../components/ui/sonner';
import { Button } from './v2_components/ui/button';
import { Badge } from './v2_components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './v2_components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from './v2_components/ui/sheet';
import { Dashboard } from './v2_components/Dashboard';
import { Appointments } from './v2_components/Appointments';
import { Gallery } from './v2_components/Gallery';
import { Loyalty } from './v2_components/Loyalty';
import { Achievements } from './v2_components/Achievements';
import { Masters } from './v2_components/Masters';
import { BeautyProfile } from './v2_components/BeautyProfile';
import { Notifications } from './v2_components/Notifications';
import { Settings } from './v2_components/Settings';
import { currentUser, notifications } from '../../data/mockData';

type Tab = 'dashboard' | 'appointments' | 'gallery' | 'loyalty' | 'achievements' | 'masters' | 'beauty' | 'notifications' | 'settings';

const menuItems = [
  { id: 'dashboard' as Tab, label: 'Главная', icon: Home },
  { id: 'appointments' as Tab, label: 'Записи', icon: Calendar },
  { id: 'gallery' as Tab, label: 'Галерея', icon: Image },
  { id: 'loyalty' as Tab, label: 'Лояльность', icon: Award },
  { id: 'achievements' as Tab, label: 'Достижения', icon: Trophy },
  { id: 'masters' as Tab, label: 'Мастера', icon: Users },
  { id: 'beauty' as Tab, label: 'Бьюти-профиль', icon: Sparkles },
  { id: 'notifications' as Tab, label: 'Уведомления', icon: Bell },
  { id: 'settings' as Tab, label: 'Настройки', icon: SettingsIcon },
];

export function AccountPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'appointments':
        return <Appointments />;
      case 'gallery':
        return <Gallery />;
      case 'loyalty':
        return <Loyalty />;
      case 'achievements':
        return <Achievements />;
      case 'masters':
        return <Masters />;
      case 'beauty':
        return <BeautyProfile />;
      case 'notifications':
        return <Notifications />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  const MenuItem = ({ item }: { item: typeof menuItems[0] }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const hasNotification = item.id === 'notifications' && unreadNotifications > 0;

    return (
      <button
        onClick={() => {
          setActiveTab(item.id);
          setMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-pink-100 text-pink-600'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {hasNotification && (
          <Badge className="bg-red-500">{unreadNotifications}</Badge>
        )}
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Профиль */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{currentUser.name}</div>
            <div className="text-sm text-muted-foreground capitalize">
              {currentUser.currentTier}
            </div>
          </div>
        </div>
      </div>

      {/* Меню */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))}
        </div>
      </nav>

      {/* Футер */}
      <div className="p-4 border-t">
        <div className="text-xs text-center text-muted-foreground">
          Beauty Salon App
          <br />
          v1.0.0
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <Toaster />

      {/* Мобильная шапка */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-pink-500" />
            <span className="font-bold">Beauty Salon</span>
          </div>

          <Avatar className="w-8 h-8">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="flex h-screen pt-[73px] lg:pt-0">
        {/* Десктопный сайдбар */}
        <aside className="hidden lg:block w-[280px] bg-white border-r flex-shrink-0">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-pink-500" />
              <span className="text-xl font-bold">Beauty Salon</span>
            </div>
          </div>
          <SidebarContent />
        </aside>

        {/* Основной контент */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
