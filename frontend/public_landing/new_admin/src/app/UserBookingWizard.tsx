import { useState, useEffect } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isTomorrow, parseISO } from 'date-fns';
import { ru, enUS, ar } from 'date-fns/locale';
import {
  ArrowLeft, Calendar as CalendarIcon, Check, ChevronRight, Clock,
  List, MapPin, Search, Star, User, X, Loader2, Edit2,
  Sparkles, CheckCircle2, Users
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent } from './components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { toast } from 'sonner';
import { Badge } from './components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from './components/ui/scroll-area';

// Mock data
const MOCK_SERVICES = [
  { id: 1, name: 'Hair Cut', name_ru: 'Стрижка', name_ar: 'قص شعر', price: 150, duration: '60', category: 'Hair', description: 'Professional haircut' },
  { id: 2, name: 'Hair Coloring', name_ru: 'Окрашивание', name_ar: 'صبغ الشعر', price: 400, duration: '120', category: 'Hair', description: 'Full hair coloring' },
  { id: 3, name: 'Manicure', name_ru: 'Маникюр', name_ar: 'مانيكير', price: 120, duration: '45', category: 'Nails', description: 'Classic manicure' },
  { id: 4, name: 'Pedicure', name_ru: 'Педикюр', name_ar: 'باديكير', price: 150, duration: '60', category: 'Nails', description: 'Classic pedicure' },
  { id: 5, name: 'Facial', name_ru: 'Уход за лицом', name_ar: 'علاج الوجه', price: 250, duration: '75', category: 'Skin Care', description: 'Deep cleansing facial' },
  { id: 6, name: 'Massage', name_ru: 'Массаж', name_ar: 'تدليك', price: 300, duration: '90', category: 'Body', description: 'Relaxing massage' },
];

