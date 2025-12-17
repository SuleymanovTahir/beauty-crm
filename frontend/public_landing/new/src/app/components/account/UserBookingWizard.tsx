import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru, enUS, ar } from 'date-fns/locale';
import { User, List, ChevronRight, ArrowLeft, MapPin, Loader2, Calendar as CalendarIcon, Search, Check, Edit2, X } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { api } from '../../../../../../src/services/api';
import { toast } from 'sonner';
import { useAuth } from '../../../../../../src/contexts/AuthContext';

interface Service {
    id: number;
    name: string;
    name_ru?: string;
    name_ar?: string;
    price: number;
    duration?: string;
    currency?: string;
    description?: string;
    category?: string; // Add category field
    [key: string]: any;
}

interface Master {
    id: number;
    full_name: string;
    username: string;
    photo?: string;
    position?: string;
    services?: Service[];
}

interface Props {
    onClose?: () => void;
    onSuccess?: () => void;
}

export function UserBookingWizard({ onClose, onSuccess }: Props) {
    const { t, i18n } = useTranslation(['booking', 'common']);
    const { user } = useAuth(); // used for booking payload

    const [step, setStep] = useState<'menu' | 'professional' | 'services' | 'datetime' | 'confirm'>('menu');
    const [loading, setLoading] = useState(false);

    // Data State
    const [masters, setMasters] = useState<Master[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [previewSlots, setPreviewSlots] = useState<Record<number, string[]>>({});
    const [previewDates, setPreviewDates] = useState<Record<number, 'today' | 'tomorrow'>>({});

    // Selection State
    interface BookingConfig {
        serviceId: string;
        master: Master | null;
        date: string;
        time: string;
    }

    // Selection State - Refactored for Multi-Service
    const [bookingConfigs, setBookingConfigs] = useState<Record<string, BookingConfig>>({});
    const [currentServiceId, setCurrentServiceId] = useState<string | null>(null);

    // Derived state for legacy compatibility or current context
    const currentConfig = currentServiceId ? bookingConfigs[currentServiceId] : null;
    const selectedMaster = currentConfig?.master || null;
    const selectedDate = currentConfig?.date || '';
    const selectedTime = currentConfig?.time || '';

    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSelectedModal, setShowSelectedModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Toggle Master
    // Toggle Master Implementation for Current Service
    const toggleMaster = (master: Master) => {
        if (!currentServiceId) return;

        setBookingConfigs(prev => {
            const current = prev[currentServiceId];
            // If already selected, deselect. Else select.
            const newMaster = current?.master?.id === master.id ? null : master;

            return {
                ...prev,
                [currentServiceId]: {
                    ...current,
                    master: newMaster,
                    // Reset date/time if master changes, as slots might differ
                    date: '',
                    time: ''
                }
            };
        });
        // Do not auto-navigate
    };

    // Smart Sticky Footer
    const renderStickyFooter = () => {
        if (selectedServices.length === 0) return null;

        // Find first incomplete service
        const incompleteService = selectedServices.find(s => {
            const config = bookingConfigs[String(s.id)];
            return !config || !config.master || !config.date || !config.time;
        });

        // If all services configured -> Show Confirm
        if (!incompleteService) {
            return (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20 md:absolute md:rounded-b-xl">
                    <Button
                        onClick={() => setStep('confirm')}
                        className="w-full h-12 text-lg hero-button-primary hover:bg-black/90"
                        style={{ backgroundColor: 'black', color: 'white' }}
                    >
                        {t('continue', 'Continue')}
                    </Button>
                </div>
            );
        }

        // Determine next step for the incomplete service
        const config = bookingConfigs[String(incompleteService.id)];
        const needsMaster = !config || !config.master;
        const needsDate = !needsMaster && (!config.date || !config.time);

        return (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20 md:absolute md:rounded-b-xl flex flex-col gap-2">
                <div className="text-xs text-center text-muted-foreground pb-1">
                    Booking for: <span className="font-medium text-foreground">{getServiceName(incompleteService)}</span>
                </div>

                <div className="flex gap-2">
                    {/* Services Button (Values 'Back') */}
                    {step !== 'services' && (
                        <Button
                            variant="outline"
                            className="flex-1 h-12 border-primary/50 text-foreground"
                            onClick={() => setStep('services')}
                        >
                            {t('services', 'Services')}
                        </Button>
                    )}

                    {/* Select Date (Any Master) */}
                    {needsMaster && (
                        <Button
                            variant="outline"
                            className="flex-[1.5] h-12 border-primary/50 text-foreground"
                            onClick={() => {
                                setCurrentServiceId(String(incompleteService.id));
                                // Set 'Any' master implicitly by not setting specific master
                                // But we might need to clear it if it was set?
                                // toggleMaster ensures correct state.
                                // Here we just go to date.
                                setBookingConfigs(prev => ({
                                    ...prev,
                                    [String(incompleteService.id)]: {
                                        ...prev[String(incompleteService.id)],
                                        master: null // Any
                                    }
                                }));
                                setStep('datetime');
                            }}
                        >
                            {t('chooseDate', 'Only Date')}
                        </Button>
                    )}

                    {/* Select Master */}
                    <Button
                        variant="default"
                        className="flex-[2] h-12"
                        style={{ backgroundColor: 'black', color: 'white' }}
                        onClick={() => {
                            setCurrentServiceId(String(incompleteService.id));
                            if (needsMaster) setStep('professional');
                            else if (needsDate) setStep('datetime');
                        }}
                    >
                        {needsMaster ? t('chooseMaster', 'Select Master') : t('chooseDate', 'Select Date')}
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        );
    };

    // Helpers
    const getServiceName = (s: Service) => {
        return s[`name_${i18n.language}` as keyof Service] || s.name_ru || s.name;
    };

    const renderHeader = (title: string, onBackHost?: () => void) => (
        <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBackHost || (() => setStep('menu'))}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    {/* Visual Breadcrumbs */}
                    {step !== 'menu' && (
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold mt-1">
                            <span
                                className={`${step === 'services' ? 'text-primary' : 'text-muted-foreground hover:text-primary cursor-pointer transition-colors'}`}
                                onClick={() => setStep('services')}
                            >
                                Services
                            </span>
                            <span className="text-muted-foreground/30">/</span>
                            <span
                                className={`${step === 'professional' ? 'text-primary' : (['datetime', 'confirm'].includes(step) ? 'text-muted-foreground hover:text-primary cursor-pointer transition-colors' : 'text-muted-foreground/50')}`}
                                onClick={() => {
                                    if (['datetime', 'confirm'].includes(step)) setStep('professional');
                                }}
                            >
                                Master
                            </span>
                            <span className="text-muted-foreground/30">/</span>
                            <span className={`${step === 'datetime' ? 'text-primary' : (step === 'confirm' ? 'text-muted-foreground' : 'text-muted-foreground/50')}`}>
                                Date
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const groupSlots = (slots: string[]) => {
        const groups: { label: string; slots: string[] }[] = [];
        const morning: string[] = [];
        const day: string[] = [];
        const evening: string[] = [];

        slots.forEach(slot => {
            const hour = parseInt(slot.split(':')[0], 10);
            if (hour < 12) morning.push(slot);
            else if (hour < 17) day.push(slot);
            else evening.push(slot);
        });

        if (morning.length) groups.push({ label: t('morning', 'Morning'), slots: morning });
        if (day.length) groups.push({ label: t('day', 'Day'), slots: day });
        if (evening.length) groups.push({ label: t('evening', 'Evening'), slots: evening });

        return groups;
    };

    const parseDuration = (durationStr?: string): number => {
        if (!durationStr) return 60;
        let d = 0;
        if (durationStr.includes('h')) d += parseInt(durationStr) * 60;
        if (durationStr.includes('min')) {
            const parts = durationStr.split(' ');
            const minIndex = parts.findIndex(p => p.includes('min'));
            if (minIndex > 0) d += parseInt(parts[minIndex - 1]);
            else if (!durationStr.includes('h')) d += parseInt(durationStr);
        }
        if (d === 0 && !isNaN(parseInt(durationStr))) {
            d = parseInt(durationStr);
        }
        return d > 0 ? d : 60;
    };

    const formattedDuration = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0 && m > 0) return `${h} h ${m} min`;
        if (h > 0) return `${h} h`;
        return `${m} min`;
    };

    const getTotalStats = () => {
        const servicesToCount = selectedServices;

        let totalDuration = 0;
        let totalPrice = 0;

        servicesToCount.forEach(s => {
            totalDuration += parseDuration(s.duration);
            totalPrice += s.price;
        });

        return {
            duration: totalDuration,
            durationStr: formattedDuration(totalDuration),
            price: totalPrice
        };
    }; const [searchParams, setSearchParams] = useSearchParams();

    // Sync URL on Mount and Step Change (Listen to URL changes)
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const stepParam = searchParams.get('step');
        if (stepParam && ['menu', 'services', 'professional', 'datetime', 'confirm'].includes(stepParam)) {
            if (stepParam !== step) {
                setStep(stepParam as any);
            }
        }

        // Restore State from URL if needed (e.g. refresh or deep link)
        const idsParam = searchParams.get('ids');
        const currentParam = searchParams.get('current');

        if (idsParam && services.length > 0) {
            const ids = idsParam.split(',').map(Number);
            // Only update if different to prevent loops
            const currentIds = selectedServices.map(s => s.id);
            const isDifferent = ids.length !== currentIds.length || !ids.every(id => currentIds.includes(id));

            if (isDifferent) {
                const restored = services.filter(s => ids.includes(s.id));
                if (restored.length > 0) {
                    setSelectedServices(restored);
                    // Initialize configs for restored
                    setBookingConfigs(prev => {
                        const next = { ...prev };
                        restored.forEach(s => {
                            if (!next[String(s.id)]) {
                                next[String(s.id)] = { serviceId: String(s.id), master: null, date: '', time: '' };
                            }
                        });
                        return next;
                    });
                }
            }
        }

        if (currentParam && currentParam !== currentServiceId) {
            setCurrentServiceId(currentParam);
        }

    }, [searchParams, services]); // Depend on services to restore objects

    // Write State to URL
    useEffect(() => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('step', step);
            if (!newParams.has('booking')) newParams.set('booking', 'true');

            // Sync Services
            if (selectedServices.length > 0) {
                newParams.set('ids', selectedServices.map(s => s.id).join(','));
            } else {
                newParams.delete('ids');
            }

            // Sync Current Content
            if (currentServiceId) {
                newParams.set('current', currentServiceId);
            } else {
                newParams.delete('current');
            }

            return newParams;
        });
    }, [step, selectedServices, currentServiceId, setSearchParams]);

    // Reset selection when returning to menu (as per user request)
    useEffect(() => {
        if (step === 'menu') {
            setSelectedServices([]);
            setBookingConfigs({});
            setCurrentServiceId(null);
        }
    }, [step]);

    const toggleService = (service: Service, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setSelectedServices(prev => {
            const exists = prev.find(s => String(s.id) === String(service.id));
            if (exists) {
                // Remove service
                const newServices = prev.filter(s => String(s.id) !== String(service.id));
                setBookingConfigs(curr => {
                    const next = { ...curr };
                    delete next[String(service.id)];
                    return next;
                });
                // If we removed the current service, reset currentServiceId?
                if (String(service.id) === currentServiceId) {
                    setCurrentServiceId(null);
                }
                return newServices;
            } else {
                // Add service
                setBookingConfigs(curr => ({
                    ...curr,
                    [String(service.id)]: {
                        serviceId: String(service.id),
                        master: null,
                        date: '',
                        time: ''
                    }
                }));
                // Set context to this new service immediately so Master/Date steps know what we are configuring
                setCurrentServiceId(String(service.id));
                return [...prev, service];
            }
        });
    };

    // Filter masters for CURRENT service
    const capableMasters = useMemo(() => {
        if (!currentServiceId) return masters;
        // Find the service object
        const service = selectedServices.find(s => String(s.id) === currentServiceId);
        if (!service) return masters;

        return masters.filter(master => {
            if (!master.services || master.services.length === 0) return true;
            return master.services.some(s => String(s.id) === String(service.id));
        });
    }, [masters, currentServiceId, selectedServices]);

    // ... (rest of code)

    // Replace usage of 'masters' with 'capableMasters' in render
    // ...

    // Fix click handler in render loop (pass e)
    // onClick={(e) => toggleService(service, e)}

    // Moved filteredServices logic to render or useMemo if needed
    // const filteredServices = ... (Removed to avoid duplicate)

    // Load Data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                // Load Masters
                let employees: Master[] = [];
                try {
                    const usersRes = await api.getUsers();
                    const users = Array.isArray(usersRes) ? usersRes : (usersRes.users || []);
                    // Log to verify services
                    console.log("Users loaded:", users.map((u: any) => ({ name: u.full_name, servicesCount: u.services?.length, services: u.services })));

                    employees = users.filter((u: any) => u.role === 'employee' || u.is_service_provider);
                    setMasters(employees);
                } catch (err) {
                    console.error("Error loading users", err);
                }

                // Load Services
                const servicesRes = await api.getServices();
                // Response from backend/api/services.py is { services: [...] }
                if (Array.isArray(servicesRes)) {
                    setServices(servicesRes);
                } else if (servicesRes.services && Array.isArray(servicesRes.services)) {
                    setServices(servicesRes.services);
                } else if (servicesRes.categories) {
                    const allServices: Service[] = [];
                    servicesRes.categories.forEach((cat: any) => {
                        if (cat.items) allServices.push(...cat.items);
                    });
                    setServices(allServices);
                }
            } catch (e) {
                console.error("Failed to load booking data", e);
                toast.error("Error loading booking data");
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [i18n.language]);

    // Load Slots trigger
    useEffect(() => {
        if (currentServiceId && bookingConfigs[currentServiceId]?.date) {
            loadSlots();
        }
    }, [bookingConfigs, currentServiceId]);

    // Load Preview Slots
    useEffect(() => {
        if (masters.length > 0) loadPreviewSlots();
    }, [masters]);

    const loadPreviewSlots = async () => {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const newSlots: Record<number, string[]> = {};
        const newDates: Record<number, 'today' | 'tomorrow'> = {};

        await Promise.all(masters.map(async (m) => {
            try {
                let res = await api.getAvailableSlots(m.username, today, 60);
                if (res.available_slots?.length > 0) {
                    newSlots[m.id] = res.available_slots.slice(0, 5);
                    newDates[m.id] = 'today';
                } else {
                    res = await api.getAvailableSlots(m.username, tomorrow, 60);
                    if (res.available_slots?.length > 0) {
                        newSlots[m.id] = res.available_slots.slice(0, 5);
                        newDates[m.id] = 'tomorrow';
                    }
                }
            } catch (e) { }
        }));
        setPreviewSlots(newSlots);
        setPreviewDates(newDates);
    };

    const loadSlots = async () => {
        if (!currentServiceId) return;
        const config = bookingConfigs[currentServiceId];
        if (!config || !config.date) return;

        try {
            // Calculate duration for CURRENT service
            const service = selectedServices.find(s => String(s.id) === currentServiceId);
            const duration = service ? parseDuration(service.duration) : 60;

            if (config.master) {
                // Specific master
                const res = await api.getAvailableSlots(config.master.full_name, config.date, duration);
                if (res.success && res.available_slots) {
                    setAvailableSlots(res.available_slots);
                }
            } else {
                // Any master: Filter candidates who can do THIS service, then merge slots.
                const candidates = capableMasters;
                const allSlotsSet = new Set<string>();

                if (candidates.length === 0) {
                    // If no capable masters, no slots.
                    setAvailableSlots([]);
                    return;
                }

                await Promise.all(candidates.map(async (m) => {
                    try {
                        const res = await api.getAvailableSlots(m.full_name, config.date, duration);
                        if (res.success && res.available_slots) {
                            res.available_slots.forEach(s => allSlotsSet.add(s));
                        }
                    } catch (e) { }
                }));

                const sorted = Array.from(allSlotsSet).sort();
                setAvailableSlots(sorted);
            }
        } catch (e) {
            console.error("Error loading slots", e);
        }
    };

    const handleBook = async () => {
        if (selectedServices.length === 0) return;

        // Validation: Verify all services have configs
        const complete = selectedServices.every(s => {
            const c = bookingConfigs[String(s.id)];
            return c && c.master !== undefined && c.date && c.time;
        });

        if (!complete) {
            toast.error(t('completeAllBookings', 'Please complete configuration for all services'));
            return;
        }

        try {
            setLoading(true);

            // Execute bookings in sequence (or separate calls)
            // Backend might not support array? Let's assume loop for now.
            for (const service of selectedServices) {
                const config = bookingConfigs[String(service.id)];
                // If incomplete, skip or error? Should be validated before confirm.
                if (!config || !config.date || !config.time) continue;

                await api.createBooking({
                    instagram_id: user?.username || `web_${user?.id}`,
                    service: getServiceName(service), // Pass single service name
                    master: config.master?.username || 'any_professional', // or handle Any logic if backend supports
                    date: config.date,
                    time: config.time,
                    phone: user?.phone,
                    name: user?.full_name
                });
            }

            toast.success(t('bookingSuccess', 'Запись успешно создана!'));
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (e) {
            console.error("Booking error", e);
            toast.error(t('bookingError', 'Ошибка при создании записи'));
        } finally {
            setLoading(false);
        }
    };

    // ... (renderHeader)

    // ... (groupSlots)

    if (step === 'menu') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Salon Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            M Le Diamant
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Shop 13, Amwaj 2, Plaza Level, JBR - Dubai
                        </p>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="grid gap-4">
                    {/* Services First - Per User Request 3 Flow: Select Services -> Choose Professional */}
                    <Card
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-transparent hover:border-l-primary"
                        onClick={() => setStep('services')}
                    >
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <List className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium">{t('chooseServices', 'Select services')}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {selectedServices.length > 0
                                        ? `${selectedServices.length} selected (${selectedServices.reduce((acc, s) => acc + s.price, 0)} AED)`
                                        : "Choose from menu"}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-transparent hover:border-l-primary"
                        onClick={() => {
                            // If multiple services, maybe go to sticky footer logic? 
                            // Or just professional step to start configuring first one?
                            // Let's use the incomplete logic from footer?
                            // For now, simple redirect to 'professional' which handles 'currentServiceId' logic?
                            // We need to SET a current service ID if none set.
                            if (selectedServices.length > 0 && !currentServiceId) {
                                setCurrentServiceId(String(selectedServices[0].id));
                            }
                            setStep('professional');
                        }}
                    >
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium">{t('chooseMaster', 'Choose a professional')}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {selectedServices.length === 0 ? "Select services first" : "Configure per service"}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-transparent hover:border-l-primary"
                        onClick={() => {
                            if (selectedServices.length > 0 && !currentServiceId) {
                                setCurrentServiceId(String(selectedServices[0].id));
                            }
                            setStep('datetime');
                        }}
                    >
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium">{t('chooseDate', 'Select date and time')}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {selectedServices.length === 0 ? "Select services first" : "Configure per service"}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </CardContent>
                    </Card>
                </div>

                {/* Action Button */}
                {/* Action Button - Moved to Sticky Footer Logic */}
                {renderStickyFooter()}
            </div>
        );
    }



    if (step === 'professional') {
        const currentService = selectedServices.find(s => String(s.id) === currentServiceId);

        return (
            <div className="space-y-6">
                {renderHeader(currentService ? `${t('chooseMaster')} for ${getServiceName(currentService)}` : t('chooseMaster'), () => setStep('services'))}

                <div className="space-y-6">
                    {/* Any Professional Option */}
                    <div
                        className="flex items-center justify-between p-4 bg-transparent cursor-pointer hover:bg-muted/30 rounded-lg group"
                        onClick={() => {
                            if (currentServiceId) {
                                setBookingConfigs(prev => ({
                                    ...prev,
                                    [currentServiceId]: { ...prev[currentServiceId], master: null, date: '', time: '' }
                                }));
                                // Go to next step?
                                // Usually if "Any", next step is Date.
                                setStep('datetime');
                            }
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-lg">Any available professional</span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 ${!selectedMaster ? 'border-primary bg-primary' : 'border-muted-foreground/30'} flex items-center justify-center`}>
                            {!selectedMaster && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                    </div>

                    {/* Masters List */}
                    {capableMasters.map(master => (
                        <div key={master.id} className="space-y-3">
                            {/* Master Header */}
                            <div
                                className="flex items-center justify-between cursor-pointer group"
                                onClick={() => toggleMaster(master)}
                            >
                                <div className="flex items-center gap-4">
                                    <Avatar className="w-12 h-12">
                                        <AvatarImage src={master.photo} />
                                        <AvatarFallback>{master.full_name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-bold text-lg uppercase tracking-wide">{master.full_name}</h3>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{master.position}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 border border-border text-muted-foreground" onClick={(e) => { e.stopPropagation(); /* Show info */ }}>
                                        <span className="font-serif italic font-bold text-xs">i</span>
                                    </Button>
                                    <div className={`w-6 h-6 rounded-full border-2 ${selectedMaster?.id === master.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'} flex items-center justify-center`}>
                                        {selectedMaster?.id === master.id && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                    </div>
                                </div>
                            </div>

                            {/* Nearest Slots */}
                            {previewSlots[master.id] && (
                                <div className="pl-0 sm:pl-16">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Nearest time slot for the appointment <span className="font-bold text-foreground">{previewDates[master.id]}</span>:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {previewSlots[master.id].map(slot => (
                                            <button
                                                key={slot}
                                                className="px-4 py-2 bg-muted/50 hover:bg-muted rounded-2xl text-sm font-medium transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent opening master again
                                                    if (currentServiceId) {
                                                        const date = previewDates[master.id] === 'today'
                                                            ? new Date().toISOString().split('T')[0]
                                                            : new Date(Date.now() + 86400000).toISOString().split('T')[0];

                                                        setBookingConfigs(prev => ({
                                                            ...prev,
                                                            [currentServiceId]: {
                                                                ...prev[currentServiceId],
                                                                master: master,
                                                                date: date,
                                                                time: slot
                                                            }
                                                        }));
                                                        setStep('menu');
                                                    }
                                                }}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (step === 'services') {
        // Extract categories
        const categories = ['All', ...Array.from(new Set(services.map(s => s.category || t('other', 'Other'))))];

        // Filter services based on search AND category
        const filteredServices = services.filter(s => {
            const matchesSearch = String(getServiceName(s)).toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || (s.category || t('other', 'Other')) === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        // Group filtered services by category for display (if All selected)
        const groupedServices = filteredServices.reduce((acc, service) => {
            const cat = service.category || t('other', 'Other');
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
        }, {} as Record<string, Service[]>);

        return (
            <div className="space-y-4 pb-32 relative min-h-screen">
                {renderHeader("Select services")}

                {/* Search & Tabs */}
                <div className="sticky top-0 bg-background z-50 space-y-4 py-4 border-b shadow-sm -mx-4 px-4">
                    {/* Categories Row */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
                        {categories.map(c => (
                            <button
                                key={c}
                                onClick={() => setSelectedCategory(c)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === c
                                    ? 'bg-black text-white'
                                    : 'bg-muted/50 hover:bg-muted text-foreground'
                                    }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-9 bg-muted/30 border-none px-4 py-6 rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Services List */}
                <div className="space-y-8 pt-4">
                    {/* If 'All' is selected, show grouped by category. If specific cat, show list. */}
                    {Object.entries(groupedServices).map(([category, categoryServices]) => (
                        <div key={category} className="space-y-3">
                            {selectedCategory === 'All' && (
                                <h3 className="font-bold text-xl">{category}</h3>
                            )}
                            <div className="space-y-4">
                                {categoryServices.map(service => {
                                    // Use 'some' and ensure string comparison for robust check
                                    const isSelected = selectedServices.some(s => String(s.id) === String(service.id));
                                    return (
                                        <div
                                            key={service.id}
                                            className="flex items-start justify-between py-4 border-b last:border-0 cursor-pointer group"
                                            onClick={(e) => toggleService(service, e)}
                                        >
                                            <div className="flex-1 pr-4">
                                                <h4 className="font-medium text-lg">{getServiceName(service)}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-muted-foreground text-sm">{service.duration || '30 min'}</span>
                                                    <span className="text-muted-foreground text-sm text-[10px]">•</span>
                                                    <span className="font-semibold text-primary">{service.price} AED</span>
                                                </div>
                                            </div>
                                            <div
                                                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? 'border-black' : 'border-muted-foreground group-hover:border-primary'}`}
                                                style={{ backgroundColor: isSelected ? 'black' : 'transparent', borderColor: isSelected ? 'black' : undefined }}
                                            >
                                                {isSelected && <Check className="w-4 h-4" style={{ color: 'white' }} strokeWidth={3} />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {filteredServices.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No services found</p>
                    )}
                </div>

                {/* Bottom Sticky Summary (Legacy replaced by Smart Footer) */}
                {/* However, user liked the summary stats... 
                    The Smart Footer doesn't show stats. 
                    Maybe we should show stats above buttons? 
                    For now, let's use the Smart Footer as requested for navigation.
                    The Summary is useful though. 
                    Let's combine: Show Summary Bar + Smart Buttons below?
                    Or just buttons. User asked for "two buttons".
                */}
                {selectedServices.length > 0 && (
                    <div className="fixed bottom-20 left-4 right-4 z-20 flex justify-between items-center bg-black/5 backdrop-blur-md p-2 rounded-lg mb-2 md:bottom-24">
                        <span className="font-bold text-sm">{selectedServices.length} selected</span>
                        <span className="font-bold text-sm">{getTotalStats().price} AED</span>
                    </div>
                )}
                {renderStickyFooter()}

                {/* Edit Modal (Simple overlay) */}
                {showSelectedModal && (
                    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm p-6 flex flex-col animate-in fade-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Selected Services</h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowSelectedModal(false)}>
                                <X className="w-6 h-6" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4">
                            {selectedServices.map(s => (
                                <div key={s.id} className="flex justify-between items-center border-b pb-4">
                                    <div>
                                        <p className="font-medium">{getServiceName(s)}</p>
                                        <p className="text-sm text-muted-foreground">{s.duration || '30 min'}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold">{s.price} AED</span>
                                        <Button variant="ghost" size="icon" onClick={() => toggleService(s)}>
                                            <X className="w-4 h-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t">
                            <Button className="w-full h-12 bg-black text-white" onClick={() => setShowSelectedModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (step === 'datetime') {
        const currentLocale = i18n.language === 'ru' ? ru : (i18n.language === 'ar' ? ar : enUS);
        return (
            <div className="space-y-6 pb-24 relative min-h-screen">
                {renderHeader("Select date and time", () => setStep('menu'))}

                <div className="space-y-6">
                    {/* Date Picker */}
                    <div className="flex justify-center bg-card rounded-lg shadow-sm border p-4">
                        <Calendar
                            mode="single"
                            selected={selectedDate ? new Date(selectedDate) : undefined}
                            onSelect={(date) => {
                                if (date && currentServiceId) {
                                    // Fix timezone offset issue
                                    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                                    const dStr = d.toISOString().split('T')[0];

                                    setBookingConfigs(prev => ({
                                        ...prev,
                                        [currentServiceId]: {
                                            ...prev[currentServiceId],
                                            date: dStr,
                                            time: '' // Reset time
                                        }
                                    }));
                                }
                            }}
                            className="rounded-md"
                            locale={currentLocale}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                    </div>

                    {/* Slots */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : availableSlots.length === 0 && selectedDate ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('noSlots', 'No available slots for this date')}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groupSlots(availableSlots).map((group, idx) => (
                                <div key={idx} className="space-y-3">
                                    <h4 className="font-medium text-muted-foreground">{group.label}</h4>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {group.slots.map(slot => (
                                            <Button
                                                key={slot}
                                                variant={selectedTime === slot ? "default" : "outline"}
                                                className={`rounded-full px-6 ${selectedTime === slot ? 'bg-black text-white' : 'border-primary/30 text-foreground hover:border-primary'}`}
                                                onClick={() => {
                                                    if (currentServiceId) {
                                                        setBookingConfigs(prev => ({
                                                            ...prev,
                                                            [currentServiceId]: { ...prev[currentServiceId], time: slot }
                                                        }));
                                                        // Auto navigate to confirm if all services done?
                                                        // Or just stay here? Or go to next incomplete service?
                                                        // Let the user decide via Sticky Footer "Continue" or "Next Service"
                                                    }
                                                }}
                                            >
                                                {slot}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Floating Action Button */}
                {renderStickyFooter()}
            </div>
        );
    }


    if (step === 'confirm') {
        const totalStats = getTotalStats();

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
                {renderHeader("Confirmation")}

                <div className="space-y-4">
                    {selectedServices.map(service => {
                        const config = bookingConfigs[String(service.id)];
                        if (!config) return null;

                        return (
                            <Card key={service.id} className="border-l-4 border-l-primary">
                                <CardContent className="p-4 space-y-4">
                                    {/* Service Header */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg">{getServiceName(service)}</h3>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                                <span>{service.duration || '30 min'}</span>
                                                <span>•</span>
                                                <span>{service.price} AED</span>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            setCurrentServiceId(String(service.id));
                                            setStep('professional');
                                        }}>
                                            <Edit2 className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-2">
                                        {/* Master Info */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                {config.master?.photo ? (
                                                    <img src={config.master.photo} alt={config.master.full_name} className="w-full h-full object-cover rounded-full" />
                                                ) : (
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t('master', 'Master')}</p>
                                                <p className="font-medium text-sm">{config.master?.full_name || 'Any Professional'}</p>
                                            </div>
                                        </div>

                                        {/* Date Info */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t('date', 'Date')}</p>
                                                <p className="font-medium text-sm">
                                                    {config.date ? format(new Date(config.date), 'd MMM') : '-'} at {config.time || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {/* Total Summary */}
                    <Card className="bg-muted/30">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-muted-foreground">Total Services</span>
                                <span className="font-medium">{selectedServices.length}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-muted-foreground">Total Duration</span>
                                <span className="font-medium">{totalStats.durationStr}</span>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t mt-4">
                                <span className="text-lg font-bold">Total Price</span>
                                <span className="text-2xl font-bold">{totalStats.price} AED</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Button onClick={handleBook} disabled={loading} className="w-full h-12 text-lg hero-button-primary mt-4 bg-black text-white hover:bg-black/90">
                        {loading ? <Loader2 className="animate-spin" /> : t('confirmBooking', 'Confirm & Book')}
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
