import { useState, useEffect } from 'react';
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
    const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSelectedModal, setShowSelectedModal] = useState(false);

    // Helpers
    const getServiceName = (s: Service) => {
        return s[`name_${i18n.language}` as keyof Service] || s.name_ru || s.name;
    };

    const renderHeader = (title: string, onBackHost?: () => void) => (
        <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={onBackHost || (() => setStep('menu'))}>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-semibold">{title}</h2>
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
        let price = 0;
        let duration = 0;
        selectedServices.forEach(s => {
            price += s.price;
            duration += parseDuration(s.duration);
        });
        return { price, duration, durationStr: formattedDuration(duration) };
    };

    const toggleService = (service: Service) => {
        if (selectedServices.find(s => s.id === service.id)) {
            setSelectedServices(selectedServices.filter(s => s.id !== service.id));
        } else {
            setSelectedServices([...selectedServices, service]);
        }
    };

    const filteredServices = services.filter(s =>
        String(getServiceName(s)).toLowerCase().includes(searchTerm.toLowerCase())
    );

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
        if (selectedMaster && selectedDate && selectedService) {
            loadSlots();
        }
    }, [selectedMaster, selectedDate, selectedService]);

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
        if (!selectedMaster || !selectedDate) return;
        try {
            // Calculate total duration for selected services
            const servicesToBook = selectedServices.length > 0 ? selectedServices : (selectedService ? [selectedService] : []);
            let totalDuration = 0;
            if (servicesToBook.length > 0) {
                servicesToBook.forEach(s => totalDuration += parseDuration(s.duration));
            } else {
                totalDuration = 60;
            }

            const res = await api.getAvailableSlots(selectedMaster.username, selectedDate, totalDuration);
            if (res.success) {
                setAvailableSlots(res.available_slots);
            }
        } catch (e) {
            console.error("Error loading slots", e);
        }
    };

    const handleBook = async () => {
        if (!selectedMaster || (selectedServices.length === 0 && !selectedService) || !selectedDate || !selectedTime) return;

        // Support both single selectedService (legacy/fallback) and multiple selectedServices
        const servicesToBook = selectedServices.length > 0 ? selectedServices : (selectedService ? [selectedService] : []);
        const serviceNames = servicesToBook.map(s => getServiceName(s)).join(' + ');

        try {
            setLoading(true);
            await api.createBooking({
                instagram_id: user?.username || `web_${user?.id}`,
                service: serviceNames,
                master: selectedMaster.username,
                date: selectedDate,
                time: selectedTime,
                phone: user?.phone,
                name: user?.full_name
            });
            toast.success(t('bookingSuccess', 'Запись успешно создана!'));
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (e) {
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
                            Shop 13, Amwaj 3 Plaza Level, JBR - Dubai
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
                                <h3 className="font-medium">Select services</h3>
                                <p className="text-sm text-muted-foreground">
                                    {selectedServices.length > 0
                                        ? `${selectedServices.length} selected (${selectedServices.reduce((acc, s) => acc + s.price, 0)} AED)`
                                        : (selectedService ? getServiceName(selectedService) : "Choose from menu")}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-transparent hover:border-l-primary"
                        onClick={() => {
                            // Professional selection allowed anytime
                            setStep('professional');
                        }}
                    >
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium">Choose a professional</h3>
                                <p className="text-sm text-muted-foreground">
                                    {selectedMaster ? selectedMaster.full_name : "Any professional"}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-transparent hover:border-l-primary"
                        onClick={() => {
                            if (!selectedMaster) {
                                toast.info("Please select a professional first to see accurate availability");
                                setStep('professional');
                                return;
                            }
                            setStep('datetime');
                        }}
                    >
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium">Select date and time</h3>
                                <p className="text-sm text-muted-foreground">
                                    {selectedDate ? `${format(new Date(selectedDate), 'd MMM')} at ${selectedTime || '...'}` : "Choose slot"}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </CardContent>
                    </Card>
                </div>

                {/* Action Button */}
                {selectedMaster && (selectedServices.length > 0 || selectedService) && selectedDate && selectedTime && (
                    <Button onClick={() => setStep('confirm')} className="w-full h-12 text-lg hero-button-primary">
                        Продолжить запись
                    </Button>
                )}
            </div>
        );
    }



    if (step === 'professional') {
        return (
            <div className="space-y-6">
                {renderHeader("Choose a professional")}

                <div className="space-y-6">
                    {/* Any Professional Option */}
                    <div
                        className="flex items-center justify-between p-4 bg-transparent cursor-pointer hover:bg-muted/30 rounded-lg group"
                        onClick={() => {
                            setSelectedMaster(null); // Any
                            setStep('menu');
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
                    {masters.map(master => (
                        <div key={master.id} className="space-y-3">
                            {/* Master Header */}
                            <div
                                className="flex items-center justify-between cursor-pointer group"
                                onClick={() => {
                                    setSelectedMaster(master);
                                    setStep('menu');
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
                                                onClick={() => {
                                                    setSelectedMaster(master);
                                                    const date = previewDates[master.id] === 'today'
                                                        ? new Date().toISOString().split('T')[0]
                                                        : new Date(Date.now() + 86400000).toISOString().split('T')[0];
                                                    setSelectedDate(date);
                                                    setSelectedTime(slot); // Pre-select
                                                    // If service not selected, go to menu? Or if service selected go to confirm?
                                                    // Let's just go to menu to show progress
                                                    setStep('menu');
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
        const stats = getTotalStats();

        return (
            <div className="space-y-4 pb-32 relative min-h-screen">
                {renderHeader("Select services")}

                {/* Search & Tabs (Mocked tabs for now as data source is flat) */}
                <div className="sticky top-0 bg-background z-10 space-y-4 pb-4">
                    {/* Categories Row (Future enhancement: real categories) */}
                    {/* 
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                         {categories.map(c => (
                             <button ... >{c}</button>
                         ))}
                    </div> 
                    */}

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
                <div className="space-y-6">
                    {/* Group by existing categories if possible, else updated flat list */}
                    <div className="space-y-4">
                        {filteredServices.map(service => {
                            const isSelected = !!selectedServices.find(s => s.id === service.id);
                            return (
                                <div
                                    key={service.id}
                                    className="flex items-start justify-between py-4 border-b last:border-0 cursor-pointer"
                                    onClick={() => toggleService(service)}
                                >
                                    <div className="space-y-1">
                                        <h4 className="font-medium text-lg">{getServiceName(service)}</h4>
                                        <p className="text-muted-foreground text-sm">{service.duration || '30 min'}</p>
                                        <p className="font-semibold mt-1">{service.price} AED</p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-black border-black text-white' : 'border-muted-foreground'}`}>
                                        {isSelected && <Check className="w-4 h-4" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom Sticky Summary */}
                {selectedServices.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20 md:absolute md:rounded-b-xl">
                        <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setShowSelectedModal(true)}>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}</span>
                                <span className="text-muted-foreground">{stats.durationStr}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{stats.price} AED</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </div>
                        </div>
                        <Button
                            className="w-full h-12 text-lg rounded-full hero-button-primary bg-black text-white hover:bg-black/90"
                            onClick={() => {
                                // Save as single selectedService for compatibility or handle array
                                // For now, taking the first one or changing logic
                                if (selectedServices.length > 0) {
                                    setSelectedService(selectedServices[0]); // Primary
                                    // TODO: Handle multiple services in next steps
                                }
                                setStep('professional'); // Per flow Request: Service -> Professional
                                // Wait, previous flow was Professional -> Date -> Service (AccountBooking)
                                // User Request 2 said: "if chose date, layout... button select service active"
                                // User Request 3 (This one): "Select service -> Choose professional"
                                // It seems user wants: [Services] -> [Professional] -> [Date] OR [Professional] -> [Date] -> [Services]
                                // The latest screenshot "Select services" has button "Choose a professional".
                                // This implies flow: Services Selection -> Professional Selection.
                                // I will enable this flow transition.
                            }}
                        >
                            Choose a professional
                        </Button>
                    </div>
                )}

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
                                if (date) {
                                    // Fix timezone offset issue
                                    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                                    setSelectedDate(d.toISOString().split('T')[0]);
                                    setSelectedTime(''); // Reset time when date changes
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
                                            <button
                                                key={slot}
                                                className={`py-2 px-4 rounded-full text-sm font-medium transition-all ${selectedTime === slot
                                                    ? 'bg-black text-white hover:bg-black/90'
                                                    : 'bg-muted/50 hover:bg-muted text-foreground'
                                                    }`}
                                                onClick={() => setSelectedTime(slot)}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Floating Action Button */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:absolute md:rounded-b-xl z-10">
                    <Button
                        className="w-full h-12 text-lg rounded-full hero-button-primary"
                        disabled={!selectedDate || !selectedTime}
                        onClick={() => setStep('confirm')}
                    >
                        {t('continue', 'Continue')}
                    </Button>
                </div>
            </div>
        );
    }


    if (step === 'confirm') {
        const stats = getTotalStats();
        return (
            <div className="space-y-6 text-center">
                {renderHeader("Confirm Booking", () => setStep('datetime'))}

                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-6 space-y-4">
                        <h3 className="text-xl font-bold">Your Booking</h3>

                        <div className="space-y-4 text-left">
                            <div className="border-b border-primary/10 pb-4">
                                <span className="text-sm text-muted-foreground block mb-2">Services</span>
                                {selectedServices.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedServices.map(s => (
                                            <div key={s.id} className="flex justify-between items-center text-sm">
                                                <span className="font-medium">{getServiceName(s)}</span>
                                                <span>{s.price} AED</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex justify-between font-medium">
                                        <span>{selectedService && getServiceName(selectedService)}</span>
                                        <span>{selectedService?.price} AED</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Master</span>
                                <span className="font-medium">{selectedMaster?.full_name}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Date</span>
                                <span className="font-medium">{selectedDate ? format(new Date(selectedDate), 'd MMMM yyyy') : ''} at {selectedTime}</span>
                            </div>

                            <div className="border-t border-primary/20 pt-4 mt-2 flex justify-between items-end text-primary">
                                <div className="text-left">
                                    <span className="block text-sm text-muted-foreground">Total Duration</span>
                                    <span className="font-medium">{stats.durationStr}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-sm text-muted-foreground">Total Price</span>
                                    <span className="text-2xl font-bold">{stats.price} AED</span>
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleBook} disabled={loading} className="w-full h-12 text-lg hero-button-primary mt-4">
                            {loading ? <Loader2 className="animate-spin" /> : t('confirmBooking', 'Confirm & Book')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
