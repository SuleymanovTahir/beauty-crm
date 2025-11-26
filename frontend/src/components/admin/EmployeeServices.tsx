import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '../ui/accordion';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';

interface Service {
    id: number;
    name: string;
    name_ru: string;
    name_ar: string;
    category: string;
    default_price?: number;
    default_duration?: number;
    is_assigned?: boolean;
}

interface AssignedService {
    id: number;
    name: string;
    name_ru: string;
    category: string;
    price?: number;
    price_min?: number;
    price_max?: number;
    duration?: number;
    is_online_booking_enabled: boolean;
    is_calendar_enabled: boolean;
}

interface EmployeeServicesProps {
    employeeId: number;
    onServicesChange?: () => void;
}

export function EmployeeServices({ employeeId, onServicesChange }: EmployeeServicesProps) {
    const { t } = useTranslation(['admin/users', 'common']);

    const [allServices, setAllServices] = useState<Service[]>([]);
    const [assignedServices, setAssignedServices] = useState<AssignedService[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<number | null>(null); // ID of service being saved

    useEffect(() => {
        loadServices();
    }, [employeeId]);

    const loadServices = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/api/users/${employeeId}/services`);
            setAllServices(data?.all_services || []);
            setAssignedServices(data?.assigned_services || []);
        } catch (error) {
            console.error('Error loading services:', error);
            toast.error(t('error_loading_services'));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleService = async (serviceId: number, currentAssigned: boolean) => {
        try {
            if (currentAssigned) {
                await api.delete(`/api/users/${employeeId}/services/${serviceId}`);
                toast.success(t('service_removed'));
            } else {
                const service = allServices.find(s => s.id === serviceId);
                await api.post(`/api/users/${employeeId}/services`, {
                    service_id: serviceId,
                    price: service?.default_price,
                    duration: service?.default_duration || 60,
                    is_online_booking_enabled: true,
                    is_calendar_enabled: true,
                });
                toast.success(t('service_added'));
            }
            loadServices();
            onServicesChange?.();
        } catch (error) {
            console.error('Error toggling service:', error);
            toast.error(t('error_updating_service'));
        }
    };

    const handleUpdateService = async (serviceId: number, updates: Partial<AssignedService>) => {
        try {
            setSaving(serviceId);
            // Optimistic update
            setAssignedServices(prev => prev.map(s =>
                s.id === serviceId ? { ...s, ...updates } : s
            ));

            await api.put(`/api/users/${employeeId}/services/${serviceId}`, updates);
            // toast.success(t('service_updated')); // Too noisy for inline edits
        } catch (error) {
            console.error('Error updating service:', error);
            toast.error(t('error_updating_service'));
            loadServices(); // Revert on error
        } finally {
            setSaving(null);
        }
    };

    // Group services by category
    const categories = Array.from(new Set(allServices.map(s => s.category))).filter(Boolean);
    const servicesByCategory = categories.reduce((acc, category) => {
        acc[category] = allServices.filter(s => s.category === category);
        return acc;
    }, {} as Record<string, Service[]>);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Accordion type="multiple" className="w-full space-y-4">
                {categories.map(category => {
                    const categoryServices = servicesByCategory[category];
                    const assignedCount = categoryServices.filter(s =>
                        assignedServices.some(as => as.id === s.id)
                    ).length;
                    const totalCount = categoryServices.length;

                    return (
                        <AccordionItem key={category} value={category} className="border rounded-lg bg-white px-4">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex flex-col items-start text-left">
                                    <span className="text-lg font-semibold">{category}</span>
                                    <span className="text-sm text-gray-500 font-normal">
                                        {t('provides')}: {assignedCount} {t('of')} {totalCount}
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="space-y-6">
                                    {/* Header Row */}
                                    <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase px-2">
                                        <div className="col-span-3">{t('service')}</div>
                                        <div className="col-span-2">{t('prof_price')}</div>
                                        <div className="col-span-2 text-center">{t('online_booking')}</div>
                                        <div className="col-span-2 text-center">{t('appt_calendar')}</div>
                                        <div className="col-span-2">{t('duration')}</div>
                                        <div className="col-span-1"></div>
                                    </div>

                                    {categoryServices.map(service => {
                                        const assigned = assignedServices.find(as => as.id === service.id);
                                        const isAssigned = !!assigned;

                                        return (
                                            <div key={service.id} className="grid grid-cols-12 gap-4 items-center px-2 py-2 hover:bg-gray-50 rounded-md transition-colors">
                                                {/* Service Name */}
                                                <div className="col-span-3 font-medium text-sm">
                                                    {service.name_ru || service.name}
                                                </div>

                                                {/* Price */}
                                                <div className="col-span-2">
                                                    {isAssigned ? (
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                value={assigned.price || ''}
                                                                onChange={(e) => handleUpdateService(service.id, { price: parseFloat(e.target.value) })}
                                                                className="h-8 w-full pr-8"
                                                                placeholder="0"
                                                            />
                                                            <span className="absolute right-2 top-2 text-xs text-gray-400">AED</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">-</span>
                                                    )}
                                                </div>

                                                {/* Online Booking */}
                                                <div className="col-span-2 flex justify-center">
                                                    {isAssigned ? (
                                                        <Switch
                                                            checked={assigned.is_online_booking_enabled}
                                                            onCheckedChange={(checked) => handleUpdateService(service.id, { is_online_booking_enabled: checked })}
                                                        />
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">-</span>
                                                    )}
                                                </div>

                                                {/* Calendar */}
                                                <div className="col-span-2 flex justify-center">
                                                    {isAssigned ? (
                                                        <Switch
                                                            checked={assigned.is_calendar_enabled}
                                                            onCheckedChange={(checked) => handleUpdateService(service.id, { is_calendar_enabled: checked })}
                                                        />
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">-</span>
                                                    )}
                                                </div>

                                                {/* Duration */}
                                                <div className="col-span-2">
                                                    {isAssigned ? (
                                                        <Select
                                                            value={String(assigned.duration || 60)}
                                                            onValueChange={(value) => handleUpdateService(service.id, { duration: parseInt(value) })}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="15">15 {t('min')}</SelectItem>
                                                                <SelectItem value="30">30 {t('min')}</SelectItem>
                                                                <SelectItem value="45">45 {t('min')}</SelectItem>
                                                                <SelectItem value="60">1 {t('hour')}</SelectItem>
                                                                <SelectItem value="90">1.5 {t('hours')}</SelectItem>
                                                                <SelectItem value="120">2 {t('hours')}</SelectItem>
                                                                <SelectItem value="150">2.5 {t('hours')}</SelectItem>
                                                                <SelectItem value="180">3 {t('hours')}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">-</span>
                                                    )}
                                                </div>

                                                {/* Toggle Assignment */}
                                                <div className="col-span-1 flex justify-end">
                                                    <Switch
                                                        checked={isAssigned}
                                                        onCheckedChange={() => handleToggleService(service.id, isAssigned)}
                                                        className="data-[state=checked]:bg-green-500"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
}
