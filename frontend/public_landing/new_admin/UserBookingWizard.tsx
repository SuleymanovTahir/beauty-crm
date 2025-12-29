import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO } from 'date-fns';
import { ru, enUS, ar, es, fr, de, it, pt, ja } from 'date-fns/locale';
import {
  ArrowLeft, Calendar as CalendarIcon, ChevronRight, Clock,
  List, MapPin, Search, Star, User, X, Loader2,
  Sparkles, CheckCircle2, Users, ChevronDown
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from './ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

// Language configurations
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', locale: enUS },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', locale: ru },
  { code: 'ar', name: 'العربية', flag: '🇦🇪', locale: ar },
  { code: 'es', name: 'Español', flag: '🇪🇸', locale: es },
  { code: 'fr', name: 'Français', flag: '🇫🇷', locale: fr },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', locale: de },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', locale: it },
  { code: 'pt', name: 'Português', flag: '🇵🇹', locale: pt },
  { code: 'ja', name: '日本語', flag: '🇯🇵', locale: ja },
];

// Mock data для демонстрации
const MOCK_SERVICES = [
  { id: 1, name: 'Hair Cut', name_ru: 'Стрижка', name_ar: 'قص شعر', price: 150, duration: '60', category: 'Hair', description: 'Professional haircut and styling' },
  { id: 2, name: 'Hair Coloring', name_ru: 'Окрашивание', name_ar: 'صبغ الشعر', price: 400, duration: '120', category: 'Hair', description: 'Full hair coloring service' },
  { id: 3, name: 'Manicure', name_ru: 'Маникюр', name_ar: 'مانيكير', price: 120, duration: '45', category: 'Nails', description: 'Classic manicure treatment' },
  { id: 4, name: 'Pedicure', name_ru: 'Педикюр', name_ar: 'باديكير', price: 150, duration: '60', category: 'Nails', description: 'Relaxing pedicure service' },
  { id: 5, name: 'Facial', name_ru: 'Уход за лицом', name_ar: 'علاج الوجه', price: 250, duration: '75', category: 'Skin Care', description: 'Deep cleansing facial treatment' },
  { id: 6, name: 'Massage', name_ru: 'Массаж', name_ar: 'تدليك', price: 300, duration: '90', category: 'Body', description: 'Full body relaxing massage' },
];

const MOCK_MASTERS = [
  { 
    id: 1, 
    full_name: 'Elena Petrova', 
    username: 'elena_stylist',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
    position: 'Senior Hair Stylist',
    rating: 4.9,
    reviews: 156,
    todaySlots: ['10:00', '12:30', '15:00', '17:30']
  },
  { 
    id: 2, 
    full_name: 'Maria Santos', 
    username: 'maria_nails',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
    position: 'Nail Specialist',
    rating: 4.8,
    reviews: 203,
    todaySlots: ['09:30', '11:00', '14:00', '16:30']
  },
  { 
    id: 3, 
    full_name: 'Sofia Ahmed', 
    username: 'sofia_beauty',
    photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400',
    position: 'Beauty Therapist',
    rating: 4.9,
    reviews: 178,
    todaySlots: ['10:30', '13:00', '15:30', '18:00']
  },
];

const MOCK_TIME_SLOTS = [
  { time: '09:00', is_optimal: false },
  { time: '09:30', is_optimal: true },
  { time: '10:00', is_optimal: true },
  { time: '10:30', is_optimal: false },
  { time: '11:00', is_optimal: true },
  { time: '11:30', is_optimal: false },
  { time: '12:00', is_optimal: false },
  { time: '13:00', is_optimal: true },
  { time: '13:30', is_optimal: false },
  { time: '14:00', is_optimal: true },
  { time: '14:30', is_optimal: true },
  { time: '15:00', is_optimal: false },
  { time: '16:00', is_optimal: true },
  { time: '17:00', is_optimal: false },
  { time: '18:00', is_optimal: true },
  { time: '19:00', is_optimal: false },
];

interface Service {
  id: number;
  name: string;
  name_ru?: string;
  name_ar?: string;
  price: number;
  duration?: string;
  description?: string;
  category?: string;
}

interface Master {
  id: number;
  full_name: string;
  username: string;
  photo?: string;
  position?: string;
  rating?: number;
  reviews?: number;
  todaySlots?: string[];
}

