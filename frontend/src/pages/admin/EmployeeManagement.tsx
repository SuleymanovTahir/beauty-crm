// /frontend/src/pages/admin/EmployeeManagement.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, Plus, ArrowLeft, GripVertical, Save, X, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { toast } from 'sonner';
import EmployeeDetail from './EmployeeDetail';
import { usePermissions } from '../../utils/permissions';

interface Employee {
    id: number;
    full_name: string;
    position?: string;
    photo?: string;
    gender?: string;
    is_service_provider: boolean;
    is_public_visible?: boolean;
}

export default function EmployeeManagement() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation(['admin/users', 'common']);

    // Get role from localStorage
    const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = savedUser?.role || 'employee';
    const permissions = usePermissions(userRole);

    const rolePrefix = window.location.pathname.startsWith('/manager') ? '/manager' : '/crm';

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isOrderChanged, setIsOrderChanged] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        loadEmployees();
    }, []);

    // Redirect to first employee if no ID specified
    useEffect(() => {
        if (!id && employees.length > 0) {
            navigate(`${rolePrefix}/employees/${employees[0].id}`, { replace: true });
        }
    }, [id, employees, navigate]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users');
            // Filter only service providers (employees)
            const serviceProviders = response.data.filter(
                (user: Employee) => user.is_service_provider
            );
            setEmployees(serviceProviders);
        } catch (error) {
            console.error('Error loading employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.position?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newEmployees = [...employees];
        const draggedItem = newEmployees[draggedIndex];
        newEmployees.splice(draggedIndex, 1);
        newEmployees.splice(index, 0, draggedItem);

        setEmployees(newEmployees);
        setDraggedIndex(index);
        setIsOrderChanged(true);
    };

    const handleSaveOrder = async () => {
        try {
            setLoading(true);
            const orders = employees.map((emp, index) => ({
                id: emp.id,
                sort_order: index
            }));
            await api.post('/users/reorder', { orders });
            toast.success(t('order_saved'));
            setIsOrderChanged(false);
        } catch (error) {
            console.error('Error saving order:', error);
            toast.error(t('error_saving_order'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = () => {
        loadEmployees();
        setIsOrderChanged(false);
    };

    const getAvatarUrl = (employee: Employee) => {
        if (employee.photo) return employee.photo;
        // Use gender-based default avatar
        if (employee.gender === 'male') {
            return '/static/avatars/default_male.webp';
        }
        return '/static/avatars/default_female.webp';
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                {/* Go back button */}
                <div className="p-4 border-b border-gray-200">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`${rolePrefix}/dashboard`)}
                        className="w-full justify-start gap-2 text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('go_back')}
                    </Button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder={t('search_team_member')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Employee List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                        </div>
                    ) : (
                        <div className="space-y-1 p-2">
                            {isOrderChanged && (
                                <div className="p-2 mb-2 bg-blue-50 border border-blue-100 rounded-lg flex flex-col gap-2">
                                    <p className="text-xs text-blue-800 font-medium">{t('order_changed_msg')}</p>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSaveOrder} className="flex-1 h-8 text-[10px] gap-1">
                                            <Save className="w-3 h-3" /> {t('common:save')}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={handleCancelOrder} className="h-8 text-[10px] gap-1 px-2">
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {filteredEmployees.map((employee, index) => (
                                <div
                                    key={employee.id}
                                    draggable={!searchQuery}
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={() => setDraggedIndex(null)}
                                    className={`group flex items-center gap-2 p-2 rounded-lg transition-all ${id === String(employee.id) ? 'bg-blue-50' : 'hover:bg-gray-100'} ${draggedIndex === index ? 'opacity-50 scale-95 border-2 border-dashed border-blue-300' : ''}`}
                                >
                                    {!searchQuery && (
                                        <div className="cursor-grab active:cursor-grabbing text-gray-300 group-hover:text-gray-400">
                                            <GripVertical className="w-4 h-4" />
                                        </div>
                                    )}
                                    <Link
                                        to={`${rolePrefix}/employees/${employee.id}`}
                                        className="flex flex-1 items-center gap-3 min-w-0"
                                    >
                                        <img
                                            src={getAvatarUrl(employee)}
                                            alt={employee.full_name}
                                            className="w-10 h-10 rounded-full object-cover border border-gray-100"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold truncate ${id === String(employee.id) ? 'text-blue-900' : 'text-gray-900'}`}>
                                                {employee.full_name}
                                            </p>
                                            <p className="text-[10px] text-gray-500 truncate uppercase tracking-wider font-bold opacity-70">
                                                {(i18n.language === 'ru' && employee.position_ru) ? employee.position_ru : (employee.position || t('employee'))}
                                            </p>
                                        </div>
                                        {/* Visibility indicator */}
                                        {employee.is_public_visible === false && (
                                            <div title={t('hidden_from_public')} className="text-gray-400">
                                                <EyeOff className="w-4 h-4" />
                                            </div>
                                        )}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add team member button - only for those who can create */}
                {permissions.canCreateUsers && (
                    <div className="p-4 border-t border-gray-200">
                        <Button
                            onClick={() => navigate(`${rolePrefix}/users/create`)}
                            className="w-full gap-2"
                            variant="outline"
                        >
                            <Plus className="h-4 w-4" />
                            {t('add_team_member')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto p-8">
                    {id ? (
                        <EmployeeDetail />
                    ) : (
                        <div className="flex items-center justify-center h-64">
                            <p className="text-gray-500">{t('select_employee')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
