// /frontend/src/pages/shared/MenuCustomization.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  Calendar,
  Scissors,
  MessageCircle,
  Filter,
  CheckSquare,
  Phone,
  Link2,
  Clock,
  Package,
  Wallet,
  BarChart2,
  Gift,
  Layers,
  Briefcase,
  LayoutGrid,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../utils/permissions';
import { CRM_MENU_DEFAULT_ORDER, CRM_MENU_GROUPS } from '../../components/layouts/UniversalLayout';

// ---- Types ----
interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: MenuItem[];
  permanent?: boolean; // нельзя скрыть
}

// ---- Menu Catalog ----
const buildAllItems = (t: (k: string, o?: any) => string): MenuItem[] => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    platform: Briefcase,
    dashboard: LayoutDashboard,
    bookings: Calendar,
    'chat-group': MessageSquare,
    chat: MessageSquare,
    'internal-chat': MessageCircle,
    funnel: Filter,
    'catalog-group': LayoutGrid,
    services: Scissors,
    team: Users,
    'tools-group': Briefcase,
    tasks: CheckSquare,
    telephony: Phone,
    'referral-links': Link2,
    kpi: BarChart2,
    waitlist: Clock,
    'finance-group': Wallet,
    cashbox: Wallet,
    inventory: Package,
    'gift-cards': Gift,
    'service-bundles': Layers,
    'settings-group': Settings,
    settings: Settings,
  };

  const labelMap: Record<string, string> = {
    platform: t('menu.platform_control', { defaultValue: 'Платформа' }),
    dashboard: t('menu.dashboard', { defaultValue: 'Дашборд' }),
    bookings: t('menu.bookings', { defaultValue: 'Записи' }),
    'chat-group': t('menu.chat', { defaultValue: 'Чат' }),
    chat: t('menu.chat', { defaultValue: 'Мессенджер' }),
    'internal-chat': t('menu.internal_chat', { defaultValue: 'Внутренний чат' }),
    funnel: t('menu.funnel', { defaultValue: 'Воронка' }),
    'catalog-group': t('menu.catalog', { defaultValue: 'Каталог' }),
    services: t('menu.services', { defaultValue: 'Услуги' }),
    team: t('menu.team', { defaultValue: 'Команда' }),
    'tools-group': t('menu.tools', { defaultValue: 'Инструменты' }),
    tasks: t('menu.tasks', { defaultValue: 'Задачи' }),
    telephony: t('menu.telephony', { defaultValue: 'Телефония' }),
    'referral-links': t('menu.referral_links', { defaultValue: 'Реклама' }),
    kpi: t('menu.kpi', { defaultValue: 'KPI' }),
    waitlist: t('menu.waitlist', { defaultValue: 'Очередь' }),
    'finance-group': t('menu.finance', { defaultValue: 'Финансы' }),
    cashbox: t('menu.cashbox', { defaultValue: 'Касса' }),
    inventory: t('menu.inventory', { defaultValue: 'Склад' }),
    'gift-cards': t('menu.gift_cards', { defaultValue: 'Сертификаты' }),
    'service-bundles': t('menu.service_bundles', { defaultValue: 'Абонементы' }),
    'settings-group': t('menu.settings', { defaultValue: 'Настройки' }),
    settings: t('menu.settings', { defaultValue: 'Настройки' }),
  };

  return CRM_MENU_DEFAULT_ORDER.map((id) => {
    const childIds = CRM_MENU_GROUPS[id];
    const item: MenuItem = {
      id,
      label: labelMap[id] || id,
      icon: iconMap[id] || Briefcase,
    };
    if (childIds && childIds.length > 0) {
      item.children = childIds.map((cid) => ({
        id: cid,
        label: labelMap[cid] || cid,
        icon: iconMap[cid] || Briefcase,
      }));
    }
    return item;
  });
};

// ---- Drag helpers ----
let dragSourceIndex: number | null = null;

