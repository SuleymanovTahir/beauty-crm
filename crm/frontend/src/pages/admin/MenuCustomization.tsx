import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GripVertical, Eye, EyeOff, RotateCcw, ArrowLeft, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Folder, Link as LinkIcon, X, LayoutGrid } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { buildCrmMenuCatalog, CRM_MENU_DEFAULT_ORDER, CRM_MENU_GROUPS } from '../../components/layouts/UniversalLayout';

interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    path?: string;
    type: 'group' | 'link';
    visible: boolean;
    children?: MenuItem[];
    isOpen?: boolean;
}

const ACCOUNT_MENU_DEFAULT_ORDER = [
    'account-main',
    'account-bonus-program',
    'account-profile-tools',
];

const ACCOUNT_MENU_GROUPS: Record<string, string[]> = {
    'account-main': ['dashboard', 'appointments', 'gallery', 'masters', 'beauty'],
    'account-bonus-program': ['loyalty', 'achievements', 'promocodes', 'specialoffers'],
    'account-profile-tools': ['notifications', 'settings'],
};

type CatalogItem = {
    label?: string;
    path?: string;
};

const buildMenuItemsFromCatalog = (
    catalogItems: Record<string, CatalogItem>,
    groups: Record<string, string[]>,
    defaultOrder: string[]
): MenuItem[] => {
    const result: MenuItem[] = [];

    defaultOrder.forEach((id) => {
        const item = catalogItems[id];
        if (item === undefined) {
            return;
        }

        const groupChildren = groups[id];
        if (Array.isArray(groupChildren)) {
            const children: MenuItem[] = [];
            groupChildren.forEach((childId) => {
                const child = catalogItems[childId];
                if (child === undefined) {
                    return;
                }
                children.push({
                    id: childId,
                    label: child.label ?? childId,
                    path: child.path,
                    type: 'link',
                    visible: true,
                });
            });

            result.push({
                id,
                label: item.label ?? id,
                type: 'group',
                visible: true,
                isOpen: true,
                children,
            });
            return;
        }

        result.push({
            id,
            label: item.label ?? id,
            path: item.path,
            type: 'link',
            visible: true,
        });
    });

    return result;
};

