import { useTranslation } from 'react-i18next';

interface EmployeePayrollProps {
    employeeId: number;
}

export function EmployeePayroll({ employeeId }: EmployeePayrollProps) {
    const { t } = useTranslation(['admin/users', 'common']);

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">{t('payroll_settings')}</h3>
            <p className="text-gray-500">{t('payroll_coming_soon')}</p>
        </div>
    );
}
