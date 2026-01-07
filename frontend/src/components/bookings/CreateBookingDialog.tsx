
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { X } from 'lucide-react';

// Interface for props
interface CreateBookingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    initialClient?: any; // Pre-selected client
    initialDate?: string; // Pre-selected date YYYY-MM-DD
}

export function CreateBookingDialog({
    open,
    onOpenChange,
    onSuccess,
    initialClient,
    initialDate
}: CreateBookingDialogProps) {
    const { t, i18n } = useTranslation(['admin/bookings', 'admin/services', 'common']);

    // Form State
    const [addForm, setAddForm] = useState({
        phone: '',
        date: initialDate || '',
        time: '',
        revenue: 0,
        master: '',
        status: 'confirmed',
        source: 'manual'
    });

    // Data State
    const [services, setServices] = useState<any[]>([]);
    const [masters, setMasters] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]); // For search

    // Selection State
    const [selectedClient, setSelectedClient] = useState<any>(initialClient || null);
    const [selectedService, setSelectedService] = useState<any>(null);

    // UI State
    const [clientSearch, setClientSearch] = useState('');
    const [serviceSearch, setServiceSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [loadingMasters, setLoadingMasters] = useState(false);
    const [filteredMasters, setFilteredMasters] = useState<any[]>([]);
    const [busySlots, setBusySlots] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Initial Load
    useEffect(() => {
        if (open) {
            loadInitialData();
            if (initialClient) {
                setSelectedClient(initialClient);
                setAddForm(prev => ({ ...prev, phone: initialClient.phone || '' }));
            }
        }
    }, [open, initialClient]);

    const loadInitialData = async () => {
        try {
            const [servicesData, usersData] = await Promise.all([
                api.getServices(),
                api.getUsers()
            ]);
            setServices(servicesData.services || []);
            const allUsers = Array.isArray(usersData) ? usersData : (usersData.users || []);
            const validMasters = allUsers.filter((u: any) =>
                ['employee', 'manager', 'admin', 'director'].includes(u.role)
            );
            setMasters(validMasters);
            setFilteredMasters(validMasters);
        } catch (error) {
            console.error("Failed to load data", error);
            toast.error(t('bookings:error_loading_data'));
        }
    };

    // Client Search
    useEffect(() => {
        if (clientSearch.length > 2) {
            const timeoutId = setTimeout(async () => {
                try {
                    // Start search
                    // Assuming api.getClients() returns a list we filter client-side or use a search endpoint if available
                    // Existing code in Bookings.tsx loaded ALL clients. For massive DBs this is bad, but consistent with existing code for now.
                    // Ideally: api.searchClients(clientSearch)
                    const res = await api.getClients(); // optimization: cache this or use proper search
                    const allClients = res.clients || [];
                    setClients(allClients.filter((c: any) =>
                        (c.display_name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                        (c.phone || '').includes(clientSearch) ||
                        (c.username || '').toLowerCase().includes(clientSearch.toLowerCase())
                    ));
                } catch (e) {
                    console.error(e);
                }
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [clientSearch]);

    // Master Filter based on Service
    useEffect(() => {
        const loadFilteredMasters = async () => {
            if (selectedService) {
                try {
                    setLoadingMasters(true);
                    const data = await api.getEmployeesForService(selectedService.id);
                    setFilteredMasters(data.employees || []);
                } catch (err) {
                    console.error('Error loading filtered masters:', err);
                    setFilteredMasters(masters);
                } finally {
                    setLoadingMasters(false);
                }
            } else {
                setFilteredMasters(masters);
            }
        };
        loadFilteredMasters();
    }, [selectedService, masters]);

    // Busy Slots
    useEffect(() => {
        const loadBusySlots = async () => {
            if (addForm.master && addForm.date) {
                try {
                    const master = masters.find((m: any) => (m.full_name || m.username) === addForm.master);
                    if (master) {
                        const data = await api.getEmployeeBusySlots(master.id, addForm.date);
                        setBusySlots(data.busy_slots || []);
                    }
                } catch (err) {
                    console.error('Error loading busy slots:', err);
                    setBusySlots([]);
                }
            } else {
                setBusySlots([]);
            }
        };
        loadBusySlots();
    }, [addForm.master, addForm.date, masters]);

    const handleSubmit = async () => {
        if (!selectedClient || !selectedService || !addForm.date || !addForm.time) {
            toast.error(t('bookings:fill_all_required_fields'));
            return;
        }

        try {
            setSubmitting(true);
            const bookingData = {
                instagram_id: selectedClient.instagram_id,
                name: selectedClient.display_name || selectedClient.name || selectedClient.username,
                phone: addForm.phone || selectedClient.phone || '',
                service: selectedService.name || selectedService.name_ru,
                date: addForm.date,
                time: addForm.time,
                revenue: addForm.revenue || selectedService.price,
                master: addForm.master,
                source: addForm.source,
            };

            await api.createBooking(bookingData);
            toast.success(t('bookings:booking_created'));
            onSuccess();
            onOpenChange(false);

            // Reset
            setAddForm({
                phone: '',
                date: '',
                time: '',
                revenue: 0,
                master: '',
                status: 'confirmed',
                source: 'manual'
            });
            setSelectedClient(null);
            setSelectedService(null);

        } catch (err: any) {
            toast.error(`${t('bookings:error')}: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredServices = services.filter((s: any) =>
        (s.name_ru || '').toLowerCase().includes(serviceSearch.toLowerCase()) ||
        (s.name || '').toLowerCase().includes(serviceSearch.toLowerCase())
    );

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">{t('bookings:add_booking')}</h3>
                    <button onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">

                    {/* Client Selection */}
                    <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('bookings:client')} *</label>
                        {selectedClient ? (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    <div className="font-medium text-gray-900">{selectedClient.display_name || selectedClient.name || selectedClient.username}</div>
                                    <div className="text-xs text-gray-500">{selectedClient.phone}</div>
                                </div>
                                <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="text"
                                    placeholder={t('bookings:search_client')}
                                    value={clientSearch}
                                    onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                                    onFocus={() => setShowClientDropdown(true)}
                                    className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                                />
                                {showClientDropdown && clientSearch && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                        {clients.length > 0 ? clients.map(c => (
                                            <div
                                                key={c.instagram_id}
                                                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                onClick={() => {
                                                    setSelectedClient(c);
                                                    setClientSearch('');
                                                    setShowClientDropdown(false);
                                                    setAddForm(prev => ({ ...prev, phone: c.phone || '' }));
                                                }}
                                            >
                                                <div className="font-medium text-sm text-gray-900">{c.display_name || c.name || c.username}</div>
                                                <div className="text-xs text-gray-500">{c.phone}</div>
                                            </div>
                                        )) : (
                                            <div className="p-3 text-sm text-gray-500 text-center">{t('bookings:clients_not_found')}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Service Selection */}
                    <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('bookings:service')} *</label>
                        {selectedService ? (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    <div className="font-medium text-gray-900">{selectedService.name_ru || selectedService.name}</div>
                                    <div className="text-xs text-green-600 font-medium">{selectedService.price} {t('bookings:currency')}</div>
                                </div>
                                <button onClick={() => { setSelectedService(null); setFilteredMasters(masters); }} className="text-gray-400 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="text"
                                    placeholder={t('bookings:search_service')}
                                    value={serviceSearch}
                                    onChange={(e) => { setServiceSearch(e.target.value); setShowServiceDropdown(true); }}
                                    onFocus={() => setShowServiceDropdown(true)}
                                    className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                                />
                                {showServiceDropdown && serviceSearch && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                        {filteredServices.length > 0 ? filteredServices.map(s => (
                                            <div
                                                key={s.id}
                                                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                onClick={() => {
                                                    setSelectedService(s);
                                                    setServiceSearch('');
                                                    setShowServiceDropdown(false);
                                                    setAddForm(prev => ({ ...prev, revenue: s.price }));
                                                }}
                                            >
                                                <div className="font-medium text-sm text-gray-900">{s.name_ru || s.name}</div>
                                                <div className="text-xs text-gray-500">{s.price} {t('bookings:currency')}</div>
                                            </div>
                                        )) : (
                                            <div className="p-3 text-sm text-gray-500 text-center">{t('bookings:services_not_found')}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Price/Revenue Adjustment */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('bookings:price')} ({t('bookings:currency')})</label>
                        <input
                            type="number"
                            value={addForm.revenue || ''}
                            onChange={(e) => setAddForm({ ...addForm, revenue: parseFloat(e.target.value) || 0 })}
                            className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('bookings:date')} *</label>
                            <input
                                type="date"
                                value={addForm.date}
                                onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                                className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('bookings:time')} *</label>
                            <input
                                type="time"
                                value={addForm.time}
                                onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
                                className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Master Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('bookings:master')}
                            {loadingMasters && <span className="ml-2 text-xs text-gray-400 font-normal">({t('bookings:loading')}...)</span>}
                        </label>
                        <select
                            value={addForm.master}
                            onChange={(e) => setAddForm({ ...addForm, master: e.target.value })}
                            className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white"
                            disabled={loadingMasters}
                        >
                            <option value="">{t('bookings:select_master')}</option>
                            {filteredMasters.map(m => (
                                <option key={m.id} value={m.full_name || m.username}>
                                    {(i18n.language === 'ru' && m.full_name_ru) ? m.full_name_ru : (m.full_name || m.username)}
                                </option>
                            ))}
                        </select>

                        {/* Busy Slots Warning */}
                        {busySlots.length > 0 && addForm.time && (
                            <div className="mt-2 p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-sm text-amber-800">
                                <div className="font-semibold">{t('bookings:master_busy')}</div>
                                <div className="mt-1">
                                    {busySlots.map((slot, i) => (
                                        <div key={i}>• {slot.start_time} - {slot.end_time}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Status Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('bookings:status', 'Статус')}</label>
                        <select
                            value={addForm.status}
                            onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                            className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white"
                        >
                            <option value="confirmed">{t('bookings:confirmed', 'Подтверждено')}</option>
                            <option value="pending">{t('bookings:pending', 'Ожидает')}</option>
                            <option value="cancelled">{t('bookings:cancelled', 'Отменено')}</option>
                            <option value="completed">{t('bookings:completed', 'Завершено')}</option>
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50 rounded-b-xl">
                    <button
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                        className="flex-1 h-11 rounded-lg border border-gray-200 font-medium text-gray-600 hover:bg-gray-50 transition-all"
                    >
                        {t('bookings:cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 h-11 rounded-lg bg-pink-600 font-medium text-white hover:bg-pink-700 shadow-lg shadow-pink-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? t('bookings:creating') : t('bookings:create_booking')}
                    </button>
                </div>
            </div>
        </div>
    );
}
