// /frontend/src/components/admin/EmployeeSettings.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { DollarSign, Percent, Save, Loader2, Bell, Mail, MessageSquare } from 'lucide-react';

interface Employee {
    id: number;
    full_name: string;
    base_salary?: number;
    commission_rate?: number;
    is_public_visible?: boolean;
}

interface NotificationSettings {
    notify_email: boolean;
    notify_sms: boolean;
    notify_on_booking: boolean;
    notify_birthday: boolean;
    notify_chat: boolean;
    notify_telegram: boolean;
    has_telegram: boolean;
    has_email: boolean;
}

interface EmployeeSettingsProps {
    employee: Employee;
    onUpdate: () => void;
}

export function EmployeeSettings({ employee, onUpdate }: EmployeeSettingsProps) {
    const { t } = useTranslation(['admin/users', 'common']);
    const [loading, setLoading] = useState(false);
    const [notifLoading, setNotifLoading] = useState(false);

    const [formData, setFormData] = useState({
        base_salary: employee.base_salary || 0,
        commission_rate: employee.commission_rate || 0,
        is_public_visible: employee.is_public_visible !== false // Default to true
    });

    const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
        notify_email: true,
        notify_sms: false,
        notify_on_booking: true,
        notify_birthday: true,
        notify_chat: true,
        notify_telegram: false,
        has_telegram: false,
        has_email: false
    });

    useEffect(() => {
        setFormData({
            base_salary: employee.base_salary || 0,
            commission_rate: employee.commission_rate || 0,
            is_public_visible: employee.is_public_visible !== false
        });
        loadNotificationSettings();
    }, [employee]);

    const loadNotificationSettings = async () => {
        try {
            setNotifLoading(true);
            const data = await api.get(`/api/users/${employee.id}/notification-settings`);
            setNotifSettings(data);
        } catch (error) {
            console.error('Error loading notif settings:', error);
        } finally {
            setNotifLoading(false);
        }
    };

    const handleSavePayroll = async () => {
        try {
            setLoading(true);
            await api.post(`/api/users/${employee.id}/update-profile`, {
                ...employee,
                base_salary: Number(formData.base_salary),
                commission_rate: Number(formData.commission_rate),
                is_public_visible: formData.is_public_visible
            });
            toast.success(t('settings_updated', 'Settings updated successfully'));
            onUpdate();
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error(t('error_updating_settings', 'Error updating settings'));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleNotif = async (key: keyof NotificationSettings, value: boolean) => {
        const newSettings = { ...notifSettings, [key]: value };
        setNotifSettings(newSettings);

        try {
            await api.post(`/api/users/${employee.id}/notification-settings`, newSettings);
            toast.success(t('notifications_updated', 'Notification settings updated'));
        } catch (error) {
            console.error('Error updating notif settings:', error);
            toast.error(t('error_updating_notifications', 'Error updating notifications'));
            // Rollback on error
            setNotifSettings(notifSettings);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Payroll Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        {t('payroll_settings', 'Payroll Settings')}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">{t('public_visibility', 'Public Visibility')}</span>
                        <Switch
                            checked={formData.is_public_visible}
                            onCheckedChange={(val) => setFormData({ ...formData, is_public_visible: val })}
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                {t('base_salary', 'Base Salary')}
                            </label>
                            <Input
                                type="number"
                                value={formData.base_salary}
                                onChange={(e) => setFormData({ ...formData, base_salary: Number(e.target.value) })}
                                placeholder="0"
                            />
                            <p className="text-xs text-gray-500">{t('base_salary_hint', 'Fixed monthly salary')}</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Percent className="w-4 h-4" />
                                {t('commission_rate', 'Commission Rate (%)')}
                            </label>
                            <Input
                                type="number"
                                value={formData.commission_rate}
                                onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
                                placeholder="0"
                            />
                            <p className="text-xs text-gray-500">{t('commission_rate_hint', 'Percentage from completed services')}</p>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button onClick={handleSavePayroll} disabled={loading} className="w-full md:w-auto">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {t('save_payroll_settings', 'Save Payroll Settings')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        {t('notification_settings_title', 'Notification Preferences')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {notifLoading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                        <Mail className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{t('email_notifications', 'Email Notifications')}</p>
                                        <p className="text-xs text-gray-500">{notifSettings.has_email ? employee.full_name : t('no_email_set', 'No email address set')}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={notifSettings.notify_email}
                                    onCheckedChange={(val) => handleToggleNotif('notify_email', val)}
                                    disabled={!notifSettings.has_email}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center">
                                        <MessageSquare className="w-4 h-4 text-sky-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{t('telegram_notifications', 'Telegram Bot Notifications')}</p>
                                        <p className="text-xs text-gray-500">{notifSettings.has_telegram ? t('connected', 'Connected') : t('not_connected_hint', 'Connect via @bot')}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={notifSettings.notify_telegram}
                                    onCheckedChange={(val) => handleToggleNotif('notify_telegram', val)}
                                    disabled={!notifSettings.has_telegram}
                                />
                            </div>

                            <div className="pt-2 border-t mt-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    {t('events_to_notify', 'Events to notify about')}
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-gray-700">{t('notif_new_booking', 'New bookings & changes')}</label>
                                        <Switch
                                            checked={notifSettings.notify_on_booking}
                                            onCheckedChange={(val) => handleToggleNotif('notify_on_booking', val)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-gray-700">{t('notif_birthdays', 'Client birthdays')}</label>
                                        <Switch
                                            checked={notifSettings.notify_birthday}
                                            onCheckedChange={(val) => handleToggleNotif('notify_birthday', val)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-100">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-medium text-blue-900">{t('payroll_explanation_title', 'How payroll works')}</h4>
                            <p className="text-sm text-blue-700 mt-1">
                                {t('payroll_explanation_text', 'The total salary is calculated as: Base Salary + (Total Revenue * Commission Rate / 100). This helps automate monthly payments for your team.')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
