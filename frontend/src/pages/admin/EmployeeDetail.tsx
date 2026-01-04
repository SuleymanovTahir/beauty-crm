
// /frontend/src/pages/admin/EmployeeDetail.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Edit, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { EmployeeInformation } from '../../components/admin/EmployeeInformation';
import { EmployeeServices } from '../../components/admin/EmployeeServices';
import { EmployeeSchedule } from '../../components/admin/EmployeeSchedule';
import { EmployeeSettings } from '../../components/admin/EmployeeSettings';
import { EmployeePayroll } from '../../components/admin/EmployeePayroll';
import { EmployeeOnlineBooking } from '../../components/admin/EmployeeOnlineBooking';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import { getPhotoUrl } from '../../utils/photoUtils';

interface Employee {
    id: number;
    username: string;
    full_name: string;
    full_name_ru?: string;
    email: string;
    role: string;
    position?: string;
    position_ru?: string;
    phone?: string;
    bio?: string;
    photo?: string;
    is_service_provider: boolean;
    years_of_experience?: string | number;
    specialization?: string;
    about_me?: string;
    base_salary?: number;
    commission_rate?: number;
}

export default function EmployeeDetail() {
    const { id, tab } = useParams<{ id: string; tab: string }>();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation(['admin/users', 'common']);

    const activeTab = tab || 'information';

    const handleTabChange = (value: string) => {
        navigate(`/crm/users/${id}/${value}`);
    };

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [servicesCount, setServicesCount] = useState(0);

    useEffect(() => {
        loadAllEmployees();
    }, []);

    useEffect(() => {
        if (id) {
            loadEmployee();
            loadServicesCount();
        }
    }, [id]);

    useEffect(() => {
        const filtered = allEmployees.filter(emp =>
            emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.position && emp.position.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredEmployees(filtered);
    }, [searchTerm, allEmployees]);

    const loadAllEmployees = async () => {
        try {
            const response = await api.getUsers();
            const usersArray = Array.isArray(response) ? response : (response?.users || []);
            setAllEmployees(usersArray);
            setFilteredEmployees(usersArray);
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    };

    const loadEmployee = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/api/users/${id}`);
            // Map bio to about_me for EmployeeInformation
            if (data && data.bio && !data.about_me) {
                data.about_me = data.bio;
            }
            setEmployee(data);
        } catch (error) {
            console.error('Error loading employee:', error);
            toast.error(t('error_loading_employee'));
        } finally {
            setLoading(false);
        }
    };

    const loadServicesCount = async () => {
        try {
            const data = await api.get(`/api/users/${id}/services`);
            setServicesCount(data?.assigned_services?.length || 0);
        } catch (error) {
            console.error('Error loading services count:', error);
        }
    };

    const handleDelete = async () => {
        if (!confirm(t('confirm_delete_employee'))) return;

        try {
            await api.post(`/api/users/${id}/delete`);
            toast.success(t('employee_deleted'));
            navigate('/crm/users');
        } catch (error) {
            console.error('Error deleting employee:', error);
            toast.error(t('error_deleting_employee'));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">{t('employee_not_found')}</p>
                <Button onClick={() => navigate('/crm/users')} className="mt-4">
                    {t('back_to_list')}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)]">
            {/* Left Sidebar - Employee List */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen self-start">
                {/* Back Button */}
                <div className="p-4 border-b border-gray-200">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/crm/users')}
                        className="w-full justify-start text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('back_to_list', 'Go back')}
                    </Button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder={t('search_team_member', 'Search team member')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 text-sm"
                        />
                    </div>
                </div>

                {/* Employee List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredEmployees.map((emp) => (
                        <button
                            key={emp.id}
                            onClick={() => navigate(`/crm/users/${emp.id}/${activeTab}`)}
                            className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${emp.id === employee.id ? 'bg-gray-100' : ''
                                }`}
                        >
                            <img
                                src={getPhotoUrl(emp.photo) || getDynamicAvatar(emp.full_name || emp.username, 'cold')}
                                alt={emp.full_name}
                                className="w-10 h-10 rounded-full bg-gray-100 object-cover"
                            />
                            <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-gray-900">
                                    {(i18n.language === 'ru' && emp.full_name_ru) ? emp.full_name_ru : emp.full_name}
                                </p>
                                <p className="text-xs text-gray-500 uppercase">
                                    {(i18n.language === 'ru' && emp.position_ru) ? emp.position_ru : (emp.position || emp.role)}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Add Team Member Button */}
                <div className="p-4 border-t border-gray-200">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/crm/users/create')}
                        className="w-full text-sm"
                    >
                        + {t('add_team_member', 'Add team member')}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
                    {/* Header with Tabs */}
                    <div className="bg-white border-b border-gray-200 shrink-0">
                        <div className="flex items-center justify-between px-6 pt-4">
                            <TabsList className="justify-start border-b-0 rounded-none h-auto p-0 bg-transparent">
                                <TabsTrigger
                                    value="information"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    {t('tab_information', 'Information')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="services"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    {t('tab_services', 'Services')}
                                    {servicesCount > 0 && (
                                        <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                                            {servicesCount}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="online_booking"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    {t('tab_online_booking', 'Online booking')}
                                </TabsTrigger>

                                <TabsTrigger
                                    value="settings"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    {t('tab_settings', 'Settings')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="schedule"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    {t('tab_schedule', 'Schedule')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="payroll"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    {t('tab_payroll', 'Payroll')}
                                </TabsTrigger>
                            </TabsList>

                            {/* Action Buttons - Only Edit and Delete */}
                            <div className="flex items-center gap-2 pb-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                    title={t('action_edit_title', 'Edit')}
                                >
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleDelete}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title={t('action_delete_title', 'Delete')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 bg-gray-50 p-6">
                        <TabsContent value="information" className="mt-0">
                            <EmployeeInformation employee={employee} onUpdate={loadEmployee} />
                        </TabsContent>

                        <TabsContent value="services" className="mt-0">
                            <EmployeeServices
                                employeeId={employee.id}
                                onServicesChange={loadServicesCount}
                            />
                        </TabsContent>

                        <TabsContent value="online_booking" className="mt-0">
                            <EmployeeOnlineBooking employee={employee} onUpdate={loadEmployee} />
                        </TabsContent>

                        <TabsContent value="settings" className="mt-0">
                            <EmployeeSettings employee={employee} onUpdate={loadEmployee} />
                        </TabsContent>

                        <TabsContent value="schedule" className="mt-0">
                            <EmployeeSchedule employeeId={employee.id} employee={employee} />
                        </TabsContent>

                        <TabsContent value="payroll" className="mt-0">
                            <EmployeePayroll employeeId={employee.id} employee={employee} onUpdate={loadEmployee} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div >
    );
}
