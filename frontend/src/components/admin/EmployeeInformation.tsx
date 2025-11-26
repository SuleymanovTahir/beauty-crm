import { useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Employee {
    id: number;
    username: string;
    full_name: string;
    email: string;
    phone?: string;
    bio?: string;
    position?: string;
}

interface EmployeeInformationProps {
    employee: Employee;
    onUpdate: () => void;
}

export function EmployeeInformation({ employee, onUpdate }: EmployeeInformationProps) {
    const { t } = useTranslation(['admin/users', 'common']);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        full_name: employee.full_name,
        email: employee.email,
        phone: employee.phone || '',
        bio: employee.bio || '',
        position: employee.position || '',
    });

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.post(`/users/${employee.id}/update-profile`, form);
            toast.success(t('profile_updated'));
            setEditing(false);
            onUpdate();
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(t('error_updating_profile'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{t('basic_information')}</h3>
                {!editing ? (
                    <Button onClick={() => setEditing(true)}>{t('edit')}</Button>
                ) : (
                    <div className="flex gap-2">
                        <Button onClick={handleSave} disabled={saving}>
                            {t('save')}
                        </Button>
                        <Button variant="outline" onClick={() => setEditing(false)}>
                            {t('cancel')}
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('full_name')}</Label>
                    <Input
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        disabled={!editing}
                    />
                </div>

                <div className="space-y-2">
                    <Label>{t('email')}</Label>
                    <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        disabled={!editing}
                    />
                </div>

                <div className="space-y-2">
                    <Label>{t('phone')}</Label>
                    <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        disabled={!editing}
                    />
                </div>

                <div className="space-y-2">
                    <Label>{t('position')}</Label>
                    <Input
                        value={form.position}
                        onChange={(e) => setForm({ ...form, position: e.target.value })}
                        disabled={!editing}
                    />
                </div>

                <div className="space-y-2 col-span-2">
                    <Label>{t('bio')}</Label>
                    <textarea
                        className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                        value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        disabled={!editing}
                    />
                </div>
            </div>
        </div>
    );
}