export default function MenuCustomization() {
  const { t } = useTranslation(['layouts/mainlayout', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const permissions = usePermissions(user?.role || 'employee', user?.secondary_role);

  const rolePrefix = useMemo(() => {
    if (location.pathname.startsWith('/crm')) return '/crm';
    if (location.pathname.startsWith('/manager')) return '/manager';
    if (location.pathname.startsWith('/sales')) return '/sales';
    if (location.pathname.startsWith('/marketer')) return '/marketer';
    if (location.pathname.startsWith('/employee')) return '/employee';
    return '/crm';
  }, [location.pathname]);

  const allItems = useMemo(() => buildAllItems(t), [t]);

  const [order, setOrder] = useState<string[]>([...CRM_MENU_DEFAULT_ORDER]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Load current settings
  useEffect(() => {
    api.getMenuSettings()
      .then((data) => {
        if (data.menu_order && data.menu_order.length > 0) {
          const savedOrder = data.menu_order as string[];
          const merged = [
            ...savedOrder.filter((id) => CRM_MENU_DEFAULT_ORDER.includes(id)),
            ...CRM_MENU_DEFAULT_ORDER.filter((id) => !savedOrder.includes(id)),
          ];
          setOrder(merged);
        }
        if (data.hidden_items && data.hidden_items.length > 0) {
          setHidden(new Set(data.hidden_items));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Ordered items list (for rendering)
  const orderedItems = useMemo(
    () => order.map((id) => allItems.find((it) => it.id === id)).filter(Boolean) as MenuItem[],
    [order, allItems],
  );

  const toggleHidden = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Drag-and-drop
  const handleDragStart = (index: number) => {
    dragSourceIndex = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragSourceIndex === null || dragSourceIndex === targetIndex) {
      dragSourceIndex = null;
      setDragOver(null);
      return;
    }
    const newOrder = [...order];
    const [moved] = newOrder.splice(dragSourceIndex, 1);
    newOrder.splice(targetIndex, 0, moved);
    setOrder(newOrder);
    dragSourceIndex = null;
    setDragOver(null);
  };

  const handleDragEnd = () => {
    dragSourceIndex = null;
    setDragOver(null);
  };

  const handleSave = async (forRole = false) => {
    setSaving(true);
    try {
      await api.saveMenuSettings({ menu_order: order, hidden_items: Array.from(hidden) }, forRole);
      window.dispatchEvent(new Event('crm-menu-settings-updated'));
      toast.success(t('common:saved', { defaultValue: 'Сохранено' }));
    } catch {
      toast.error(t('common:save_error', { defaultValue: 'Ошибка сохранения' }));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await api.resetMenuSettings();
      setOrder([...CRM_MENU_DEFAULT_ORDER]);
      setHidden(new Set());
      window.dispatchEvent(new Event('crm-menu-settings-updated'));
      toast.success(t('common:reset_done', { defaultValue: 'Сброшено' }));
    } catch {
      toast.error(t('common:save_error', { defaultValue: 'Ошибка' }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`${rolePrefix}/settings`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {t('settings:customize_menu', { defaultValue: 'Настройка меню' })}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Перетащите пункты для изменения порядка, нажмите глаз чтобы скрыть
          </p>
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2 mb-6">
        {orderedItems.map((item, index) => {
          const isHidden = hidden.has(item.id);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expanded.has(item.id);
          const isDragTarget = dragOver === index;
          const Icon = item.icon;

          return (
            <div key={item.id}>
              <div
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={[
                  'flex items-center gap-3 p-3 rounded-lg border bg-white select-none cursor-grab active:cursor-grabbing transition-all',
                  isDragTarget ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:border-gray-300',
                  isHidden ? 'opacity-40' : '',
                ].join(' ')}
              >
                {/* Drag handle */}
                <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />

                {/* Icon */}
                <Icon className="w-4 h-4 text-gray-600 flex-shrink-0" />

                {/* Label */}
                <span className={`flex-1 text-sm font-medium ${isHidden ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {item.label}
                </span>

                {/* Expand children toggle */}
                {hasChildren && (
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => toggleExpanded(item.id)}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}

                {/* Visibility toggle */}
                <button
                  type="button"
                  className={`p-1 transition-colors ${isHidden ? 'text-gray-300 hover:text-gray-500' : 'text-gray-500 hover:text-gray-800'}`}
                  onClick={() => toggleHidden(item.id)}
                  title={isHidden ? 'Показать' : 'Скрыть'}
                >
                  {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Sub-items */}
              {hasChildren && isExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children!.map((child) => {
                    const isChildHidden = hidden.has(child.id);
                    const ChildIcon = child.icon;
                    return (
                      <div
                        key={child.id}
                        className={[
                          'flex items-center gap-3 p-2.5 rounded-lg border bg-gray-50 transition-all',
                          'border-gray-100 hover:border-gray-200',
                          isChildHidden ? 'opacity-40' : '',
                        ].join(' ')}
                      >
                        <ChildIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className={`flex-1 text-sm ${isChildHidden ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {child.label}
                        </span>
                        <button
                          type="button"
                          className={`p-1 transition-colors ${isChildHidden ? 'text-gray-300 hover:text-gray-500' : 'text-gray-400 hover:text-gray-700'}`}
                          onClick={() => toggleHidden(child.id)}
                          title={isChildHidden ? 'Показать' : 'Скрыть'}
                        >
                          {isChildHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={saving}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Сбросить
        </Button>

        <div className="flex gap-2">
          {permissions.roleLevel >= 80 && (
            <Button
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Для всей роли
            </Button>
          )}
          <Button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}
