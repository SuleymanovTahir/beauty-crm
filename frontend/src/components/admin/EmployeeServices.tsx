import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, DollarSign, Clock, Calendar, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';

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
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Edit state for each service
    const [editingService, setEditingService] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<AssignedService>>({});

    useEffect(() => {
        loadServices();
    }, [employeeId]);

    const loadServices = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/users/${employeeId}/services`);
            setAllServices(response.data.all_services || []);
            setAssignedServices(response.data.assigned_services || []);
        } catch (error) {
            console.error('Error loading services:', error);
            toast.error(t('error_loading_services'));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleService = async (service: Service) => {
        if (service.is_assigned) {
            // Remove service
            try {
                await api.delete(`/users/${employeeId}/services/${service.id}`);
                toast.success(t('service_removed'));
                loadServices();
                onServicesChange?.();
            } catch (error) {
                console.error('Error removing service:', error);
                toast.error(t('error_removing_service'));
            }
        } else {
            // Add service with default values
            try {
                await api.post(`/users/${employeeId}/services`, {
                    service_id: service.id,
                    price: service.default_price,
                    duration: service.default_duration || 60,
                    is_online_booking_enabled: true,
                    is_calendar_enabled: true,
                });
                toast.success(t('service_added'));
                loadServices();
                onServicesChange?.();
            } catch (error) {
                console.error('Error adding service:', error);
                toast.error(t('error_adding_service'));
            }
        }
    };

    const handleEditService = (service: AssignedService) => {
        setEditingService(service.id);
        setEditForm({
            price: service.price,
            price_min: service.price_min,
            price_max: service.price_max,
            duration: service.duration,
            is_online_booking_enabled: service.is_online_booking_enabled,
            is_calendar_enabled: service.is_calendar_enabled,
        });
    };

    const handleSaveService = async (serviceId: number) => {
        try {
            setSaving(true);
            await api.put(`/users/${employeeId}/services/${serviceId}`, editForm);
            toast.success(t('service_updated'));
            setEditingService(null);
            loadServices();
        } catch (error) {
            console.error('Error updating service:', error);
            toast.error(t('error_updating_service'));
        } finally {
            setSaving(false);
        }
    };

    const categories = Array.from(new Set(allServices.map(s => s.category))).filter(Boolean);

    const filteredServices = allServices.filter(service => {
        const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.name_ru?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with filters */}
            <div className="flex gap-4">
                <div className="flex-1">
                    <Input
                        placeholder={t('search_services')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder={t('all_categories')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('all_categories')}</SelectItem>
                        {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Assigned Services */}
            {assignedServices.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('assigned_services')} ({assignedServices.length})</h3>
                    <div className="space-y-2">
                        {assignedServices.map(service => (
                            <div
                                key={service.id}
                                className="border rounded-lg p-4 space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">{service.name_ru || service.name}</h4>
                                        <p className="text-sm text-gray-500">{service.category}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {editingService === service.id ? (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSaveService(service.id)}
                                                    disabled={saving}
                                                >
                                                    <Save className="h-4 w-4 mr-2" />
                                                    {t('save')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setEditingService(null)}
                                                >
                                                    {t('cancel')}
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditService(service)}
                                                >
                                                    {t('edit')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleToggleService({ ...service, is_assigned: true } as Service)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {editingService === service.id && (
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                        {/* Price Settings */}
                                        <div className="space-y-2">
                                            <Label>{t('price_type')}</Label>
                                            <Select
                                                value={editForm.price_min && editForm.price_max ? 'range' : 'fixed'}
                                                onValueChange={(value) => {
                                                    if (value === 'fixed') {
                                                        setEditForm({ ...editForm, price_min: undefined, price_max: undefined });
                                                    } else {
                                                        setEditForm({ ...editForm, price: undefined });
                                                    }
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="fixed">{t('fixed_price')}</SelectItem>
                                                    <SelectItem value="range">{t('price_range')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {editForm.price_min !== undefined || editForm.price_max !== undefined ? (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>{t('min_price')}</Label>
                                                    <Input
                                                        type="number"
                                                        value={editForm.price_min || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, price_min: parseFloat(e.target.value) })}
                                                        placeholder="700"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('max_price')}</Label>
                                                    <Input
                                                        type="number"
                                                        value={editForm.price_max || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, price_max: parseFloat(e.target.value) })}
                                                        placeholder="1200"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-2">
                                                <Label>{t('price')}</Label>
                                                <Input
                                                    type="number"
                                                    value={editForm.price || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                                                    placeholder="350"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label>{t('duration_minutes')}</Label>
                                            <Select
                                                value={String(editForm.duration || 60)}
                                                onValueChange={(value) => setEditForm({ ...editForm, duration: parseInt(value) })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="30">30 {t('minutes')}</SelectItem>
                                                    <SelectItem value="60">60 {t('minutes')}</SelectItem>
                                                    <SelectItem value="90">90 {t('minutes')}</SelectItem>
                                                    <SelectItem value="120">120 {t('minutes')}</SelectItem>
                                                    <SelectItem value="180">180 {t('minutes')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={editForm.is_online_booking_enabled}
                                                onCheckedChange={(checked) =>
                                                    setEditForm({ ...editForm, is_online_booking_enabled: checked })
                                                }
                                            />
                                            <Label>{t('online_booking_enabled')}</Label>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={editForm.is_calendar_enabled}
                                                onCheckedChange={(checked) =>
                                                    setEditForm({ ...editForm, is_calendar_enabled: checked })
                                                }
                                            />
                                            <Label>{t('calendar_enabled')}</Label>
                                        </div>
                                    </div>
                                )}

                                {editingService !== service.id && (
                                    <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            {service.price_min && service.price_max
                                                ? `${service.price_min} - ${service.price_max} AED`
                                                : service.price
                                                    ? `${service.price} AED`
                                                    : t('not_set')}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            {service.duration ? `${service.duration} ${t('min')}` : t('not_set')}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-4 w-4" />
                                            {service.is_online_booking_enabled ? t('online_yes') : t('online_no')}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            {service.is_calendar_enabled ? t('calendar_yes') : t('calendar_no')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Available Services */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('available_services')}</h3>
                <div className="grid grid-cols-2 gap-2">
                    {filteredServices.map(service => (
                        <div
                            key={service.id}
                            className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50"
                        >
                            <Checkbox
                                checked={service.is_assigned}
                                onCheckedChange={() => handleToggleService(service)}
                            />
                            <div className="flex-1">
                                <p className="font-medium">{service.name_ru || service.name}</p>
                                <p className="text-sm text-gray-500">{service.category}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
