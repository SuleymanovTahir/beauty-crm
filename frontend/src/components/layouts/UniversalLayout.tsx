import { useEffect, useState, useMemo, useRef } from 'react';
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
    Target,
    MoreHorizontal,
    Link as LinkIcon,
    LayoutGrid,
    Share2,
    Award,
    Image as ImageIcon
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

export const CRM_MENU_DEFAULT_ORDER = [
    'dashboard',
    'bookings',
    'clients',
    'chat-group',
    'calendar',
    'funnel',
    'catalog-group',
    'analytics-group',
    'finance-group',
    'tools-group',
    'integrations-group',
    'settings-group'
];

export const CRM_MENU_GROUPS: Record<string, string[]> = {
    'chat-group': ['internal-chat'],
    'catalog-group': ['services', 'service-change-requests', 'products'],
    'analytics-group': ['analytics', 'visitor-analytics'],
    'finance-group': ['invoices', 'contracts'],
    'tools-group': ['tasks', 'broadcasts', 'telephony', 'referrals', 'promo-codes', 'loyalty', 'challenges'],
    'integrations-group': ['messengers', 'payment-integrations', 'marketplace-integrations'],
    'settings-group': ['settings', 'team', 'public-content', 'bot-settings', 'audit-log', 'trash'],
};

export const buildCrmMenuCatalog = ({
    t,
    rolePrefix,
    dashboardPath,
    permissions,
    userRole,
}: {
    t: (key: string, options?: any) => string;
    rolePrefix: string;
    dashboardPath: string;
    permissions: any;
    userRole?: string;
}) => {
    const items: Record<string, any> = {
        'dashboard': { icon: LayoutDashboard, label: t('menu.dashboard'), path: dashboardPath, req: () => true },
        'bookings': { icon: Calendar, label: t('menu.bookings'), path: `${rolePrefix}/bookings`, req: () => permissions.canViewAllBookings },
        'calendar': { icon: Calendar, label: t('menu.calendar'), path: `${rolePrefix}/calendar`, req: () => true },
        'clients': { icon: Users, label: t('menu.clients'), path: `${rolePrefix}/clients`, req: () => true },
        'chat-group': { icon: MessageSquare, label: t('menu.chat'), req: () => true },
        'internal-chat': { icon: MessageCircle, label: t('menu.internal_chat'), path: `${rolePrefix}/internal-chat`, req: () => true },
        'funnel': { icon: Filter, label: t('menu.funnel'), path: `${rolePrefix}/funnel`, req: () => true },
        'catalog-group': { icon: LayoutGrid, label: t('menu.catalog'), req: () => true },
        'services': { icon: Scissors, label: t('menu.services'), path: `${rolePrefix}/services`, req: () => permissions.canEditServices },
        'service-change-requests': { icon: FileText, label: t('menu.service_requests'), path: `${rolePrefix}/service-change-requests`, req: () => permissions.canEditServices },
        'products': { icon: Package, label: t('menu.products'), path: `${rolePrefix}/products`, req: () => permissions.roleLevel >= 70 },
        'analytics-group': { icon: BarChart3, label: t('menu.analytics'), req: () => permissions.canViewAnalytics },
        'analytics': { icon: BarChart3, label: t('menu.analytics'), path: `${rolePrefix}/analytics`, req: () => permissions.canViewAnalytics },
        'visitor-analytics': { icon: Users, label: t('menu.visitors'), path: `${rolePrefix}/visitor-analytics`, req: () => permissions.roleLevel >= 70 },
        'finance-group': { icon: Receipt, label: t('menu.finance'), req: () => permissions.roleLevel >= 70 },
        'invoices': { icon: Receipt, label: t('menu.invoices'), path: `${rolePrefix}/invoices`, req: () => permissions.roleLevel >= 70 },
        'contracts': { icon: Briefcase, label: t('menu.contracts'), path: `${rolePrefix}/contracts`, req: () => permissions.roleLevel >= 70 },
        'tools-group': { icon: Briefcase, label: t('menu.tools'), req: () => true },
        'tasks': { icon: CheckSquare, label: t('menu.tasks'), path: `${rolePrefix}/tasks`, req: () => true },
        'broadcasts': { icon: Send, label: t('menu.broadcasts'), path: `${rolePrefix}/broadcasts`, req: () => permissions.roleLevel >= 70 },
        'telephony': { icon: Phone, label: t('menu.telephony'), path: `${rolePrefix}/telephony`, req: () => true },
        'referrals': { icon: Share2, label: t('menu.referrals'), path: `${rolePrefix}/referrals`, req: () => permissions.roleLevel >= 70 },
        'promo-codes': { icon: Ticket, label: t('menu.promo_codes'), path: `${rolePrefix}/promo-codes`, req: () => permissions.roleLevel >= 70 },
        'loyalty': { icon: Gift, label: t('adminpanel/loyaltymanagement:title'), path: `${rolePrefix}/loyalty`, req: () => permissions.roleLevel >= 70 },
        'challenges': { icon: Target, label: t('menu.challenges'), path: `${rolePrefix}/challenges`, req: () => permissions.roleLevel >= 70 },
        'integrations-group': { icon: LinkIcon, label: t('menu.integrations'), req: () => true },
        'messengers': { icon: MessageSquare, label: t('menu.messengers'), path: `${rolePrefix}/messengers`, req: () => true },
        'payment-integrations': { icon: CreditCard, label: t('menu.payments'), path: `${rolePrefix}/payment-integrations`, req: () => true },
        'marketplace-integrations': { icon: Store, label: t('menu.marketplaces'), path: `${rolePrefix}/marketplace-integrations`, req: () => true },
        'settings-group': { icon: Settings, label: t('menu.settings'), req: () => permissions.canEditSettings },
        'settings': { icon: Settings, label: t('menu.settings'), path: `${rolePrefix}/settings`, req: () => permissions.canEditSettings },
        'team': { icon: Users, label: t('menu.team', { defaultValue: 'Команда' }), path: `${rolePrefix}/team`, req: () => permissions.roleLevel >= 70 },
        'public-content': { icon: Globe, label: t('menu.public_content'), path: `${rolePrefix}/public-content`, req: () => permissions.roleLevel >= 70 },
        'bot-settings': { icon: Bot, label: t('menu.bot_settings'), path: `${rolePrefix}/bot-settings`, req: () => permissions.canViewBotSettings },
        'audit-log': { icon: ShieldCheck, label: t('menu.audit_log'), path: `${rolePrefix}/audit-log`, req: () => userRole === 'director' },
        'trash': { icon: Trash2, label: t('menu.trash'), path: `${rolePrefix}/trash`, req: () => permissions.roleLevel >= 70 },
    };

    return { items, groups: CRM_MENU_GROUPS, defaultOrder: CRM_MENU_DEFAULT_ORDER };
};

