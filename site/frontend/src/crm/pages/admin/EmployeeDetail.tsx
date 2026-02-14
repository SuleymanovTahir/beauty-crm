
// /frontend/src/pages/admin/EmployeeDetail.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
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
import { useAuth } from '../../contexts/AuthContext';

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
    const { user } = useAuth();

    const activeTab = tab === 'bookings' ? 'schedule' : (tab || 'information');
    const canViewPayroll = ['director', 'accountant'].includes(String(user?.role ?? '').toLowerCase());
    const visibleTab = activeTab === 'payroll' && !canViewPayroll ? 'information' : activeTab;

    const rolePrefix = window.location.pathname.startsWith('/admin')
        ? '/admin'
        : window.location.pathname.startsWith('/manager')
            ? '/manager'
            : '/crm';
    const usersPath = 'team';

    const handleTabChange = (value: string) => {
        navigate(`${rolePrefix}/${usersPath}/${id}/${value}`);
    };
    const handleGoBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate(`${rolePrefix}/${usersPath}`);
    };

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);

    const [servicesCount, setServicesCount] = useState(0);

    useEffect(() => {
        if (id) {
            loadEmployee();
            loadServicesCount();
        }
    }, [id]);

    useEffect(() => {
        if (tab === 'bookings' && id) {
            navigate(`${rolePrefix}/${usersPath}/${id}/schedule`, { replace: true });
        }
    }, [tab, id]);

    useEffect(() => {
        if (!id) {
            return;
        }
        if (activeTab === 'payroll' && !canViewPayroll) {
            navigate(`${rolePrefix}/${usersPath}/${id}/information`, { replace: true });
        }
    }, [activeTab, canViewPayroll, id, navigate, rolePrefix, usersPath]);

    const loadEmployee = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/api/users/${id}?language=${i18n.language}`);
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
                <Button onClick={() => navigate(`${rolePrefix}/${usersPath}`)} className="mt-4">
                    {t('back_to_list')}
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)]">
            <Tabs value={visibleTab} onValueChange={handleTabChange} className="flex flex-col h-full">
                <div className="bg-white border-b border-gray-200 shrink-0">
                    <div className="px-4 sm:px-6 pt-4 pb-2">
                        <Button
                            variant="outline"
                            onClick={handleGoBack}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {t('back_to_list', 'Назад')}
                        </Button>
                    </div>
                    <div className="px-4 sm:px-6 pb-1">
                        <div className="w-full overflow-x-auto">
                        <TabsList className="justify-start border-b-0 rounded-none h-auto p-0 bg-transparent min-w-max">
                            <TabsTrigger
                                value="information"
                                className="shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                            >
                                {t('tab_information', 'Information')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="services"
                                className="shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
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
                                className="shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                            >
                                {t('tab_online_booking', 'Online booking')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="settings"
                                className="shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                            >
                                {t('tab_settings', 'Settings')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="schedule"
                                className="shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                            >
                                {t('tab_schedule', 'Schedule')}
                            </TabsTrigger>
                            {canViewPayroll && (
                                <TabsTrigger
                                    value="payroll"
                                    className="shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    {t('tab_payroll', 'Payroll')}
                                </TabsTrigger>
                            )}
                        </TabsList>
                        </div>
                    </div>
                </div>

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

                    {canViewPayroll && (
                        <TabsContent value="payroll" className="mt-0">
                            <EmployeePayroll employeeId={employee.id} employee={employee} onUpdate={loadEmployee} />
                        </TabsContent>
                    )}
                </div>
            </Tabs>
        </div>
    );
}