export default function MenuCustomization() {
    const { t } = useTranslation([
        'admin/menucustomization',
        'account',
        'layouts/mainlayout',
        'layouts/adminpanellayout',
        'adminpanel/loyaltymanagement',
        'admin/settings',
        'common'
    ]);
    const navigate = useNavigate();
    const location = useLocation();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [draggedItem, setDraggedItem] = useState<{ index: number; parentId: string | null } | null>(null);
    const [applyMode, setApplyMode] = useState<'all' | 'selected'>('all');
    const [targetClientIds, setTargetClientIds] = useState<string[]>([]);
    const [clients, setClients] = useState<Array<{ id: string; label: string }>>([]);
    const autosaveTimerRef = useRef<number | null>(null);
    const lastSavedSnapshotRef = useRef<string>('');
    const hasLoadedSettingsRef = useRef<boolean>(false);

    const rolePrefix = useMemo(() => {
        if (location.pathname.startsWith('/admin')) return '/admin';
        if (location.pathname.startsWith('/crm')) return '/crm';
        if (location.pathname.startsWith('/manager')) return '/manager';
        if (location.pathname.startsWith('/sales')) return '/sales';
        if (location.pathname.startsWith('/marketer')) return '/marketer';
        if (location.pathname.startsWith('/employee')) return '/employee';
        return '/crm';
    }, [location.pathname]);

    const portalMode = useMemo(() => {
        const searchParams = new URLSearchParams(location.search);
        return searchParams.get('portal') === 'account' ? 'account' : 'crm';
    }, [location.search]);

    const crmCatalog = useMemo(
        () => buildCrmMenuCatalog({
            t: (key: string, options?: any) => {
                const translated = key.includes(':')
                    ? t(key, options)
                    : t(`layouts/mainlayout:${key}`, options);
                return typeof translated === 'string' ? translated : String(translated);
            },
            rolePrefix: '/crm',
            dashboardPath: '/crm/dashboard',
            permissions: {
                canViewAllBookings: true,
                canEditServices: true,
                canViewAnalytics: true,
                roleLevel: 100,
                canEditSettings: true,
                canViewBotSettings: true,
            },
            userRole: 'director',
        }),
        [t]
    );

    const SYSTEM_LIBRARY: Partial<MenuItem>[] = useMemo(() => {
        const result: Partial<MenuItem>[] = [];
        const groupedIds = new Set<string>();

        Object.values(CRM_MENU_GROUPS).forEach((children) => {
            children.forEach((id) => groupedIds.add(id));
        });

        Object.entries(crmCatalog.items).forEach(([id, item]) => {
            if (groupedIds.has(id)) {
                result.push({
                    id,
                    label: item.label,
                    path: item.path,
                    type: 'link',
                });
                return;
            }

            if (item.path === undefined) {
                return;
            }

            result.push({
                id,
                label: item.label,
                path: item.path,
                type: 'link',
            });
        });

        return result;
    }, [crmCatalog]);

    const defaultMenuItems: MenuItem[] = useMemo(
        () => buildMenuItemsFromCatalog(crmCatalog.items, CRM_MENU_GROUPS, CRM_MENU_DEFAULT_ORDER),
        [crmCatalog]
    );

    const accountCatalog = useMemo(
        () => ({
            'account-main': { label: t('account_menu_group_main', { defaultValue: 'Основные разделы' }) },
            'account-bonus-program': { label: t('account_menu_group_bonus_program', { defaultValue: 'Бонусная программа' }) },
            'account-profile-tools': { label: t('account_menu_group_profile_tools', { defaultValue: 'Профиль и настройки' }) },
            dashboard: { label: t('account:tabs.dashboard', { defaultValue: 'Главная' }), path: '/account/dashboard' },
            appointments: { label: t('account:tabs.appointments', { defaultValue: 'Записи' }), path: '/account/appointments' },
            gallery: { label: t('account:tabs.gallery', { defaultValue: 'Галерея' }), path: '/account/gallery' },
            masters: { label: t('account:tabs.masters', { defaultValue: 'Мастера' }), path: '/account/masters' },
            beauty: { label: t('account:tabs.beauty', { defaultValue: 'Уход и рекомендации' }), path: '/account/beauty' },
            loyalty: { label: t('adminpanel/loyaltymanagement:title', { defaultValue: 'Бонусная программа' }), path: '/account/loyalty' },
            achievements: { label: t('layouts/mainlayout:menu.challenges', { defaultValue: 'Челленджи' }), path: '/account/achievements' },
            promocodes: { label: t('layouts/mainlayout:menu.promo_codes', { defaultValue: 'Промокоды' }), path: '/account/promocodes' },
            specialoffers: { label: t('account:settings.special_offers', { defaultValue: 'Специальные предложения' }), path: '/account/special-offers' },
            notifications: { label: t('account:tabs.notifications', { defaultValue: 'Уведомления' }), path: '/account/notifications' },
            settings: { label: t('account:tabs.settings', { defaultValue: 'Настройки' }), path: '/account/settings' },
        }),
        [t]
    );

    const accountDefaultMenuItems: MenuItem[] = useMemo(
        () => buildMenuItemsFromCatalog(accountCatalog, ACCOUNT_MENU_GROUPS, ACCOUNT_MENU_DEFAULT_ORDER),
        [accountCatalog]
    );

    // Modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState<{ item: MenuItem | null; parentId: string | null }>({ item: null, parentId: null });
    const [editForm, setEditForm] = useState({ label: '', path: '', type: 'link' as 'group' | 'link' });

    useEffect(() => {
        hasLoadedSettingsRef.current = false;
        loadMenuSettings();
    }, [portalMode, defaultMenuItems, accountDefaultMenuItems]);

    const applyHiddenItemsToMenu = (items: MenuItem[], hiddenItems: string[]) => {
        const hiddenSet = new Set(hiddenItems);
        const applyVisibility = (source: MenuItem[]): MenuItem[] => {
            return source.map((item) => ({
                ...item,
                visible: !hiddenSet.has(item.id),
                children: Array.isArray(item.children) ? applyVisibility(item.children) : undefined,
            }));
        };
        return applyVisibility(items);
    };

    const getHiddenIds = (items: MenuItem[]): string[] => {
        let ids: string[] = [];
        items.forEach((item) => {
            if (item.visible !== true) {
                ids.push(item.id);
            }
            if (Array.isArray(item.children)) {
                ids = [...ids, ...getHiddenIds(item.children)];
            }
        });
        return ids;
    };

    const normalizeMenuOrderIds = (rawMenuOrder: unknown): string[] => {
        if (!Array.isArray(rawMenuOrder)) {
            return [];
        }

        const ids: string[] = [];
        rawMenuOrder.forEach((entry) => {
            if (typeof entry === 'string' && entry.length > 0) {
                ids.push(entry);
                return;
            }

            if (typeof entry === 'object' && entry !== null) {
                const maybeId = (entry as { id?: unknown }).id;
                if (typeof maybeId === 'string' && maybeId.length > 0) {
                    ids.push(maybeId);
                }
            }
        });

        const uniqueIds: string[] = [];
        ids.forEach((id) => {
            if (uniqueIds.includes(id)) {
                return;
            }
            uniqueIds.push(id);
        });

        return uniqueIds;
    };

    const cloneMenuItems = (items: MenuItem[]): MenuItem[] => {
        return items.map((item) => ({
            ...item,
            children: Array.isArray(item.children) ? cloneMenuItems(item.children) : undefined,
        }));
    };

    const buildCrmMenuFromOrder = (rawMenuOrder: unknown): MenuItem[] => {
        const orderedIds = normalizeMenuOrderIds(rawMenuOrder);
        const defaultById = new Map<string, MenuItem>();
        defaultMenuItems.forEach((item) => {
            defaultById.set(item.id, item);
        });

        const orderedItems: MenuItem[] = [];
        orderedIds.forEach((id) => {
            const item = defaultById.get(id);
            if (item === undefined) {
                return;
            }
            orderedItems.push({
                ...item,
                children: Array.isArray(item.children) ? cloneMenuItems(item.children) : undefined,
            });
            defaultById.delete(id);
        });

        defaultMenuItems.forEach((item) => {
            if (defaultById.has(item.id) === false) {
                return;
            }
            orderedItems.push({
                ...item,
                children: Array.isArray(item.children) ? cloneMenuItems(item.children) : undefined,
            });
        });

        return orderedItems;
    };

    const buildSaveSnapshot = (
        items: MenuItem[],
        nextApplyMode: 'all' | 'selected',
        nextTargetClientIds: string[]
    ): string => {
        const hiddenItems = getHiddenIds(items).sort();
        if (portalMode === 'account') {
            const normalizedTargets = [...nextTargetClientIds].sort();
            return JSON.stringify({
                portal: portalMode,
                hidden_items: hiddenItems,
                apply_mode: nextApplyMode,
                target_client_ids: normalizedTargets,
            });
        }

        return JSON.stringify({
            portal: portalMode,
            hidden_items: hiddenItems,
            menu_order: items.map((item) => item.id),
        });
    };

    const persistMenuSettings = async (
        itemsToSave: MenuItem[],
        nextApplyMode: 'all' | 'selected',
        nextTargetClientIds: string[],
        showToast: boolean
    ) => {
        const hidden_items = getHiddenIds(itemsToSave);
        if (portalMode === 'account') {
            localStorage.setItem('account_menu_hidden_items_preview', JSON.stringify(hidden_items));
            await api.saveAccountMenuSettings({
                hidden_items,
                apply_mode: nextApplyMode,
                target_client_ids: nextApplyMode === 'selected' ? nextTargetClientIds : [],
            });
        } else {
            await api.saveMenuSettings({
                menu_order: itemsToSave.map((item) => item.id),
                hidden_items,
            });
            localStorage.setItem('crm_menu_settings_updated_at', String(Date.now()));
            window.dispatchEvent(new Event('crm-menu-settings-updated'));
        }

        lastSavedSnapshotRef.current = buildSaveSnapshot(itemsToSave, nextApplyMode, nextTargetClientIds);
        setAutoSaveStatus('saved');
        if (showToast) {
            toast.success(t('settings_saved'));
        }
    };

    const loadClients = async () => {
        try {
            const response = await api.getClients('all');
            const allClients = Array.isArray(response?.clients) ? response.clients : [];
            setClients(
                allClients.map((client: any) => ({
                    id: String(client.instagram_id ?? client.id ?? ''),
                    label: String(client.display_name ?? client.name ?? client.username ?? client.instagram_id ?? ''),
                })).filter((client: { id: string; label: string }) => client.id.length > 0)
            );
        } catch (error) {
            setClients([]);
        }
    };

    const loadMenuSettings = async () => {
        try {
            setLoading(true);
            setAutoSaveStatus('idle');

            if (portalMode === 'account') {
                const [settings] = await Promise.all([
                    api.getAccountMenuSettings(),
                    loadClients(),
                ]);

                const hiddenItems = Array.isArray(settings.hidden_items) ? settings.hidden_items : [];
                const loadedApplyMode: 'all' | 'selected' = settings.apply_mode === 'selected' ? 'selected' : 'all';
                const loadedTargetClientIds = Array.isArray(settings.target_client_ids) ? settings.target_client_ids : [];
                const loadedMenuItems = applyHiddenItemsToMenu(accountDefaultMenuItems, hiddenItems);

                setApplyMode(loadedApplyMode);
                setTargetClientIds(loadedTargetClientIds);
                setMenuItems(loadedMenuItems);
                lastSavedSnapshotRef.current = buildSaveSnapshot(loadedMenuItems, loadedApplyMode, loadedTargetClientIds);
                hasLoadedSettingsRef.current = true;
                setAutoSaveStatus('saved');
                return;
            }

            const settings = await api.getMenuSettings();
            const hiddenItems = Array.isArray(settings.hidden_items) ? settings.hidden_items : [];
            const orderedMenuItems = buildCrmMenuFromOrder(settings.menu_order);
            const loadedMenuItems = applyHiddenItemsToMenu(orderedMenuItems, hiddenItems);

            setMenuItems(loadedMenuItems);
            lastSavedSnapshotRef.current = buildSaveSnapshot(loadedMenuItems, applyMode, targetClientIds);
            hasLoadedSettingsRef.current = true;
            setAutoSaveStatus('saved');
        } catch (error) {
            if (portalMode === 'account') {
                const fallbackMenuItems = accountDefaultMenuItems;
                setMenuItems(fallbackMenuItems);
                setApplyMode('all');
                setTargetClientIds([]);
                lastSavedSnapshotRef.current = buildSaveSnapshot(fallbackMenuItems, 'all', []);
            } else {
                const fallbackMenuItems = defaultMenuItems;
                setMenuItems(fallbackMenuItems);
                lastSavedSnapshotRef.current = buildSaveSnapshot(fallbackMenuItems, applyMode, targetClientIds);
            }
            hasLoadedSettingsRef.current = true;
            setAutoSaveStatus('error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (loading || !hasLoadedSettingsRef.current) {
            return;
        }

        const nextSnapshot = buildSaveSnapshot(menuItems, applyMode, targetClientIds);
        if (nextSnapshot === lastSavedSnapshotRef.current) {
            setAutoSaveStatus((previousStatus) => previousStatus === 'saving' ? 'saved' : previousStatus);
            return;
        }

        if (autosaveTimerRef.current !== null) {
            window.clearTimeout(autosaveTimerRef.current);
        }

        setAutoSaveStatus('saving');
        autosaveTimerRef.current = window.setTimeout(() => {
            void persistMenuSettings(menuItems, applyMode, targetClientIds, false).catch(() => {
                setAutoSaveStatus('error');
            });
        }, 500);

        return () => {
            if (autosaveTimerRef.current !== null) {
                window.clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
        };
    }, [applyMode, loading, menuItems, targetClientIds]);

    useEffect(() => {
        return () => {
            if (autosaveTimerRef.current !== null) {
                window.clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
        };
    }, []);

    const handleReset = async () => {
        if (!confirm(t('reset_confirm'))) return;
        if (portalMode === 'account') {
            setMenuItems(accountDefaultMenuItems);
            setApplyMode('all');
            setTargetClientIds([]);
            return;
        }
        setMenuItems(defaultMenuItems);
    };

    const toggleVisibility = (id: string) => {
        const applyVisibilityRecursive = (items: MenuItem[], nextVisible: boolean): MenuItem[] => {
            return items.map((entry) => ({
                ...entry,
                visible: nextVisible,
                children: Array.isArray(entry.children)
                    ? applyVisibilityRecursive(entry.children, nextVisible)
                    : undefined,
            }));
        };

        const updateVisibility = (items: MenuItem[]): MenuItem[] => {
            return items.map(item => {
                if (item.id === id) {
                    const nextVisible = !item.visible;
                    if (item.type === 'group' && Array.isArray(item.children)) {
                        return {
                            ...item,
                            visible: nextVisible,
                            children: applyVisibilityRecursive(item.children, nextVisible),
                        };
                    }

                    return { ...item, visible: nextVisible };
                }
                if (item.children) return { ...item, children: updateVisibility(item.children) };
                return item;
            });
        };
        const nextMenuItems = updateVisibility(menuItems);
        setMenuItems(nextMenuItems);
    };

    const toggleGroup = (id: string) => {
        setMenuItems(prev => prev.map(item => item.id === id ? { ...item, isOpen: !item.isOpen } : item));
    };

    // --- CRUD ---

    const addItemFromLibrary = (libItem: Partial<MenuItem>, parentId: string | null = null) => {
        const newItem: MenuItem = {
            id: libItem.id!,
            label: libItem.label!,
            path: libItem.path,
            type: libItem.type as any,
            visible: true,
            children: libItem.type === 'group' ? [] : undefined
        };

        if (parentId) {
            setMenuItems(prev => addItemToGroupRecursive(prev, parentId, newItem));
        } else {
            setMenuItems(prev => [...prev.filter(i => i.id !== newItem.id), newItem]);
        }
    };

    const openAddModal = (parentId: string | null = null, type: 'group' | 'link' = 'link') => {
        setEditingItem({ item: null, parentId });
        setEditForm({ label: '', path: '', type });
        setShowEditModal(true);
    };

    const openEditModal = (item: MenuItem, parentId: string | null = null) => {
        setEditingItem({ item, parentId });
        setEditForm({ label: item.label, path: item.path || '', type: item.type });
        setShowEditModal(true);
    };

    const handleSaveItem = () => {
        if (!editForm.label) return toast.error(t('common:fill_fields'));
        const newItem: MenuItem = {
            id: editingItem.item?.id || `custom_${Date.now()}`,
            label: editForm.label,
            path: editForm.type === 'link' ? editForm.path : undefined,
            type: editForm.type,
            visible: editingItem.item?.visible ?? true,
            children: editingItem.item?.children || (editForm.type === 'group' ? [] : undefined),
        };
        if (editingItem.item) setMenuItems(prev => updateItemRecursive(prev, newItem.id, newItem));
        else {
            if (editingItem.parentId) setMenuItems(prev => addItemToGroupRecursive(prev, editingItem.parentId!, newItem));
            else setMenuItems(prev => [...prev, newItem]);
        }
        setShowEditModal(false);
    };

    const updateItemRecursive = (items: MenuItem[], id: string, updated: MenuItem): MenuItem[] => {
        return items.map(item => {
            if (item.id === id) return updated;
            if (item.children) return { ...item, children: updateItemRecursive(item.children, id, updated) };
            return item;
        });
    };

    const addItemToGroupRecursive = (items: MenuItem[], groupId: string, newItem: MenuItem): MenuItem[] => {
        return items.map(item => {
            if (item.id === groupId) return { ...item, children: [...(item.children?.filter(c => c.id !== newItem.id) || []), newItem], isOpen: true };
            if (item.children) return { ...item, children: addItemToGroupRecursive(item.children, groupId, newItem) };
            return item;
        });
    };

    const handleDeleteItem = (id: string) => {
        if (!confirm(t('delete_confirm'))) return;
        const deleteRecursive = (items: MenuItem[]): MenuItem[] => {
            return items.filter(item => item.id !== id).map(item => ({ ...item, children: item.children ? deleteRecursive(item.children) : undefined }));
        };
        setMenuItems(deleteRecursive(menuItems));
    };

    const handleDragStart = (index: number, parentId: string | null) => setDraggedItem({ index, parentId });
    const handleDragOver = (e: React.DragEvent, index: number, parentId: string | null) => {
        e.preventDefault();
        if (!draggedItem) return;
        if (draggedItem.index === index && draggedItem.parentId === parentId) return;

        const newItems = JSON.parse(JSON.stringify(menuItems)) as MenuItem[];

        let sourceList: MenuItem[] | undefined;
        if (draggedItem.parentId === null) sourceList = newItems;
        else sourceList = findGroupById(newItems, draggedItem.parentId!)?.children;

        let targetList: MenuItem[] | undefined;
        if (parentId === null) targetList = newItems;
        else targetList = findGroupById(newItems, parentId!)?.children;

        if (sourceList && targetList) {
            const item = sourceList[draggedItem.index];
            if (!item) return;

            // Prevent dragging a group into itself or its children
            if (item.type === 'group' && parentId !== null) {
                if (parentId === item.id || isChildOf(item, parentId)) return;
            }

            sourceList.splice(draggedItem.index, 1);
            targetList.splice(index, 0, item);

            setMenuItems(newItems);
            setDraggedItem({ index, parentId });
        }
    };

    const isChildOf = (parent: MenuItem, childId: string): boolean => {
        if (!parent.children) return false;
        return parent.children.some(c => c.id === childId || isChildOf(c, childId));
    };
    const findGroupById = (items: MenuItem[], id: string): MenuItem | null => {
        for (const item of items) {
            if (item.id === id) return item;
            if (item.children) { const found = findGroupById(item.children, id); if (found) return found; }
        }
        return null;
    };

    const renderMenuItem = (item: MenuItem, index: number, parentId: string | null = null, depth: number = 0) => {
        const isGroup = item.type === 'group';
        const canEditStructure = portalMode === 'crm';
        return (
            <div key={item.id} className="space-y-1">
                <div
                    draggable={canEditStructure}
                    onDragStart={() => {
                        if (canEditStructure) {
                            handleDragStart(index, parentId);
                        }
                    }}
                    onDragOver={(e) => {
                        if (canEditStructure) {
                            handleDragOver(e, index, parentId);
                        }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all group ${depth > 0 ? 'ml-8' : ''} ${draggedItem?.index === index && draggedItem?.parentId === parentId ? 'border-blue-500 bg-blue-50 shadow-lg' :
                        item.visible ? 'border-gray-50 bg-white hover:border-blue-100 shadow-sm' : 'border-gray-50 bg-gray-50/50 opacity-60'
                        }`}
                >
                    <div className={`flex items-center gap-2 flex-1 ${canEditStructure ? 'cursor-move' : ''}`}>
                        {canEditStructure ? <GripVertical className="w-5 h-5 text-gray-300" /> : <div className="w-5" />}
                        {isGroup ? (
                            <button onClick={() => toggleGroup(item.id)} className="p-1 hover:bg-gray-100 rounded">
                                {item.isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        ) : <div className="w-6" />}
                        <div className={`p-2 rounded-lg ${isGroup ? 'bg-pink-50' : 'bg-gray-50'}`}>
                            {isGroup ? <Folder className="w-4 h-4 text-pink-600" /> : <LinkIcon className="w-4 h-4 text-gray-600" />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">{item.label}</span>
                            {!isGroup && item.path && <span className="text-[10px] text-gray-400 font-mono italic">{item.path}</span>}
                        </div>
                    </div>
                    {canEditStructure && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isGroup && (
                            <button onClick={() => openAddModal(item.id, 'link')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                <Plus className="w-4 h-4" />
                                <span className="text-xs font-bold">{t('sub_item')}</span>
                            </button>
                            )}
                            <button onClick={() => openEditModal(item, parentId)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <button onClick={() => toggleVisibility(item.id)} className={`p-2 rounded-lg ${item.visible ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}>
                        {item.visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                </div>
                {isGroup && item.isOpen && item.children && (
                    <div className="space-y-1">{item.children.map((child, idx) => renderMenuItem(child, idx, item.id, depth + 1))}</div>
                )}
            </div>
        );
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;

    const autosaveStatusLabel = autoSaveStatus === 'saving'
        ? t('autosave_saving', { defaultValue: 'Автосохранение...' })
        : autoSaveStatus === 'error'
            ? t('autosave_error', { defaultValue: 'Ошибка автосохранения' })
            : t('autosave_saved', { defaultValue: 'Сохраняется автоматически' });

    return (
        <div className="p-8 max-w-[1400px] mx-auto pb-32">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate(`${rolePrefix}/settings`)} className="p-3 bg-white hover:shadow-xl rounded-2xl border border-gray-100 transition-all"><ArrowLeft className="w-6 h-6" /></button>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
                            {portalMode === 'account'
                                ? t('account_menu_title', { defaultValue: 'Настройка меню клиента' })
                                : t('title')}
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium italic text-lg opacity-80">
                            {portalMode === 'account'
                                ? t('account_menu_subtitle', { defaultValue: 'Скрывайте разделы в личном кабинете для всех клиентов или выбранных профилей' })
                                : t('subtitle')}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className={`text-sm font-medium ${autoSaveStatus === 'error' ? 'text-red-500' : 'text-gray-500'}`}>
                        {autosaveStatusLabel}
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={handleReset} className="rounded-2xl h-12 px-6 border-2 font-bold hover:bg-gray-50 border-gray-100"><RotateCcw className="w-4 h-4 mr-2" />{t('reset')}</Button>
                    </div>
                </div>
            </div>

            <div className="flex gap-8 items-start">
                <div className="flex-1 space-y-4">
                    <div className="bg-white rounded-[32px] shadow-2xl shadow-blue-500/5 p-8 border border-gray-100 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                    {portalMode === 'account'
                                        ? t('account_visible_items', { defaultValue: 'Пункты меню клиента' })
                                        : t('working_structure')}
                                </h2>
                                <p className="text-sm text-gray-400 font-medium">
                                    {portalMode === 'account'
                                        ? t('account_hide_hint', { defaultValue: 'Отключенные пункты исчезнут в личном кабинете' })
                                        : t('drag_hint')}
                                </p>
                            </div>
                            {portalMode === 'crm' && (
                                <div className="flex gap-2">
                                    <Button onClick={() => openAddModal(null, 'group')} className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl h-10 px-4 font-bold shadow-lg shadow-pink-200"><Plus className="w-4 h-4 mr-2" /> {t('add_group')}</Button>
                                    <Button onClick={() => openAddModal(null, 'link')} variant="outline" className="rounded-xl h-10 px-4 font-bold border-gray-200"><Plus className="w-4 h-4 mr-2" /> {t('custom_link')}</Button>
                                </div>
                            )}
                        </div>

                        {portalMode === 'account' && (
                            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                                <div className="text-sm font-semibold text-gray-700">
                                    {t('account_apply_mode_title', { defaultValue: 'Кому применить скрытые пункты' })}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setApplyMode('all')}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${applyMode === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                                    >
                                        {t('account_apply_mode_all', { defaultValue: 'Всем клиентам' })}
                                    </button>
                                    <button
                                        onClick={() => setApplyMode('selected')}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${applyMode === 'selected' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                                    >
                                        {t('account_apply_mode_selected', { defaultValue: 'Только выбранным' })}
                                    </button>
                                </div>

                                {applyMode === 'selected' && (
                                    <div className="bg-white border border-gray-200 rounded-xl p-3 max-h-52 overflow-y-auto">
                                        <div className="text-xs text-gray-500 mb-2">
                                            {t('account_select_clients', { defaultValue: 'Выберите клиентов:' })}
                                        </div>
                                        <div className="space-y-2">
                                            {clients.map((client) => {
                                                const checked = targetClientIds.includes(client.id);
                                                return (
                                                    <label key={client.id} className="flex items-center gap-2 text-sm text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={(event) => {
                                                                setTargetClientIds((prev) => {
                                                                    if (event.target.checked) {
                                                                        return [...prev, client.id];
                                                                    }
                                                                    return prev.filter((value) => value !== client.id);
                                                                });
                                                            }}
                                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span>{client.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="space-y-3">{menuItems.map((item, index) => renderMenuItem(item, index))}</div>
                    </div>
                </div>

                {portalMode === 'crm' && (
                    <div className="w-[350px] shrink-0 sticky top-8">
                        <div className="bg-gray-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-white/10 rounded-xl"><LayoutGrid className="w-6 h-6" /></div>
                            <h3 className="text-xl font-black tracking-tight">{t('library_title')}</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-6 font-medium leading-relaxed">{t('library_hint')}</p>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {SYSTEM_LIBRARY.map(lib => {
                                const exists = JSON.stringify(menuItems).includes(lib.id!);
                                return (
                                    <div key={lib.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${exists ? 'border-white/5 opacity-40 bg-white/5' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">{lib.label}</span>
                                            <span className="text-[10px] text-gray-500 font-mono tracking-tighter">{lib.path}</span>
                                        </div>
                                        {!exists && (
                                            <button onClick={() => addItemFromLibrary(lib)} className="p-2 bg-blue-500 hover:bg-blue-400 rounded-xl transition-all shadow-lg shadow-blue-500/20"><Plus className="w-4 h-4 text-white" /></button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    </div>
                )}
            </div>

            {showEditModal && portalMode === 'crm' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-in fade-in transition-all">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 p-10 border border-gray-100">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{editingItem.item ? t('edit') : t('confirm')}</h3>
                            <button onClick={() => setShowEditModal(false)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition-all"><X className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-3">{t('item_type')}</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setEditForm(p => ({ ...p, type: 'link' }))} className={`p-5 rounded-3xl border-3 transition-all flex flex-col items-center gap-3 ${editForm.type === 'link' ? 'border-blue-600 bg-blue-50/50 shadow-inner' : 'border-gray-50 bg-gray-50/50 opacity-60'}`}><LinkIcon className={`w-8 h-8 ${editForm.type === 'link' ? 'text-blue-600' : 'text-gray-400'}`} /><span className="text-sm font-black">{t('link')}</span></button>
                                    <button onClick={() => setEditForm(p => ({ ...p, type: 'group' }))} className={`p-5 rounded-3xl border-3 transition-all flex flex-col items-center gap-3 ${editForm.type === 'group' ? 'border-blue-600 bg-blue-50/50 shadow-inner' : 'border-gray-50 bg-gray-50/50 opacity-60'}`}><Folder className={`w-8 h-8 ${editForm.type === 'group' ? 'text-blue-600' : 'text-gray-400'}`} /><span className="text-sm font-black">{t('group')}</span></button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-3">{t('label')}</label>
                                <Input value={editForm.label} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} className="rounded-2xl h-14 text-lg border-2 border-gray-100 font-bold focus:border-blue-500 transition-all px-6" />
                            </div>
                            {editForm.type === 'link' && (
                                <div>
                                    <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-3">{t('path')}</label>
                                    <Input value={editForm.path} onChange={e => setEditForm(p => ({ ...p, path: e.target.value }))} placeholder="/crm/..." className="rounded-2xl h-14 text-sm font-mono border-2 border-gray-100 focus:border-blue-500 transition-all px-6" />
                                </div>
                            )}
                        </div>
                        <div className="mt-10 flex gap-4"><Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1 rounded-2xl h-14 font-bold border-2 border-gray-100">{t('cancel')}</Button><Button onClick={handleSaveItem} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 font-black text-lg shadow-xl">{t('confirm')}</Button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