export default function UniversalLayout({ user, onLogout }: MainLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation(['layouts/mainlayout', 'layouts/adminpanellayout', 'adminpanel/loyaltymanagement', 'common']);

    // Detect if we are in Admin Panel
    const isAdminPanel = location.pathname.startsWith('/admin');

    const [incomingCall, setIncomingCall] = useState<{
        from: number;
        type: 'audio' | 'video';
        callerName?: string;
        callerPhoto?: string;
    } | null>(null);

    const [showMoreModal, setShowMoreModal] = useState(false);
    const [showChatMenu, setShowChatMenu] = useState(false);
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    const [internalChatUnreadCount, setInternalChatUnreadCount] = useState(0);
    const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
    const [mobileExpandedGroups, setMobileExpandedGroups] = useState<Set<string>>(new Set());
    const [menuSettings, setMenuSettings] = useState<{ menu_order: any[] | null; hidden_items: string[] | null } | null>(null);
    const [salonSettings, setSalonSettings] = useState<{ name?: string; logo_url?: string } | null>(null);
    const sidebarNavRef = useRef<HTMLElement | null>(null);

    const permissions = usePermissions(user?.role || 'employee', user?.secondary_role);

    const rolePrefix = useMemo(() => {
        const path = location.pathname;
        if (path.startsWith('/admin')) return '/admin';
        if (path.startsWith('/crm')) return '/crm';
        if (path.startsWith('/manager')) return '/manager';
        if (path.startsWith('/sales')) return '/sales';
        if (path.startsWith('/saler')) return '/sales';
        if (path.startsWith('/marketer')) return '/marketer';
        if (path.startsWith('/employee')) return '/employee';
        return '/crm';
    }, [location.pathname]);

    const dashboardPath = useMemo(() => {
        if (isAdminPanel) return '/admin/dashboard';
        if (['sales', 'saler'].includes(user?.role ?? '')) return `${rolePrefix}/clients`;
        if (user?.role === 'marketer') return `${rolePrefix}/analytics`;
        return `${rolePrefix}/dashboard`;
    }, [user?.role, rolePrefix, isAdminPanel]);

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
            const data = await api.getTotalUnread();
            setChatUnreadCount(data.chat || 0);
            setInternalChatUnreadCount(data.internal_chat || 0);
            setNotificationsUnreadCount(data.notifications || 0);
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
        if (isAdminPanel) return; // Menu settings are only for CRM
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
        if (isAdminPanel) return t('layouts/adminpanellayout:admin_panel', 'Админ-панель');
        switch (user?.role) {
            case 'director': return t('roles.director');
            case 'admin': return t('roles.admin');
            case 'manager': return t('roles.manager');
            case 'sales': return t('roles.saler');
            case 'saler': return t('roles.saler');
            case 'marketer': return t('roles.marketer');
            default: return t('roles.employee');
        }
    };

    const allMenuItems: any[] = useMemo(() => {
        if (isAdminPanel) {
            return [
                { id: 'dashboard', icon: LayoutDashboard, label: t('layouts/adminpanellayout:menu.dashboard'), path: '/admin/dashboard', req: () => true },
                { id: 'team', icon: Users, label: t('layouts/adminpanellayout:menu.team', 'Команда'), path: '/admin/team', req: () => true },
                { id: 'clients', icon: Users, label: t('menu.clients'), path: '/admin/clients', req: () => true },
                { id: 'loyalty', icon: Gift, label: t('adminpanel/loyaltymanagement:title'), path: '/admin/loyalty', req: () => true },
                { id: 'referrals', icon: Award, label: t('layouts/adminpanellayout:menu.referral_program'), path: '/admin/referrals', req: () => true },
                { id: 'challenges', icon: Target, label: t('layouts/adminpanellayout:menu.challenges'), path: '/admin/challenges', req: () => true },
                { id: 'promo-codes', icon: Ticket, label: t('layouts/mainlayout:menu.promo_codes'), path: '/admin/promo-codes', req: () => true },
                { id: 'gallery', icon: ImageIcon, label: t('layouts/adminpanellayout:menu.photo_gallery'), path: '/admin/gallery', req: () => true },
                { id: 'broadcasts', icon: Send, label: t('menu.broadcasts'), path: '/admin/broadcasts', req: () => true },
                { id: 'notifications', icon: Bell, label: t('layouts/adminpanellayout:menu.notifications'), path: '/admin/notifications', req: () => true },
                { id: 'settings', icon: Settings, label: t('menu.settings'), path: '/admin/settings', req: () => true },
            ];
        }

        const crmCatalog = buildCrmMenuCatalog({
            t,
            rolePrefix,
            dashboardPath,
            permissions,
            userRole: user?.role,
        });
        const items: Record<string, any> = crmCatalog.items;
        const groups: Record<string, string[]> = crmCatalog.groups;

        const finalItems: any[] = [];
        const order = menuSettings?.menu_order ?? CRM_MENU_DEFAULT_ORDER;

        order.forEach(id => {
            if (menuSettings?.hidden_items?.includes(id)) return;
            const item = items[id];
            if (item && item.req()) {
                if (groups[id]) {
                    const subItems = groups[id]
                        .map((subid) => {
                            const subItem = items[subid];
                            if (!subItem) return null;
                            return { ...subItem, id: subid };
                        })
                        .filter((sub) => sub && sub.req() && !menuSettings?.hidden_items?.includes(sub.id));

                    if (subItems.length > 0) {
                        finalItems.push({ ...item, id, items: subItems });
                    }
                } else {
                    finalItems.push({ ...item, id });
                }
            }
        });

        return finalItems;
    }, [t, rolePrefix, dashboardPath, permissions, user?.role, menuSettings, isAdminPanel]);

    const menuItems = useMemo(() => {
        return allMenuItems.map((item: any) => {
            let badge = 0;
            if (item.id === 'chat-group' || (isAdminPanel && item.id === 'notifications')) {
                badge = item.id === 'notifications' ? notificationsUnreadCount : (chatUnreadCount + internalChatUnreadCount);
            }
            else if (item.id === 'messengers') badge = chatUnreadCount;
            else if (item.id === 'internal-chat') badge = internalChatUnreadCount;

            const subItems = item.items?.map((sub: any) => {
                let subBadge = 0;
                if (sub.id === 'messengers') subBadge = chatUnreadCount;
                else if (sub.id === 'internal-chat') subBadge = internalChatUnreadCount;
                return { ...sub, badge: subBadge };
            });

            return { ...item, badge, items: subItems };
        });
    }, [allMenuItems, chatUnreadCount, internalChatUnreadCount, notificationsUnreadCount, isAdminPanel]);

    const activeDesktopGroupId = useMemo(() => {
        const activeGroup = menuItems.find((item: any) => {
            if (!Array.isArray(item.items)) {
                return false;
            }
            return item.items.some((sub: any) => sub.path === location.pathname);
        });

        return activeGroup?.id ?? null;
    }, [menuItems, location.pathname]);

    const mainTabs = useMemo(() => {
        if (isAdminPanel) {
            return [
                { id: 'dashboard', icon: LayoutDashboard, label: t('layouts/adminpanellayout:menu.dashboard_short', 'Главная'), path: '/admin/dashboard' },
                { id: 'loyalty', icon: Gift, label: t('adminpanel/loyaltymanagement:title'), path: '/admin/loyalty' },
                { id: 'referrals', icon: Award, label: t('layouts/adminpanellayout:menu.referrals_short', 'Рефералы'), path: '/admin/referrals' },
                { id: 'challenges', icon: Target, label: t('layouts/adminpanellayout:menu.challenges_short', 'Цели'), path: '/admin/challenges' },
                { id: 'more', icon: MoreHorizontal, label: t('menu.more', 'Ещё'), badge: notificationsUnreadCount },
            ];
        }
        return [
            { id: 'dashboard', icon: LayoutDashboard, label: t('menu.dashboard'), path: dashboardPath },
            { id: 'funnel', icon: Filter, label: t('menu.funnel'), path: `${rolePrefix}/funnel` },
            { id: 'bookings', icon: Calendar, label: t('menu.bookings'), path: `${rolePrefix}/bookings` },
            { id: 'chat', icon: MessageSquare, label: t('menu.chat'), path: `${rolePrefix}/chat`, badge: chatUnreadCount + internalChatUnreadCount },
            { id: 'more', icon: MoreHorizontal, label: t('menu.more', 'Ещё'), badge: notificationsUnreadCount },
        ];
    }, [t, dashboardPath, rolePrefix, chatUnreadCount, internalChatUnreadCount, notificationsUnreadCount, isAdminPanel]);

    const chatSubItems = useMemo(() => [
        { id: 'messengers', icon: Send, label: t('menu.messengers'), path: `${rolePrefix}/messengers`, badge: chatUnreadCount },
        { id: 'internal', icon: MessageCircle, label: t('menu.internal_chat'), path: `${rolePrefix}/internal-chat`, badge: internalChatUnreadCount },
    ], [t, rolePrefix, chatUnreadCount, internalChatUnreadCount]);

    // Update document title based on current page and selected tab
    useEffect(() => {
        const collectNavigableEntries = (items: any[]): Array<{ path: string; label: string }> => {
            const entries: Array<{ path: string; label: string }> = [];

            for (const item of items) {
                if (typeof item.path === 'string' && item.path.length > 0) {
                    entries.push({ path: item.path, label: item.label });
                }

                if (Array.isArray(item.items) && item.items.length > 0) {
                    entries.push(...collectNavigableEntries(item.items));
                }
            }

            return entries;
        };

        const menuEntries = collectNavigableEntries(menuItems);
        const tabEntries = mainTabs
            .filter((tab: any) => typeof tab.path === 'string' && tab.path.length > 0)
            .map((tab: any) => ({ path: tab.path as string, label: tab.label as string }));

        const allEntries = [...tabEntries, ...menuEntries];
        const exactEntry = allEntries.find((entry) => entry.path === location.pathname);
        const nestedEntry = allEntries
            .filter((entry) => location.pathname.startsWith(`${entry.path}/`))
            .sort((left, right) => right.path.length - left.path.length)[0];

        const currentPageLabel = exactEntry?.label ?? nestedEntry?.label ?? '';
        const searchParams = new URLSearchParams(location.search);
        const pathSegments = location.pathname.split('/').filter((segment) => segment.length > 0);

        const getPathTabValue = (): string | null => {
            const tabParentRoutes = ['settings', 'bot-settings', 'public-content'];

            for (const parentRoute of tabParentRoutes) {
                const routeIndex = pathSegments.indexOf(parentRoute);
                if (routeIndex >= 0 && pathSegments.length > routeIndex + 1) {
                    return pathSegments[routeIndex + 1];
                }
            }

            const teamIndex = pathSegments.indexOf('team');
            if (teamIndex >= 0 && pathSegments.length > teamIndex + 2) {
                return pathSegments[teamIndex + 2];
            }

            return null;
        };

        const humanizeTabValue = (value: string): string => {
            const normalizedValue = value.trim();
            if (normalizedValue.length === 0) {
                return '';
            }

            return normalizedValue
                .replace(/[-_]+/g, ' ')
                .split(' ')
                .filter((segment) => segment.length > 0)
                .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
                .join(' ');
        };

        const getMappedTabLabel = (value: string): string => {
            if (location.pathname.endsWith('/special-packages')) {
                if (value === 'packages') {
                    return t('admin/specialpackages:tab_packages');
                }
                if (value === 'referrals') {
                    return t('admin/specialpackages:tab_referrals');
                }
                if (value === 'challenges') {
                    return t('layouts/mainlayout:menu.challenges');
                }
                if (value === 'loyalty') {
                    return t('adminpanel/loyaltymanagement:title');
                }
                if (value === 'promo-codes') {
                    return t('layouts/mainlayout:menu.promo_codes');
                }
                if (value === 'history') {
                    return t('admin/specialpackages:referrals_history_tab', 'История приглашений');
                }
                if (value === 'campaigns') {
                    return t('admin/specialpackages:referrals_campaigns_tab', 'Кампании и бонусы');
                }
            }

            if (location.pathname.endsWith('/referrals')) {
                if (value === 'history') {
                    return t('admin/specialpackages:referrals_history_tab', 'История приглашений');
                }
                if (value === 'campaigns') {
                    return t('admin/specialpackages:referrals_campaigns_tab', 'Кампании и бонусы');
                }
                if (value === 'all') {
                    return t('adminpanel/referralprogram:table.filters.all_statuses');
                }
                if (value === 'pending') {
                    return t('adminpanel/referralprogram:table.statuses.pending');
                }
                if (value === 'completed') {
                    return t('adminpanel/referralprogram:table.statuses.completed');
                }
                if (value === 'cancelled') {
                    return t('adminpanel/referralprogram:table.statuses.cancelled');
                }
            }

            const tabKeyMap: Record<string, string> = {
                compose: 'admin/broadcasts:create_broadcast',
                history: 'admin/broadcasts:history',
                subscribers: 'admin/broadcasts:subscribers',
                unsubscribed: 'admin/broadcasts:unsubscribed_tab',
                profile: 'settings:profile',
                general: 'settings:general',
                notifications: 'settings:notifications',
                subscriptions: 'settings:subscriptions',
                holidays: 'settings:holidays',
                roles: 'settings:manage_roles',
                security: 'settings:security',
                danger: 'settings:danger_zone',
                information: 'admin/users:tab_information',
                services: 'menu.services',
                online_booking: 'admin/users:tab_online_booking',
                settings: 'menu.settings',
                schedule: 'admin/users:tab_schedule',
                payroll: 'admin/users:tab_payroll',
                analytics: 'admin/botsettings:tab_analytics',
                personality: 'admin/botsettings:tabs.personality',
                pricing: 'admin/botsettings:tabs.pricing',
                objections: 'admin/botsettings:tabs.objections',
                communication: 'admin/botsettings:tabs.communication',
                advanced: 'admin/botsettings:tabs.advanced',
                safety: 'admin/botsettings:tabs.safety',
                examples: 'admin/botsettings:tabs.examples',
                reviews: 'admin/publiccontent:tabs.reviews',
                faq: 'admin/publiccontent:tabs.faq',
                gallery: 'admin/publiccontent:tabs.gallery',
                banners: 'admin/publiccontent:tabs.banners',
            };

            const translationKey = tabKeyMap[value];
            if (translationKey !== undefined) {
                const translatedLabel = t(translationKey);
                if (translatedLabel !== translationKey) {
                    return translatedLabel;
                }
            }

            return humanizeTabValue(value);
        };

        const rawTabValues: string[] = [];
        const sectionValue = searchParams.get('section');
        const viewValue = searchParams.get('view');
        const queryTabValue = searchParams.get('tab');
        const pathTabValue = getPathTabValue();

        if (sectionValue !== null && sectionValue.length > 0) {
            rawTabValues.push(sectionValue);
        }
        if (viewValue !== null && viewValue.length > 0) {
            rawTabValues.push(viewValue);
        }
        if (queryTabValue !== null && queryTabValue.length > 0) {
            rawTabValues.push(queryTabValue);
        }
        if (pathTabValue !== null && pathTabValue.length > 0) {
            rawTabValues.push(pathTabValue);
        }

        const tabLabels: string[] = [];
        for (const tabValue of rawTabValues) {
            const tabLabel = getMappedTabLabel(tabValue);
            if (tabLabel.length === 0) {
                continue;
            }
            if (tabLabel === currentPageLabel) {
                continue;
            }
            if (tabLabels.includes(tabLabel)) {
                continue;
            }
            tabLabels.push(tabLabel);
        }

        const titleParts: string[] = [];
        if (currentPageLabel.length > 0) {
            titleParts.push(currentPageLabel);
        }
        titleParts.push(...tabLabels);

        if (titleParts.length > 0) {
            document.title = titleParts.join(' · ');
        }
    }, [location.pathname, location.search, mainTabs, menuItems, t]);

    useEffect(() => {
        if (activeDesktopGroupId !== null) {
            setExpandedMenu(activeDesktopGroupId);
        }
    }, [location.pathname, activeDesktopGroupId]);

    useEffect(() => {
        const navElement = sidebarNavRef.current;
        if (navElement === null) {
            return;
        }

        let secondFrameId = 0;
        const frameId = window.requestAnimationFrame(() => {
            secondFrameId = window.requestAnimationFrame(() => {
                const activeElement =
                    navElement.querySelector('.submenu-item-premium.active') ||
                    navElement.querySelector('.menu-item-premium.active');

                if (activeElement instanceof HTMLElement) {
                    activeElement.scrollIntoView({ block: 'center', inline: 'nearest' });
                }
            });
        });

        return () => {
            window.cancelAnimationFrame(frameId);
            window.cancelAnimationFrame(secondFrameId);
        };
    }, [location.pathname, activeDesktopGroupId]);

    // Close mobile menu on resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1100 && showMoreModal) {
                setShowMoreModal(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [showMoreModal]);

    useEffect(() => {
        if (!showMoreModal) {
            return;
        }

        if (activeDesktopGroupId === null) {
            return;
        }

        setMobileExpandedGroups(new Set([activeDesktopGroupId]));
    }, [showMoreModal, activeDesktopGroupId, location.pathname]);

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
            <aside className="fixed min-[1100px]:sticky top-0 left-0 z-30 h-screen w-64 desktop-sidebar sidebar-premium shadow-sm hidden min-[1100px]:flex">
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Logo Section */}
                    <div className="sidebar-header-premium flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 p-2 shrink-0">
                            <img
                                src={salonSettings?.logo_url || '/logo.webp'}
                                alt="Logo"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    // Fallback to logo.png if webp fails, or hide if both fail
                                    const target = e.target as HTMLImageElement;
                                    if (target.src.endsWith('.webp')) {
                                        target.src = '/logo.png';
                                    }
                                }}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="sidebar-brand-name">{salonSettings?.name || 'Beauty CRM'}</h1>
                            <div className="sidebar-brand-role">{getRoleLabel()}</div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav ref={sidebarNavRef} className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
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
                                                    "w-full flex items-center gap-3 menu-item-premium",
                                                    isActive && !isExpanded && "active",
                                                    isExpanded && "expanded"
                                                )}
                                            >
                                                <item.icon size={20} className="shrink-0" />
                                                <span className="flex-1 text-left truncate">{item.label}</span>
                                                {item.badge > 0 && !isExpanded && (
                                                    <span className="badge-premium badge-premium-red badge-sidebar mr-1">
                                                        {item.badge}
                                                    </span>
                                                )}
                                                <ChevronDown size={16} className={cn("transition-transform duration-200 shrink-0", isExpanded && "rotate-180")} />
                                            </button>
                                            {isExpanded && (
                                                <ul className="mt-1 space-y-1">
                                                    {item.items.map((sub: any) => (
                                                        <li key={sub.id}>
                                                            <button
                                                                onClick={() => navigate(sub.path)}
                                                                className={cn(
                                                                    "w-full flex items-center gap-3 submenu-item-premium",
                                                                    location.pathname === sub.path && "active"
                                                                )}
                                                            >
                                                                <sub.icon size={16} className="shrink-0" />
                                                                <span className="flex-1 truncate text-left">{sub.label}</span>
                                                                {sub.badge > 0 && (
                                                                    <span className="badge-premium badge-premium-red badge-sidebar">
                                                                        {sub.badge}
                                                                    </span>
                                                                )}
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
                                                "w-full flex items-center gap-3 menu-item-premium",
                                                location.pathname === item.path && "active"
                                            )}
                                        >
                                            <item.icon size={20} className="shrink-0" />
                                            <span className="flex-1 text-left truncate">{item.label}</span>
                                            {item.badge > 0 && (
                                                <span className="badge-premium badge-premium-red badge-sidebar">
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
                    <div className="sidebar-footer-premium">
                        {/* User & Notifications Row */}
                        <div className="user-card-sidebar px-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <img
                                        src={getDynamicAvatar(user?.full_name || 'User')}
                                        alt="Avatar"
                                        className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</div>
                                        <div className="text-[11px] text-gray-400 font-medium truncate">@{user?.username || 'admin'}</div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`${rolePrefix}/notifications`)}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all relative",
                                        location.pathname.includes('/notifications')
                                            ? "bg-pink-50 text-pink-600 shadow-sm"
                                            : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                                    )}
                                    title={t('menu.notifications')}
                                >
                                    <Bell size={20} />
                                    {notificationsUnreadCount > 0 && (
                                        <span className="badge-premium badge-premium-orange badge-header transition-transform hover:scale-110">
                                            {notificationsUnreadCount > 99 ? '99+' : notificationsUnreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 px-4 pb-6">
                            <div className="flex-1">
                                <LanguageSwitcher />
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-bold shadow-sm"
                            >
                                <LogOut size={18} />
                                <span className="text-sm">{t('common:logout')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation - Visible ONLY on small screens */}
            <div className="mobile-bottom-nav min-[1100px]:hidden">
                {mainTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            if (tab.id === 'more') setShowMoreModal(true);
                            else if (tab.id === 'chat') setShowChatMenu(true);
                            else navigate(tab.path!);
                        }}
                        className={cn(
                            "mobile-nav-btn",
                            location.pathname === (tab as any).path && "active",
                            tab.id === 'more' && showMoreModal && "active",
                            tab.id === 'chat' && showChatMenu && "active"
                        )}
                    >
                        <div className="mobile-nav-icon-container">
                            <tab.icon size={24} />
                            {(tab as any).badge !== undefined && (tab as any).badge > 0 && (
                                <span className={cn(
                                    "mobile-nav-badge",
                                    tab.id === 'more' && "badge-orange"
                                )}>
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
                                <X size={18} />
                            </button>
                        </div>

                        <div className="more-menu-items">
                            {menuItems.map((item: any) => {
                                if (mainTabs.some(t => t.id === item.id)) return null;

                                const isGroupActive = Array.isArray(item.items) && item.items.some((sub: any) => location.pathname === sub.path);
                                const isGroupExpanded = mobileExpandedGroups.has(item.id);
                                const isItemActive = typeof item.path === 'string' && location.pathname === item.path;

                                return (
                                    <div key={item.id} className="menu-group">
                                        {item.items ? (
                                            <div>
                                                <button
                                                    onClick={() => toggleMobileGroup(item.id)}
                                                    className={cn(
                                                        "menu-group-btn",
                                                        isGroupActive && "active",
                                                        isGroupExpanded && "expanded"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <item.icon size={16} className="menu-item-icon" />
                                                        <span className="menu-item-label">{item.label}</span>
                                                        {item.badge > 0 && !isGroupExpanded && (
                                                            <span className="badge-premium badge-premium-red badge-sidebar">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isGroupExpanded ? (
                                                        <ChevronDown size={14} className={cn("menu-group-chevron", isGroupActive && "active")} />
                                                    ) : (
                                                        <ChevronRight size={14} className={cn("menu-group-chevron", isGroupActive && "active")} />
                                                    )}
                                                </button>
                                                {isGroupExpanded && (
                                                    <div className="menu-sub-items">
                                                        {item.items.map((sub: any) => (
                                                            <button
                                                                key={sub.id}
                                                                onClick={() => { navigate(sub.path); setShowMoreModal(false); }}
                                                                className={cn(
                                                                    "menu-sub-item",
                                                                    location.pathname === sub.path && "active"
                                                                )}
                                                            >
                                                                <sub.icon size={14} className="menu-sub-icon" />
                                                                <span className="menu-sub-label">{sub.label}</span>
                                                                {sub.badge > 0 && (
                                                                    <span className="badge-premium badge-premium-red badge-sidebar">
                                                                        {sub.badge}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { navigate(item.path); setShowMoreModal(false); }}
                                                className={cn("menu-item-link", isItemActive && "active")}
                                            >
                                                <item.icon size={16} className="menu-item-icon" />
                                                <span className="menu-item-label">{item.label}</span>
                                                {item.badge > 0 && (
                                                    <span className="badge-premium badge-premium-red badge-sidebar">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="user-profile-section">
                            {/* User Info - Left */}
                            <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-4">
                                <div className="relative shrink-0">
                                    <img
                                        src={getDynamicAvatar(user?.full_name || 'User')}
                                        alt="Avatar"
                                        className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm ring-1 ring-gray-100"
                                    />
                                    <div className="user-status-indicator" />
                                </div>
                                <div className="flex flex-col min-w-0 justify-center">
                                    <div className="text-sm font-bold text-gray-900 truncate leading-snug">{user?.full_name}</div>
                                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">{getRoleLabel()}</div>
                                </div>
                            </div>

                            {/* Actions - Right */}
                            <div className="flex items-center gap-6 shrink-0">
                                <div className="scale-100 origin-right">
                                    <LanguageSwitcher variant="minimal" />
                                </div>

                                <div className="w-px h-6 bg-gray-200"></div>

                                <button
                                    onClick={() => { navigate(`${rolePrefix}/notifications`); setShowMoreModal(false); }}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative"
                                >
                                    <Bell size={20} strokeWidth={2} />
                                    {notificationsUnreadCount > 0 && (
                                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white shadow-sm"></span>
                                    )}
                                </button>

                                <div className="w-px h-6 bg-gray-200"></div>

                                <button
                                    onClick={() => { handleLogout(); setShowMoreModal(false); }}
                                    className="p-2 text-red-500/80 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                >
                                    <LogOut size={20} strokeWidth={2} />
                                </button>
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
                                        <span className="badge-premium badge-premium-red px-2.5 py-1 text-xs">
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
                <div className="flex-1 overflow-y-auto bg-gray-50/50 relative pb-[80px] min-[1100px]:pb-0">
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
