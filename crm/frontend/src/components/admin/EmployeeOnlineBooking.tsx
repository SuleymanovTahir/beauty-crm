// /frontend/src/components/admin/EmployeeOnlineBooking.tsx
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Employee {
    id: number;
    is_available_online?: boolean;
}

interface EmployeeOnlineBookingProps {
    employee: Employee;
    onUpdate: () => void;
}

export function EmployeeOnlineBooking({ employee, onUpdate }: EmployeeOnlineBookingProps) {
    const { t } = useTranslation(['admin/users', 'common']);
    const [availableOnline, setAvailableOnline] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setAvailableOnline(employee.is_available_online ?? true);
    }, [employee]);

    const handleToggle = (value: boolean) => {
        setAvailableOnline(value);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.updateUserProfile(employee.id, {
                is_available_online: availableOnline,
            });
            toast.success(t('online_booking_updated', 'Online booking settings updated'));
            onUpdate();
        } catch (error) {
            console.error('Error updating online booking:', error);
            toast.error(t('error_updating_settings', 'Error updating settings'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">{t('online_booking', 'Online booking')}</h2>

            <div className="space-y-4">
                {/* Available for online booking */}
                <button
                    onClick={() => handleToggle(true)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${availableOnline
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                {t('available_for_online_booking', 'Available for online booking')}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {t('specialist_available_desc', 'The specialist will be available for online booking')}
                            </p>
                        </div>
                        <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${availableOnline ? 'border-yellow-500 bg-yellow-500' : 'border-gray-300'
                                }`}
                        >
                            {availableOnline && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                        </div>
                    </div>
                </button>

                {/* Unavailable for online booking */}
                <button
                    onClick={() => handleToggle(false)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${!availableOnline
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                {t('unavailable_for_online_booking', 'Unavailable for online booking')}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {t('specialist_unavailable_desc', 'The specialist will be unavailable for online booking')}
                            </p>
                        </div>
                        <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!availableOnline ? 'border-yellow-500 bg-yellow-500' : 'border-gray-300'
                                }`}
                        >
                            {!availableOnline && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                        </div>
                    </div>
                </button>
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