const MOCK_MASTERS = [
  { 
    id: 1, 
    full_name: 'Elena Petrova', 
    username: 'elena_stylist',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
    position: 'Senior Hair Stylist',
    rating: 4.9,
    reviews: 156
  },
  { 
    id: 2, 
    full_name: 'Maria Santos', 
    username: 'maria_nails',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
    position: 'Nail Specialist',
    rating: 4.8,
    reviews: 203
  },
  { 
    id: 3, 
    full_name: 'Sofia Ahmed', 
    username: 'sofia_beauty',
    photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400',
    position: 'Beauty Therapist',
    rating: 4.9,
    reviews: 178
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
  currency?: string;
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
}

interface Props {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function UserBookingWizard({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'menu' | 'services' | 'professional' | 'datetime' | 'confirm'>('menu');
  const [loading, setLoading] = useState(false);
  const [masters, setMasters] = useState<Master[]>(MOCK_MASTERS);
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category)))];

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + parseInt(s.duration || '0'), 0);

  const handleServiceSelect = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  const handleMasterSelect = (master: Master) => {
    setSelectedMaster(master);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(''); // Reset time when date changes
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleConfirmBooking = async () => {
    if (!selectedServices.length || !selectedDate || !selectedTime) {
      toast.error('Please complete all selections');
      return;
    }

    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Booking confirmed successfully!', {
      description: `${format(selectedDate, 'MMMM dd, yyyy')} at ${selectedTime}`
    });
    
    setLoading(false);
    
    if (onSuccess) onSuccess();
    if (onClose) onClose();
  };

  const renderHeader = (title: string, subtitle?: string) => (
    <div className="sticky top-0 z-10 bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pb-6 pt-4">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (step === 'services' || step === 'menu') {
              if (onClose) onClose();
            } else {
              setStep('menu');
            }
          }}
          className="rounded-full hover:bg-white/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-white/50 ml-auto"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
      </div>

      {/* Progress breadcrumbs */}
      {step !== 'menu' && (
        <div className="flex items-center gap-2 mt-4 text-xs font-medium">
          <button
            className={`${step === 'services' ? 'text-purple-600' : 'text-muted-foreground'} transition-colors`}
            onClick={() => setStep('services')}
          >
            Services
          </button>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <button
            className={`${step === 'professional' ? 'text-purple-600' : 'text-muted-foreground'} transition-colors`}
            onClick={() => selectedServices.length > 0 && setStep('professional')}
            disabled={selectedServices.length === 0}
          >
            Professional
          </button>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <button
            className={`${step === 'datetime' ? 'text-purple-600' : 'text-muted-foreground'} transition-colors`}
            onClick={() => selectedServices.length > 0 && setStep('datetime')}
            disabled={selectedServices.length === 0}
          >
            Date & Time
          </button>
          {step === 'confirm' && (
            <>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-purple-600">Confirm</span>
            </>
          )}
        </div>
      )}
    </div>
  );

  if (step === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-20 pb-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                M Le Diamant
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Shop 13, Amwaj 2, Plaza Level, JBR - Dubai
              </p>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>

          <div className="grid gap-4">
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
                  ? `${format(selectedDate, 'MMM dd')} at ${selectedTime}` 
                  : "Pick your appointment slot",
                gradient: 'from-orange-500 to-red-500'
              }
            ].map((card, idx) => (
              <motion.div
                key={card.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card
                  className="group cursor-pointer border-2 hover:border-purple-500 transition-all hover:shadow-2xl overflow-hidden"
                  onClick={() => setStep(card.value as any)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                        <card.icon className="w-7 h-7" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-xl mb-1">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {selectedServices.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button 
                size="lg" 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6 rounded-2xl shadow-xl"
                onClick={() => setStep('confirm')}
                disabled={!selectedDate || !selectedTime}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
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
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-6 pb-32 px-4">
        <div className="max-w-4xl mx-auto">
          {renderHeader('Select Services', 'Choose one or more services')}

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 rounded-xl border-2 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Categories */}
          <ScrollArea className="mb-6">
            <div className="flex gap-2 pb-2">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full whitespace-nowrap ${
                    selectedCategory === cat 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                      : ''
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Services Grid */}
          <div className="grid gap-4 mb-6">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service, idx) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        isSelected ? 'border-2 border-purple-500 shadow-lg' : 'border-2 border-transparent'
                      }`}
                      onClick={() => handleServiceSelect(service)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg">{service.name}</h3>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span>{service.duration} min</span>
                              </div>
                              <Badge variant="secondary" className="font-semibold">
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

          {/* Fixed Bottom Bar */}
          {selectedServices.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-lg">{totalPrice} AED</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} • {totalDuration} min
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={() => setStep('professional')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
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
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-6 pb-32 px-4">
        <div className="max-w-4xl mx-auto">
          {renderHeader('Choose Professional', 'Select your preferred master or any available')}

          <div className="space-y-4">
            {/* Any Available Option */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedMaster === null ? 'border-2 border-purple-500 shadow-lg' : 'border-2 border-transparent'
                }`}
                onClick={() => setSelectedMaster(null)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                      <Users className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                        Any Available Professional
                        {selectedMaster === null && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        First available master will take your appointment
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Masters List */}
            {masters.map((master, idx) => {
              const isSelected = selectedMaster?.id === master.id;
              return (
                <motion.div
                  key={master.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (idx + 1) * 0.1 }}
                >
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      isSelected ? 'border-2 border-purple-500 shadow-lg' : 'border-2 border-transparent'
                    }`}
                    onClick={() => handleMasterSelect(master)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16 border-2 border-purple-200">
                          <AvatarImage src={master.photo} />
                          <AvatarFallback>{master.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{master.full_name}</h3>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{master.position}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{master.rating}</span>
                            </div>
                            <span className="text-muted-foreground">({master.reviews} reviews)</span>
                          </div>
                          
                          {/* Preview Slots */}
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">Available today:</p>
                            <div className="flex flex-wrap gap-1">
                              {['10:00', '12:30', '15:00', '17:30'].map(time => (
                                <Badge key={time} variant="outline" className="text-xs">
                                  {time}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Fixed Bottom Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4">
            <div className="max-w-4xl mx-auto">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={() => setStep('datetime')}
              >
                Continue to Date & Time
                <ChevronRight className="w-5 h-5 ml-2" />
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

    const groupedSlots = [
      { label: 'Morning', slots: MOCK_TIME_SLOTS.filter(s => parseInt(s.time) < 12) },
      { label: 'Afternoon', slots: MOCK_TIME_SLOTS.filter(s => parseInt(s.time) >= 12 && parseInt(s.time) < 17) },
      { label: 'Evening', slots: MOCK_TIME_SLOTS.filter(s => parseInt(s.time) >= 17) },
    ].filter(g => g.slots.length > 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-6 pb-32 px-4">
        <div className="max-w-4xl mx-auto">
          {renderHeader('Select Date & Time', 'Choose your preferred appointment slot')}

          {/* Calendar */}
          <Card className="mb-6 overflow-hidden border-2">
            <CardContent className="p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h3 className="font-bold text-xl">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((day, idx) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isPast = day < new Date() && !isToday(day);
                  
                  return (
                    <motion.button
                      key={idx}
                      whileHover={!isPast ? { scale: 1.05 } : {}}
                      whileTap={!isPast ? { scale: 0.95 } : {}}
                      onClick={() => !isPast && handleDateSelect(day)}
                      disabled={isPast}
                      className={`
                        aspect-square rounded-xl p-2 text-sm font-medium transition-all
                        ${isPast 
                          ? 'text-muted-foreground/30 cursor-not-allowed' 
                          : 'hover:bg-purple-100 cursor-pointer'
                        }
                        ${isSelected 
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg' 
                          : ''
                        }
                        ${isToday(day) && !isSelected ? 'border-2 border-purple-500' : ''}
                      `}
                    >
                      <div>{format(day, 'd')}</div>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Time Slots */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-2">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    Available Time Slots
                  </h3>

                  {groupedSlots.map(group => (
                    <div key={group.label} className="mb-6 last:mb-0">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{group.label}</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {group.slots.map(slot => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <motion.button
                              key={slot.time}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleTimeSelect(slot.time)}
                              className={`
                                relative py-3 px-2 rounded-lg font-medium text-sm transition-all
                                ${isSelected
                                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg'
                                  : slot.is_optimal
                                    ? 'bg-green-50 text-green-700 border-2 border-green-200 hover:border-green-400'
                                    : 'bg-white border-2 border-gray-200 hover:border-purple-300'
                                }
                              `}
                            >
                              {slot.time}
                              {slot.is_optimal && !isSelected && (
                                <Sparkles className="w-3 h-3 absolute top-1 right-1 text-green-600" />
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

          {/* Fixed Bottom Bar */}
          {selectedDate && selectedTime && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4">
              <div className="max-w-4xl mx-auto">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  onClick={() => setStep('confirm')}
                >
                  Continue to Confirmation
                  <ChevronRight className="w-5 h-5 ml-2" />
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
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-6 pb-32 px-4">
        <div className="max-w-2xl mx-auto">
          {renderHeader('Confirm Booking', 'Review your appointment details')}

          <div className="space-y-4">
            {/* Services */}
            <Card className="border-2">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <List className="w-5 h-5 text-purple-600" />
                  Services
                </h3>
                <div className="space-y-3">
                  {selectedServices.map(service => (
                    <div key={service.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-muted-foreground">{service.duration} min</div>
                      </div>
                      <div className="font-bold">{service.price} AED</div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 border-t-2 border-purple-200">
                    <div className="font-bold text-lg">Total</div>
                    <div className="font-bold text-xl text-purple-600">{totalPrice} AED</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional */}
            <Card className="border-2">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Professional
                </h3>
                {selectedMaster ? (
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={selectedMaster.photo} />
                      <AvatarFallback>{selectedMaster.full_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{selectedMaster.full_name}</div>
                      <div className="text-sm text-muted-foreground">{selectedMaster.position}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-medium">Any Available Professional</div>
                      <div className="text-sm text-muted-foreground">First available master</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Date & Time */}
            {selectedDate && selectedTime && (
              <Card className="border-2">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-purple-600" />
                    Date & Time
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{format(selectedDate, 'EEEE, MMMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{totalDuration} minutes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Fixed Bottom Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4">
            <div className="max-w-2xl mx-auto">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={handleConfirmBooking}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Confirm Booking
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
