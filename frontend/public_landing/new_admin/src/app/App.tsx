import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import { BookingMenu } from './components/booking/BookingMenu';
import { ServicesStep } from './components/booking/ServicesStep';
import { ProfessionalStep } from './components/booking/ProfessionalStep';
import { DateTimeStep } from './components/booking/DateTimeStep';
import { ConfirmStep } from './components/booking/ConfirmStep';
import { LanguageSwitcher } from './components/booking/LanguageSwitcher';
import { Toaster } from './components/ui/sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from './components/ui/button';

export interface Service {
  id: string;
  name: Record<string, string>;
  category: string;
  duration: number;
  price: number;
  description: Record<string, string>;
}

export interface Professional {
  id: string;
  name: string;
  position: string;
  rating: number;
  reviews: number;
  avatar: string;
  specialties: string[];
}

export interface BookingState {
  services: Service[];
  professionalId: string | null;
  date: string | null;
  time: string | null;
  phone: string;
}

const STORAGE_KEY = 'booking_state';
const STORAGE_TIMESTAMP_KEY = 'booking_state_timestamp';
const STATE_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour

export default function App() {
  const { t } = useTranslation();
  const [step, setStep] = useState<string>('menu');
  const [bookingState, setBookingState] = useState<BookingState>({
    services: [],
    professionalId: null,
    date: null,
    time: null,
    phone: '',
  });

  // Load state from sessionStorage
  useEffect(() => {
    const savedState = sessionStorage.getItem(STORAGE_KEY);
    const savedTimestamp = sessionStorage.getItem(STORAGE_TIMESTAMP_KEY);
    
    if (savedState && savedTimestamp) {
      const timestamp = parseInt(savedTimestamp);
      const now = Date.now();
      
      if (now - timestamp < STATE_EXPIRY_TIME) {
        try {
          const parsed = JSON.parse(savedState);
          setBookingState(parsed);
        } catch (e) {
          console.error('Failed to parse saved state:', e);
        }
      } else {
        // Clear expired state
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_TIMESTAMP_KEY);
      }
    }

    // Get step from URL
    const params = new URLSearchParams(window.location.search);
    const urlStep = params.get('step');
    if (urlStep && ['menu', 'services', 'professional', 'datetime', 'confirm'].includes(urlStep)) {
      setStep(urlStep);
    }
  }, []);

  // Save state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(bookingState));
    sessionStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
  }, [bookingState]);

  // Update URL when step changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('step', step);
    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [step]);

  const updateBookingState = (updates: Partial<BookingState>) => {
    setBookingState((prev) => ({ ...prev, ...updates }));
  };

  const goToStep = (newStep: string) => {
    setStep(newStep);
  };

  const goBack = () => {
    const steps = ['menu', 'services', 'professional', 'datetime', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const clearBooking = () => {
    setBookingState({
      services: [],
      professionalId: null,
      date: null,
      time: null,
      phone: '',
    });
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_TIMESTAMP_KEY);
    setStep('menu');
  };

  const totalDuration = bookingState.services.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = bookingState.services.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {step !== 'menu' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('booking.back')}
              </Button>
            )}
            <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {t('booking.title')}
            </h1>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {step === 'menu' && (
          <BookingMenu
            bookingState={bookingState}
            onNavigate={goToStep}
            totalDuration={totalDuration}
            totalPrice={totalPrice}
          />
        )}
        
        {step === 'services' && (
          <ServicesStep
            selectedServices={bookingState.services}
            onServicesChange={(services) => updateBookingState({ services })}
            onContinue={() => goToStep('menu')}
          />
        )}
        
        {step === 'professional' && (
          <ProfessionalStep
            selectedProfessionalId={bookingState.professionalId}
            selectedServices={bookingState.services}
            onProfessionalChange={(professionalId) => updateBookingState({ professionalId })}
            onContinue={() => goToStep('menu')}
          />
        )}
        
        {step === 'datetime' && (
          <DateTimeStep
            selectedDate={bookingState.date}
            selectedTime={bookingState.time}
            professionalId={bookingState.professionalId}
            services={bookingState.services}
            totalDuration={totalDuration}
            onDateTimeChange={(date, time) => updateBookingState({ date, time })}
            onContinue={() => goToStep('menu')}
          />
        )}
        
        {step === 'confirm' && (
          <ConfirmStep
            bookingState={bookingState}
            totalDuration={totalDuration}
            totalPrice={totalPrice}
            onPhoneChange={(phone) => updateBookingState({ phone })}
            onSuccess={clearBooking}
          />
        )}
      </div>

      <Toaster />
    </div>
  );
}
