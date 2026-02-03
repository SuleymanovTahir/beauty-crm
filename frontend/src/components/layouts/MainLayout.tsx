import { useEffect, useState, useMemo, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useNotificationsWebSocket } from '../../hooks/useNotificationsWebSocket';
import {
    Check,
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
    FileSignature,
    Package,
    Receipt,
    CreditCard,
    Store,
    Briefcase,
    Link
} from 'lucide-react';
import { WhatsAppIcon, TelegramIcon, TikTokIcon, InstagramIcon } from '../icons/SocialIcons';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { usePermissions } from '../../utils/permissions';
import { getPhotoUrl } from '../../utils/photoUtils';

import { webrtcService, CallType } from '../../services/webrtc';
import IncomingCallModal from '../calls/IncomingCallModal';

interface MainLayoutProps {
    user: { id: number; role: string; full_name: string; username?: string } | null;
    onLogout: () => void;
}

export default function MainLayout({ user, onLogout }: MainLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation(['layouts/mainlayout', 'common']);

    // Global Call State
    const [incomingCall, setIncomingCall] = useState<{ from: number, type: CallType, name: string } | null>(null);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [expandedMenu, setExpandedMenu] = useState<string | null>(() => {
        const path = window.location.pathname;
        if (path.includes('/chat') || path.includes('/internal-chat')) return 'chat';
        if (path.includes('/services') || path.includes('/products')) return 'management';
        if (path.includes('/analytics') || path.includes('/visitor-analytics')) return 'analytics-group';
        if (path.includes('/invoices') || path.includes('/contracts')) return 'finance';
        if (path.includes('/tasks') || path.includes('/broadcasts') || path.includes('/telephony')) return 'tools';
        if (path.includes('/payment-integrations') || path.includes('/marketplace-integrations') || path.includes('/settings/messengers')) return 'integrations';
        if (path.includes('/users') || path.includes('/public-content') || path.includes('/bot-settings') || path.includes('/audit-log') || path.includes('/trash') || path.includes('/settings')) return 'settings';
        return null;
    });
    const [enabledMessengers, setEnabledMessengers] = useState<Array<{ type: string; name: string }>>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notifCount, setNotifCount] = useState(0);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [salonSettings, setSalonSettings] = useState<{ name?: string; logo_url?: string } | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [menuSettings, setMenuSettings] = useState<{ menu_order: string[] | null; hidden_items: string[] | null } | null>(null);
    const activeMenuItemRef = useRef<HTMLButtonElement>(null);
    const navContainerRef = useRef<HTMLDivElement>(null);
    const expandedMenuRef = useRef<HTMLUListElement>(null);

    // Используем централизованную систему прав
    const permissions = usePermissions(user?.role || 'employee');

    // ... (dashboardPath memo)
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

    // WebSocket для real-time уведомлений
    useNotificationsWebSocket({
        userId: user?.id || null,
        onNotification: (data) => {
            console.log('🔔 New notification via WebSocket:', data);
            loadNotifications();
            toast.info(data.title || 'Новое уведомление');
        },
        onUnreadCountUpdate: (count) => {
            console.log('🔔 Unread count update via WebSocket:', count);
            setNotifCount(count);
        },
        onConnected: () => {
            console.log('🔔 WebSocket connected - notifications will be real-time');
        },
        onDisconnected: () => {
            console.log('🔔 WebSocket disconnected - will try to reconnect');
        }
    });

    // WebRTC Service Initialization (Global Online Status & Calls)
    useEffect(() => {
        if (user?.id) {
            webrtcService.initialize(user.id).catch(err => {
                console.error('Failed to initialize WebRTC globally:', err);
            });

            // Global Incoming Call Handler
            const handleIncomingCall = async (fromUserId: number, callType: CallType) => {
                webrtcService.playRingtone('incoming');

                // Fetch caller name
                let callerName = t('common:user', 'Пользователь');
                try {
                    const profile = await api.getUserProfile(fromUserId);
                    callerName = profile.full_name || profile.username || callerName;
                } catch (err) {
                    console.error('Failed to fetch caller profile:', err);
                }

                setIncomingCall({ from: fromUserId, type: callType, name: callerName });

                // Also show a toast as backup
                if (!location.pathname.includes('/internal-chat')) {
                    toast.info(t('calls.incoming_call', 'Входящий звонок!'), {
                        description: `${callerName}: ${callType === 'video' ? t('calls.video_call') : t('calls.audio_call')}`,
                        duration: 30000,
                    });
                }
            };

            const handleStopRinging = () => {
                webrtcService.stopRingtone();
                setIncomingCall(null);
            };

            webrtcService.addEventListener('incomingCall', handleIncomingCall);
            webrtcService.addEventListener('callAccepted', handleStopRinging);
            webrtcService.addEventListener('callRejected', handleStopRinging);
            webrtcService.addEventListener('callEnded', handleStopRinging);

            return () => {
                webrtcService.removeEventListener('incomingCall', handleIncomingCall);
                webrtcService.removeEventListener('callAccepted', handleStopRinging);
                webrtcService.removeEventListener('callRejected', handleStopRinging);
                webrtcService.removeEventListener('callEnded', handleStopRinging);
            };
        }
    }, [user?.id, t, location.pathname]);

    // Handle 404 Dynamic Import Errors (Common during deployment)
    useEffect(() => {
        const handleError = (e: ErrorEvent | PromiseRejectionEvent) => {
            const message = (e instanceof ErrorEvent) ? e.message : e.reason?.message;
            if (message && (message.includes('Failed to fetch dynamically imported module') || message.includes('error loading dynamically imported module'))) {
                console.log('🔄 Detected dynamic import error (likely new version). Reloading...');
                window.location.reload();
            }
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleError);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleError);
        };
    }, []);

    useEffect(() => {
        // Загружаем все данные параллельно для ускорения загрузки
        Promise.all([
            loadEnabledMessengers(),
            loadSalonSettings(),
            loadUserProfile(),
            loadMenuSettings(),
            loadNotifications(),
            loadUnreadCount()
        ]).catch(error => {
            console.error('Error loading initial data:', error);
        });

        // Слушаем событие для немедленного обновления уведомлений
        const handleNotificationsUpdate = () => {
            loadNotifications();
        };
        window.addEventListener('notifications-updated', handleNotificationsUpdate);


        const handleMessengersUpdate = () => {
            loadEnabledMessengers();
        };
        const handleProfileUpdate = () => {
            loadUserProfile();
        };
        window.addEventListener('messengers-updated', handleMessengersUpdate);
        window.addEventListener('profile-updated', handleProfileUpdate);

        return () => {
            window.removeEventListener('messengers-updated', handleMessengersUpdate);
            window.removeEventListener('profile-updated', handleProfileUpdate);
            window.removeEventListener('notifications-updated', handleNotificationsUpdate);
        };
    }, [user?.role]);

    // Auto-scroll to expanded menu
    useEffect(() => {
        if (expandedMenu && expandedMenuRef.current && navContainerRef.current) {
            const submenu = expandedMenuRef.current;
            const container = navContainerRef.current;

            // Wait a bit for the animation to finish
            setTimeout(() => {
                const rect = submenu.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                if (rect.bottom > containerRect.bottom) {
                    submenu.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 300);
        }
    }, [expandedMenu]);

    const loadEnabledMessengers = async () => {
        try {
            const response = await api.getEnabledMessengers();
            console.log('Enabled messengers response:', response);
            const messengers = response?.enabled_messengers || [];
            console.log('Setting enabled messengers:', messengers);
            setEnabledMessengers(messengers);
        } catch (err) {
            console.error('Failed to load enabled messengers:', err);
            setEnabledMessengers([]);
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

                // Для сотрудников загружаем также employee profile для фото
                if (user.role === 'employee') {
                    try {
                        const empProfile = await api.getMyEmployeeProfile();
                        // Only use employee photo if it exists and is not empty
                        const photo = empProfile?.photo && empProfile.photo.trim() !== ''
                            ? empProfile.photo
                            : profile.photo;
                        setUserProfile({ ...profile, photo });
                    } catch (empErr) {
                        console.log('Employee profile not available:', empErr);
                        setUserProfile(profile);
                    }
                } else {
                    setUserProfile(profile);
                }
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

    const handleNotificationClick = (notif: any) => {
        setSelectedNotification(notif);
        setShowNotificationModal(true);
        setShowNotifDropdown(false);
        if (!notif.is_read) {
            markNotificationRead(notif.id);
        }
    };

    const handleDeleteNotification = async (id: number, event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            await api.deleteNotification(id);
            setNotifications(notifications.filter(n => n.id !== id));
            setNotifCount(prev => Math.max(0, prev - 1));
            toast.success(t('notification_deleted'));
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error(t('error_deleting_notification'));
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm(t('confirm_clear_all'))) {
            return;
        }
        try {
            await api.clearAllNotifications();
            setNotifications([]);
            setNotifCount(0);
            toast.success(t('all_notifications_cleared'));
        } catch (error) {
            console.error('Error clearing notifications:', error);
            toast.error(t('error_clearing'));
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
            // TOP LEVEL - Reordered as requested
            {
                id: 'dashboard',
                icon: LayoutDashboard,
                label: user?.role === 'employee' ? t('menu.my_bookings') :
                    user?.role === 'sales' ? t('menu.dashboard_sales') :
                        user?.role === 'marketer' ? t('menu.analytics') : t('menu.dashboard'),
                path: dashboardPath,
                requirePermission: () => true
            },
            { id: 'bookings', icon: FileText, label: t('menu.bookings'), path: `${rolePrefix}/bookings`, requirePermission: () => permissions.canViewAllBookings || permissions.canCreateBookings || user?.role === 'employee' },
            { id: 'clients', icon: Users, label: t('menu.clients'), path: `${rolePrefix}/clients`, requirePermission: () => permissions.canViewAllClients && user?.role !== 'sales' },
            {
                id: 'chat',
                icon: MessageSquare,
                label: t('menu.chat'),
                path: `${rolePrefix}/chat`,
                badge: unreadCount,
                requirePermission: () => permissions.canViewInstagramChat || permissions.roleLevel >= 70 || user?.role === 'sales' || permissions.canUseStaffChat,
                items: [
                    ...enabledMessengers.map(messenger => ({
                        id: `chat-${messenger.type}`,
                        icon: messenger.type === 'instagram' ? (props: any) => <InstagramIcon {...props} colorful={true} /> :
                            messenger.type === 'telegram' ? (props: any) => <TelegramIcon {...props} colorful={true} /> :
                                messenger.type === 'whatsapp' ? (props: any) => <WhatsAppIcon {...props} colorful={true} /> :
                                    messenger.type === 'tiktok' ? (props: any) => <TikTokIcon {...props} colorful={true} /> : MessageSquare,
                        label: messenger.name,
                        path: `${rolePrefix}/chat?messenger=${messenger.type}`,
                        requirePermission: () => permissions.canViewInstagramChat || permissions.roleLevel >= 70 || user?.role === 'sales'
                    })),
                    {
                        id: 'internal-chat',
                        icon: MessageCircle,
                        label: t('menu.internal_chat'),
                        path: `${rolePrefix}/internal-chat`,
                        requirePermission: () => permissions.canUseStaffChat
                    }
                ]
            },
            { id: 'calendar', icon: Calendar, label: t('menu.calendar'), path: `${rolePrefix}/calendar`, requirePermission: () => permissions.canViewAllCalendars && user?.role !== 'employee' },
            { id: 'funnel', icon: Filter, label: t('menu.funnel'), path: `${rolePrefix}/funnel`, requirePermission: () => permissions.canViewAnalytics || user?.role === 'sales' },

            // MANAGEMENT GROUP
            {
                id: 'management',
                icon: Briefcase,
                label: t('menu.management'),
                requirePermission: () => true,
                items: [
                    { id: 'services', icon: Scissors, label: t('menu.services'), path: `${rolePrefix}/services`, requirePermission: () => permissions.canViewServices },
                    { id: 'service-requests', icon: Scissors, label: t('menu.service_requests', 'Запросы услуг'), path: `${rolePrefix}/service-change-requests`, requirePermission: () => permissions.roleLevel >= 80 },
                    { id: 'products', icon: Package, label: t('menu.products'), path: `${rolePrefix}/products`, requirePermission: () => permissions.canViewServices },
                ]
            },
            // ANALYTICS GROUP
            {
                id: 'analytics-group',
                icon: BarChart3,
                label: t('menu.analytics'),
                requirePermission: () => true,
                items: [
                    { id: 'analytics', icon: BarChart3, label: t('menu.analytics'), path: `${rolePrefix}/analytics`, requirePermission: () => permissions.canViewAnalytics && user?.role !== 'marketer' && user?.role !== 'sales' },
                    { id: 'visitors', icon: MapPinned, label: t('menu.visitors'), path: `${rolePrefix}/visitor-analytics`, requirePermission: () => permissions.canViewAnalytics },
                ]
            },
            // FINANCE GROUP
            {
                id: 'finance',
                icon: Receipt,
                label: t('menu.finance', 'Финансы'),
                requirePermission: () => true,
                items: [
                    { id: 'invoices', icon: Receipt, label: t('menu.invoices'), path: `${rolePrefix}/invoices`, requirePermission: () => permissions.canViewAllClients || user?.role === 'sales' || user?.role === 'manager' },
                    { id: 'contracts', icon: FileSignature, label: t('menu.contracts'), path: `${rolePrefix}/contracts`, requirePermission: () => permissions.canViewAllClients || user?.role === 'sales' || user?.role === 'manager' },
                ]
            },
            // TOOLS GROUP
            {
                id: 'tools',
                icon: Package,
                label: t('menu.tools'),
                requirePermission: () => true,
                items: [
                    { id: 'tasks', icon: CheckSquare, label: t('menu.tasks'), path: `${rolePrefix}/tasks`, requirePermission: () => permissions.canViewTasks || permissions.roleLevel >= 70 || user?.role === 'sales' || user?.role === 'marketer' || user?.role === 'manager' },
                    { id: 'broadcasts', icon: Send, label: t('menu.broadcasts'), path: `${rolePrefix}/broadcasts`, requirePermission: () => permissions.canSendBroadcasts || user?.role === 'sales' },
                    { id: 'telephony', icon: Phone, label: t('menu.telephony'), path: `${rolePrefix}/telephony`, requirePermission: () => permissions.roleLevel >= 80 || user?.role === 'sales' },
                ]
            },
            // INTEGRATIONS GROUP
            {
                id: 'integrations',
                icon: Link,
                label: t('menu.integrations'),
                requirePermission: () => (permissions.roleLevel >= 70 || user?.role === 'sales'),
                items: [
                    { id: 'messengers', icon: MessageSquare, label: t('menu.messengers'), path: `${rolePrefix}/messengers`, requirePermission: () => (permissions.canViewSettings || user?.role === 'sales') },
                    { id: 'payment', icon: CreditCard, label: t('menu.payment_integrations'), path: `${rolePrefix}/payment-integrations`, requirePermission: () => (permissions.roleLevel >= 70 || user?.role === 'sales') },
                    { id: 'marketplace', icon: Store, label: t('menu.marketplace_integrations'), path: `${rolePrefix}/marketplace-integrations`, requirePermission: () => (permissions.roleLevel >= 70 || user?.role === 'sales') },
                ]
            },
            // SETTINGS GROUP
            {
                id: 'settings',
                icon: Settings,
                label: t('menu.settings'),
                requirePermission: () => true,
                items: [
                    { id: 'app-settings', icon: Settings, label: t('menu.settings'), path: `${rolePrefix}/settings`, requirePermission: () => (permissions.canViewSettings || user?.role === 'manager' || user?.role === 'sales' || user?.role === 'marketer') && user?.role !== 'employee' },
                    { id: 'employee-settings', icon: Settings, label: t('menu.settings'), path: `${rolePrefix}/profile`, requirePermission: () => user?.role === 'employee' },
                    { id: 'users', icon: UserCog, label: t('menu.users'), path: `${rolePrefix}/users`, requirePermission: () => permissions.canViewAllUsers },
                    { id: 'public-content', icon: Globe, label: t('menu.public_content'), path: `${rolePrefix}/public-content`, requirePermission: () => permissions.canViewSettings && permissions.roleLevel >= 80 },
                    { id: 'bot-settings', icon: Bot, label: t('menu.bot_settings'), path: `${rolePrefix}/bot-settings`, requirePermission: () => permissions.canViewBotSettings || user?.role === 'sales' },
                    { id: 'audit', icon: ShieldCheck, label: t('menu.audit_log'), path: `${rolePrefix}/audit-log`, requirePermission: () => permissions.roleLevel >= 80 },
                    { id: 'trash', icon: Trash2, label: t('menu.trash'), path: `${rolePrefix}/trash`, requirePermission: () => permissions.roleLevel >= 80 },
                ]
            }
        ];

        // Рекурсивная фильтрация с "выравниванием" (flattening)
        // Но группа 'chat' никогда не схлопывается - всегда показывается как группа
        const filterItems = (items: any[]) => {
            return items.reduce((acc, item) => {
                if (item.requirePermission && !item.requirePermission()) return acc;

                if (item.items) {
                    const filteredChildren = filterItems(item.items);
                    // Группа 'chat' всегда остаётся группой (не схлопывается)
                    if (filteredChildren.length === 1 && item.id !== 'chat') {
                        // Если доступен только один подпункт, выводим его как родительский
                        acc.push(filteredChildren[0]);
                    } else if (filteredChildren.length >= 1) {
                        acc.push({ ...item, items: filteredChildren });
                    }
                } else {
                    acc.push(item);
                }
                return acc;
            }, []);
        };

        const filtered = filterItems(allItems);

        // TODO: Восстановить сортировку menuSettings, если необходимо для групп
        return filtered;
    }, [permissions, unreadCount, menuSettings, t, rolePrefix, user?.role, enabledMessengers, dashboardPath]);

    const getRoleLabel = () => {
        switch (user?.role) {
            case 'director': return t('roles.director');
            case 'admin': return t('admin');
            case 'manager': return t('manager');
            case 'sales': return t('roles.sales');
            case 'marketer': return t('roles.marketer');
            case 'employee': return t('employee');
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
                                {salonSettings?.logo_url && (
                                    <img
                                        src={salonSettings.logo_url}
                                        alt={salonSettings?.name || 'Logo'}
                                        className="w-10 h-10 rounded-lg object-contain shadow-sm"
                                    />
                                )}
                            </div>
                            <div className="min-w-0">
                                <span className="text-sm text-gray-900 block font-semibold truncate leading-tight">
                                    {salonSettings?.name || t('crm')}
                                </span>
                                <span className="text-xs text-gray-500">{getRoleLabel()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <nav ref={navContainerRef} className="flex-1 overflow-y-auto p-3">
                        <ul className="space-y-1">
                            {menuItems.map((item: any, index: number) => {
                                const isExpanded = expandedMenu === item.id;
                                const isActive = item.path ? location.pathname.startsWith(item.path) : false;
                                // Check if any child is active
                                const isChildActive = item.items?.some((sub: any) => location.pathname.startsWith(sub.path));

                                return (
                                    <li key={item.id || index}>
                                        {item.items ? (
                                            <div>
                                                <button
                                                    ref={(isActive || isChildActive) ? activeMenuItemRef : null}
                                                    onClick={() => setExpandedMenu(isExpanded ? null : item.id)}
                                                    className={`
                                                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm
                                                    transition-all duration-200 relative
                                                    ${isChildActive || isActive
                                                            ? 'bg-blue-50 text-blue-700 font-medium'
                                                            : 'text-gray-700 hover:bg-gray-100'
                                                        }
                                                `}
                                                >
                                                    <item.icon size={18} />
                                                    <span className="flex-1 text-left">{item.label}</span>
                                                    <ChevronDown
                                                        size={16}
                                                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                    />
                                                    {item.badge != null && Number(item.badge) > 0 && (
                                                        <span className="absolute right-10 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                                                            {Number(item.badge) > 99 ? '99+' : item.badge}
                                                        </span>
                                                    )}
                                                </button>

                                                {/* Submenu Items */}
                                                {isExpanded && (
                                                    <ul ref={expandedMenuRef} className="mt-1 ml-4 border-l border-gray-200 pl-4 space-y-1">
                                                        {item.items.map((subItem: any, subIndex: number) => {
                                                            const isSubActive = location.pathname.startsWith(subItem.path) ||
                                                                (subItem.path.includes('?') && location.search.includes(subItem.path.split('?')[1]));

                                                            return (
                                                                <li key={subItem.id || subIndex}>
                                                                    <button
                                                                        onClick={() => {
                                                                            navigate(subItem.path);
                                                                            setIsMobileMenuOpen(false);
                                                                        }}
                                                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 
                                                                        ${isSubActive
                                                                                ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-sm'
                                                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                                            }`}
                                                                    >
                                                                        <subItem.icon size={16} />
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
                                                ref={isActive ? activeMenuItemRef : null}
                                                onClick={() => {
                                                    navigate(item.path);
                                                    setIsMobileMenuOpen(false);
                                                }}
                                                className={`
                                                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm
                                                transition-all duration-200 relative
                                                ${isActive
                                                        ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-md'
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
                                );
                            })}
                        </ul>
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-gray-200">
                        {/* Notifications Button (for all roles) */}
                        <div className="relative mb-4">
                            <button
                                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
                            >
                                <Bell size={18} />
                                <span>{t('menu.notifications')}</span>
                                {notifCount > 0 && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {notifCount}
                                    </span>
                                )}
                            </button>

                            {showNotifDropdown && (
                                <div className="absolute bottom-full left-0 w-72 mb-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                                    <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-pink-50 flex justify-between items-center">
                                        <span className="font-semibold text-sm text-gray-900">{t('notifications')}</span>
                                        <button
                                            onClick={() => setShowNotifDropdown(false)}
                                            className="text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`p-3 border-b border-gray-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-pink-50 cursor-pointer transition-all group ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        {!n.is_read && (
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-semibold text-gray-900 line-clamp-2">{n.title}</p>
                                                            <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{n.message}</p>
                                                            <span className="text-[9px] text-gray-400 mt-1 block">
                                                                {new Date(n.created_at).toLocaleString('ru-RU', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {!n.is_read && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); markNotificationRead(n.id); }}
                                                                    className="text-gray-400 hover:text-blue-500 p-1"
                                                                    title={t('mark_as_read')}
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => handleDeleteNotification(n.id, e)}
                                                                className="text-gray-400 hover:text-red-500 p-1"
                                                                title={t('common:delete')}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-xs text-gray-400">
                                                <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                                                {t('no_new_notifications')}
                                            </div>
                                        )}
                                    </div>
                                    {notifications.length > 0 && (
                                        <div className="p-2 border-t border-gray-100 bg-gray-50 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setShowNotifDropdown(false);
                                                    navigate(`${rolePrefix}/notifications`);
                                                }}
                                                className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                {t('view_all')}
                                            </button>
                                            <button
                                                onClick={handleClearAll}
                                                className="flex-1 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                {t('clear_all')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                const profilePath = `${rolePrefix}/profile`;
                                navigate(profilePath);
                                setIsMobileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 mb-3 p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                            {userProfile?.photo ? (
                                <img
                                    src={getPhotoUrl(userProfile.photo) || ''}
                                    alt={userProfile.full_name}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-100 shadow-sm"
                                />
                            ) : (
                                <img
                                    src={getDynamicAvatar(
                                        userProfile?.full_name || user?.full_name || t('user'),
                                        'warm',
                                        user?.role === 'employee' || userProfile?.gender === 'female' ? 'female' : 'male'
                                    )}
                                    alt={userProfile?.full_name}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-100 shadow-sm"
                                />
                            )}
                            <div className="flex-1 overflow-hidden">
                                <span className="text-sm font-semibold text-gray-900 block truncate">
                                    {userProfile?.full_name || user?.full_name || t('user')}
                                </span>
                                <span className="text-[10px] text-gray-500 capitalize leading-tight">@{user?.username || 'user'}</span>
                            </div>
                        </button>

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

            {/* Notification Detail Modal */}
            {showNotificationModal && selectedNotification && (
                <div
                    className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
                    onClick={() => setShowNotificationModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-pink-50">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-gray-900">{selectedNotification.title}</h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {new Date(selectedNotification.created_at).toLocaleString('ru-RU', {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowNotificationModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {selectedNotification.message}
                            </p>
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                            <button
                                onClick={() => setShowNotificationModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                {t('close', 'Закрыть')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Global Incoming Call Modal */}
            {incomingCall && (
                <IncomingCallModal
                    callerName={incomingCall.name}
                    callerId={incomingCall.from}
                    callType={incomingCall.type}
                    onAccept={() => {
                        webrtcService.stopRingtone();
                        setIncomingCall(null);
                        navigate(`${rolePrefix}/internal-chat?answer=true&from=${incomingCall.from}&type=${incomingCall.type}`);
                    }}
                    onReject={() => {
                        webrtcService.rejectCall();
                        webrtcService.stopRingtone();
                        setIncomingCall(null);
                    }}
                />
            )}
        </div>
    );
}
