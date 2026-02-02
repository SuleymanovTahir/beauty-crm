import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GripVertical, Eye, EyeOff, RotateCcw, Save, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface MenuItem {
    id: string;
    label: string;
    visible: boolean;
}

export default function MenuCustomization() {
    const { t } = useTranslation('admin/menucustomization');
    const navigate = useNavigate();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);

    const defaultMenuItems = [
        { id: 'dashboard', label: t('items.dashboard') },
        { id: 'bookings', label: t('items.bookings') },
        { id: 'clients', label: t('items.clients') },
        { id: 'chat', label: t('items.chat') },
        { id: 'analytics', label: t('items.analytics') },
        { id: 'funnel', label: t('items.funnel') },
        { id: 'tasks', label: t('items.tasks') },
        { id: 'services', label: t('items.services') },
        { id: 'calendar', label: t('items.calendar') },
        { id: 'users', label: t('items.users') },
        { id: 'public_content', label: t('items.public_content') },
        { id: 'visitors', label: t('items.visitors') },
        { id: 'settings', label: t('items.settings') },
        { id: 'bot_settings', label: t('items.bot_settings') },
        { id: 'telephony', label: t('items.telephony') },
    ];

    useEffect(() => {
        loadMenuSettings();
    }, []);

    const loadMenuSettings = async () => {
        try {
            setLoading(true);
            const settings = await api.getMenuSettings();

            if (settings.menu_order && settings.menu_order.length > 0) {
                const ordered = settings.menu_order.map((id: string) => {
                    const item = defaultMenuItems.find(i => i.id === id);
                    return item ? {
                        id: item.id,
                        label: item.label,
                        visible: !settings.hidden_items?.includes(id)
                    } : null;
                }).filter(Boolean) as MenuItem[];

                defaultMenuItems.forEach(item => {
                    if (!ordered.find(o => o.id === item.id)) {
                        ordered.push({
                            id: item.id,
                            label: item.label,
                            visible: true
                        });
                    }
                });

                setMenuItems(ordered);
            } else {
                setMenuItems(defaultMenuItems.map(item => ({
                    ...item,
                    visible: !settings.hidden_items?.includes(item.id)
                })));
            }
        } catch (error) {
            console.error('Error loading menu settings:', error);
            setMenuItems(defaultMenuItems.map(item => ({ ...item, visible: true })));
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (index: number) => {
        setDraggedItem(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === index) return;

        const newItems = [...menuItems];
        const draggedContent = newItems[draggedItem];
        newItems.splice(draggedItem, 1);
        newItems.splice(index, 0, draggedContent);

        setMenuItems(newItems);
        setDraggedItem(index);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    const toggleVisibility = (index: number) => {
        const newItems = [...menuItems];
        newItems[index].visible = !newItems[index].visible;
        setMenuItems(newItems);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const menu_order = menuItems.map(item => item.id);
            const hidden_items = menuItems.filter(item => !item.visible).map(item => item.id);

            await api.saveMenuSettings({ menu_order, hidden_items });

            toast.success(t('settings_saved'));
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            toast.error(t('save_error'));
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm(t('reset_confirm'))) return;

        try {
            setSaving(true);
            await api.resetMenuSettings();
            toast.success(t('reset_success'));
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            toast.error(t('reset_error'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/crm/settings')}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
                    <p className="text-gray-600 mt-2">{t('subtitle')}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{t('section_title')}</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {t('drag_hint')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            disabled={saving}
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {t('reset')}
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-gradient-to-r from-pink-500 to-blue-600"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? t('saving') : t('save')}
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    {menuItems.map((item, index) => (
                        <div
                            key={item.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-move ${draggedItem === index
                                ? 'border-pink-500 bg-pink-50 shadow-lg scale-105'
                                : item.visible
                                    ? 'border-gray-200 bg-white hover:border-pink-200'
                                    : 'border-gray-100 bg-gray-50 opacity-60'
                                }`}
                        >
                            <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <span className={`flex-1 font-medium ${item.visible ? 'text-gray-900' : 'text-gray-400'}`}>
                                {item.label}
                            </span>
                            <button
                                onClick={() => toggleVisibility(index)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {item.visible ? (
                                    <Eye className="w-5 h-5 text-green-600" />
                                ) : (
                                    <EyeOff className="w-5 h-5 text-gray-400" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>{t('hint_title')}</strong> {t('hint_text')}
                </p>
            </div>
        </div>
    );
}
