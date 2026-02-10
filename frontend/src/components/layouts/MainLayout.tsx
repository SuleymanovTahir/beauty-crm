import { useEffect, useState, useMemo, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useNotificationsWebSocket } from '../../hooks/useNotificationsWebSocket';
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
    Menu,
    ChevronDown,
    Filter,
    MessageCircle,
    Package,
    Receipt,
    Briefcase,
    Link,
    CheckSquare,
    Send,
    Phone,
    Trash2,
    ShieldCheck,
    Globe,
    Bot,
    CreditCard,
    Store,
    Bell,
    Ticket,
    Gift
} from 'lucide-react';
import { TelegramIcon, InstagramIcon } from '../icons/SocialIcons';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { usePermissions } from '../../utils/permissions';
import { webrtcService, CallType } from '../../services/webrtc';

interface MainLayoutProps {
    user: { id: number; role: string; secondary_role?: string; full_name: string; username?: string } | null;
    onLogout: () => void;
}

export default function MainLayout({ user, onLogout }: MainLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation(['layouts/mainlayout', 'common']);

    const [incomingCall, setIncomingCall] = useState<{
        from: number;
        type: 'audio' | 'video';
        callerName?: string;
        callerPhoto?: string;
    } | null>(null);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
    const [enabledMessengers, setEnabledMessengers] = useState<Array<{ type: string; name: string }>>([]);
    const [menuSettings, setMenuSettings] = useState<{ menu_order: any[] | null; hidden_items: string[] | null } | null>(null);
    const [salonSettings, setSalonSettings] = useState<{ name?: string; logo_url?: string } | null>(null);
    const [users, setUsers] = useState<any[]>([]);

    const permissions = usePermissions(user?.role || 'employee', user?.secondary_role);

    const rolePrefix = useMemo(() => {
        const path = location.pathname;
        if (path.startsWith('/crm')) return '/crm';
        if (path.startsWith('/manager')) return '/manager';
        if (path.startsWith('/saler')) return '/saler';
        if (path.startsWith('/marketer')) return '/marketer';
        if (path.startsWith('/employee')) return '/employee';
        return '/crm';
    }, [location.pathname]);

    const dashboardPath = useMemo(() => {
        if (user?.role === 'saler') return `${rolePrefix}/clients`;
        if (user?.role === 'marketer') return `${rolePrefix}/analytics`;
        return `${rolePrefix}/dashboard`;
    }, [user?.role, rolePrefix]);

    useNotificationsWebSocket({
        userId: user?.id || null,
        onNotification: () => {
            loadUnreadCount();
            toast.info('Новое уведомление');
        },
        onUnreadCountUpdate: () => loadUnreadCount()
    });

    const handleStopRinging = useCallback(() => {
        webrtcService.stopRingtone();
        setIncomingCall(null);
    }, []);

    const handleAcceptCall = useCallback(() => {
        if (incomingCall) {
            webrtcService.stopRingtone();
            setIncomingCall(null);
            navigate(`${rolePrefix}/internal-chat?answer=true&from=${incomingCall.from}&type=${incomingCall.type}`);
        }
    }, [incomingCall, navigate, rolePrefix]);

    const handleIncomingCall = useCallback((fromId: number, type: CallType, _status: string, name?: string, photo?: string, dndActive?: boolean) => {
        const caller = users.find(u => u.id === fromId);
        const finalCallerName = name || caller?.full_name || caller?.username || 'Пользователь';

        if (dndActive) return;

        webrtcService.playRingtone('incoming');
        setIncomingCall({ from: fromId, type, callerName: finalCallerName, callerPhoto: photo });

        toast.info('Входящий звонок!', {
            description: `${finalCallerName}`,
            action: { label: 'Принять', onClick: handleAcceptCall }
        });
    }, [users, handleAcceptCall]);

    useEffect(() => {
        if (user?.id) {
            webrtcService.initialize(user.id);
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
    }, [user?.id, handleIncomingCall, handleStopRinging]);

    useEffect(() => {
        loadMenuSettings();
        loadSalonSettings();
        loadEnabledMessengers();
        loadUnreadCount();
        const loadInitialData = async () => {
            try {
                const fetchedUsers = await api.getUsers('ru');
                setUsers(fetchedUsers);
            } catch (error) { console.error(error); }
        };
        loadInitialData();
    }, [user?.role]);

    const loadMenuSettings = async () => {
        try {
            const settings = await api.getMenuSettings();
            setMenuSettings(settings);
        } catch (error) { console.error(error); }
    };

    const loadEnabledMessengers = async () => {
        try {
            const response = await api.getEnabledMessengers();
            setEnabledMessengers(response?.enabled_messengers || []);
        } catch (err) { console.error(err); }
    };

    const loadSalonSettings = async () => {
        try {
            const settings = await api.getSalonSettings();
            setSalonSettings(settings);
        } catch (err) { console.error(err); }
    };

    const loadUnreadCount = async () => {
        try {
            const data = await api.getTotalUnread();
            setUnreadCount(data.total || 0);
        } catch (error) { console.error(error); }
    };

    const handleLogout = async () => {
        localStorage.removeItem('session_token');
        onLogout();
        navigate('/login');
    };

    const menuItems = useMemo(() => {
        const itemMetadata: Record<string, any> = {
            'dashboard': { icon: LayoutDashboard, label: t('menu.dashboard'), path: dashboardPath, req: () => true },
            'bookings': { icon: FileText, label: t('menu.bookings'), path: `${rolePrefix}/bookings`, req: () => permissions.canViewAllBookings || permissions.canCreateBookings || user?.role === 'employee' },
            'clients': { icon: Users, label: t('menu.clients'), path: `${rolePrefix}/clients`, req: () => permissions.canViewAllClients && user?.role !== 'saler' },
            'chat-group': { icon: MessageSquare, label: t('menu.chat'), req: () => true },
            'chat': { icon: MessageSquare, label: t('menu.chat'), path: `${rolePrefix}/chat`, badge: unreadCount, req: () => permissions.canViewInstagramChat || permissions.roleLevel >= 70 || user?.role === 'saler' || permissions.canUseStaffChat },
            'internal-chat': { icon: MessageCircle, label: t('menu.internal_chat'), path: `${rolePrefix}/internal-chat`, req: () => permissions.canUseStaffChat },
            'calendar': { icon: Calendar, label: t('menu.calendar'), path: `${rolePrefix}/calendar`, req: () => permissions.canViewAllCalendars && user?.role !== 'employee' },
            'funnel': { icon: Filter, label: t('menu.funnel'), path: `${rolePrefix}/funnel`, req: () => permissions.canViewAnalytics || user?.role === 'saler' },
            'catalog-group': { icon: Package, label: t('menu.catalog'), req: () => true },
            'services': { icon: Scissors, label: t('menu.services'), path: `${rolePrefix}/services`, req: () => permissions.canViewServices },
            'products': { icon: Package, label: t('menu.products'), path: `${rolePrefix}/products`, req: () => permissions.canViewServices },
            'service-requests': { icon: FileText, label: t('menu.service_requests'), path: `${rolePrefix}/service-change-requests`, req: () => permissions.canViewServices },
            'analytics-group': { icon: BarChart3, label: t('menu.analytics'), req: () => true },
            'analytics': { icon: BarChart3, label: t('menu.analytics'), path: `${rolePrefix}/analytics`, req: () => permissions.canViewAnalytics },
            'visitors': { icon: Users, label: t('menu.visitors'), path: `${rolePrefix}/visitor-analytics`, req: () => permissions.canViewAnalytics },
            'finance-group': { icon: Receipt, label: t('menu.finance'), req: () => true },
            'invoices': { icon: FileText, label: t('menu.invoices'), path: `${rolePrefix}/invoices`, req: () => true },
            'contracts': { icon: FileText, label: t('menu.contracts'), path: `${rolePrefix}/contracts`, req: () => true },
            'tools-group': { icon: Package, label: t('menu.tools'), req: () => true },
            'tasks': { icon: CheckSquare, label: t('menu.tasks'), path: `${rolePrefix}/tasks`, req: () => true },
            'broadcasts': { icon: Send, label: t('menu.broadcasts'), path: `${rolePrefix}/broadcasts`, req: () => true },
            'promo-codes': { icon: Ticket, label: t('menu.promo_codes', 'Промокоды'), path: `${rolePrefix}/promo-codes`, req: () => permissions.roleLevel >= 70 },
            'loyalty': { icon: Gift, label: t('menu.loyalty', 'Лояльность'), path: `${rolePrefix}/loyalty`, req: () => permissions.roleLevel >= 70 },
            'telephony': { icon: Phone, label: t('menu.telephony'), path: `${rolePrefix}/telephony`, req: () => true },
            'integrations-group': { icon: Link, label: t('menu.integrations'), req: () => true },
            'messengers': { icon: MessageSquare, label: t('menu.messengers'), path: `${rolePrefix}/messengers`, req: () => true },
            'payment-integrations': { icon: CreditCard, label: t('menu.payments'), path: `${rolePrefix}/payment-integrations`, req: () => true },
            'marketplace-integrations': { icon: Store, label: t('menu.marketplaces'), path: `${rolePrefix}/marketplace-integrations`, req: () => true },
            'settings-group': { icon: Settings, label: t('menu.settings'), req: () => true },
            'app-settings': { icon: Settings, label: t('menu.settings'), path: `${rolePrefix}/settings`, req: () => permissions.canViewSettings || user?.role === 'manager' },
            'users': { icon: UserCog, label: t('menu.users'), path: `${rolePrefix}/users`, req: () => permissions.canViewAllUsers },
            'public-content': { icon: Globe, label: t('menu.public_content'), path: `${rolePrefix}/public-content`, req: () => true },
            'bot-settings': { icon: Bot, label: t('menu.bot_settings'), path: `${rolePrefix}/bot-settings`, req: () => true },
            'audit-log': { icon: ShieldCheck, label: t('menu.audit_log'), path: `${rolePrefix}/audit-log`, req: () => permissions.roleLevel >= 90 },
            'trash': { icon: Trash2, label: t('menu.trash'), path: `${rolePrefix}/trash`, req: () => permissions.roleLevel >= 90 },
        };

        const messengerSubItems = enabledMessengers.map(m => ({
            id: `chat-${m.type}`,
            icon: m.type === 'instagram' ? InstagramIcon : m.type === 'telegram' ? TelegramIcon : MessageSquare,
            label: m.name,
            path: `${rolePrefix}/chat?messenger=${m.type}`,
            req: () => true
        }));

        const augmentItem = (item: any): any => {
            const meta = itemMetadata[item.id] || {};
            const augmented: any = {
                ...item,
                icon: meta.icon || (item.type === 'group' ? Briefcase : Link),
                label: item.label || meta.label || item.id,
                path: item.path || meta.path,
                req: meta.req || (() => true),
                badge: meta.badge
            };

            // Special handling for legacy chat subitems injection
            if (item.id === 'chat' || item.id === 'chat-group') {
                const subItems = [...messengerSubItems, { id: 'internal-chat', ...itemMetadata['internal-chat'] }];
                if (item.type === 'group') {
                    augmented.items = [...(item.children || []).map(augmentItem), ...subItems].filter((c: any) => c.visible !== false && c.req());
                } else {
                    augmented.items = subItems;
                }
            } else if (item.children) {
                augmented.items = item.children.map(augmentItem).filter((c: any) => c.visible !== false && c.req());
            }
            return augmented;
        };

        if (menuSettings?.menu_order && menuSettings.menu_order.length > 0 && typeof menuSettings.menu_order[0] === 'object') {
            return menuSettings.menu_order.map(augmentItem).filter(i => i.visible !== false && i.req());
        }

        // Default structure (fallback if no settings in DB)
        return [
            augmentItem({ id: 'dashboard' }),
            augmentItem({ id: 'bookings' }),
            augmentItem({ id: 'clients' }),
            augmentItem({ id: 'chat-group', type: 'group', children: [] }),
            augmentItem({ id: 'calendar' }),
            augmentItem({ id: 'funnel' }),
            augmentItem({ id: 'catalog-group', type: 'group', children: [{ id: 'services' }, { id: 'service-requests' }, { id: 'products' }] }),
            augmentItem({ id: 'analytics-group', type: 'group', children: [{ id: 'analytics' }, { id: 'visitors' }] }),
            augmentItem({ id: 'finance-group', type: 'group', children: [{ id: 'invoices' }, { id: 'contracts' }] }),
            augmentItem({ id: 'tools-group', type: 'group', children: [{ id: 'tasks' }, { id: 'broadcasts' }, { id: 'telephony' }] }),
            augmentItem({ id: 'integrations-group', type: 'group', children: [{ id: 'messengers' }, { id: 'payment-integrations' }, { id: 'marketplace-integrations' }] }),
            augmentItem({ id: 'settings-group', type: 'group', children: [{ id: 'app-settings' }, { id: 'users' }, { id: 'public-content' }, { id: 'bot-settings' }, { id: 'audit-log' }, { id: 'trash' }] }),
        ].filter(i => i.req());
    }, [permissions, unreadCount, menuSettings, t, rolePrefix, user?.role, enabledMessengers, dashboardPath]);

    const getRoleLabel = () => {
        switch (user?.role) {
            case 'director': return t('roles.director');
            case 'admin': return t('admin');
            default: return user?.role;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600 font-bold">
                                {salonSettings?.name?.[0] || 'C'}
                            </div>
                            <div className="min-w-0">
                                <span className="text-sm font-semibold truncate block">{salonSettings?.name || 'Beauty CRM'}</span>
                                <span className="text-xs text-gray-500">{getRoleLabel()}</span>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 overflow-y-auto p-3">
                        <ul className="space-y-1">
                            {menuItems.map((item: any) => {
                                const isExpanded = expandedMenu === item.id;
                                return (
                                    <li key={item.id}>
                                        {item.items && item.items.length > 0 ? (
                                            <div>
                                                <button onClick={() => setExpandedMenu(isExpanded ? null : item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-100`}>
                                                    <item.icon size={18} />
                                                    <span className="flex-1 text-left">{item.label}</span>
                                                    <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isExpanded && (
                                                    <ul className="mt-1 ml-4 border-l border-gray-200 pl-4 space-y-1">
                                                        {item.items.map((sub: any) => (
                                                            <li key={sub.id}>
                                                                <button onClick={() => navigate(sub.path)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                                                                    <sub.icon size={16} />
                                                                    <span>{sub.label}</span>
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ) : (
                                            <button onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                                                <item.icon size={18} />
                                                <span>{item.label}</span>
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    <div className="p-4 border-t border-gray-100 flex flex-col gap-4 mt-auto">
                        <button
                            onClick={() => navigate(`${rolePrefix}/notifications`)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group"
                        >
                            <span className="relative">
                                <Bell size={18} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </span>
                            <span className="font-medium">{t('menu.notifications') || 'Уведомления'}</span>
                        </button>

                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/50 rounded-2xl border border-gray-50">
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm overflow-hidden ring-2 ring-blue-50">
                                <img src={getDynamicAvatar(user?.full_name || 'User')} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-gray-900 truncate">{user?.full_name || 'Admin'}</span>
                                <span className="text-xs text-gray-500 truncate font-medium">@{user?.username || 'Admin'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <div className="flex-1">
                                <LanguageSwitcher />
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                            >
                                <LogOut size={18} />
                                <span className="font-bold">{t('common:logout')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {!isMobileMenuOpen && (
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="lg:hidden fixed top-4 left-4 p-2 bg-white rounded-lg shadow-md text-gray-600 z-40 border border-gray-100"
                    >
                        <Menu size={24} />
                    </button>
                )}
                <div className="flex-1 overflow-y-auto bg-gray-50/50 relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
