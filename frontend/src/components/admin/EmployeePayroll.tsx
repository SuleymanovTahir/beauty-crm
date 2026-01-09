// /frontend/src/components/admin/EmployeePayroll.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Calculator, Calendar, DollarSign, TrendingUp, Save, Percent } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';

interface Employee {
    id: number;
    full_name: string;
    base_salary?: number;
    commission_rate?: number;
}

interface EmployeePayrollProps {
    employeeId: number;
    employee: Employee;
    onUpdate: () => void;
}

interface PayrollSummary {
    total_bookings: number;
    total_revenue: number;
    calculated_salary: number;
    base_salary: number;
    commission_amount: number;
    currency: string;
    period_start: string;
    period_end: string;
}

interface PayrollHistoryItem {
    id: number;
    period_start: string;
    period_end: string;
    total_amount: number;
    currency: string;
    created_at: string;
    status: string;
}



export function EmployeePayroll({ employeeId, employee, onUpdate }: EmployeePayrollProps) {
    const { t } = useTranslation(['admin/users', 'common']);

    // Default to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);
    const [loading, setLoading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [summary, setSummary] = useState<PayrollSummary | null>(null);
    const [history, setHistory] = useState<PayrollHistoryItem[]>([]);

    const [salarySettings, setSalarySettings] = useState({
        base_salary: employee?.base_salary || 0,
        commission_rate: employee?.commission_rate || 0,
        hourly_rate: (employee as any)?.hourly_rate || 0,
        daily_rate: (employee as any)?.daily_rate || 0,
        per_booking_rate: (employee as any)?.per_booking_rate || 0,
        salary_type: 'commission' // fixed, commission, hourly, daily, per_booking
    });

    useEffect(() => {
        setSalarySettings({
            base_salary: employee?.base_salary || 0,
            commission_rate: employee?.commission_rate || 0,
            hourly_rate: (employee as any)?.hourly_rate || 0,
            daily_rate: (employee as any)?.daily_rate || 0,
            per_booking_rate: (employee as any)?.per_booking_rate || 0,
            salary_type: 'commission'
        });
    }, [employee]);

    useEffect(() => {
        loadHistory();
    }, [employeeId]);

    const loadHistory = async () => {
        try {
            const data = await api.get(`/api/payroll/history/${employeeId}`);
            setHistory(data);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    };

    const handleCalculate = async () => {
        try {
            setLoading(true);
            const data = await api.post(`/api/payroll/calculate`, {
                employee_id: employeeId,
                start_date: startDate,
                end_date: endDate
            });
            setSummary(data);
            toast.success(t('calculation_complete', 'Calculation complete'));
        } catch (error) {
            console.error('Error calculating payroll:', error);
            toast.error(t('error_calculating_payroll', 'Error calculating payroll'));
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayment = async () => {
        if (!summary) return;

        try {
            setRecording(true);
            await api.post(`/api/payroll/record-payment`, {
                employee_id: employeeId,
                amount: summary.calculated_salary,
                currency: summary.currency,
                period_start: summary.period_start,
                period_end: summary.period_end
            });
            toast.success(t('payment_recorded', 'Payment recorded successfully'));
            loadHistory();
            setSummary(null); // Clear summary after recording
        } catch (error) {
            console.error('Error recording payment:', error);
            toast.error(t('error_recording_payment', 'Error recording payment'));
        } finally {
            setRecording(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setSavingSettings(true);
            await api.post(`/api/users/${employeeId}/update-profile`, {
                base_salary: salarySettings.base_salary,
                commission_rate: salarySettings.commission_rate,
                hourly_rate: salarySettings.hourly_rate,
                daily_rate: salarySettings.daily_rate,
                per_booking_rate: salarySettings.per_booking_rate
            });
            toast.success(t('settings_saved', 'Settings saved'));
            onUpdate();
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error(t('error_saving_settings', 'Error saving settings'));
        } finally {
            setSavingSettings(false);
        }
    };

    const handleStatusChange = async (paymentId: number, newStatus: string) => {
        try {
            await api.post(`/api/payroll/update-status`, {
                payment_id: paymentId,
                status: newStatus
            });
            toast.success(t('status_updated', 'Status updated'));
            loadHistory();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error(t('error_updating_status', 'Error updating status'));
        }
    };

    return (
        <div className="space-y-6">
            {/* Salary Settings Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        {t('payroll_settings', 'Payroll Settings')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('salary_type', 'Тип расчета зарплаты')}</label>
                        <select
                            value={salarySettings.salary_type}
                            onChange={(e) => setSalarySettings(prev => ({ ...prev, salary_type: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="fixed">{t('salary_type_fixed', 'Фиксированный оклад')}</option>
                            <option value="commission">{t('salary_type_commission', 'Оклад + % от выручки')}</option>
                            <option value="hourly">{t('salary_type_hourly', 'Почасовая оплата')}</option>
                            <option value="daily">{t('salary_type_daily', 'Оплата за день')}</option>
                            <option value="per_booking">{t('salary_type_per_booking', 'Оплата за запись')}</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(salarySettings.salary_type === 'fixed' || salarySettings.salary_type === 'commission') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('base_salary', 'Base Salary')}</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        type="number"
                                        value={salarySettings.base_salary}
                                        onChange={(e) => setSalarySettings(prev => ({ ...prev, base_salary: parseFloat(e.target.value) || 0 }))}
                                        className="pl-8"
                                        placeholder="0"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">{t('base_salary_hint', 'Fixed monthly salary')}</p>
                            </div>
                        )}

                        {salarySettings.salary_type === 'commission' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('commission_rate', 'Commission Rate (%)')}</label>
                                <div className="relative">
                                    <Percent className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        type="number"
                                        value={salarySettings.commission_rate}
                                        onChange={(e) => setSalarySettings(prev => ({ ...prev, commission_rate: parseFloat(e.target.value) || 0 }))}
                                        className="pl-8"
                                        placeholder="0"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">{t('commission_rate_hint', 'Percentage of revenue')}</p>
                            </div>
                        )}

                        {salarySettings.salary_type === 'hourly' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('hourly_rate', 'Ставка за час')}</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        type="number"
                                        value={salarySettings.hourly_rate}
                                        onChange={(e) => setSalarySettings(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                                        className="pl-8"
                                        placeholder="0"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">{t('hourly_rate_hint', 'Оплата за каждый отработанный час')}</p>
                            </div>
                        )}

                        {salarySettings.salary_type === 'daily' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('daily_rate', 'Ставка за день')}</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        type="number"
                                        value={salarySettings.daily_rate}
                                        onChange={(e) => setSalarySettings(prev => ({ ...prev, daily_rate: parseFloat(e.target.value) || 0 }))}
                                        className="pl-8"
                                        placeholder="0"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">{t('daily_rate_hint', 'Оплата за каждый отработанный день')}</p>
                            </div>
                        )}

                        {salarySettings.salary_type === 'per_booking' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('per_booking_rate', 'Оплата за запись')}</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        type="number"
                                        value={salarySettings.per_booking_rate}
                                        onChange={(e) => setSalarySettings(prev => ({ ...prev, per_booking_rate: parseFloat(e.target.value) || 0 }))}
                                        className="pl-8"
                                        placeholder="0"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">{t('per_booking_rate_hint', 'Оплата за каждую завершенную запись')}</p>
                            </div>
                        )}
                    </div>
                    <Button onClick={handleSaveSettings} disabled={savingSettings}>
                        {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {t('save_settings', 'Save Settings')}
                    </Button>
                </CardContent>
            </Card>

            {/* Date Range Controls */}
            <div className="flex flex-wrap items-end gap-4 bg-white p-4 rounded-lg border">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t('start_date', 'Start Date')}</label>
                    <div className="relative">
                        <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="pl-8 w-40"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t('end_date', 'End Date')}</label>
                    <div className="relative">
                        <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="pl-8 w-40"
                        />
                    </div>
                </div>
                <Button onClick={handleCalculate} disabled={loading} className="mb-[2px]">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                    {t('calculate', 'Calculate')}
                </Button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('total_bookings', 'Total Bookings')}
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total_bookings}</div>
                            <p className="text-xs text-muted-foreground">
                                {t('in_selected_period', 'In selected period')}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('total_revenue', 'Total Revenue')}
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {summary.total_revenue} {summary.currency}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('gross_revenue', 'Gross revenue generated')}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('estimated_salary', 'Estimated Salary')}
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {summary.calculated_salary} {summary.currency}
                            </div>
                            <div className="mt-2 space-y-1">
                                <p className="text-xs text-muted-foreground flex justify-between">
                                    <span>{t('base_salary', 'Base')}:</span>
                                    <span className="font-medium">{summary.base_salary || 0} {summary.currency}</span>
                                </p>
                                <p className="text-xs text-muted-foreground flex justify-between">
                                    <span>{t('commission', 'Commission')}:</span>
                                    <span className="font-medium text-blue-600">+{summary.commission_amount || 0} {summary.currency}</span>
                                </p>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 italic">
                                {t('based_on_settings', 'Based on current settings')}
                            </p>
                            <Button
                                className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                                onClick={handleRecordPayment}
                                disabled={recording}
                            >
                                {recording ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {t('record_payment', 'Record & Save Payment')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* History Table (Placeholder for now) */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('payroll_history', 'Payroll History')}</h3>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('period', 'Period')}</TableHead>
                                <TableHead>{t('amount', 'Amount')}</TableHead>
                                <TableHead>{t('status', 'Status')}</TableHead>
                                <TableHead>{t('date', 'Date')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length > 0 ? (
                                history.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            {item.period_start} — {item.period_end}
                                        </TableCell>
                                        <TableCell>
                                            {item.total_amount} {item.currency}
                                        </TableCell>
                                        <TableCell>
                                            <select
                                                value={item.status || 'paid'}
                                                onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                                className={`px-2 py-1 rounded text-xs font-semibold border-0 cursor-pointer ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                    item.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}
                                            >
                                                <option value="pending">{t('status_pending', 'Pending')}</option>
                                                <option value="paid">{t('status_paid', 'Paid')}</option>
                                                <option value="cancelled">{t('status_cancelled', 'Cancelled')}</option>
                                            </select>
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                        {t('no_history', 'No payroll history found')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
