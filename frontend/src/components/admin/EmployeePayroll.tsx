// /frontend/src/components/admin/EmployeePayroll.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Calculator, Calendar, DollarSign, TrendingUp, Save } from 'lucide-react';
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

interface EmployeePayrollProps {
    employeeId: number;
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



export function EmployeePayroll({ employeeId }: EmployeePayrollProps) {
    const { t } = useTranslation(['admin/users', 'common']);

    // Default to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);
    const [loading, setLoading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [summary, setSummary] = useState<PayrollSummary | null>(null);
    const [history, setHistory] = useState<PayrollHistoryItem[]>([]);

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

    return (
        <div className="space-y-6">
            {/* Controls */}
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
                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                                {item.status || 'paid'}
                                            </span>
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
