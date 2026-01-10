import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Loader, Users, User, Calendar, Save, Pencil, MessageSquare } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useSalonSettings';

interface Plan {
    id: number;
    metric_type: string;
    target_value: number;
    period_type: string;
    start_date: string;
    end_date: string;
    role_key?: string;
    user_id?: number;
    is_position_plan: boolean;
    is_individual_plan: boolean;
    created_by: number;
    created_at: string;
    comment?: string;
    name?: string;
}

interface Metric {
    id: number;
    key: string;
    name: string;
    name_ru: string;
    name_en: string;
    unit?: string;
    description?: string;
}

interface Role {
    key: string;
    name: string;
    level: number;
}

interface UserData {
    id: number;
    username: string;
    full_name: string;
    role: string;
}

export default function PlansManagement() {
    const { t, i18n } = useTranslation(['admin/plans', 'common']);
    const { user: currentUser } = useAuth();
    const { currency } = useCurrency();
    const [activeTab, setActiveTab] = useState<'my_plans' | 'role_plans' | 'individual_plans'>('my_plans');
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [metrics, setMetrics] = useState<Metric[]>([]);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
    const [isEditingMetric, setIsEditingMetric] = useState(false);
    const [createType, setCreateType] = useState<'role' | 'individual'>('role');

    // Form data for Plan
    const [formData, setFormData] = useState({
        metric_type: 'revenue',
        target_value: '',
        period_type: 'month',
        role_key: '',
        user_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        comment: ''
    });

    // Form data for Metric
    const [metricFormData, setMetricFormData] = useState({
        key: '',
        name: '',
        unit: '',
        description: ''
    });

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'director';

    useEffect(() => {
        if (!formData.start_date || formData.period_type === 'custom') return;

        const start = new Date(formData.start_date);
        const end = new Date(start);

        switch (formData.period_type) {
            case 'week':
                end.setDate(start.getDate() + 7);
                break;
            case 'two_weeks':
                end.setDate(start.getDate() + 14);
                break;
            case 'month':
                end.setDate(start.getDate() + 30);
                break;
            case 'quarter':
                end.setDate(start.getDate() + 90);
                break;
            case 'year':
                end.setDate(start.getDate() + 365);
                break;
            default:
                end.setDate(start.getDate() + 30);
        }

        const endDateStr = end.toISOString().split('T')[0];
        if (formData.end_date !== endDateStr) {
            setFormData(prev => ({ ...prev, end_date: endDateStr }));
        }
    }, [formData.period_type, formData.start_date]);

    useEffect(() => {
        loadData();
        loadMetrics();
        if (isAdmin) {
            loadRoles();
            loadUsers();
        }
    }, [activeTab, currentUser]);

    const loadMetrics = async () => {
        try {
            const response = await api.getPlanMetrics();
            if (response.success) {
                setMetrics(response.metrics);
                if (response.metrics.length > 0 && !formData.metric_type) {
                    setFormData(prev => ({ ...prev, metric_type: response.metrics[0].key }));
                }
            }
        } catch (error) {
            console.error('Error loading metrics:', error);
            toast.error(t('error_loading_metrics'));
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            let response;
            if (activeTab === 'my_plans') {
                response = await api.getMyPlans();
            } else if (activeTab === 'role_plans' && isAdmin) {
                if (formData.role_key) {
                    response = await api.getRolePlans(formData.role_key);
                } else {
                    response = { success: true, plans: [] };
                }
            } else if (activeTab === 'individual_plans' && isAdmin) {
                // To list ALL individual plans, we might need a separate endpoint or fetch for all users.
                // For now, let's just show My Plans if not filtered.
                response = await api.getMyPlans();
            } else {
                response = await api.getMyPlans();
            }

            if (response.success) {
                setPlans(response.plans);
            }
        } catch (error) {
            console.error('Error loading plans:', error);
            toast.error(t('common:error_loading_data'));
        } finally {
            setLoading(false);
        }
    };

    const loadRoles = async () => {
        try {
            const response = await api.getRoles();
            setRoles(response.roles);
            if (response.roles.length > 0 && !formData.role_key) {
                setFormData(prev => ({ ...prev, role_key: response.roles[0].key }));
            }
        } catch (error) {
            console.error('Error loading roles:', error);
        }
    };

    const loadUsers = async () => {
        try {
            const response = await api.getUsers();
            setUsers(response.users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    const handleCreatePlan = async () => {
        try {
            if (!formData.target_value) {
                toast.error(t('fill_required_fields'));
                return;
            }

            if (createType === 'role') {
                if (!formData.role_key) {
                    toast.error(t('select_role'));
                    return;
                }
                await api.createRolePlan(
                    formData.role_key,
                    formData.metric_type,
                    Number(formData.target_value),
                    formData.period_type,
                    undefined, // visibleToRoles
                    undefined, // canEditRoles
                    formData.start_date || undefined,
                    formData.end_date || undefined,
                    formData.comment
                );
            } else {
                if (!formData.user_id) {
                    toast.error(t('select_user'));
                    return;
                }
                await api.createIndividualPlan(
                    Number(formData.user_id),
                    formData.metric_type,
                    Number(formData.target_value),
                    formData.period_type,
                    formData.start_date || undefined,
                    formData.end_date || undefined,
                    formData.comment
                );
            }

            toast.success(t('plan_created'));
            setIsCreateModalOpen(false);
            setFormData(prev => ({ ...prev, target_value: '', comment: '', start_date: '', end_date: '' }));
            loadData();
        } catch (error) {
            console.error('Error creating plan:', error);
            toast.error(t('error_creating_plan'));
        }
    };

    const handleCreateMetric = async () => {
        try {
            if (!metricFormData.key || !metricFormData.name) {
                toast.error(t('fill_required_fields'));
                return;
            }
            await api.createPlanMetric({
                key: metricFormData.key,
                name: metricFormData.name,
                unit: metricFormData.unit,
                description: metricFormData.description
            });
            toast.success(t('common:success'));
            setMetricFormData({ key: '', name: '', unit: '', description: '' });
            setIsEditingMetric(false);
            loadMetrics();
        } catch (error) {
            console.error('Error creating metric:', error);
            toast.error(t('common:error'));
        }
    };

    const startEditingMetric = (metric: Metric) => {
        setMetricFormData({
            key: metric.key,
            name: i18n.language === 'ru' ? metric.name_ru || metric.name : metric.name_en || metric.name,
            unit: metric.unit || '',
            description: metric.description || ''
        });
        setIsEditingMetric(true);
    };

    const handleDeleteMetric = async (key: string) => {
        if (!confirm(t('confirm_delete'))) return;
        try {
            await api.deletePlanMetric(key);
            toast.success(t('common:success'));
            loadMetrics();
        } catch (error) {
            console.error('Error deleting metric:', error);
            toast.error(t('common:error'));
        }
    };

    const handleDeletePlan = async (planId: number) => {
        if (!confirm(t('confirm_delete'))) return;
        try {
            await api.deletePlan(planId);
            toast.success(t('plan_deleted'));
            loadData();
        } catch (error) {
            console.error('Error deleting plan:', error);
            toast.error(t('error_deleting_plan'));
        }
    };

    const getMetricLabel = (type: string) => {
        const metric = metrics.find(m => m.key === type);
        if (!metric) return type;
        return i18n.language === 'ru' ? metric.name_ru : metric.name_en;
    };

    const getMetricUnit = (type: string) => {
        const metric = metrics.find(m => m.key === type);
        return metric?.unit || '';
    };

    return (
        <div className="p-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <Target className="w-8 h-8 text-pink-600" />
                        {t('plans_management')}
                    </h1>
                    <p className="text-gray-600">{t('manage_goals_and_targets')}</p>
                </div>
                <div className="flex gap-3">
                    {isAdmin && (
                        <>
                            <Button variant="outline" onClick={() => setIsMetricsModalOpen(true)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                {t('manage_metrics')}
                            </Button>
                            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-pink-600 hover:bg-pink-700">
                                <Plus className="w-4 h-4 mr-2" />
                                {t('create_plan')}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-1">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('my_plans')}
                        className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'my_plans' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Target className="w-5 h-5 inline-block mr-2" />
                        {t('my_plans')}
                    </button>
                    {isAdmin && (
                        <>
                            <button
                                onClick={() => setActiveTab('role_plans')}
                                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'role_plans' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <Users className="w-5 h-5 inline-block mr-2" />
                                {t('role_plans')}
                            </button>
                            <button
                                onClick={() => setActiveTab('individual_plans')}
                                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'individual_plans' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <User className="w-5 h-5 inline-block mr-2" />
                                {t('individual_plans')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filters for Admin Tabs */}
            {isAdmin && activeTab === 'role_plans' && (
                <div className="mb-6 flex gap-4 items-center bg-white p-4 rounded-xl border border-gray-200">
                    <Label>{t('select_role')}:</Label>
                    <Select
                        value={formData.role_key}
                        onValueChange={(val) => {
                            setFormData(prev => ({ ...prev, role_key: val }));
                            setTimeout(loadData, 100);
                        }}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder={t('select_role')} />
                        </SelectTrigger>
                        <SelectContent>
                            {roles.map(role => (
                                <SelectItem key={role.key} value={role.key}>{role.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={() => loadData()} variant="outline">{t('refresh')}</Button>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader className="w-8 h-8 text-pink-600 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.length > 0 ? (
                        plans.map((plan) => (
                            <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900">{getMetricLabel(plan.metric_type)}</h3>
                                        <p className="text-sm text-gray-500 capitalize">{t(`periods.${plan.period_type}`)}</p>
                                    </div>
                                    <Badge className={plan.is_individual_plan ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800'}>
                                        {plan.is_individual_plan ? t('individual') : t('role_based')}
                                    </Badge>
                                </div>

                                <div className="mb-4">
                                    <span className="text-3xl font-bold text-pink-600">{plan.target_value}</span>
                                    <span className="text-gray-500 ml-1">{getMetricUnit(plan.metric_type)}</span>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}
                                </div>

                                {plan.comment && (
                                    <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic flex items-start gap-2">
                                        <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                                        {plan.comment}
                                    </div>
                                )}

                                <div className="mt-auto flex justify-end pt-4 border-t border-gray-100 gap-2">
                                    {isAdmin && (
                                        <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            {t('delete')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            {t('no_plans_found')}
                        </div>
                    )}
                </div>
            )}

            {/* Create Plan Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('create_new_plan')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex gap-2 mb-2 p-1 bg-gray-100 rounded-lg">
                            <Button
                                variant={createType === 'role' ? 'default' : 'ghost'}
                                onClick={() => setCreateType('role')}
                                className={`flex-1 ${createType === 'role' ? 'bg-white text-black shadow-sm' : ''}`}
                            >
                                {t('role_plan')}
                            </Button>
                            <Button
                                variant={createType === 'individual' ? 'default' : 'ghost'}
                                onClick={() => setCreateType('individual')}
                                className={`flex-1 ${createType === 'individual' ? 'bg-white text-black shadow-sm' : ''}`}
                            >
                                {t('individual_plan')}
                            </Button>
                        </div>

                        {createType === 'role' ? (
                            <div className="space-y-2">
                                <Label>{t('role')}</Label>
                                <Select value={formData.role_key} onValueChange={(val) => setFormData({ ...formData, role_key: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('select_role')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map(role => (
                                            <SelectItem key={role.key} value={role.key}>{role.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>{t('user')}</Label>
                                <Select value={formData.user_id} onValueChange={(val) => setFormData({ ...formData, user_id: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('select_user')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map(user => (
                                            <SelectItem key={user.id} value={user.id.toString()}>{user.full_name} ({user.role})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('metric_type')}</Label>
                                <Select value={formData.metric_type} onValueChange={(val) => setFormData({ ...formData, metric_type: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {metrics.map(m => (
                                            <SelectItem key={m.key} value={m.key}>{i18n.language === 'ru' ? m.name_ru : m.name_en}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('target_value')}</Label>
                                <Input
                                    type="number"
                                    value={formData.target_value}
                                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                                    placeholder="0"
                                    min="1"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('period_type')}</Label>
                            <Select value={formData.period_type} onValueChange={(val) => setFormData({ ...formData, period_type: val })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="week">{t('periods.week')}</SelectItem>
                                    <SelectItem value="two_weeks">{t('periods.two_weeks')}</SelectItem>
                                    <SelectItem value="month">{t('periods.month')}</SelectItem>
                                    <SelectItem value="quarter">{t('periods.quarter')}</SelectItem>
                                    <SelectItem value="year">{t('periods.year')}</SelectItem>
                                    <SelectItem value="custom">{t('periods.custom')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('periods.week') === t('periods.custom') ? t('common:from') : t('start_date', 'Дата начала')}</Label>
                                <Input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('end_date', 'Дата окончания')}</Label>
                                <Input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    readOnly={formData.period_type !== 'custom'}
                                    className={formData.period_type !== 'custom' ? 'bg-gray-50 text-gray-500' : ''}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('comment')}</Label>
                            <Textarea
                                value={formData.comment}
                                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                placeholder={t('comment')}
                                className="h-20"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleCreatePlan} className="bg-pink-600 hover:bg-pink-700">{t('create')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Metrics Modal */}
            <Dialog open={isMetricsModalOpen} onOpenChange={setIsMetricsModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('manage_metrics')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4 border p-5 rounded-2xl bg-gray-50/50">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Key (ID)</Label>
                                <Input
                                    value={metricFormData.key}
                                    onChange={(e) => setMetricFormData({ ...metricFormData, key: e.target.value })}
                                    placeholder="e.g. sales_target"
                                    disabled={isEditingMetric}
                                    className="h-11 bg-white border-gray-200 focus:ring-pink-500 focus:border-pink-500 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">{t('unit')}</Label>
                                <Input
                                    value={metricFormData.unit}
                                    onChange={(e) => setMetricFormData({ ...metricFormData, unit: e.target.value })}
                                    placeholder={`${currency}, %, pcs`}
                                    className="h-11 bg-white border-gray-200 focus:ring-pink-500 focus:border-pink-500 transition-all"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">{t('metric_name', 'Название')}</Label>
                                <Input
                                    value={metricFormData.name}
                                    onChange={(e) => setMetricFormData({ ...metricFormData, name: e.target.value })}
                                    placeholder={t('metric_name', 'Название')}
                                    className="h-11 bg-white border-gray-200 focus:ring-pink-500 focus:border-pink-500 transition-all"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">{t('description')}</Label>
                                <Input
                                    value={metricFormData.description}
                                    onChange={(e) => setMetricFormData({ ...metricFormData, description: e.target.value })}
                                    className="h-11 bg-white border-gray-200 focus:ring-pink-500 focus:border-pink-500 transition-all"
                                />
                            </div>
                            <div className="col-span-2 flex gap-3 pt-2">
                                <Button onClick={handleCreateMetric} className="flex-1 h-11 bg-pink-600 hover:bg-pink-700 text-white font-medium shadow-sm transition-all active:scale-95">
                                    {isEditingMetric ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                    {isEditingMetric ? t('common:save') : t('add_metric')}
                                </Button>
                                {isEditingMetric && (
                                    <Button variant="outline" className="h-11 border-gray-200 hover:bg-gray-100 transition-all" onClick={() => {
                                        setIsEditingMetric(false);
                                        setMetricFormData({ key: '', name: '', unit: '', description: '' });
                                    }}>
                                        {t('common:cancel')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto rounded-xl border border-gray-100">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-sm text-gray-500 border-b">
                                    <tr>
                                        <th className="p-3 text-left font-semibold">Key</th>
                                        <th className="p-3 text-left font-semibold">Name</th>
                                        <th className="p-3 text-left font-semibold">Unit</th>
                                        <th className="p-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.map(m => (
                                        <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-pink-50/30 transition-colors group">
                                            <td className="p-3 font-mono text-gray-500">{m.key}</td>
                                            <td className="p-3 font-medium text-gray-900">{i18n.language === 'ru' ? m.name_ru || m.name : m.name_en || m.name}</td>
                                            <td className="p-3 text-gray-600">{m.unit}</td>
                                            <td className="p-3 text-right flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => startEditingMetric(m)} className="text-blue-600 h-9 w-9 p-0 hover:bg-blue-50 transition-colors">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteMetric(m.key)} className="text-red-600 h-9 w-9 p-0 hover:bg-red-50 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsMetricsModalOpen(false)}>{t('common:close')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
