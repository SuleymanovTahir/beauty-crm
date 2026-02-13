// /frontend/src/components/admin/EmployeeSettings.tsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { Loader2, Save, Eye } from 'lucide-react';

interface Employee {
    id: number;
    is_public_visible?: boolean;
}

interface EmployeeSettingsProps {
    employee: Employee;
    onUpdate: () => void;
}

export function EmployeeSettings({ employee, onUpdate }: EmployeeSettingsProps) {
    const { t } = useTranslation(['admin/users', 'common']);
    const [loading, setLoading] = useState(false);
    const [isPublicVisible, setIsPublicVisible] = useState(employee.is_public_visible !== false);

    useEffect(() => {
        setIsPublicVisible(employee.is_public_visible !== false);
    }, [employee]);

    const handleSave = async () => {
        try {
            setLoading(true);
            await api.post(`/api/users/${employee.id}/update-profile`, {
                is_public_visible: isPublicVisible
            });
            toast.success(t('settings_updated', 'Settings updated successfully'));
            onUpdate();
        } catch (error) {
            console.error('Error updating employee settings:', error);
            toast.error(t('error_updating_settings', 'Error updating settings'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        {t('public_visibility', 'Public Visibility')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                {t('visible_on_site', 'Visible on website')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {t('visible_on_site_hint', 'This employee appears in public booking and team sections')}
                            </p>
                        </div>
                        <Switch
                            checked={isPublicVisible}
                            onCheckedChange={setIsPublicVisible}
                        />
                    </div>

                    <div className="pt-2">
                        <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {t('save_settings', 'Save Settings')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
