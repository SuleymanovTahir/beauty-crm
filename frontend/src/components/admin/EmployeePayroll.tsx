// /frontend/src/components/admin/EmployeePayroll.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Calculator, Calendar, DollarSign, TrendingUp } from 'lucide-react';
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
    currency: string;
    period_start: string;
    period_end: string;
}

interface PayrollHistoryItem {
    id: number;
    period_start: string;
    period_end: string;
    total_amount: number;
    status: 'paid' | 'pending';
    created_at: string;
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
    const [summary, setSummary] = useState<PayrollSummary | null>(null);
    const [history, setHistory] = useState<PayrollHistoryItem[]>([]);

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
                            <p className="text-xs text-muted-foreground">
                                {t('based_on_settings', 'Based on current settings')}
                            </p>
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
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    {t('no_history', 'No payroll history found')}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
