import { useState, useEffect } from 'react';
import { Loader2, Link as LinkIcon } from 'lucide-react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';

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
    const [saving, setSaving] = useState<number | null>(null);

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
            <Accordion type="multiple" className="w-full space-y-4" defaultValue={categories}>
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
                                        {t('provides', 'Provides')}: {assignedCount} {t('of', 'of')} {totalCount}
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-b-0">
                                            <TableHead className="w-[25%]">{t('service', 'Service')}</TableHead>
                                            <TableHead className="w-[20%]">{t('prof_price', "Professional's price")}</TableHead>
                                            <TableHead className="w-[15%] text-center">{t('online_booking', 'Online booking')}</TableHead>
                                            <TableHead className="w-[15%] text-center">{t('appt_calendar', 'Appt. Calendar')}</TableHead>
                                            <TableHead className="w-[15%]">{t('duration', 'Duration')}</TableHead>
                                            <TableHead className="w-[10%] text-center">{t('bill_of_materials', 'Bill of materials')}</TableHead>
                                            <TableHead className="w-[5%]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {categoryServices.map(service => {
                                            const assigned = assignedServices.find(as => as.id === service.id);
                                            const isAssigned = !!assigned;

                                            return (
                                                <TableRow key={service.id} className="hover:bg-gray-50">
                                                    <TableCell className="font-medium">
                                                        {service.name_ru || service.name}
                                                    </TableCell>

                                                    <TableCell>
                                                        {isAssigned ? (
                                                            <div className="relative">
                                                                <Input
                                                                    type="number"
                                                                    value={assigned.price || ''}
                                                                    onChange={(e) => handleUpdateService(service.id, { price: parseFloat(e.target.value) })}
                                                                    className="h-8 w-full pr-8"
                                                                    placeholder="0"
                                                                />
                                                                <span className="absolute right-2 top-2 text-xs text-gray-400">{t('currency', 'AED')}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        {isAssigned ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Switch
                                                                    checked={assigned.is_online_booking_enabled}
                                                                    onCheckedChange={(checked) => handleUpdateService(service.id, { is_online_booking_enabled: checked })}
                                                                    className="data-[state=checked]:bg-yellow-400"
                                                                />
                                                                <span className="text-sm text-gray-600">
                                                                    {assigned.is_online_booking_enabled ? t('on', 'On') : t('off', 'Off')}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        {isAssigned ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Switch
                                                                    checked={assigned.is_calendar_enabled}
                                                                    onCheckedChange={(checked) => handleUpdateService(service.id, { is_calendar_enabled: checked })}
                                                                    className="data-[state=checked]:bg-yellow-400"
                                                                />
                                                                <span className="text-sm text-gray-600">
                                                                    {assigned.is_calendar_enabled ? t('on', 'On') : t('off', 'Off')}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        {isAssigned ? (
                                                            <Select
                                                                value={String(assigned.duration || 60)}
                                                                onValueChange={(value) => handleUpdateService(service.id, { duration: parseInt(value) })}
                                                            >
                                                                <SelectTrigger className="h-8 border-none bg-transparent shadow-none hover:bg-gray-100">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="15">00 h 15 m</SelectItem>
                                                                    <SelectItem value="30">00 h 30 m</SelectItem>
                                                                    <SelectItem value="45">00 h 45 m</SelectItem>
                                                                    <SelectItem value="50">00 h 50 m</SelectItem>
                                                                    <SelectItem value="60">01 h 00 m</SelectItem>
                                                                    <SelectItem value="90">01 h 30 m</SelectItem>
                                                                    <SelectItem value="120">02 h 00 m</SelectItem>
                                                                    <SelectItem value="150">02 h 30 m</SelectItem>
                                                                    <SelectItem value="180">03 h 00 m</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-center text-gray-500 text-sm">
                                                        {t('not_indicated', 'Not indicated')}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Switch
                                                                checked={isAssigned}
                                                                onCheckedChange={() => handleToggleService(service.id, isAssigned)}
                                                                className="data-[state=checked]:bg-green-500"
                                                            />
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                                                                <LinkIcon className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
}
