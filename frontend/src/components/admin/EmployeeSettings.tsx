// /frontend/src/components/admin/EmployeeSettings.tsx
import { useTranslation } from 'react-i18next';

interface Employee {
    id: number;
    full_name: string;
}

interface EmployeeSettingsProps {
    employee: Employee;
    onUpdate: () => void;
}

export function EmployeeSettings({ employee, onUpdate }: EmployeeSettingsProps) {
    const { t } = useTranslation(['admin/users', 'common']);

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">{t('employee_settings')}</h3>
            <p className="text-gray-500">{t('settings_coming_soon')}</p>
        </div>
    );
}
