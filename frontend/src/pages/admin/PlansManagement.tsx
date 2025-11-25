import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Loader, Users, User, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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
    const { t } = useTranslation(['admin/plans', 'common']);
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'my_plans' | 'role_plans' | 'individual_plans'>('my_plans');
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createType, setCreateType] = useState<'role' | 'individual'>('role');

    // Form data
    const [formData, setFormData] = useState({
        metric_type: 'revenue',
        target_value: '',
        period_type: 'month',
        role_key: '',
        user_id: '',
        start_date: '',
        end_date: ''
    });

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'director';

    useEffect(() => {
        loadData();
        if (isAdmin) {
            loadRoles();
            loadUsers();
        }
    }, [activeTab, currentUser]);

    const loadData = async () => {
        setLoading(true);
        try {
            let response;
            if (activeTab === 'my_plans') {
                response = await api.getMyPlans();
            } else if (activeTab === 'role_plans' && isAdmin) {
                // For admin, we might want to see all role plans. 
                // Currently API requires a role_key. We'll fetch for the first role or handle differently.
                // For now, let's just fetch plans for the selected role in a filter, defaulting to 'admin' or similar.
                // Or maybe we should list all plans? The backend get_all_plans returns everything but it's legacy.
                // Let's use getRolePlans for the selected role (we'll add a filter).
                if (formData.role_key) {
                    response = await api.getRolePlans(formData.role_key);
                } else {
                    // If no role selected, maybe show nothing or fetch for current user's role
                    response = { success: true, plans: [] };
                }
            } else if (activeTab === 'individual_plans' && isAdmin) {
                // Similar to role plans, we need a user_id.
                response = { success: true, plans: [] };
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
                    formData.end_date || undefined
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
                    formData.end_date || undefined
                );
            }

            toast.success(t('plan_created'));
            setIsCreateModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error creating plan:', error);
            toast.error(t('error_creating_plan'));
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
        const metrics: Record<string, string> = {
            revenue: t('metrics.revenue'),
            new_clients: t('metrics.new_clients'),
            bookings: t('metrics.bookings'),
            average_check: t('metrics.average_check'),
            vip_clients: t('metrics.vip_clients'),
            active_clients: t('metrics.active_clients')
        };
        return metrics[type] || type;
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
                {isAdmin && (
                    <Button onClick={() => setIsCreateModalOpen(true)} className="bg-pink-600 hover:bg-pink-700">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('create_plan')}
                    </Button>
                )}
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
                            // Trigger reload manually or via effect if we add dependency
                            // For now, let's just reload data manually
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
                            <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900">{getMetricLabel(plan.metric_type)}</h3>
                                        <p className="text-sm text-gray-500 capitalize">{t(`periods.${plan.period_type}`)}</p>
                                    </div>
                                    <Badge className={plan.is_individual_plan ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                                        {plan.is_individual_plan ? t('individual') : t('role_based')}
                                    </Badge>
                                </div>

                                <div className="mb-4">
                                    <span className="text-3xl font-bold text-pink-600">{plan.target_value}</span>
                                    {plan.metric_type === 'revenue' && <span className="text-gray-500 ml-1">AED</span>}
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}
                                </div>

                                {isAdmin && (
                                    <div className="flex justify-end pt-4 border-t border-gray-100">
                                        <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            {t('delete')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            {t('no_plans_found')}
                        </div>
                    )}
                </div>
            )}

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('create_new_plan')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex gap-4 mb-4">
                            <Button
                                variant={createType === 'role' ? 'default' : 'outline'}
                                onClick={() => setCreateType('role')}
                                className="flex-1"
                            >
                                {t('role_plan')}
                            </Button>
                            <Button
                                variant={createType === 'individual' ? 'default' : 'outline'}
                                onClick={() => setCreateType('individual')}
                                className="flex-1"
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

                        <div className="space-y-2">
                            <Label>{t('metric_type')}</Label>
                            <Select value={formData.metric_type} onValueChange={(val) => setFormData({ ...formData, metric_type: val })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="revenue">{t('metrics.revenue')}</SelectItem>
                                    <SelectItem value="new_clients">{t('metrics.new_clients')}</SelectItem>
                                    <SelectItem value="bookings">{t('metrics.bookings')}</SelectItem>
                                    <SelectItem value="average_check">{t('metrics.average_check')}</SelectItem>
                                    <SelectItem value="vip_clients">{t('metrics.vip_clients')}</SelectItem>
                                    <SelectItem value="active_clients">{t('metrics.active_clients')}</SelectItem>
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
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t('period_type')}</Label>
                            <Select value={formData.period_type} onValueChange={(val) => setFormData({ ...formData, period_type: val })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="week">{t('periods.week')}</SelectItem>
                                    <SelectItem value="month">{t('periods.month')}</SelectItem>
                                    <SelectItem value="quarter">{t('periods.quarter')}</SelectItem>
                                    <SelectItem value="year">{t('periods.year')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleCreatePlan} className="bg-pink-600 hover:bg-pink-700">{t('create')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
