// /frontend/src/pages/admin/EmployeeManagement.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import EmployeeDetail from './EmployeeDetail';

interface Employee {
    id: number;
    full_name: string;
    full_name_ru?: string;
    position?: string;
    position_ru?: string;
    photo?: string;
    gender?: string;
    is_service_provider: boolean;
}

export default function EmployeeManagement() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation(['admin/users', 'common']);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadEmployees();
    }, []);

    // Redirect to first employee if no ID specified
    useEffect(() => {
        if (!id && employees.length > 0) {
            navigate(`/crm/employees/${employees[0].id}`, { replace: true });
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

    const getAvatarUrl = (employee: Employee) => {
        if (employee.photo) return employee.photo;
        // Use gender-based default avatar
        if (employee.gender === 'male') {
            return '/static/avatars/default_male.webp';
        }
        return '/static/avatars/default_female.webp';
    };

    const { i18n } = useTranslation();

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                {/* Go back button */}
                <div className="p-4 border-b border-gray-200">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/crm/dashboard')}
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
                            {filteredEmployees.map((employee) => (
                                <Link
                                    key={employee.id}
                                    to={`/crm/employees/${employee.id}`}
                                    className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors ${id === String(employee.id)
                                        ? 'bg-blue-50 hover:bg-blue-100'
                                        : ''
                                        }`}
                                >
                                    <img
                                        src={getAvatarUrl(employee)}
                                        alt={employee.full_name}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${id === String(employee.id)
                                            ? 'text-blue-900'
                                            : 'text-gray-900'
                                            }`}>
                                            {(i18n.language === 'ru' && employee.full_name_ru) ? employee.full_name_ru : employee.full_name}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {(i18n.language === 'ru' && employee.position_ru) ? employee.position_ru : (employee.position || t('employee'))}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add team member button */}
                <div className="p-4 border-t border-gray-200">
                    <Button
                        onClick={() => navigate('/crm/users/create')}
                        className="w-full gap-2"
                        variant="outline"
                    >
                        <Plus className="h-4 w-4" />
                        {t('add_team_member')}
                    </Button>
                </div>
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
