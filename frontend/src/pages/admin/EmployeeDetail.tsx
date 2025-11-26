import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { EmployeeInformation } from '../../components/admin/EmployeeInformation';
import { EmployeeServices } from '../../components/admin/EmployeeServices';
import { EmployeeSchedule } from '../../components/admin/EmployeeSchedule';
import { EmployeeSettings } from '../../components/admin/EmployeeSettings';
import { EmployeePayroll } from '../../components/admin/EmployeePayroll';

interface Employee {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: string;
    position?: string;
    phone?: string;
    bio?: string;
    photo?: string;
    is_service_provider: boolean;
}

export default function EmployeeDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation(['admin/users', 'common']);

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('information');
    const [servicesCount, setServicesCount] = useState(0);

    useEffect(() => {
        if (id) {
            loadEmployee();
            loadServicesCount();
        }
    }, [id]);

    const loadEmployee = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/users/${id}`);
            setEmployee(response.data);
        } catch (error) {
            console.error('Error loading employee:', error);
            toast.error(t('error_loading_employee'));
        } finally {
            setLoading(false);
        }
    };

    const loadServicesCount = async () => {
        try {
            const response = await api.get(`/users/${id}/services`);
            setServicesCount(response.data.assigned_services?.length || 0);
        } catch (error) {
            console.error('Error loading services count:', error);
        }
    };

    const handleDelete = async () => {
        if (!confirm(t('confirm_delete_employee'))) return;

        try {
            await api.post(`/users/${id}/delete`);
            toast.success(t('employee_deleted'));
            navigate('/admin/users');
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
                <Button onClick={() => navigate('/admin/users')} className="mt-4">
                    {t('back_to_list')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/admin/users')}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('go_back')}
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{employee.full_name}</h1>
                        <p className="text-sm text-gray-500">
                            {employee.position || employee.role}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDelete}
                        className="gap-2 text-red-600 hover:text-red-700"
                    >
                        <Trash2 className="h-4 w-4" />
                        {t('delete')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/admin/users')}
                    >
                        <X className="h-4 w-4" />
                        {t('dismiss')}
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                    <TabsTrigger
                        value="information"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                    >
                        {t('tab_information')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="services"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                    >
                        {t('tab_services')}
                        {servicesCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {servicesCount}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger
                        value="schedule"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                    >
                        {t('tab_schedule')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="settings"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                    >
                        {t('tab_settings')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="payroll"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                    >
                        {t('tab_payroll')}
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="information">
                        <EmployeeInformation employee={employee} onUpdate={loadEmployee} />
                    </TabsContent>

                    <TabsContent value="services">
                        <EmployeeServices
                            employeeId={employee.id}
                            onServicesChange={loadServicesCount}
                        />
                    </TabsContent>

                    <TabsContent value="schedule">
                        <EmployeeSchedule employeeId={employee.id} />
                    </TabsContent>

                    <TabsContent value="settings">
                        <EmployeeSettings employee={employee} onUpdate={loadEmployee} />
                    </TabsContent>

                    <TabsContent value="payroll">
                        <EmployeePayroll employeeId={employee.id} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