interface Props {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function UserBookingWizard({ onClose, onSuccess }: Props) {
  const [currentLang, setCurrentLang] = useState(LANGUAGES[0]);
  const [step, setStep] = useState<'menu' | 'services' | 'professional' | 'datetime' | 'confirm'>('menu');
  const [loading, setLoading] = useState(false);
  const [masters] = useState<Master[]>(MOCK_MASTERS);
  const [services] = useState<Service[]>(MOCK_SERVICES);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category)))];

  const getServiceName = (s: Service) => (s as any)[`name_${currentLang.code}`] || s.name;

  const filteredServices = services.filter(service => {
    const matchesSearch = getServiceName(service).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + parseInt(s.duration || '0'), 0);

  const handleServiceSelect = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      return exists ? prev.filter(s => s.id !== service.id) : [...prev, service];
    });
  };

  const handleConfirmBooking = async () => {
    if (!selectedServices.length || !selectedDate || !selectedTime) {
      toast.error('Please complete all selections');
      return;
    }

    if (!phoneNumber) {
      setShowPhoneModal(true);
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Booking confirmed successfully!', {
      description: `${format(selectedDate, 'MMMM dd, yyyy', { locale: currentLang.locale })} at ${selectedTime}`
    });
    
    setLoading(false);
    if (onSuccess) onSuccess();
    if (onClose) onClose();
  };

  const renderHeader = (title: string, subtitle?: string) => (
    <div className="sticky top-0 z-10 bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pb-3 pt-3">
      <div className="flex items-center gap-3 mb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (step === 'menu') {
              if (onClose) onClose();
            } else {
              setStep('menu');
            }
          }}
          className="rounded-full hover:bg-white/50 h-9 w-9"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 rounded-full hover:bg-white/50 h-9">
              <span className="text-base">{currentLang.flag}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {LANGUAGES.map(lang => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => setCurrentLang(lang)}
                className={currentLang.code === lang.code ? 'bg-purple-50' : ''}
              >
                <span className="mr-2">{lang.flag}</span>
                <span className="text-sm">{lang.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/50 h-9 w-9">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="mb-2">
        <h2 className="text-lg md:text-xl font-bold mb-0.5">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      </div>

      {step !== 'menu' && (
        <div className="flex items-center gap-1.5 text-[10px] font-medium overflow-x-auto">
          <button
            className={`${step === 'services' ? 'text-purple-600' : 'text-muted-foreground'} transition-colors whitespace-nowrap`}
            onClick={() => setStep('services')}
          >
            Services
          </button>
          <ChevronRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
          <button
            className={`${step === 'professional' ? 'text-purple-600' : 'text-muted-foreground'} transition-colors whitespace-nowrap`}
            onClick={() => selectedServices.length > 0 && setStep('professional')}
            disabled={selectedServices.length === 0}
          >
            Professional
          </button>
          <ChevronRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
          <button
            className={`${step === 'datetime' ? 'text-purple-600' : 'text-muted-foreground'} transition-colors whitespace-nowrap`}
            onClick={() => selectedServices.length > 0 && setStep('datetime')}
            disabled={selectedServices.length === 0}
          >
            Date & Time
          </button>
          {step === 'confirm' && (
            <>
              <ChevronRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
              <span className="text-purple-600 whitespace-nowrap">Confirm</span>
            </>
          )}
        </div>
      )}
    </div>
  );

  if (step === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-8 pb-8 px-4">
        <div className="max-w-xl mx-auto space-y-3">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                M Le Diamant
              </h1>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Shop 13, Amwaj 2, Plaza Level, JBR - Dubai
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 rounded-full h-9">
                    <span className="text-base">{currentLang.flag}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {LANGUAGES.map(lang => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setCurrentLang(lang)}
                      className={currentLang.code === lang.code ? 'bg-purple-50' : ''}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      <span className="text-sm">{lang.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-9 w-9">
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-2.5">
            {[
              {
                value: 'services',
                icon: List,
                title: 'Select Services',
                description: selectedServices.length > 0
                  ? `${selectedServices.length} selected • ${totalPrice} AED`
                  : "Choose from our menu",
                gradient: 'from-purple-500 to-pink-500'
              },
              {
                value: 'professional',
                icon: User,
                title: 'Choose Professional',
                description: selectedMaster ? selectedMaster.full_name : "Select your preferred master",
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                value: 'datetime',
                icon: CalendarIcon,
                title: 'Select Date & Time',
                description: selectedDate && selectedTime 
                  ? `${format(selectedDate, 'MMM dd', { locale: currentLang.locale })} at ${selectedTime}` 
                  : "Pick your appointment slot",
                gradient: 'from-orange-500 to-red-500'
              }
            ].map((card, idx) => (
              <motion.div
                key={card.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
              >
                <Card
                  className="group cursor-pointer border-2 hover:border-purple-500 transition-all hover:shadow-lg overflow-hidden"
                  onClick={() => setStep(card.value as any)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                        <card.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm mb-0.5 truncate">{card.title}</h3>
                        <p className="text-[11px] text-muted-foreground truncate">{card.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {selectedServices.length > 0 && selectedDate && selectedTime && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Button 
                size="lg" 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 rounded-xl shadow-lg h-auto"
                onClick={() => setStep('confirm')}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Continue to Confirmation
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'services') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-4 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          {renderHeader('Select Services', 'Choose one or more services')}

          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 rounded-lg border-2 focus:border-purple-500 bg-white text-sm"
              />
            </div>
          </div>

          <ScrollArea className="mb-3">
            <div className="flex gap-1.5 pb-1.5">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full whitespace-nowrap text-xs h-7 px-3 ${
                    selectedCategory === cat 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' 
                      : 'bg-white hover:bg-purple-50'
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </ScrollArea>

          <div className="grid gap-2.5 mb-4">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service, idx) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-md bg-white ${
                        isSelected ? 'border-2 border-purple-500 shadow-sm' : 'border-2 border-transparent hover:border-purple-200'
                      }`}
                      onClick={() => handleServiceSelect(service)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <h3 className="font-bold text-sm truncate">{getServiceName(service)}</h3>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{service.description}</p>
                            <div className="flex items-center gap-2.5 text-xs flex-wrap">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span>{service.duration} min</span>
                              </div>
                              <Badge variant="secondary" className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 h-5">
                                {service.price} AED
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {selectedServices.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-50">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-sm">{totalPrice} AED</div>
                  <div className="text-[10px] text-muted-foreground">
                    {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} • {totalDuration} min
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setStep('professional')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md h-9 px-4"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'professional') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-4 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          {renderHeader('Choose Professional', 'Select your preferred master or any available')}

          <div className="space-y-2.5">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md bg-white ${
                  selectedMaster === null ? 'border-2 border-purple-500 shadow-sm' : 'border-2 border-transparent hover:border-purple-200'
                }`}
                onClick={() => setSelectedMaster(null)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm mb-0.5 flex items-center gap-1.5 truncate">
                        Any Available Professional
                        {selectedMaster === null && <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        First available master
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {masters.map((master, idx) => {
              const isSelected = selectedMaster?.id === master.id;
              return (
                <motion.div
                  key={master.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (idx + 1) * 0.04 }}
                >
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-md bg-white ${
                      isSelected ? 'border-2 border-purple-500 shadow-sm' : 'border-2 border-transparent hover:border-purple-200'
                    }`}
                    onClick={() => setSelectedMaster(master)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2.5">
                        <Avatar className="w-10 h-10 border-2 border-purple-200 shadow-sm">
                          <AvatarImage src={master.photo} />
                          <AvatarFallback>{master.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h3 className="font-bold text-sm truncate">{master.full_name}</h3>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1.5 truncate">{master.position}</p>
                          <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
                            <div className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{master.rating}</span>
                            </div>
                            <span className="text-muted-foreground">({master.reviews} reviews)</span>
                          </div>
                          
                          {master.todaySlots && master.todaySlots.length > 0 && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded-lg border border-green-100">
                              <p className="text-[10px] text-green-700 font-medium mb-1 flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                Available today:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {master.todaySlots.map(time => (
                                  <Badge key={time} variant="outline" className="text-[10px] bg-white border-green-200 text-green-700 px-1.5 py-0 h-4">
                                    {time}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-50">
            <div className="max-w-2xl mx-auto">
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md h-10"
                onClick={() => setStep('datetime')}
              >
                Continue to Date & Time
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'datetime') {
    const monthDays = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
    const firstDayOfMonth = startOfMonth(currentMonth).getDay();
    const startPadding = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const groupedSlots = [
      { label: '☀️ Morning', slots: MOCK_TIME_SLOTS.filter(s => parseInt(s.time) < 12) },
      { label: '🌤️ Afternoon', slots: MOCK_TIME_SLOTS.filter(s => parseInt(s.time) >= 12 && parseInt(s.time) < 17) },
      { label: '🌙 Evening', slots: MOCK_TIME_SLOTS.filter(s => parseInt(s.time) >= 17) },
    ].filter(g => g.slots.length > 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-4 pb-20 px-4">
        <div className="max-w-xl mx-auto">
          {renderHeader('Select Date & Time', 'Choose your preferred appointment slot')}

          <Card className="mb-3 overflow-hidden border-2 bg-white shadow-md">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between mb-2.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                  className="h-7 w-7 rounded-full hover:bg-purple-100"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Button>
                <h3 className="font-bold text-sm">
                  {format(currentMonth, 'MMMM yyyy', { locale: currentLang.locale })}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                  className="h-7 w-7 rounded-full hover:bg-purple-100"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 mb-1.5">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <div key={`${day}-${idx}`} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {[...Array(startPadding)].map((_, idx) => (
                  <div key={`pad-${idx}`} className="aspect-square" />
                ))}
                
                {monthDays.map((day, idx) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isPast = day < new Date() && !isToday(day);
                  
                  return (
                    <motion.button
                      key={idx}
                      whileHover={!isPast ? { scale: 1.05 } : {}}
                      whileTap={!isPast ? { scale: 0.95 } : {}}
                      onClick={() => !isPast && setSelectedDate(day)}
                      disabled={isPast}
                      className={`
                        aspect-square rounded-md p-1 text-xs font-medium transition-all
                        ${isPast 
                          ? 'text-muted-foreground/30 cursor-not-allowed' 
                          : 'hover:bg-purple-100 cursor-pointer'
                        }
                        ${isSelected 
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md' 
                          : ''
                        }
                        ${isToday(day) && !isSelected ? 'border-2 border-purple-500 font-bold' : ''}
                      `}
                    >
                      <div className="flex items-center justify-center h-full">
                        {format(day, 'd')}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDate && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-2 bg-white shadow-md">
                <CardContent className="p-2.5">
                  <h3 className="font-bold text-sm mb-2.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Available Time Slots
                  </h3>

                  {groupedSlots.map(group => (
                    <div key={group.label} className="mb-3 last:mb-0">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">{group.label}</h4>
                      <div className="grid grid-cols-5 gap-1.5">
                        {group.slots.map(slot => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <motion.button
                              key={slot.time}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedTime(slot.time)}
                              className={`
                                relative py-1.5 px-1 rounded-md font-medium text-xs transition-all
                                ${isSelected
                                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md'
                                  : slot.is_optimal
                                    ? 'bg-green-50 text-green-700 border border-green-200 hover:border-green-400'
                                    : 'bg-white border border-gray-200 hover:border-purple-300'
                                }
                              `}
                            >
                              {slot.time}
                              {slot.is_optimal && !isSelected && (
                                <Sparkles className="w-2 h-2 absolute top-0.5 right-0.5 text-green-600" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {selectedDate && selectedTime && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-50">
              <div className="max-w-xl mx-auto">
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md h-10"
                  onClick={() => setStep('confirm')}
                >
                  Continue to Confirmation
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-4 pb-20 px-4">
          <div className="max-w-lg mx-auto">
            {renderHeader('Confirm Booking', 'Review your appointment details')}

            <div className="space-y-2.5">
              <Card className="border-2 bg-white shadow-md">
                <CardContent className="p-3">
                  <h3 className="font-bold text-sm mb-2.5 flex items-center gap-1.5">
                    <List className="w-4 h-4 text-purple-600" />
                    Services
                  </h3>
                  <div className="space-y-2">
                    {selectedServices.map(service => (
                      <div key={service.id} className="flex justify-between items-center py-1 border-b last:border-0">
                        <div>
                          <div className="font-medium text-sm">{getServiceName(service)}</div>
                          <div className="text-xs text-muted-foreground">{service.duration} min</div>
                        </div>
                        <div className="font-bold text-sm">{service.price} AED</div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-1.5 border-t-2 border-purple-200">
                      <div className="font-bold text-sm">Total</div>
                      <div className="font-bold text-base text-purple-600">{totalPrice} AED</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 bg-white shadow-md">
                <CardContent className="p-3">
                  <h3 className="font-bold text-sm mb-2.5 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-purple-600" />
                    Professional
                  </h3>
                  {selectedMaster ? (
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-9 h-9 border-2 border-purple-200">
                        <AvatarImage src={selectedMaster.photo} />
                        <AvatarFallback>{selectedMaster.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{selectedMaster.full_name}</div>
                        <div className="text-xs text-muted-foreground">{selectedMaster.position}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Any Available Professional</div>
                        <div className="text-xs text-muted-foreground">First available master</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedDate && selectedTime && (
                <Card className="border-2 bg-white shadow-md">
                  <CardContent className="p-3">
                    <h3 className="font-bold text-sm mb-2.5 flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-purple-600" />
                      Date & Time
                    </h3>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Date</span>
                        <span className="font-medium text-sm">{format(selectedDate, 'EEEE, MMMM dd, yyyy', { locale: currentLang.locale })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Time</span>
                        <span className="font-medium text-sm">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Duration</span>
                        <span className="font-medium text-sm">{totalDuration} minutes</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-50">
              <div className="max-w-lg mx-auto">
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md h-11"
                  onClick={handleConfirmBooking}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirm Booking
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showPhoneModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowPhoneModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-lg font-bold text-purple-600 mb-2">Contact Number Required</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Please provide your phone number so we can contact you about your booking.
                </p>
                <div className="space-y-2.5">
                  <Input
                    type="tel"
                    placeholder="+971 XX XXX XXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-9 rounded-lg text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && phoneNumber.length >= 7) {
                        setShowPhoneModal(false);
                        handleConfirmBooking();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-9 rounded-lg text-sm"
                      onClick={() => setShowPhoneModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-9 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-sm"
                      onClick={() => {
                        if (phoneNumber.length >= 7) {
                          setShowPhoneModal(false);
                          handleConfirmBooking();
                        } else {
                          toast.error('Please enter a valid phone number');
                        }
                      }}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
}
