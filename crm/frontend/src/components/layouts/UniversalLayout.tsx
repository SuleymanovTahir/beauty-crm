import { useEffect, useState, useMemo, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useNotificationsWebSocket } from '../../hooks/useNotificationsWebSocket';
import {
    LayoutDashboard,
    Users,
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
    Briefcase,
    CheckSquare,
    Send,
    Phone,
    Bell,
    MoreHorizontal,
    LayoutGrid,
    Link2,
    Clock,
    Package,
    Wallet,
    BarChart2,
    Gift,
    Layers,
    User
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { usePermissions } from '../../utils/permissions';
import { webrtcService } from '../../services/webrtc';
import { cn } from '../../lib/utils';
import {
    getUnauthenticatedCrmPathByGates,
    normalizePlatformGates,
} from '../../utils/platformRouting';
import './MainLayout.css';

interface MainLayoutProps {
    user: { id: number; role: string; secondary_role?: string; full_name: string; username?: string } | null;
    onLogout: () => void;
}

export const CRM_MENU_DEFAULT_ORDER = [
    'platform',
    'dashboard',
    'bookings',
    'chat-group',
    'funnel',
    'catalog-group',
    'finance-group',
    'tools-group',
    'settings-group'
];

export const CRM_MENU_GROUPS: Record<string, string[]> = {
    'chat-group': ['chat', 'internal-chat'],
    'catalog-group': ['services', 'team'],
    'finance-group': ['cashbox', 'inventory', 'gift-cards', 'service-bundles'],
    'tools-group': ['tasks', 'telephony', 'referral-links', 'kpi', 'waitlist'],
    'settings-group': ['settings', 'profile-link'],
};

type BusinessModuleBinding = {
    suite: 'crm' | 'site';
    module: string;
};

const MENU_MODULE_BINDINGS: Record<string, BusinessModuleBinding> = {
    platform: { suite: 'crm', module: 'settings' },
    dashboard: { suite: 'crm', module: 'dashboard' },
    bookings: { suite: 'crm', module: 'bookings' },
    team: { suite: 'crm', module: 'team' },
    services: { suite: 'crm', module: 'services' },
    tasks: { suite: 'crm', module: 'tasks' },
    funnel: { suite: 'crm', module: 'funnel' },
    telephony: { suite: 'crm', module: 'telephony' },
    'internal-chat': { suite: 'crm', module: 'internal_chat' },
    settings: { suite: 'crm', module: 'settings' },
    notifications: { suite: 'crm', module: 'notifications' },
};

type LayoutSalonSettings = {
    name?: string;
    logo_url?: string;
    business_profile_config?: {
        modules?: {
            crm?: Record<string, boolean>;
            site?: Record<string, boolean>;
        };
    };
};

export const buildCrmMenuCatalog = ({
    t,
    rolePrefix,
    dashboardPath,
    permissions,
}: {
    t: (key: string, options?: any) => string;
    rolePrefix: string;
    dashboardPath: string;
    permissions: any;
}) => {
    const items: Record<string, any> = {
        'platform': { icon: Briefcase, label: t('menu.platform_control', { defaultValue: 'Платформа' }), path: `${rolePrefix}/platform`, req: () => permissions.roleLevel >= 1000 },
        'dashboard': { icon: LayoutDashboard, label: t('menu.dashboard'), path: dashboardPath, req: () => true },
        'bookings': { icon: Calendar, label: t('menu.bookings'), path: `${rolePrefix}/bookings`, req: () => permissions.canViewAllBookings },
        'chat-group': { icon: MessageSquare, label: t('menu.chat'), req: () => true },
        'chat': { icon: MessageSquare, label: t('menu.chat'), path: `${rolePrefix}/chat`, req: () => true },
        'internal-chat': { icon: MessageCircle, label: t('menu.internal_chat'), path: `${rolePrefix}/internal-chat`, req: () => true },
        'funnel': { icon: Filter, label: t('menu.funnel'), path: `${rolePrefix}/funnel`, req: () => true },
        'catalog-group': { icon: LayoutGrid, label: t('menu.catalog'), req: () => true },
        'services': { icon: Scissors, label: t('menu.services'), path: `${rolePrefix}/services`, req: () => permissions.canEditServices },
        'team': { icon: Users, label: t('menu.team', { defaultValue: 'Команда' }), path: `${rolePrefix}/team`, req: () => permissions.roleLevel >= 70 },
        'tools-group': { icon: Briefcase, label: t('menu.tools'), req: () => true },
        'tasks': { icon: CheckSquare, label: t('menu.tasks'), path: `${rolePrefix}/tasks`, req: () => true },
        'telephony': { icon: Phone, label: t('menu.telephony'), path: `${rolePrefix}/telephony`, req: () => true },
        'referral-links': { icon: Link2, label: t('menu.referral_links', { defaultValue: 'Реклама' }), path: `${rolePrefix}/referral-links`, req: () => permissions.roleLevel >= 50 },
        'kpi': { icon: BarChart2, label: t('menu.kpi', { defaultValue: 'KPI' }), path: `${rolePrefix}/kpi`, req: () => permissions.roleLevel >= 50 },
        'waitlist': { icon: Clock, label: t('menu.waitlist', { defaultValue: 'Очередь' }), path: `${rolePrefix}/waitlist`, req: () => true },
        'finance-group': { icon: Wallet, label: t('menu.finance', { defaultValue: 'Финансы' }), req: () => permissions.roleLevel >= 50 },
        'cashbox': { icon: Wallet, label: t('menu.cashbox', { defaultValue: 'Касса' }), path: `${rolePrefix}/cashbox`, req: () => permissions.roleLevel >= 50 },
        'inventory': { icon: Package, label: t('menu.inventory', { defaultValue: 'Склад' }), path: `${rolePrefix}/inventory`, req: () => permissions.roleLevel >= 50 },
        'gift-cards': { icon: Gift, label: t('menu.gift_cards', { defaultValue: 'Сертификаты' }), path: `${rolePrefix}/gift-cards`, req: () => true },
        'service-bundles': { icon: Layers, label: t('menu.service_bundles', { defaultValue: 'Абонементы' }), path: `${rolePrefix}/service-bundles`, req: () => true },
        'settings-group': { icon: Settings, label: t('menu.settings'), req: () => permissions.canEditSettings || permissions.roleLevel >= 1 },
        'settings': { icon: Settings, label: t('menu.settings'), path: `${rolePrefix}/settings`, req: () => permissions.canEditSettings },
        'profile-link': { icon: User, label: t('menu.profile', { defaultValue: 'Профиль' }), path: `${rolePrefix}/settings/profile`, req: () => true },
    };

    return { items, groups: CRM_MENU_GROUPS, defaultOrder: CRM_MENU_DEFAULT_ORDER };
};

export default function UniversalLayout({ user, onLogout }: MainLayoutProps) {
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
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    const [internalChatUnreadCount, setInternalChatUnreadCount] = useState(0);
    const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
    const [mobileExpandedGroups, setMobileExpandedGroups] = useState<Set<string>>(new Set());
    const [menuSettings, setMenuSettings] = useState<{ menu_order: any[] | null; hidden_items: string[] | null } | null>(null);
    const [salonSettings, setSalonSettings] = useState<LayoutSalonSettings | null>(null);
    const sidebarNavRef = useRef<HTMLElement | null>(null);
    const lastDeniedPathRef = useRef<string>('');

    const permissions = usePermissions(user?.role || 'employee', user?.secondary_role);

    const normalizedPlatformGates = useMemo(() => normalizePlatformGates(salonSettings), [salonSettings]);
    const logoutPath = useMemo(
        () => getUnauthenticatedCrmPathByGates(
            normalizedPlatformGates.site_enabled,
            normalizedPlatformGates.crm_enabled,
        ),
        [normalizedPlatformGates.crm_enabled, normalizedPlatformGates.site_enabled],
    );

    const businessModules = useMemo(() => {
        const modules = salonSettings?.business_profile_config?.modules;
        if (modules && typeof modules === 'object') {
            return modules;
        }
        return null;
    }, [salonSettings]);

    const isModuleEnabled = useMemo(() => {
        return (menuId: string): boolean => {
            const binding = MENU_MODULE_BINDINGS[menuId];
            if (binding === undefined) {
                return true;
            }
            if (businessModules === null) {
                return true;
            }

            const suiteModules = businessModules[binding.suite];
            if (suiteModules === undefined || typeof suiteModules !== 'object') {
                return true;
            }

            const moduleFlag = suiteModules[binding.module];
            if (typeof moduleFlag === 'boolean') {
                return moduleFlag;
            }
            return true;
        };
    }, [businessModules]);

    const rolePrefix = useMemo(() => {
        const path = location.pathname;
        if (path.startsWith('/crm')) return '/crm';
        if (path.startsWith('/manager')) return '/manager';
        if (path.startsWith('/sales')) return '/sales';
        if (path.startsWith('/saler')) return '/sales';
        if (path.startsWith('/marketer')) return '/marketer';
        if (path.startsWith('/employee')) return '/employee';
        return '/crm';
    }, [location.pathname]);

    const dashboardPath = useMemo(() => {
        if (['sales', 'saler'].includes(user?.role ?? '')) return `${rolePrefix}/dashboard`;
        if (user?.role === 'marketer') return `${rolePrefix}/dashboard`;
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
        const handleMenuSettingsUpdated = () => {
            loadMenuSettings();
        };

        const handleMenuSettingsStorage = (event: StorageEvent) => {
            if (event.key === 'crm_menu_settings_updated_at') {
                loadMenuSettings();
            }
        };

        const handleWindowFocus = () => {
            loadMenuSettings();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadMenuSettings();
            }
        };

        const menuSettingsIntervalId = window.setInterval(() => {
            loadMenuSettings();
        }, 30000);

        window.addEventListener('crm-menu-settings-updated', handleMenuSettingsUpdated);
        window.addEventListener('storage', handleMenuSettingsStorage);
        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        webrtcService.onIncomingCall = (fromId: number, type: 'audio' | 'video', _status?: string, name?: string, photo?: string) => {
            setIncomingCall({ from: fromId, type, callerName: name, callerPhoto: photo });
        };

        return () => {
            window.clearInterval(menuSettingsIntervalId);
            window.removeEventListener('crm-menu-settings-updated', handleMenuSettingsUpdated);
            window.removeEventListener('storage', handleMenuSettingsStorage);
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        navigate(logoutPath);
    };

    const getRoleLabel = () => {
        switch (user?.role) {
            case 'super_admin': return t('roles.super_admin', { defaultValue: 'Platform Owner' });
            case 'director': return t('roles.director');
            case 'admin': return t('roles.admin');
            case 'accountant': return t('roles.accountant', { defaultValue: t('common:role_accountant', 'Бухгалтер') });
            case 'manager': return t('roles.manager');
            case 'sales': return t('roles.saler');
            case 'saler': return t('roles.saler');
            case 'marketer': return t('roles.marketer');
            default: return t('roles.employee');
        }
    };

    const allMenuItems: any[] = useMemo(() => {
        const crmCatalog = buildCrmMenuCatalog({
            t,
            rolePrefix,
            dashboardPath,
            permissions,
        });
        const items: Record<string, any> = crmCatalog.items;
        const groups: Record<string, string[]> = crmCatalog.groups;

        const finalItems: any[] = [];
        const savedOrderIds = Array.isArray(menuSettings?.menu_order)
            ? menuSettings.menu_order
                .map((entry: any) => {
                    if (typeof entry === 'string' && entry.length > 0) {
                        return entry;
                    }
                    if (typeof entry === 'object' && entry !== null && typeof entry.id === 'string' && entry.id.length > 0) {
                        return entry.id;
                    }
                    return '';
                })
                .filter((id: string) => id.length > 0)
            : [];
        const order = savedOrderIds.length > 0
            ? [
                ...savedOrderIds,
                ...CRM_MENU_DEFAULT_ORDER.filter((id) => !savedOrderIds.includes(id)),
            ]
            : CRM_MENU_DEFAULT_ORDER;

        order.forEach(id => {
            if (menuSettings?.hidden_items?.includes(id)) return;
            if (!isModuleEnabled(id)) return;
            const item = items[id];
            if (item && item.req()) {
                if (groups[id]) {
                    const subItems = groups[id]
                        .map((subid) => {
                            const subItem = items[subid];
                            if (!subItem) return null;
                            return { ...subItem, id: subid };
                        })
                        .filter((sub) => sub && sub.req() && !menuSettings?.hidden_items?.includes(sub.id) && isModuleEnabled(sub.id));

                    if (subItems.length > 0) {
                        finalItems.push({ ...item, id, items: subItems });
                    }
                } else {
                    finalItems.push({ ...item, id });
                }
            }
        });

        return finalItems;
    }, [t, rolePrefix, dashboardPath, permissions, user?.role, menuSettings, isModuleEnabled]);

    const menuItems = useMemo(() => {
        return allMenuItems.map((item: any) => {
            let badge = 0;
            if (item.id === 'chat-group') {
                badge = chatUnreadCount + internalChatUnreadCount;
            } else if (item.id === 'messengers') badge = chatUnreadCount;
            else if (item.id === 'internal-chat') badge = internalChatUnreadCount;

            const subItems = item.items?.map((sub: any) => {
                let subBadge = 0;
                if (sub.id === 'chat') subBadge = chatUnreadCount;
                else if (sub.id === 'messengers') subBadge = chatUnreadCount;
                else if (sub.id === 'internal-chat') subBadge = internalChatUnreadCount;
                return { ...sub, badge: subBadge };
            });

            return { ...item, badge, items: subItems };
        });
    }, [allMenuItems, chatUnreadCount, internalChatUnreadCount, notificationsUnreadCount]);

    const routeAccessEntries = useMemo(() => {
        const crmCatalog = buildCrmMenuCatalog({
            t,
            rolePrefix,
            dashboardPath,
            permissions,
        });
        const catalogItems: Record<string, any> = crmCatalog.items;

        return Object.entries(catalogItems)
            .map(([id, item]) => {
                const path = typeof item.path === 'string' ? item.path : '';
                if (path.length === 0) {
                    return null;
                }

                const hiddenBySettings = menuSettings?.hidden_items?.includes(id) === true;
                const allowedByRole = item.req() === true;
                const moduleEnabled = isModuleEnabled(id);

                return {
                    id,
                    path,
                    allowed: allowedByRole && hiddenBySettings !== true && moduleEnabled,
                };
            })
            .filter((entry): entry is { id: string; path: string; allowed: boolean } => entry !== null);
    }, [dashboardPath, menuSettings?.hidden_items, permissions, rolePrefix, t, user?.role, isModuleEnabled]);

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
        if (user?.role === 'super_admin') {
            return [
                { id: 'platform', icon: Briefcase, label: t('menu.platform_control', { defaultValue: 'Платформа' }), path: `${rolePrefix}/platform` },
                { id: 'team', icon: Users, label: t('menu.team', { defaultValue: 'Команда' }), path: `${rolePrefix}/team` },
                { id: 'chat', icon: MessageSquare, label: t('menu.chat'), path: `${rolePrefix}/chat`, badge: chatUnreadCount + internalChatUnreadCount },
                { id: 'settings', icon: Settings, label: t('menu.settings'), path: `${rolePrefix}/settings` },
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
    }, [t, dashboardPath, rolePrefix, chatUnreadCount, internalChatUnreadCount, notificationsUnreadCount, user?.role]);

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
            const tabParentRoutes = ['settings', 'bot-settings'];

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
            const tabKeyMap: Record<string, string> = {
                profile: 'settings:profile',
                general: 'settings:general',
                notifications: 'settings:notifications',
                subscriptions: 'settings:subscriptions',
                holidays: 'settings:holidays',
                roles: 'settings:manage_roles',
                security: 'settings:security',
                danger: 'settings:danger_zone',
                information: 'crm/users:tab_information',
                services: 'menu.services',
                online_booking: 'crm/users:tab_online_booking',
                settings: 'menu.settings',
                schedule: 'crm/users:tab_schedule',
                payroll: 'crm/users:tab_payroll',
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
        const matchedRoute = routeAccessEntries
            .filter((entry) => {
                if (location.pathname === entry.path) {
                    return true;
                }

                return location.pathname.startsWith(`${entry.path}/`);
            })
            .sort((left, right) => right.path.length - left.path.length)[0];

        if (matchedRoute === undefined) {
            return;
        }

        if (matchedRoute.allowed) {
            lastDeniedPathRef.current = '';
            return;
        }

        const fallbackPath = routeAccessEntries.find((entry) => entry.allowed)?.path ?? '';
        if (fallbackPath.length === 0 || fallbackPath === location.pathname) {
            return;
        }

        if (lastDeniedPathRef.current !== location.pathname) {
            toast.error(t('common:access_denied'));
            lastDeniedPathRef.current = location.pathname;
        }
        navigate(fallbackPath, { replace: true });
    }, [location.pathname, navigate, routeAccessEntries, t]);

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
                            <span className="text-lg font-semibold text-gray-700">
                                {(salonSettings?.name?.trim()?.charAt(0) ?? 'S').toUpperCase()}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="sidebar-brand-name">{salonSettings?.name ?? 'ST CRM'}</h1>
                            <div className="sidebar-brand-role">{getRoleLabel()}</div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav ref={sidebarNavRef} className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                        {menuItems.map((item: any) => {
                            const isGroup = !!(item.items && item.items.length > 0);
                            const isExpanded = expandedMenu === item.id;
                            const isActive = location.pathname === item.path || (isGroup && item.items.some((sub: any) => location.pathname === sub.path));

                            // Группа с одним подпунктом → рендерим как flat-пункт (показываем имя подпункта)
                            const isSingleChildGroup = isGroup && item.items.length === 1;
                            const singleChild = isSingleChildGroup ? item.items[0] : null;

                            return (
                                <li key={item.id} className="list-none mb-1">
                                    {isSingleChildGroup ? (
                                        <button
                                            onClick={() => navigate(singleChild.path)}
                                            className={cn(
                                                "w-full flex items-center gap-3 menu-item-premium",
                                                location.pathname === singleChild.path && "active"
                                            )}
                                        >
                                            <singleChild.icon size={20} className="shrink-0" />
                                            <span className="flex-1 text-left truncate">{singleChild.label}</span>
                                            {singleChild.badge > 0 && (
                                                <span className="badge-premium badge-premium-red badge-sidebar">
                                                    {singleChild.badge}
                                                </span>
                                            )}
                                        </button>
                                    ) : isGroup ? (
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
                                <button
                                    onClick={() => navigate(`${rolePrefix}/settings/profile`)}
                                    className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                                >
                                    <img
                                        src={getDynamicAvatar(user?.full_name || 'User')}
                                        alt="Avatar"
                                        className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</div>
                                        <div className="text-[11px] text-gray-400 font-medium truncate">@{user?.username || 'admin'}</div>
                                    </div>
                                </button>

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

                                const isMobileSingleChild = item.items && item.items.length === 1;
                                const mobileSingleChild = isMobileSingleChild ? item.items[0] : null;

                                return (
                                    <div key={item.id} className="menu-group">
                                        {isMobileSingleChild ? (
                                            <button
                                                onClick={() => { navigate(mobileSingleChild.path); setShowMoreModal(false); }}
                                                className={cn("menu-item-link", location.pathname === mobileSingleChild.path && "active")}
                                            >
                                                <mobileSingleChild.icon size={16} className="menu-item-icon" />
                                                <span className="menu-item-label">{mobileSingleChild.label}</span>
                                                {mobileSingleChild.badge > 0 && (
                                                    <span className="badge-premium badge-premium-red badge-sidebar">
                                                        {mobileSingleChild.badge}
                                                    </span>
                                                )}
                                            </button>
                                        ) : item.items ? (
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
                                        <Bell size={20} strokeWidth={2} className="text-gray-700" />
                                        {notificationsUnreadCount > 0 && (
                                            <span className="quick-action-badge">
                                                {notificationsUnreadCount > 99 ? '99+' : notificationsUnreadCount}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            </div>

                            <div className="profile-logout-row">
                                <button
                                    className="user-card-premium flex-1 text-left hover:opacity-80 transition-opacity"
                                    onClick={() => { navigate(`${rolePrefix}/settings/profile`); setShowMoreModal(false); }}
                                >
                                    <div className="user-card-content">
                                        <div className="relative shrink-0">
                                            <img
                                                src={getDynamicAvatar(user?.full_name || 'User')}
                                                alt="Avatar"
                                                className="user-avatar-img"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="user-name-premium">{user?.full_name}</div>
                                            <div className="user-role-premium">{getRoleLabel()}</div>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => { handleLogout(); setShowMoreModal(false); }}
                                    className="logout-btn-minimal"
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
