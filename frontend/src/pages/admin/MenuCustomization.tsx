import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GripVertical, Eye, EyeOff, RotateCcw, ArrowLeft, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Folder, Link as LinkIcon, X, LayoutGrid } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';

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

export default function MenuCustomization() {
    const { t } = useTranslation(['admin/menucustomization', 'common']);
    const navigate = useNavigate();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [draggedItem, setDraggedItem] = useState<{ index: number; parentId: string | null } | null>(null);

    // Modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState<{ item: MenuItem | null; parentId: string | null }>({ item: null, parentId: null });
    const [editForm, setEditForm] = useState({ label: '', path: '', type: 'link' as 'group' | 'link' });

    // Список всех стандартных системных пунктов для быстрого добавления
    const SYSTEM_LIBRARY: Partial<MenuItem>[] = [
        { id: 'dashboard', label: t('items.dashboard'), path: '/crm/dashboard', type: 'link' },
        { id: 'bookings', label: t('items.bookings'), path: '/crm/bookings', type: 'link' },
        { id: 'calendar', label: t('items.calendar'), path: '/crm/calendar', type: 'link' },
        { id: 'clients', label: t('items.clients'), path: '/crm/clients', type: 'link' },
        { id: 'internal-chat', label: t('items.internal_chat'), path: '/crm/internal-chat', type: 'link' },
        { id: 'funnel', label: t('items.funnel'), path: '/crm/funnel', type: 'link' },
        { id: 'services', label: t('items.services'), path: '/crm/services', type: 'link' },
        { id: 'service-requests', label: t('items.service_requests'), path: '/crm/service-change-requests', type: 'link' },
        { id: 'products', label: t('items.products'), path: '/crm/products', type: 'link' },
        { id: 'analytics', label: t('items.analytics'), path: '/crm/analytics', type: 'link' },
        { id: 'visitors', label: t('items.visitors'), path: '/crm/visitor-analytics', type: 'link' },
        { id: 'invoices', label: t('items.invoices'), path: '/crm/invoices', type: 'link' },
        { id: 'contracts', label: t('items.contracts'), path: '/crm/contracts', type: 'link' },
        { id: 'tasks', label: t('items.tasks'), path: '/crm/tasks', type: 'link' },
        { id: 'broadcasts', label: t('items.broadcasts'), path: '/crm/broadcasts', type: 'link' },
        { id: 'telephony', label: t('items.telephony'), path: '/crm/telephony', type: 'link' },
        { id: 'messengers', label: t('items.messengers'), path: '/crm/messengers', type: 'link' },
        { id: 'payment-integrations', label: t('items.payment_integrations'), path: '/crm/payment-integrations', type: 'link' },
        { id: 'marketplace-integrations', label: t('items.marketplace_integrations'), path: '/crm/marketplace-integrations', type: 'link' },
        { id: 'app-settings', label: t('items.settings'), path: '/crm/settings', type: 'link' },
        { id: 'users', label: t('items.users'), path: '/crm/users', type: 'link' },
        { id: 'public-content', label: t('items.public_content'), path: '/crm/public-content', type: 'link' },
        { id: 'bot-settings', label: t('items.bot_settings'), path: '/crm/bot-settings', type: 'link' },
        { id: 'audit-log', label: t('items.audit_log'), path: '/crm/audit-log', type: 'link' },
        { id: 'trash', label: t('items.trash'), path: '/crm/trash', type: 'link' },
    ];

    const defaultMenuItems: MenuItem[] = [
        { id: 'dashboard', label: t('items.dashboard'), path: '/crm/dashboard', type: 'link', visible: true },
        { id: 'bookings', label: t('items.bookings'), path: '/crm/bookings', type: 'link', visible: true },
        { id: 'clients', label: t('items.clients'), path: '/crm/clients', type: 'link', visible: true },
        {
            id: 'chat-group', label: t('items.chat'), type: 'group', visible: true, isOpen: true, children: [
                { id: 'internal-chat', label: t('items.internal_chat'), path: '/crm/internal-chat', type: 'link', visible: true }
            ]
        },
        { id: 'calendar', label: t('items.calendar'), path: '/crm/calendar', type: 'link', visible: true },
        { id: 'funnel', label: t('items.funnel'), path: '/crm/funnel', type: 'link', visible: true },
        {
            id: 'catalog-group', label: t('items.catalog'), type: 'group', visible: true, isOpen: true, children: [
                { id: 'services', label: t('items.services'), path: '/crm/services', type: 'link', visible: true },
                { id: 'service-requests', label: t('items.service_requests'), path: '/crm/service-change-requests', type: 'link', visible: true },
                { id: 'products', label: t('items.products'), path: '/crm/products', type: 'link', visible: true }
            ]
        },
        {
            id: 'analytics-group', label: t('items.analytics'), type: 'group', visible: true, isOpen: true, children: [
                { id: 'analytics', label: t('items.analytics'), path: '/crm/analytics', type: 'link', visible: true },
                { id: 'visitors', label: t('items.visitors'), path: '/crm/visitor-analytics', type: 'link', visible: true }
            ]
        },
        {
            id: 'finance-group', label: t('items.finance'), type: 'group', visible: true, isOpen: true, children: [
                { id: 'invoices', label: t('items.invoices'), path: '/crm/invoices', type: 'link', visible: true },
                { id: 'contracts', label: t('items.contracts'), path: '/crm/contracts', type: 'link', visible: true }
            ]
        },
        {
            id: 'tools-group', label: t('items.tools'), type: 'group', visible: true, isOpen: true, children: [
                { id: 'tasks', label: t('items.tasks'), path: '/crm/tasks', type: 'link', visible: true },
                { id: 'broadcasts', label: t('items.broadcasts'), path: '/crm/broadcasts', type: 'link', visible: true },
                { id: 'telephony', label: t('items.telephony'), path: '/crm/telephony', type: 'link', visible: true }
            ]
        },
        {
            id: 'integrations-group', label: t('items.integrations'), type: 'group', visible: true, isOpen: true, children: [
                { id: 'messengers', label: t('items.messengers'), path: '/crm/messengers', type: 'link', visible: true },
                { id: 'payment-integrations', label: t('items.payment_integrations'), path: '/crm/payment-integrations', type: 'link', visible: true },
                { id: 'marketplace-integrations', label: t('items.marketplace_integrations'), path: '/crm/marketplace-integrations', type: 'link', visible: true }
            ]
        },
        {
            id: 'settings-group', label: t('items.settings'), type: 'group', visible: true, isOpen: true, children: [
                { id: 'app-settings', label: t('items.settings'), path: '/crm/settings', type: 'link', visible: true },
                { id: 'users', label: t('items.users'), path: '/crm/users', type: 'link', visible: true },
                { id: 'public-content', label: t('items.public_content'), path: '/crm/public-content', type: 'link', visible: true },
                { id: 'bot-settings', label: t('items.bot_settings'), path: '/crm/bot-settings', type: 'link', visible: true },
                { id: 'audit-log', label: t('items.audit_log'), path: '/crm/audit-log', type: 'link', visible: true },
                { id: 'trash', label: t('items.trash'), path: '/crm/trash', type: 'link', visible: true }
            ]
        }
    ];

    useEffect(() => {
        loadMenuSettings();
    }, []);

    const loadMenuSettings = async () => {
        try {
            setLoading(true);
            const settings = await api.getMenuSettings();
            if (settings.menu_order && settings.menu_order.length > 0 && typeof settings.menu_order[0] === 'object') {
                setMenuItems(settings.menu_order as any as MenuItem[]);
            } else {
                setMenuItems(defaultMenuItems);
            }
        } catch (error) {
            setMenuItems(defaultMenuItems);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const hidden_items = extractHiddenIds(menuItems);
            await api.saveMenuSettings({ menu_order: menuItems as any, hidden_items });
            toast.success(t('settings_saved'));
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            toast.error(t('save_error'));
        } finally {
            setSaving(false);
        }
    };

    const extractHiddenIds = (items: MenuItem[]): string[] => {
        let ids: string[] = [];
        items.forEach(item => {
            if (!item.visible) ids.push(item.id);
            if (item.children) ids = [...ids, ...extractHiddenIds(item.children)];
        });
        return ids;
    };

    const handleReset = async () => {
        if (!confirm(t('reset_confirm'))) return;
        setMenuItems(defaultMenuItems);
    };

    const toggleVisibility = (id: string) => {
        const updateVisibility = (items: MenuItem[]): MenuItem[] => {
            return items.map(item => {
                if (item.id === id) return { ...item, visible: !item.visible };
                if (item.children) return { ...item, children: updateVisibility(item.children) };
                return item;
            });
        };
        setMenuItems(updateVisibility(menuItems));
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
        return (
            <div key={item.id} className="space-y-1">
                <div
                    draggable onDragStart={() => handleDragStart(index, parentId)}
                    onDragOver={(e) => handleDragOver(e, index, parentId)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all group ${depth > 0 ? 'ml-8' : ''} ${draggedItem?.index === index && draggedItem?.parentId === parentId ? 'border-blue-500 bg-blue-50 shadow-lg' :
                        item.visible ? 'border-gray-50 bg-white hover:border-blue-100 shadow-sm' : 'border-gray-50 bg-gray-50/50 opacity-60'
                        }`}
                >
                    <div className="flex items-center gap-2 flex-1 cursor-move">
                        <GripVertical className="w-5 h-5 text-gray-300" />
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

    return (
        <div className="p-8 max-w-[1400px] mx-auto pb-32">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate('/crm/settings')} className="p-3 bg-white hover:shadow-xl rounded-2xl border border-gray-100 transition-all"><ArrowLeft className="w-6 h-6" /></button>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">{t('title')}</h1>
                        <p className="text-gray-500 mt-1 font-medium italic text-lg opacity-80">{t('subtitle')}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={handleReset} className="rounded-2xl h-12 px-6 border-2 font-bold hover:bg-gray-50 border-gray-100"><RotateCcw className="w-4 h-4 mr-2" />{t('reset')}</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-gray-900 hover:bg-black text-white rounded-2xl h-12 px-10 shadow-xl font-black text-lg">{saving ? t('saving') : t('save_changes')}</Button>
                </div>
            </div>

            <div className="flex gap-8 items-start">
                <div className="flex-1 space-y-4">
                    <div className="bg-white rounded-[32px] shadow-2xl shadow-blue-500/5 p-8 border border-gray-100 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('working_structure')}</h2>
                                <p className="text-sm text-gray-400 font-medium">{t('drag_hint')}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => openAddModal(null, 'group')} className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl h-10 px-4 font-bold shadow-lg shadow-pink-200"><Plus className="w-4 h-4 mr-2" /> {t('add_group')}</Button>
                                <Button onClick={() => openAddModal(null, 'link')} variant="outline" className="rounded-xl h-10 px-4 font-bold border-gray-200"><Plus className="w-4 h-4 mr-2" /> {t('custom_link')}</Button>
                            </div>
                        </div>
                        <div className="space-y-3">{menuItems.map((item, index) => renderMenuItem(item, index))}</div>
                    </div>
                </div>

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
            </div>

            {showEditModal && (
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
