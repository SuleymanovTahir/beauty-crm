import { useEffect, useState, useMemo } from 'react';
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
    ChevronDown,
    ChevronRight,
    X,
    Filter,
    MessageCircle,
    Package,
    Receipt,
    Briefcase,
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
    Gift,
    Award,
    Target,
    MoreHorizontal,
    Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { usePermissions } from '../../utils/permissions';
import { webrtcService } from '../../services/webrtc';
import { cn } from '../../lib/utils';
import './MainLayout.css';

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

    const [showMoreModal, setShowMoreModal] = useState(false);
    const [showChatMenu, setShowChatMenu] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
    const [mobileExpandedGroups, setMobileExpandedGroups] = useState<Set<string>>(new Set());
    const [menuSettings, setMenuSettings] = useState<{ menu_order: any[] | null; hidden_items: string[] | null } | null>(null);
    const [salonSettings, setSalonSettings] = useState<{ name?: string; logo_url?: string } | null>(null);

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

    useEffect(() => {
        loadUnreadCount();
        loadEnabledMessengers();
        loadMenuSettings();
        loadSalonSettings();

        webrtcService.onIncomingCall = (fromId: number, type: 'audio' | 'video', _status?: string, name?: string, photo?: string) => {
            setIncomingCall({ from: fromId, type, callerName: name, callerPhoto: photo });
        };

        return () => {
            webrtcService.onIncomingCall = null;
        };
    }, []);

    const loadUnreadCount = async () => {
        try {
            const data = await api.getUnreadCount();
            setUnreadCount(data.total || 0);
        } catch (err) {
            console.error('Failed to load unread count:', err);
        }
    };

    const loadEnabledMessengers = async () => {
        try {
            await api.getEnabledMessengers();
        } catch (err) {
            console.error('Failed to load enabled messengers:', err);
        }
    };

    const loadMenuSettings = async () => {
        try {
            const settings = await api.getMenuSettings();
            setMenuSettings(settings);
        } catch (err) {
            console.error('Failed to load menu settings:', err);
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

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    const getRoleLabel = () => {
        switch (user?.role) {
            case 'director': return t('roles.director');
            case 'admin': return t('roles.admin');
            case 'manager': return t('roles.manager');
            case 'saler': return t('roles.saler');
            case 'marketer': return t('roles.marketer');
            default: return t('roles.employee');
        }
    };

    const allMenuItems: any[] = useMemo(() => {
        const items: Record<string, any> = {
            'dashboard': { icon: LayoutDashboard, label: t('menu.dashboard'), path: dashboardPath, req: () => true },
            'bookings': { icon: Calendar, label: t('menu.bookings'), path: `${rolePrefix}/bookings`, req: () => permissions.canViewAllBookings },
            'calendar': { icon: Calendar, label: t('menu.calendar'), path: `${rolePrefix}/calendar`, req: () => true },
            'clients': { icon: Users, label: t('menu.clients'), path: `${rolePrefix}/clients`, req: () => true },
            'chat': { icon: MessageSquare, label: t('menu.chat'), path: `${rolePrefix}/chat`, req: () => true },
            'analytics': { icon: BarChart3, label: t('menu.analytics'), path: `${rolePrefix}/analytics`, req: () => permissions.canViewAnalytics },
            'funnel': { icon: Filter, label: t('menu.funnel'), path: `${rolePrefix}/funnel`, req: () => true },
            'tasks': { icon: CheckSquare, label: t('menu.tasks'), path: `${rolePrefix}/tasks`, req: () => true },
            'services': { icon: Scissors, label: t('menu.services'), path: `${rolePrefix}/services`, req: () => permissions.canEditServices },
            'internal-chat': { icon: MessageCircle, label: t('menu.internal_chat'), path: `${rolePrefix}/internal-chat`, req: () => true },
            'broadcasts': { icon: Send, label: t('menu.broadcasts'), path: `${rolePrefix}/broadcasts`, req: () => permissions.roleLevel >= 70 },
            'promo-codes': { icon: Ticket, label: t('menu.promo_codes', 'Промокоды'), path: `${rolePrefix}/promo-codes`, req: () => permissions.roleLevel >= 70 },
            'loyalty': { icon: Gift, label: t('menu.loyalty', 'Лояльность'), path: `${rolePrefix}/loyalty`, req: () => permissions.roleLevel >= 70 },
            'telephony': { icon: Phone, label: t('menu.telephony'), path: `${rolePrefix}/telephony`, req: () => true },
            'integrations-group': { icon: LinkIcon, label: t('menu.integrations'), req: () => true },
            'messengers': { icon: MessageSquare, label: t('menu.messengers'), path: `${rolePrefix}/messengers`, req: () => true },
            'payment-integrations': { icon: CreditCard, label: t('menu.payments'), path: `${rolePrefix}/payment-integrations`, req: () => true },
            'marketplace-integrations': { icon: Store, label: t('menu.marketplaces'), path: `${rolePrefix}/marketplace-integrations`, req: () => true },
            'referrals': { icon: Award, label: t('menu.referrals'), path: `${rolePrefix}/referrals`, req: () => permissions.roleLevel >= 70 },
            'challenges': { icon: Target, label: t('menu.challenges'), path: `${rolePrefix}/challenges`, req: () => permissions.roleLevel >= 70 },
            'trash': { icon: Trash2, label: t('menu.trash'), path: `${rolePrefix}/trash`, req: () => permissions.roleLevel >= 70 },
            'audit-log': { icon: ShieldCheck, label: t('menu.audit_log'), path: `${rolePrefix}/audit-log`, req: () => user?.role === 'director' },
            'employees': { icon: UserCog, label: t('menu.employees'), path: `${rolePrefix}/employees`, req: () => user?.role === 'manager' },
            'settings': { icon: Settings, label: t('menu.settings'), path: `${rolePrefix}/settings`, req: () => permissions.canEditSettings },
            'bot-settings': { icon: Bot, label: t('menu.bot_settings'), path: `${rolePrefix}/bot-settings`, req: () => permissions.canViewBotSettings },
            'users-group': { icon: Users, label: t('menu.user_management'), req: () => permissions.roleLevel >= 70 },
            'users': { icon: Users, label: t('menu.users'), path: `${rolePrefix}/users`, req: () => permissions.roleLevel >= 70 },
            'permissions': { icon: ShieldCheck, label: t('menu.permissions'), path: `${rolePrefix}/users/permissions`, req: () => permissions.roleLevel >= 70 },
            'pending-users': { icon: UserCog, label: t('menu.pending_registrations'), path: `${rolePrefix}/users/pending`, req: () => permissions.roleLevel >= 70 },
            'content-group': { icon: FileText, label: t('menu.content'), req: () => permissions.roleLevel >= 70 },
            'public-content': { icon: Globe, label: t('menu.public_content'), path: `${rolePrefix}/public-content`, req: () => permissions.roleLevel >= 70 },
            'visitor-analytics': { icon: BarChart3, label: t('menu.visitor_analytics'), path: `${rolePrefix}/visitor-analytics`, req: () => permissions.roleLevel >= 70 },
            'menu-customization': { icon: Settings, label: t('menu.menu_customization'), path: `${rolePrefix}/menu-customization`, req: () => permissions.roleLevel >= 70 },
            'finance-group': { icon: Receipt, label: t('menu.finance'), req: () => permissions.roleLevel >= 70 },
            'invoices': { icon: Receipt, label: t('menu.invoices'), path: `${rolePrefix}/invoices`, req: () => permissions.roleLevel >= 70 },
            'products': { icon: Package, label: t('menu.products'), path: `${rolePrefix}/products`, req: () => permissions.roleLevel >= 70 },
            'contracts': { icon: Briefcase, label: t('menu.contracts'), path: `${rolePrefix}/contracts`, req: () => permissions.roleLevel >= 70 },
        };

        const groups: Record<string, string[]> = {
            'users-group': ['users', 'permissions', 'pending-users'],
            'content-group': ['public-content', 'visitor-analytics', 'menu-customization'],
            'finance-group': ['invoices', 'products', 'contracts'],
            'integrations-group': ['telephony', 'messengers', 'payment-integrations', 'marketplace-integrations'],
        };

        const finalItems: any[] = [];
        const order = menuSettings?.menu_order || ['dashboard', 'bookings', 'calendar', 'clients', 'chat', 'analytics', 'funnel', 'tasks', 'services', 'internal-chat', 'broadcasts', 'promo-codes', 'loyalty', 'finance-group', 'users-group', 'content-group', 'integrations-group', 'referrals', 'challenges', 'trash', 'audit-log', 'settings', 'bot-settings'];

        order.forEach(id => {
            if (menuSettings?.hidden_items?.includes(id)) return;
            const item = items[id];
            if (item && item.req()) {
                if (groups[id]) {
                    const subItems = groups[id]
                        .map(subid => items[subid])
                        .filter(sub => sub && sub.req() && !menuSettings?.hidden_items?.includes(sub.id));

                    if (subItems.length > 0) {
                        finalItems.push({ ...item, id, items: subItems });
                    }
                } else {
                    finalItems.push({ ...item, id });
                }
            }
        });

        return finalItems;
    }, [t, rolePrefix, dashboardPath, permissions, user?.role, menuSettings]);

    const menuItems = useMemo(() => {
        return allMenuItems.map((item: any) => ({
            ...item,
            badge: item.id === 'chat' ? unreadCount : 0
        }));
    }, [allMenuItems, unreadCount]);

    const mainTabs = useMemo(() => [
        { id: 'dashboard', icon: LayoutDashboard, label: t('menu.dashboard'), path: dashboardPath },
        { id: 'funnel', icon: Filter, label: t('menu.funnel'), path: `${rolePrefix}/funnel` },
        { id: 'bookings', icon: Calendar, label: t('menu.bookings'), path: `${rolePrefix}/bookings` },
        { id: 'chat', icon: MessageSquare, label: t('menu.chat'), path: `${rolePrefix}/chat`, badge: unreadCount },
        { id: 'more', icon: MoreHorizontal, label: t('menu.more', 'Ещё') },
    ], [t, dashboardPath, rolePrefix, unreadCount]);

    const chatSubItems = useMemo(() => [
        { id: 'messengers', icon: Send, label: t('menu.messengers'), path: `${rolePrefix}/messengers`, badge: unreadCount },
        { id: 'internal', icon: MessageCircle, label: t('menu.internal_chat'), path: `${rolePrefix}/internal-chat`, badge: 0 },
    ], [t, rolePrefix, unreadCount]);

    const toggleMobileGroup = (id: string) => {
        const newGroups = new Set(mobileExpandedGroups);
        if (newGroups.has(id)) newGroups.delete(id);
        else newGroups.add(id);
        setMobileExpandedGroups(newGroups);
    };

    const handleCallAction = (action: 'accept' | 'reject') => {
        if (action === 'accept' && incomingCall) {
            navigate(`${rolePrefix}/chat?call=accept&from=${incomingCall.from}&type=${incomingCall.type}`);
        }
        setIncomingCall(null);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
            {/* Sidebar Desktop */}
            <aside className="fixed lg:sticky top-0 left-0 z-30 h-screen w-64 desktop-sidebar sidebar-premium shadow-sm">
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Logo Section */}
                    <div className="sidebar-header-premium flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                            {salonSettings?.logo_url ? (
                                <img src={salonSettings.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
                            ) : (
                                <LayoutDashboard className="w-6 h-6 text-white" />
                            )}
                        </div>
                        <h1 className="text-lg font-bold text-gray-900 truncate">{salonSettings?.name || 'Beauty CRM'}</h1>
                    </div>

                    {/* User Profile Hook */}
                    <div className="user-card-sidebar shadow-sm border border-pink-50/50">
                        <div className="flex items-center gap-3">
                            <img
                                src={getDynamicAvatar(user?.full_name || 'User')}
                                alt="Avatar"
                                className="w-10 h-10 rounded-xl object-fit shadow-sm border-2 border-white"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</div>
                                <div className="text-[11px] font-semibold text-pink-600 uppercase tracking-wider">{getRoleLabel()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                        <li className="list-none mb-4">
                            <button
                                onClick={() => navigate(`${rolePrefix}/notifications`)}
                                className={cn(
                                    "w-full menu-item-premium",
                                    location.pathname.includes('/notifications') && "active"
                                )}
                            >
                                <div className="relative">
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-bold rounded-full border border-white flex items-center justify-center">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </div>
                                <span className="flex-1 text-left font-bold">{t('menu.notifications') || 'Уведомления'}</span>
                            </button>
                        </li>

                        {menuItems.map((item: any) => {
                            const isGroup = !!(item.items && item.items.length > 0);
                            const isExpanded = expandedMenu === item.id;
                            const isActive = location.pathname === item.path || (isGroup && item.items.some((sub: any) => location.pathname === sub.path));

                            return (
                                <li key={item.id} className="list-none mb-1">
                                    {isGroup ? (
                                        <div>
                                            <button
                                                onClick={() => setExpandedMenu(isExpanded ? null : item.id)}
                                                className={cn(
                                                    "w-full menu-item-premium",
                                                    isActive && !isExpanded && "active"
                                                )}
                                            >
                                                <item.icon size={20} />
                                                <span className="flex-1 text-left">{item.label}</span>
                                                <ChevronDown size={16} className={cn("transition-transform duration-200", isExpanded && "rotate-180")} />
                                            </button>
                                            {isExpanded && (
                                                <ul className="mt-1 space-y-1">
                                                    {item.items.map((sub: any) => (
                                                        <li key={sub.id}>
                                                            <button
                                                                onClick={() => navigate(sub.path)}
                                                                className={cn(
                                                                    "w-full submenu-item-premium",
                                                                    location.pathname === sub.path && "active"
                                                                )}
                                                            >
                                                                <sub.icon size={16} />
                                                                <span>{sub.label}</span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => navigate(item.path)}
                                            className={cn(
                                                "w-full menu-item-premium",
                                                location.pathname === item.path && "active"
                                            )}
                                        >
                                            <item.icon size={20} />
                                            <span className="flex-1 text-left">{item.label}</span>
                                            {item.badge > 0 && (
                                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="sidebar-footer-premium mt-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 p-2 bg-gray-50 rounded-xl">
                                <LanguageSwitcher />
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                                title={t('common:logout')}
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                        <div className="text-[10px] text-center text-gray-400 font-medium">
                            {salonSettings?.name || 'Beauty CRM'} v1.0.1
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <div className="mobile-bottom-nav lg:hidden">
                {mainTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            if (tab.id === 'more') setShowMoreModal(true);
                            else if (tab.id === 'chat') setShowChatMenu(true);
                            else navigate(tab.path!);
                        }}
                        className={`mobile-nav-btn ${location.pathname === tab.path ? 'active' : ''}`}
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
                                if (mainTabs.some(t => t.id === item.id)) return null;

                                return (
                                    <div key={item.id} className="menu-group">
                                        {item.items ? (
                                            <div>
                                                <button
                                                    onClick={() => toggleMobileGroup(item.id)}
                                                    className="menu-group-btn"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <item.icon size={20} className="text-gray-700" />
                                                        <span className="font-medium text-gray-700">{item.label}</span>
                                                    </div>
                                                    {mobileExpandedGroups.has(item.id) ? (
                                                        <ChevronDown size={18} className="text-gray-400" />
                                                    ) : (
                                                        <ChevronRight size={18} className="text-gray-400" />
                                                    )}
                                                </button>
                                                {mobileExpandedGroups.has(item.id) && (
                                                    <div className="menu-sub-items">
                                                        {item.items.map((sub: any) => (
                                                            <button
                                                                key={sub.id}
                                                                onClick={() => { navigate(sub.path); setShowMoreModal(false); }}
                                                                className="menu-sub-item"
                                                            >
                                                                <sub.icon size={16} />
                                                                <span>{sub.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { navigate(item.path); setShowMoreModal(false); }}
                                                className="menu-item-link"
                                            >
                                                <item.icon size={20} className="text-gray-700" />
                                                <span className="font-medium">{item.label}</span>
                                            </button>
                                        )}
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
                                                <img src={getDynamicAvatar(user?.full_name || 'User')} alt="Avatar" className="user-avatar-img" />
                                                <div className="user-status-indicator" />
                                            </div>
                                            <div className="user-info-text">
                                                <div className="user-name-premium">{user?.full_name}</div>
                                                <div className="user-role-premium">{getRoleLabel()}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <button onClick={() => { handleLogout(); setShowMoreModal(false); }} className="logout-btn-minimal">
                                        <LogOut size={22} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Selection Menu */}
            {showChatMenu && (
                <div className="more-menu-modal animate-in fade-in" onClick={() => setShowChatMenu(false)}>
                    <div className="more-menu-content animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
                        <div className="more-menu-header">
                            <span className="more-menu-title">{t('menu.chat')}</span>
                            <button onClick={() => setShowChatMenu(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            {chatSubItems.map((chat: any) => (
                                <button
                                    key={chat.id}
                                    onClick={() => {
                                        navigate(chat.path);
                                        setShowChatMenu(false);
                                    }}
                                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <chat.icon size={24} className="text-gray-700" />
                                        <span className="font-semibold text-gray-800">{chat.label}</span>
                                    </div>
                                    {chat.badge > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                            {chat.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <div className="flex-1 overflow-y-auto bg-gray-50/50 relative pb-[80px] lg:pb-0">
                    <Outlet />
                </div>
            </main>

            {/* Incoming Call Overlay */}
            {incomingCall && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-sm p-8 text-center shadow-2xl animate-in zoom-in duration-300">
                        <div className="relative inline-block mb-6">
                            <div className="w-24 h-24 rounded-[32px] overflow-hidden bg-gray-100 mx-auto shadow-inner ring-4 ring-pink-50">
                                <img
                                    src={incomingCall.callerPhoto || getDynamicAvatar(incomingCall.callerName || 'Unknown')}
                                    className="w-full h-full object-cover"
                                    alt="Caller"
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white border-4 border-white">
                                <Phone size={16} />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{incomingCall.callerName || 'Unknown Caller'}</h3>
                        <p className="text-gray-500 font-medium mb-8">Incoming {incomingCall.type} call...</p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleCallAction('reject')}
                                className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => handleCallAction('accept')}
                                className="flex-1 py-4 bg-pink-500 text-white rounded-2xl font-bold hover:bg-pink-600 shadow-lg shadow-pink-200 transition-all active:scale-95"
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
