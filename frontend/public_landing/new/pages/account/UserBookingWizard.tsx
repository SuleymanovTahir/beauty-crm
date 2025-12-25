///pages/account/UserBookingWizard.tsx
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru, enUS, ar } from 'date-fns/locale';
import { ArrowLeft, Calendar as CalendarIcon, Check, ChevronRight, Clock, Info, List, MapPin, Search, Star, User, X, Home, Loader2, Edit2 } from 'lucide-react';
import { Calendar } from '../../components/ui/calendar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { api } from '../../../../src/services/api';
import { toast } from 'sonner';
import { useAuth } from '../../../../src/contexts/AuthContext';



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

    interface Slot {
        time: string;
        is_optimal: boolean;
    }

    // Data State
    const [masters, setMasters] = useState<Master[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
    const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);
    const [previewSlots, setPreviewSlots] = useState<Record<number, string[]>>({});
    const [previewDates, setPreviewDates] = useState<Record<number, 'today' | 'tomorrow'>>({});

    // Monthly Availability State
    const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

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

    // Draft Config for Master-First Flow
    // When no service is selected, we store selection here.
    const [draftConfig, setDraftConfig] = useState<{ master: Master | null; date: string; time: string; }>({
        master: null,
        date: '',
        time: ''
    });

    // Derived state for legacy compatibility or current context
    const currentConfig = currentServiceId ? bookingConfigs[currentServiceId] : null;
    // If we have a current service, use its master. Otherwise, use draft master.
    const selectedMaster = currentServiceId ? currentConfig?.master : draftConfig.master;
    const selectedDate = currentServiceId ? currentConfig?.date : draftConfig.date;
    const selectedTime = currentServiceId ? currentConfig?.time : draftConfig.time;

    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSelectedModal, setShowSelectedModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Navigation History for Back Button
    const [history, setHistory] = useState<string[]>([]);

    // Smart Master Filtering: Availability Map
    const [mastersAvailability, setMastersAvailability] = useState<Record<string, string[]>>({});

    const updateStep = (newStep: typeof step) => {
        setHistory(prev => [...prev, step]);
        setStep(newStep);
    };

    const handleBack = (override?: () => void) => {
        if (override) {
            override();
            return;
        }

        // Logic 2: Back button should follow history or logical parent
        if (history.length > 0) {
            const laststep = history[history.length - 1] as typeof step;
            setHistory(prev => prev.slice(0, -1));
            setStep(laststep);
        } else {
            // Fallback logic
            if (step === 'professional') setStep('menu');
            else if (step === 'services') setStep('menu');
            else if (step === 'datetime') {
                if (currentServiceId) setStep('professional');
                else setStep('menu');
            }
            else setStep('menu');
        }
    };

    // Helper to get or generate client ID for holds
    const getClientId = () => {
        if (user?.id) return String(user.id);
        let cid = localStorage.getItem('booking_client_id');
        if (!cid) {
            cid = 'guest_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('booking_client_id', cid);
        }
        return cid;
    };

    const handleSlotClick = async (slot: string) => {
        const dStr = selectedDate || '';
        if (!dStr) return; // Не должно случаться, если мы показываем слоты

        // Оптимистично сразу выбираем время в интерфейсе
        const applySelection = () => {
            if (currentServiceId) {
                setBookingConfigs(prev => ({
                    ...prev,
                    [currentServiceId]: { ...prev[currentServiceId], time: slot }
                }));
            } else {
                setDraftConfig(prev => ({
                    ...prev,
                    time: slot
                }));
            }
        };

        applySelection();

        // Если мастер не выбран (режим "любой мастер"), просто не делаем hold,
        // чтобы не ломать UX — запись потом всё равно создаётся с master = 'any_professional'.
        const m = selectedMaster;
        if (!m) return;

        const sId = currentServiceId ? parseInt(currentServiceId) : 0; // 0 если услуги ещё нет
        const mName = m.full_name || m.username;

        try {
            const res = await api.createHold({
                service_id: sId,
                master_name: mName,
                date: dStr,
                time: slot,
                client_id: getClientId()
            });

            if (!res.success) {
                // Бэкенд явно сказал, что слот занят — откатываем выбор
                toast.error(t('slotTaken', 'This slot is already taken. Please choose another.'));
                if (currentServiceId) {
                    setBookingConfigs(prev => ({
                        ...prev,
                        [currentServiceId]: { ...prev[currentServiceId], time: '' }
                    }));
                } else {
                    setDraftConfig(prev => ({
                        ...prev,
                        time: ''
                    }));
                }
            }
        } catch (e) {
            // Ошибка сети / CORS: не блокируем выбор времени, просто логируем
            console.error("Hold failed", e);
            // Можно показать мягкое уведомление, но без блокировки UX
            // toast.warning?.(t('errorHoldSoft', 'Slot selected, but failed to reserve it on server.'));
        }
    };

    // Toggle Master
    const toggleMaster = (master: Master) => {
        if (currentServiceId) {
            setBookingConfigs(prev => {
                const current = prev[currentServiceId];
                // If already selected, deselect. Else select.
                const newMaster = current?.master?.id === master.id ? null : master;

                return {
                    ...prev,
                    [currentServiceId]: {
                        ...current,
                        master: newMaster,
                        // Keep date, but reset time as slots usually differ
                        date: current.date,
                        time: ''
                    }
                };
            });
        } else {
            // Draft Mode
            setDraftConfig(prev => ({
                ...prev,
                master: prev.master?.id === master.id ? null : master,
                // Keep date
                date: prev.date,
                time: ''
            }));
        }
        // Do not auto-navigate
    };

    // Smart Sticky Footer
    const renderStickyFooter = () => {
        // If master-first flow (no services yet)
        if (selectedServices.length === 0) {
            if (step === 'menu') return null; // Don't show on menu

            // If on professional or date, show options


            if ((draftConfig.master || draftConfig.date) && step !== 'services') {
                return (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20 md:absolute md:rounded-b-xl animate-in slide-in-from-bottom-2">
                        <div className="flex gap-3">
                            {/* Secondary: Select Master (if not selected) */}
                            {!draftConfig.master && (
                                <Button
                                    variant="outline"
                                    className="flex-1 h-12 text-lg hover:bg-accent"
                                    onClick={() => updateStep('professional')}
                                >
                                    <User className="w-4 h-4 mr-2" />
                                    {t('chooseMaster', 'Select Master')}
                                </Button>
                            )}
                            <Button
                                className={`h - 12 text - lg hero - button - primary bg - black text - white hover: bg - black / 90 ${!draftConfig.master ? 'flex-1' : 'w-full'} `}
                                onClick={() => updateStep('services')}
                            >
                                {t('chooseServices', 'Select Services')}
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                );
            }
            return null;
        }

        // Find first service that is not fully configured (master+date+time)
        const incompleteService = selectedServices.find(s => {
            const cfg = bookingConfigs[String(s.id)];
            return !cfg || !cfg.master || !cfg.date || !cfg.time;
        });

        const config = incompleteService ? bookingConfigs[String(incompleteService.id)] : undefined;

        // Конфигурация шагов заполнения полей для услуги.
        // Позволяет централизованно управлять порядком и целевым шагом без жёстких if/else.
        const fieldFlow: {
            key: 'master' | 'date' | 'time';
            isMissing: (cfg: BookingConfig | undefined) => boolean;
            step: typeof step;
            label: string;
        }[] = [
            {
                key: 'master',
                isMissing: cfg => !cfg || !cfg.master,
                step: 'professional',
                label: t('chooseMaster', 'Выбрать мастера'),
            },
            {
                key: 'date',
                isMissing: cfg => !cfg || !cfg.date,
                step: 'datetime',
                label: t('chooseDate', 'Выбрать дату'),
            },
            {
                key: 'time',
                isMissing: cfg => !cfg || !cfg.time,
                step: 'datetime',
                label: t('chooseTime', 'Выбрать время'),
            },
        ];

        // Если все услуги полностью настроены — показываем финальную кнопку "Записаться"
        const nextField = incompleteService ? fieldFlow.find(f => f.isMissing(config)) : undefined;

        if (!incompleteService || !nextField) {
            return (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20 md:absolute md:rounded-b-xl">
                    <Button
                        onClick={() => updateStep('confirm')}
                        className="w-full h-12 text-lg hero-button-primary hover:bg-black/90"
                        style={{ backgroundColor: 'black', color: 'white' }}
                    >
                        {t('confirmBooking', 'Записаться')}
                    </Button>
                </div>
            );
        }

        return (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20 md:absolute md:rounded-b-xl flex flex-col gap-2">
                <div className="text-xs text-center text-muted-foreground pb-1">
                    Booking for: <span className="font-medium text-foreground">{getServiceName(incompleteService)}</span>
                </div>

                <div className="flex gap-2">
                    {/* Services Button (Back) */}
                    {step !== 'services' && (
                        <Button
                            variant="outline"
                            className="flex-1 h-12 border-primary/50 text-foreground"
                            onClick={() => updateStep('services')}
                        >
                            {t('services', 'Услуги')}
                        </Button>
                    )}

                    {/* Main action button: next required field (master / date / time) */}
                    <Button
                        variant="default"
                        className="flex-[2] h-12"
                        style={{ backgroundColor: 'black', color: 'white' }}
                        onClick={() => {
                            setCurrentServiceId(String(incompleteService.id));
                            updateStep(nextField.step);
                        }}
                    >
                        {nextField.label}
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        );
    };

    // Helpers
    const getServiceName = (s: Service) => {
        return s[`name_${i18n.language} ` as keyof Service] || s.name_ru || s.name;
    };

    const renderHeader = (title: string, onBackOverride?: () => void) => (
        <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => handleBack(onBackOverride)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                {/* Home Button (Exit to Cabinet) */}
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="mr-2">
                        <Home className="w-5 h-5" />
                    </Button>
                )}
                <div className="flex-1">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    {/* Visual Breadcrumbs */}
                    {step !== 'menu' && (
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold mt-1">
                            {/* Breadcrumbs Logic Issue 3: Make them navigate intelligently */}
                            <span
                                className={`${step === 'services' ? 'text-primary' : 'text-muted-foreground hover:text-primary cursor-pointer transition-colors'} `}
                                onClick={() => setStep('services')}
                            >
                                Services
                            </span>
                            <span className="text-muted-foreground/30">/</span>
                            <span
                                className={`${step === 'professional' ? 'text-primary' : (['datetime', 'confirm'].includes(step) ? 'text-muted-foreground hover:text-primary cursor-pointer transition-colors' : 'text-muted-foreground/50')} `}
                                onClick={() => {
                                    if (['datetime', 'confirm'].includes(step)) setStep('professional');
                                    else if (step === 'services') setStep('professional'); // Allow jump?
                                }}
                            >
                                Master
                            </span>
                            <span className="text-muted-foreground/30">/</span>
                            <span className={`${step === 'datetime' ? 'text-primary' : (step === 'confirm' ? 'text-muted-foreground' : 'text-muted-foreground/50')} `}>
                                Date
                            </span>
                        </div>
                    )}
                </div>
                {/* Back to Dashboard Button */}
                <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
                    <X className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );

    const groupSlots = (slots: Slot[]) => {
        const groups: { label: string; slots: Slot[] }[] = [];
        const morning: Slot[] = [];
        const day: Slot[] = [];
        const evening: Slot[] = [];

        slots.forEach(slot => {
            const hour = parseInt(slot.time.split(':')[0], 10);
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
    };

    const [searchParams, setSearchParams] = useSearchParams();

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
            // Only clear if we explicitly want to reset.
            // If user just hit 'Back' from Professional via history, we might keep it.
            // BUT user complaint 1: "Back logic weird".
            // User complaint 2: "Reset checkmarks".
            // So if we reach menu, we clear.
            setSelectedServices([]);
            setBookingConfigs({});
            setCurrentServiceId(null);
            setDraftConfig({ master: null, date: '', time: '' });
            setHistory([]);
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
                        master: draftConfig.master || null, // Apply preselected master if exists
                        date: draftConfig.date || '', // Apply preselected date
                        // Smart Time: If we have a time, checking if it is valid is hard here without fetching.
                        // But we should AT LEAST try to keep it if it exists.
                        // The User's issue is likely that 'date' was somehow empty or not applied.
                        // But wait, if I select Date -> Master -> Service.
                        // Step 1: Date selected -> stored in draftConfig.date
                        // Step 2: Master selected -> stored in draftConfig.master
                        // Step 3: Service toggle -> Should use draftConfig.date.
                        time: '' // Reset time because duration changes slot availability
                    }
                }));
                setCurrentServiceId(String(service.id));
                return [...prev, service];
            }
        });
    };

    // Filter masters for CURRENT service
    const capableMasters = useMemo(() => {
        // If draft mode (no service), show all employees?
        // Or show all, and then when selecting service filter?
        if (!currentServiceId) return masters;

        // Find the service object
        const service = selectedServices.find(s => String(s.id) === currentServiceId);
        if (!service) return masters;

        return masters.filter(master => {
            if (!master.services || master.services.length === 0) {
                return true;
            }
            const hasService = master.services.some(s => String(s.id) === String(service.id));
            return hasService;
        });
    }, [masters, currentServiceId, selectedServices]);

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
                    employees = users.filter((u: any) => u.role === 'employee' || u.is_service_provider);
                    setMasters(employees);
                } catch (err) {
                    console.error("Error loading users", err);
                }

                // Load Services
                const servicesRes = await api.getServices();
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

    // Load holidays
    useEffect(() => {
        api.getHolidays().then(data => {
            if (Array.isArray(data)) {
                setHolidays(data);
            }
        });
    }, []);

    // Load Slots trigger
    useEffect(() => {
        if (currentServiceId && bookingConfigs[currentServiceId]?.date) {
            loadSlots();
        } else if (!currentServiceId && draftConfig.date) {
            // Load slots for draft (master first)
            loadSlots();
        }
    }, [bookingConfigs, currentServiceId, draftConfig.date, draftConfig.master]);

    // Гарантируем, что при входе на шаг выбора времени у текущей услуги сохранится дата,
    // которую клиент уже выбрал ранее (в черновике), чтобы всегда подгружались слоты.
    useEffect(() => {
        if (step === 'datetime' && currentServiceId) {
            const cfg = bookingConfigs[currentServiceId];
            if (cfg && !cfg.date && draftConfig.date) {
                setBookingConfigs(prev => ({
                    ...prev,
                    [currentServiceId]: {
                        ...prev[currentServiceId],
                        date: draftConfig.date,
                        time: '' // сбрасываем время, чтобы заново подобрать слоты
                    }
                }));
            }
        }
    }, [step, currentServiceId, bookingConfigs, draftConfig.date]);

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
                // Для превью используем публичный endpoint, который просто проверяет наличие записей
                const resToday = await api.getPublicAvailableSlots(today, m.id);
                const availableToday = (resToday.slots || []).filter(s => s.available).map(s => s.time);
                if (availableToday.length > 0) {
                    newSlots[m.id] = availableToday.slice(0, 5);
                    newDates[m.id] = 'today';
                } else {
                    const resTomorrow = await api.getPublicAvailableSlots(tomorrow, m.id);
                    const availableTomorrow = (resTomorrow.slots || []).filter(s => s.available).map(s => s.time);
                    if (availableTomorrow.length > 0) {
                        newSlots[m.id] = availableTomorrow.slice(0, 5);
                        newDates[m.id] = 'tomorrow';
                    }
                }
            } catch (e) { }
        }));
        setPreviewSlots(newSlots);
        setPreviewDates(newDates);
    };

    // Load Monthly Availability
    useEffect(() => {
        const fetchAvailability = async () => {
            // Determine master and duration
            let masterName = '';
            let duration = 60;

            if (currentServiceId) {
                const config = bookingConfigs[currentServiceId];
                if (config?.master) {
                    // для публичного эндпоинта нужен employee_id, но для monthly availability
                    // по-прежнему используем логический masterName (full_name)
                    masterName = config.master.full_name || config.master.username;
                }
                const service = selectedServices.find(s => String(s.id) === currentServiceId);
                if (service) duration = parseDuration(service.duration);
            } else {
                if (draftConfig.master) {
                    masterName = draftConfig.master.full_name || draftConfig.master.username;
                }
            }

            if (!masterName) {
                // Global Availability check
                masterName = 'any';
            }

            try {
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth() + 1;
                const res = await api.getAvailableDates(masterName, year, month, duration);
                if (res.success && res.available_dates) {
                    setAvailableDates(new Set(res.available_dates));
                }
            } catch (e) {
                console.error("Error loading availability", e);
            }
        };

        fetchAvailability();
        fetchAvailability();
    }, [currentMonth, currentServiceId, draftConfig.master, bookingConfigs]);

    // Smart Master Filtering: Load availability for date
    useEffect(() => {
        const checkMasters = async () => {
            // Only if we have a date selected (either in draft or active config)
            const date = currentServiceId ? bookingConfigs[currentServiceId]?.date : draftConfig.date;
            if (!date) {
                setMastersAvailability({});
                return;
            }

            try {
                // We use the existing API that returns availability for ALL masters
                const res = await api.getAllMastersAvailability(date);

                if (res.success && res.availability) {
                    setMastersAvailability(res.availability);
                }
            } catch (e) {
                console.error("Failed to check masters availability", e);
            }
        };
        checkMasters();
    }, [currentServiceId, bookingConfigs, draftConfig.date]);

    const loadSlots = async () => {
        let dateToCheck = '';
        let masterToCheck = null;
        let duration = 60; // Default

        if (currentServiceId) {
            const config = bookingConfigs[currentServiceId];
            if (!config || !config.date) return;
            dateToCheck = config.date;
            masterToCheck = config.master;
            // Calculate duration for CURRENT service
            const service = selectedServices.find(s => String(s.id) === currentServiceId);
            if (service) duration = parseDuration(service.duration);
        } else {
            // Draft Mode
            if (!draftConfig.date) return;
            dateToCheck = draftConfig.date;
            masterToCheck = draftConfig.master;
            // Duration default 60
        }

        try {
            if (masterToCheck) {
                // Конкретный мастер: используем публичный эндпоинт по employee_id
                const res = await api.getPublicAvailableSlots(dateToCheck, masterToCheck.id);
                const slots = (res.slots || [])
                    .filter(s => s.available)
                    .map(s => ({ time: s.time, is_optimal: false }));
                setAvailableSlots(slots);
            } else {
                // Любой мастер: агрегируем доступные слоты по всем кандидатам
                const candidates = currentServiceId ? capableMasters : masters;

                if (candidates.length === 0) {
                    setAvailableSlots([]);
                    return;
                }

                const requests = candidates.map(m =>
                    api.getPublicAvailableSlots(dateToCheck, m.id)
                        .then(r =>
                            (r.slots || [])
                                .filter(s => s.available)
                                .map(s => ({ time: s.time, is_optimal: false }))
                        )
                        .catch(() => [] as Slot[])
                );

                const results = await Promise.all(requests);
                const allSlots: Slot[] = [];
                const seenTimes = new Set<string>();

                results.flat().forEach(slot => {
                    if (!seenTimes.has(slot.time)) {
                        seenTimes.add(slot.time);
                        allSlots.push(slot);
                    }
                });

                setAvailableSlots(allSlots.sort((a, b) => a.time.localeCompare(b.time)));
            }
        } catch (e) {
            console.error("Error loading slots", e);
            setAvailableSlots([]);
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
            for (const service of selectedServices) {
                const config = bookingConfigs[String(service.id)];
                if (!config || !config.date || !config.time) continue;

                await api.createBooking({
                    instagram_id: user?.username || `web_${user?.id} `,
                    service: getServiceName(service),
                    master: config.master?.username || 'any_professional',
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
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={() => onClose()}>
                            <X className="w-6 h-6" />
                        </Button>
                    )}
                </div>


                {/* Menu Items */}
                <div className="grid gap-4">
                    {/* Services First - Per User Request 3 Flow: Select Services -> Choose Professional */}
                    <Card
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-transparent hover:border-l-primary"
                        onClick={() => {
                            updateStep('services');
                        }}
                    >
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <List className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium">{t('chooseServices', 'Select services')}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {selectedServices.length > 0
                                        ? `${selectedServices.length} selected(${selectedServices.reduce((acc, s) => acc + s.price, 0)} AED)`
                                        : "Choose from menu"}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-transparent hover:border-l-primary"
                        onClick={() => {
                            updateStep('professional');
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
                            updateStep('datetime');
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
                {renderStickyFooter()}
            </div >
        );
    }



    if (step === 'professional') {
        const currentService = selectedServices.find(s => String(s.id) === currentServiceId);

        return (
            <div className="space-y-6">
                {renderHeader(currentService ? `${t('chooseMaster')} for ${getServiceName(currentService)}` : t('chooseMaster'))}

                <div className="space-y-6 pb-24">
                    {/* Any Professional Option */}
                    <div
                        className="flex items-center justify-between p-4 bg-transparent cursor-pointer hover:bg-muted/30 rounded-lg group"
                        onClick={() => {
                            if (currentServiceId) {
                                setBookingConfigs(prev => ({
                                    ...prev,
                                    [currentServiceId]: { ...prev[currentServiceId], master: null, date: '', time: '' }
                                }));
                                updateStep('datetime');
                            } else {
                                // Master First: Any Professional -> Go to Services
                                setDraftConfig(prev => ({ ...prev, master: null }));
                                updateStep('services');
                            }
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-lg">Any available professional</span>
                        </div>
                        <div className={`w - 6 h - 6 rounded - full border - 2 ${!selectedMaster ? 'border-primary bg-primary' : 'border-muted-foreground/30'} flex items - center justify - center`}>
                            {!selectedMaster && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                    </div>

                    {/* Masters List */}
                    {capableMasters.map(master => {
                        const isSelected = selectedMaster?.id === master.id;
                        return (
                            <div key={master.id} className="space-y-3">
                                {/* Master Header */}
                                <div
                                    className="flex items-center justify-between cursor-pointer group"
                                    onClick={() => {
                                        toggleMaster(master);
                                    }}
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
                                        <div className={`w - 6 h - 6 rounded - full border - 2 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'} flex items - center justify - center`}>
                                            {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
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
                                                        e.stopPropagation();
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
                                                            updateStep('datetime');
                                                        } else {
                                                            // Master First: Clicked slot
                                                            const date = previewDates[master.id] === 'today'
                                                                ? new Date().toISOString().split('T')[0]
                                                                : new Date(Date.now() + 86400000).toISOString().split('T')[0];

                                                            // Update draft
                                                            setDraftConfig({
                                                                master: master,
                                                                date: date,
                                                                time: slot
                                                            });
                                                            // Go to services since we can't book without service
                                                            updateStep('services');
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
                        );
                    })}
                </div>

                {/* Master First Footer Buttons */}
                {!currentServiceId && selectedServices.length === 0 && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20 md:absolute md:rounded-b-xl flex gap-2">
                        <Button className="flex-1 h-12" variant="outline" onClick={() => updateStep('services')}>
                            <List className="w-4 h-4 mr-2" />
                            {t('chooseServices', 'Select Services')}
                        </Button>
                        <Button className="flex-1 h-12" variant="outline" onClick={() => updateStep('datetime')}>
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {t('chooseDate', 'Select Date')}
                        </Button>
                    </div>
                )}

                {renderStickyFooter()}
            </div>
        );
    }

    if (step === 'services') {
        // Extract categories
        // Filter available services based on selected Master (if any)
        const relevantServices = services.filter(s => {
            // If master selected, check if they do this service
            // If draftConfig.master has services populated
            if (!currentServiceId && draftConfig.master) {
                if (draftConfig.master.services && draftConfig.master.services.length > 0) {
                    return draftConfig.master.services.some(ms => String(ms.id) === String(s.id));
                }
                // If master has NO services listed? Assume none? Or All?
                // Safer: If strictly defined, strict. If undefined, maybe show all (but backend usually strict).
                // User request imply strict filtering.
                // Let's check typical Master object.
                if (draftConfig.master.services) return false;
            }
            return true;
        });

        const categories = ['All', ...Array.from(new Set(relevantServices.map(s => s.category || t('other', 'Other'))))];

        // Filter services based on search AND category AND draft config master
        const filteredServices = services.filter(s => {
            const matchesSearch = String(getServiceName(s)).toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || (s.category || t('other', 'Other')) === selectedCategory;
            let matchesMaster = true;
            if (!currentServiceId && draftConfig.master) {
                // If we have a draft master, only show services they perform
                // If master.services is empty/undefined, assume they do everything? Or nothing?
                // Usually employees have services.
                if (draftConfig.master.services && draftConfig.master.services.length > 0) {
                    matchesMaster = draftConfig.master.services.some(ms => String(ms.id) === String(s.id));
                }
            }
            return matchesSearch && matchesCategory && matchesMaster;
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
                                className={`px - 4 py - 2 rounded - full text - sm font - medium whitespace - nowrap transition - colors ${selectedCategory === c
                                    ? 'bg-black text-white'
                                    : 'bg-muted/50 hover:bg-muted text-foreground'
                                    } `}
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
                                                className={`w - 6 h - 6 rounded - md border - 2 flex items - center justify - center transition - all duration - 200 ${isSelected ? 'border-black' : 'border-muted-foreground group-hover:border-primary'} `}
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
                {
                    selectedServices.length > 0 && (
                        <div className="fixed bottom-20 left-4 right-4 z-20 flex justify-between items-center bg-black/5 backdrop-blur-md p-2 rounded-lg mb-2 md:bottom-24">
                            <span className="font-bold text-sm">{selectedServices.length} selected</span>
                            <span className="font-bold text-sm">{getTotalStats().price} AED</span>
                        </div>
                    )
                }
                {renderStickyFooter()}

                {/* Edit Modal (Simple overlay) */}
                {
                    showSelectedModal && (
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
                    )
                }
            </div >
        );
    }

    if (step === 'datetime') {
        const currentLocale = i18n.language === 'ru' ? ru : (i18n.language === 'ar' ? ar : enUS);

        return (
            <div className="space-y-6 pb-24 relative min-h-screen">
                {renderHeader("Select date and time")}

                {/* Date First Flow: Show Options to Select Service/Master IF they are missing */}

                <div className="space-y-6">
                    {/* Date Picker */}
                    <div className="flex justify-center bg-card rounded-lg shadow-sm border p-4">
                        <style>{`
                            .rdp-day_disabled { opacity: 0.3 !important; cursor: not-allowed !important; pointer-events: none !important; }
                            .available-day { background-color: rgba(0, 0, 0, 0.05); color: black; font-weight: bold; border-radius: 50%; }
                            .available-day:hover { background-color: rgba(0, 0, 0, 0.1); }
                            .rdp-day_selected.available-day { background-color: black; color: white; }
                            .rdp-day_holiday { color: var(--destructive); font-weight: bold; }
                            .rdp-day_outside { opacity: 0.5; }
`}</style>
                        <Calendar
                            mode="single"
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            selected={selectedDate ? new Date(selectedDate) : undefined}
                            modifiers={{
                                available: (date) => availableDates.has(format(date, 'yyyy-MM-dd')),
                                holiday: (date) => holidays.some(h => h.date === format(date, 'yyyy-MM-dd'))
                            }}
                            modifiersClassNames={{ available: 'available-day', holiday: 'holiday' }}
                            disabled={(date) => {
                                const dStr = format(date, 'yyyy-MM-dd');
                                // Disable holidays
                                const isHoliday = holidays.some(h => h.date === dStr);
                                if (isHoliday) return true;

                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                if (date < today) return true; // Past dates

                                // KEY FIX: Only disable unavailable dates if we have availability data
                                // AND the date is in the currently viewed month
                                const dateMonth = date.getMonth();
                                const currentViewMonth = currentMonth.getMonth();
                                const dateYear = date.getFullYear();
                                const currentViewYear = currentMonth.getFullYear();

                                // If date is from a different month/year than current view, don't restrict by availability
                                // This allows next month dates to be clickable
                                if (dateMonth !== currentViewMonth || dateYear !== currentViewYear) {
                                    return false;
                                }

                                // For current month: disable if we have availability data and date is not available
                                if (availableDates.size > 0) {
                                    return !availableDates.has(dStr);
                                }

                                return false;
                            }}
                            onSelect={(date) => {
                                let dStr = '';
                                if (date) {
                                    // Fix timezone
                                    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                                    dStr = d.toISOString().split('T')[0];
                                }

                                // Issue 1: Allow deselection.
                                if (currentServiceId) {
                                    setBookingConfigs(prev => ({
                                        ...prev,
                                        [currentServiceId]: {
                                            ...prev[currentServiceId],
                                            date: dStr,
                                            time: '' // Reset time
                                        }
                                    }));
                                } else {
                                    // Draft Mode
                                    setDraftConfig(prev => ({
                                        ...prev,
                                        date: dStr,
                                        time: ''
                                    }));
                                }
                            }}
                            className="rounded-md"
                            locale={currentLocale}

                        />
                    </div>

                    {/* Selected date info */}
                    {selectedDate && (
                        <div className="text-center text-sm text-muted-foreground">
                            {t('selectedDateLabel', 'Selected date')}:{" "}
                            <span className="font-medium text-foreground">
                                {new Date(selectedDate).toLocaleDateString(
                                    i18n.language === 'ru'
                                        ? 'ru-RU'
                                        : i18n.language === 'ar'
                                            ? 'ar-AE'
                                            : 'en-US',
                                    { day: '2-digit', month: '2-digit', year: 'numeric' }
                                )}
                            </span>
                        </div>
                    )}

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
                                            <div key={slot.time} className="relative group/slot">
                                                {slot.is_optimal && (
                                                    <div className="absolute -top-2 -right-1 z-10">
                                                        <span className="flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                                                        </span>
                                                    </div>
                                                )}
                                                <Button
                                                    variant={selectedTime === slot.time ? "default" : "outline"}
                                                    className={`w - full rounded - full px - 2 ${selectedTime === slot.time ? 'bg-black text-white' : 'border-primary/30 text-foreground hover:border-primary'} ${slot.is_optimal ? 'border-pink-300 ring-1 ring-pink-100' : ''} `}
                                                    onClick={() => handleSlotClick(slot.time)}
                                                >
                                                    {slot.time}
                                                </Button>
                                            </div>
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
                                            updateStep('professional');
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
