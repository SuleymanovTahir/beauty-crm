import { useEffect, useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Users,
    FileText,
    BarChart3,
    MessageSquare,
    Settings,
    LogOut,
    UserCog,
    Calendar,
    Scissors,
    X,
    Menu,
    Bot,
    ChevronDown,
    Globe,
    MapPinned,
    Bell,
    Filter,
    CheckSquare,
    Phone,
    Trash2,
    ShieldCheck,
    Send,
    MessageCircle,
    User
} from 'lucide-react';
import { WhatsAppIcon, TelegramIcon, TikTokIcon, InstagramIcon } from '../icons/SocialIcons';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { usePermissions } from '../../utils/permissions';
import { getPhotoUrl } from '../../utils/photoUtils';

interface MainLayoutProps {
    user: { id: number; role: string; full_name: string; username?: string } | null;
    onLogout: () => void;
}

export default function MainLayout({ user, onLogout }: MainLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation(['layouts/mainlayout', 'common']);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showChatSubmenu, setShowChatSubmenu] = useState(false);
    const [enabledMessengers, setEnabledMessengers] = useState<Array<{ type: string; name: string }>>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notifCount, setNotifCount] = useState(0);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [salonSettings, setSalonSettings] = useState<{ name?: string; logo_url?: string } | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [menuSettings, setMenuSettings] = useState<{ menu_order: string[] | null; hidden_items: string[] | null } | null>(null);

    // Используем централизованную систему прав
    const permissions = usePermissions(user?.role || 'employee');

    // Определяем префикс путей в зависимости от роли или текущего пути
    const rolePrefix = useMemo(() => {
        const path = location.pathname;
        if (path.startsWith('/crm')) return '/crm';
        if (path.startsWith('/manager')) return '/manager';
        if (path.startsWith('/sales')) return '/sales';
        if (path.startsWith('/marketer')) return '/marketer';
        if (path.startsWith('/employee')) return '/employee';

        // Fallback на основе роли
        if (user?.role === 'admin' || user?.role === 'director') return '/crm';
        if (user?.role) return `/${user.role}`;
        return '/crm';
    }, [location.pathname, user?.role]);

    const dashboardPath = useMemo(() => {
        if (user?.role === 'sales') return `${rolePrefix}/clients`;
        if (user?.role === 'marketer') return `${rolePrefix}/analytics`;
        return `${rolePrefix}/dashboard`;
    }, [user?.role, rolePrefix]);

    useEffect(() => {
        loadUnreadCount();
        loadEnabledMessengers();
        loadSalonSettings();
        loadUserProfile();
        loadMenuSettings();

        // Нотификации загружаем только если есть доступ (админ или менеджер)
        if (permissions.roleLevel >= 70) {
            loadNotifications();
            const notifInterval = setInterval(loadNotifications, 30000);
            return () => clearInterval(notifInterval);
        }

        const unreadInterval = setInterval(loadUnreadCount, 10000);

        const handleMessengersUpdate = () => {
            loadEnabledMessengers();
        };
        const handleProfileUpdate = () => {
            loadUserProfile();
        };
        window.addEventListener('messengers-updated', handleMessengersUpdate);
        window.addEventListener('profile-updated', handleProfileUpdate);

        return () => {
            clearInterval(unreadInterval);
            window.removeEventListener('messengers-updated', handleMessengersUpdate);
            window.removeEventListener('profile-updated', handleProfileUpdate);
        };
    }, [user?.role]);

    const loadEnabledMessengers = async () => {
        try {
            const response = await api.getEnabledMessengers();
            setEnabledMessengers(response.enabled_messengers);
        } catch (err) {
            console.error('Failed to load enabled messengers:', err);
        }
    };

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

    const loadUnreadCount = async () => {
        try {
            const data = await api.getTotalUnread();
            setUnreadCount(data.total || 0);
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    };

    const loadMenuSettings = async () => {
        try {
            const settings = await api.getMenuSettings();
            setMenuSettings(settings);
        } catch (error) {
            console.error('Error loading menu settings:', error);
            setMenuSettings({ menu_order: null, hidden_items: null });
        }
    };

    const loadNotifications = async () => {
        try {
            const data = await api.getNotifications(true, 10);
            setNotifications(data.notifications || []);
            setNotifCount(data.notifications?.length || 0);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    const markNotificationRead = async (id: number) => {
        try {
            await api.markNotificationRead(id);
            loadNotifications();
        } catch (error) {
            console.error('Error marking notification read:', error);
        }
    };

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
            toast.success(t('logout_success'));
        }
    };

    // Фильтруем пункты меню на основе прав пользователя
    const menuItems = useMemo(() => {
        const allItems = [
            // ГРУППА 1: Ежедневная работа (Операции)
            {
                icon: LayoutDashboard,
                label: user?.role === 'employee' ? t('menu.calendar') :
                    user?.role === 'sales' ? t('menu.dashboard_sales', 'Мои клиенты') :
                        user?.role === 'marketer' ? t('menu.analytics', 'Аналитика') : t('menu.dashboard'),
                path: dashboardPath,
                requirePermission: () => true
            },
            { icon: Calendar, label: t('menu.calendar'), path: `${rolePrefix}/calendar`, requirePermission: () => permissions.canViewAllCalendars && user?.role !== 'employee' },
            { icon: FileText, label: t('menu.bookings'), path: `${rolePrefix}/bookings`, requirePermission: () => permissions.canViewAllBookings || permissions.canCreateBookings || user?.role === 'employee' },
            { icon: CheckSquare, label: t('menu.tasks'), path: `${rolePrefix}/tasks`, requirePermission: () => permissions.canViewTasks || permissions.roleLevel >= 70 || user?.role === 'sales' },
            { icon: MessageSquare, label: t('menu.chat'), path: `${rolePrefix}/chat`, badge: unreadCount, hasSubmenu: true, requirePermission: () => permissions.canViewInstagramChat || permissions.roleLevel >= 70 || user?.role === 'sales' },
            { icon: User, label: t('menu.profile', 'Профиль'), path: `${rolePrefix}/profile`, requirePermission: () => user?.role === 'employee' || user?.role === 'sales' },

            // ГРУППА 2: Управление (Базы данных)
            { icon: Users, label: t('menu.clients'), path: `${rolePrefix}/clients`, requirePermission: () => permissions.canViewAllClients && user?.role !== 'sales' },
            { icon: Scissors, label: t('menu.services'), path: `${rolePrefix}/services`, requirePermission: () => permissions.canViewServices },
            { icon: UserCog, label: t('menu.users'), path: `${rolePrefix}/users`, requirePermission: () => permissions.canViewAllUsers },

            // ГРУППА 3: Маркетинг и Аналитика
            { icon: BarChart3, label: t('menu.analytics'), path: `${rolePrefix}/analytics`, requirePermission: () => permissions.canViewAnalytics && user?.role !== 'marketer' && user?.role !== 'sales' },
            { icon: Filter, label: t('menu.funnel'), path: `${rolePrefix}/funnel`, requirePermission: () => permissions.canViewAnalytics || user?.role === 'sales' },
            { icon: MapPinned, label: t('menu.visitors'), path: `${rolePrefix}/visitor-analytics`, requirePermission: () => permissions.canViewAnalytics },
            { icon: Send, label: t('menu.broadcasts', 'Рассылки'), path: `${rolePrefix}/broadcasts`, requirePermission: () => permissions.canSendBroadcasts || user?.role === 'sales' },

            // ГРУППА 4: Контент и Каналы
            { icon: Globe, label: t('menu.public_content'), path: `${rolePrefix}/public-content`, requirePermission: () => permissions.canViewSettings && permissions.roleLevel >= 80 },
            { icon: Phone, label: t('menu.telephony', 'Телефония'), path: `${rolePrefix}/telephony`, requirePermission: () => permissions.roleLevel >= 80 },
            { icon: MessageCircle, label: t('menu.internal_chat', 'Внутренняя связь'), path: `${rolePrefix}/internal-chat`, requirePermission: () => user?.role === 'sales' || user?.role === 'marketer' || user?.role === 'manager' },

            // ГРУППА 5: Системные настройки
            { icon: Settings, label: t('menu.settings'), path: `${rolePrefix}/settings`, requirePermission: () => permissions.canViewSettings || user?.role === 'employee' || user?.role === 'manager' || user?.role === 'sales' },
            { icon: Bot, label: t('menu.bot_settings'), path: `${rolePrefix}/bot-settings`, requirePermission: () => permissions.canViewBotSettings || user?.role === 'sales' },
            { icon: ShieldCheck, label: t('menu.audit_log', 'Логи аудита'), path: `${rolePrefix}/audit-log`, requirePermission: () => user?.role === 'director' },
            { icon: Trash2, label: t('menu.trash', 'Корзина'), path: `${rolePrefix}/trash`, requirePermission: () => permissions.roleLevel >= 80 },
        ];

        // Фильтруем только те пункты, к которым есть доступ
        let filteredItems = allItems.filter(item => item.requirePermission());

        // Применяем настройки меню (только для админов/директоров пока)
        if (permissions.roleLevel >= 80 && menuSettings?.menu_order && menuSettings.menu_order.length > 0) {
            const ordered = menuSettings.menu_order
                .map(id => filteredItems.find(item => item.path.includes(id)))
                .filter(Boolean) as typeof allItems;

            filteredItems.forEach(item => {
                if (!ordered.find(o => o?.path === item.path)) {
                    ordered.push(item);
                }
            });
            filteredItems = ordered;
        }

        // Фильтруем скрытые пункты
        if (permissions.roleLevel >= 80 && menuSettings?.hidden_items && menuSettings.hidden_items.length > 0) {
            filteredItems = filteredItems.filter(item => {
                const itemId = item.path.split('/').pop();
                return !menuSettings.hidden_items?.includes(itemId || '');
            });
        }

        return filteredItems;
    }, [permissions, unreadCount, menuSettings, t, rolePrefix, user?.role]);

    const chatSubmenuItems = enabledMessengers.map(messenger => ({
        icon: messenger.type === 'instagram' ? (props: any) => <InstagramIcon {...props} colorful={true} /> :
            messenger.type === 'telegram' ? (props: any) => <TelegramIcon {...props} colorful={true} /> :
                messenger.type === 'whatsapp' ? (props: any) => <WhatsAppIcon {...props} colorful={true} /> :
                    messenger.type === 'tiktok' ? (props: any) => <TikTokIcon {...props} colorful={true} /> : MessageSquare,
        label: messenger.name,
        type: messenger.type,
        path: `${rolePrefix}/chat?messenger=${messenger.type}`,
        color: messenger.type === 'instagram' ? 'from-pink-500 to-purple-600' :
            messenger.type === 'whatsapp' ? 'from-green-500 to-green-600' :
                messenger.type === 'telegram' ? 'from-blue-500 to-blue-600' :
                    'from-gray-900 to-black'
    }));

    const getRoleLabel = () => {
        switch (user?.role) {
            case 'director': return t('director', 'Директор');
            case 'admin': return t('admin', 'Админ');
            case 'manager': return t('manager', 'Менеджер');
            case 'sales': return t('sales', 'Продажи');
            case 'marketer': return t('marketer', 'Маркетинг');
            case 'employee': return t('employee', 'Мастер');
            default: return user?.role;
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
                                <span className="text-xs text-gray-500">{getRoleLabel()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <nav className="flex-1 overflow-y-auto p-3">
                        <ul className="space-y-1">
                            {menuItems.map((item, index) => (
                                <li key={index}>
                                    {item.hasSubmenu ? (
                                        <div>
                                            <button
                                                onClick={() => setShowChatSubmenu(!showChatSubmenu)}
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
                                                <ChevronDown
                                                    size={16}
                                                    className={`ml-auto transition-transform ${showChatSubmenu ? 'rotate-180' : ''}`}
                                                />
                                                {item.badge != null && Number(item.badge) > 0 && (
                                                    <span className="absolute right-10 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                                                        {Number(item.badge) > 99 ? '99+' : item.badge}
                                                    </span>
                                                )}
                                            </button>

                                            {/* Submenu Items */}
                                            {showChatSubmenu && (
                                                <ul className="mt-1 ml-8 space-y-1">
                                                    {chatSubmenuItems.map((subItem, subIndex) => {
                                                        const params = new URLSearchParams(location.search);
                                                        const currentMessenger = params.get('messenger') || 'instagram';
                                                        const isActive = location.pathname.includes('/chat') && subItem.type === currentMessenger;

                                                        return (
                                                            <li key={subIndex}>
                                                                <button
                                                                    onClick={() => {
                                                                        navigate(subItem.path);
                                                                        setIsMobileMenuOpen(false);
                                                                    }}
                                                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${isActive ? 'bg-purple-50 text-purple-600 font-medium' : 'hover:bg-gray-50 text-gray-700'
                                                                        }`}
                                                                >
                                                                    <subItem.icon size={20} />
                                                                    <span>{subItem.label}</span>
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
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
                                            {item.badge != null && Number(item.badge) > 0 && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                                                    {Number(item.badge) > 99 ? '99+' : item.badge}
                                                </span>
                                            )}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-gray-200">
                        {/* Notifications Button (for Admin/Manager) */}
                        {permissions.roleLevel >= 70 && (
                            <div className="relative mb-4">
                                <button
                                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
                                >
                                    <Bell size={18} />
                                    <span>{t('notifications', 'Уведомления')}</span>
                                    {notifCount > 0 && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                            {notifCount}
                                        </span>
                                    )}
                                </button>

                                {showNotifDropdown && (
                                    <div className="absolute bottom-full left-0 w-64 mb-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                                        <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                            <span className="font-semibold text-xs">{t('notifications')}</span>
                                            <button
                                                onClick={() => setShowNotifDropdown(false)}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                notifications.map((n) => (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => markNotificationRead(n.id)}
                                                        className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                                                    >
                                                        <p className="text-xs font-medium text-gray-900 line-clamp-2">{n.title}</p>
                                                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                                                        <span className="text-[9px] text-gray-400 mt-1 block">
                                                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-xs text-gray-400">
                                                    {t('no_new_notifications', 'Нет уведомлений')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-3">
                            {userProfile?.photo ? (
                                <img
                                    src={getPhotoUrl(userProfile.photo) || ''}
                                    alt={userProfile.full_name}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-100 shadow-sm"
                                />
                            ) : (
                                <img
                                    src={getDynamicAvatar(
                                        userProfile?.full_name || user?.full_name || 'User',
                                        'warm',
                                        user?.role === 'employee' || userProfile?.gender === 'female' ? 'female' : 'male'
                                    )}
                                    alt={userProfile?.full_name}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-100 shadow-sm"
                                />
                            )}
                            <div className="flex-1 overflow-hidden">
                                <span className="text-sm font-semibold text-gray-900 block truncate">
                                    {userProfile?.full_name || user?.full_name || 'Пользователь'}
                                </span>
                                <span className="text-[10px] text-gray-500 capitalize leading-tight">@{user?.username || 'user'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <LanguageSwitcher />
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut size={16} />
                                <span>{t('logout')}</span>
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
