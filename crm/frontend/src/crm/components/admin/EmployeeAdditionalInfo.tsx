// /frontend/src/components/admin/EmployeeAdditionalInfo.tsx
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Employee {
    id: number;
    username: string;
    full_name: string;
    email: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    employment_date?: string;
    termination_date?: string;
}

interface EmployeeAdditionalInfoProps {
    employee: Employee;
    onUpdate: () => void;
}

export function EmployeeAdditionalInfo({ employee, onUpdate }: EmployeeAdditionalInfoProps) {
    const { t } = useTranslation(['admin/users', 'common']);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        middle_name: '',
        employment_date: '',
        termination_date: '',
        phone: '',
    });

    useEffect(() => {
        // Parse full_name into first_name and last_name if not already set
        const nameParts = employee.full_name?.split(' ') || [];
        setForm({
            first_name: employee.first_name || nameParts[0] || '',
            last_name: employee.last_name || nameParts[1] || '',
            middle_name: employee.middle_name || nameParts[2] || '',
            employment_date: employee.employment_date || '',
            termination_date: employee.termination_date || '',
            phone: employee.phone || '',
        });
    }, [employee]);

    const handleSave = async () => {
        try {
            setSaving(true);
            const full_name = `${form.first_name} ${form.last_name} ${form.middle_name}`.trim();
            await api.updateUserProfile(employee.id, {
                username: employee.username,
                full_name,
                email: employee.email,
                phone_number: form.phone,
                // Additional fields that might be supported
                first_name: form.first_name,
                last_name: form.last_name,
                middle_name: form.middle_name,
                employment_date: form.employment_date,
                termination_date: form.termination_date,
            } as any);
            toast.success(t('additional_info_updated', 'Additional information updated'));
            onUpdate();
        } catch (error) {
            console.error('Error updating additional info:', error);
            toast.error(t('error_updating_info', 'Error updating information'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-lg p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                    <Label htmlFor="first_name">{t('first_name', 'Name')}</Label>
                    <Input
                        id="first_name"
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        placeholder={t('first_name_placeholder', 'Example: Victor')}
                        className="mt-2"
                    />
                </div>

                {/* Last name */}
                <div>
                    <Label htmlFor="last_name">{t('last_name', 'Last name')}</Label>
                    <Input
                        id="last_name"
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        placeholder={t('last_name_placeholder', 'Example: Smith')}
                        className="mt-2"
                    />
                </div>

                {/* Middle name */}
                <div>
                    <Label htmlFor="middle_name">{t('middle_name', 'Middle name')}</Label>
                    <Input
                        id="middle_name"
                        value={form.middle_name}
                        onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
                        placeholder={t('middle_name_placeholder', 'Example: Michael')}
                        className="mt-2"
                    />
                </div>

                {/* Employment date */}
                <div>
                    <Label htmlFor="employment_date">{t('employment_date', 'Employment date')}</Label>
                    <Input
                        id="employment_date"
                        type="date"
                        value={form.employment_date}
                        onChange={(e) => setForm({ ...form, employment_date: e.target.value })}
                        className="mt-2"
                    />
                </div>

                {/* Termination date */}
                <div>
                    <Label htmlFor="termination_date">{t('termination_date', 'Registration/patent termination date')}</Label>
                    <Input
                        id="termination_date"
                        type="date"
                        value={form.termination_date}
                        onChange={(e) => setForm({ ...form, termination_date: e.target.value })}
                        className="mt-2"
                    />
                </div>

                {/* Phone number */}
                <div>
                    <Label htmlFor="phone">{t('phone_number', 'Phone number')}</Label>
                    <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder={t('phone_placeholder', 'Example: +971 55 538 79435')}
                        className="mt-2"
                    />
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? t('saving', 'Saving...') : t('save', 'Save')}
                </Button>
            </div>
        </div>
    );
}
