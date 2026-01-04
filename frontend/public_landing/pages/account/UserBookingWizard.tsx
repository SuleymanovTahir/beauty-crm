import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { X, Scissors, User, Edit } from 'lucide-react';
import { Toaster } from '../../components/ui/sonner';
import { api } from '../../../src/services/api';
import PublicLanguageSwitcher from '../../../src/components/PublicLanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { getLocalizedName } from '../../../src/utils/i18nUtils';

// New Synced Components
import { BookingMenu } from './booking/BookingMenu';
import { ServicesStep } from './booking/ServicesStep';
import { ProfessionalStep } from './booking/ProfessionalStep';
import { DateTimeStep } from './booking/DateTimeStep';
import { ConfirmStep } from './booking/ConfirmStep';
import { RescheduleDialog } from './v2_components/RescheduleDialog';


import './UserBookingWizard.css';

const STORAGE_KEY = 'booking-state-v2';
const STATE_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour

// --- Types ---
export interface Service {
  id: number;
  name: string;
  name_ru?: string;
  name_en?: string;
  name_ar?: string;
  description?: string;
  price: number;
  duration: string;
  category: string;
}

export interface Master {
  id: number;
  full_name: string;
  username: string;
  photo?: string;
  position?: string;
  rating?: number;
  reviews?: number;
}

export interface BookingState {
  services: Service[];
  professional: Master | null;
  professionalSelected: boolean;
  date: Date | null;
  time: string | null;
  phone: string;
}

interface Props {
  onClose?: () => void;
  onSuccess?: () => void;
}

import { Button } from './booking/ui/button';
import { ArrowLeft } from 'lucide-react';

export function UserBookingWizard({ onClose, onSuccess }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const step = searchParams.get('booking') || 'menu';
  const { t, i18n } = useTranslation(['booking', 'common']);

  // Helper for Russian pluralization
  const getPluralForm = (count: number, one: string, few: string, many: string) => {
    if (i18n.language !== 'ru') return one;
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  };

  const [bookingState, setBookingState] = useState<BookingState>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { state, timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp < STATE_EXPIRY_TIME) {
          if (state.date) state.date = parseISO(state.date);
          return state;
        }
      } catch (e) { }
    }
    return {
      services: [],
      professional: null,
      professionalSelected: false,
      date: null,
      time: null,
      phone: '',
    };
  });

  const [salonSettings, setSalonSettings] = useState<any>(null);
  const [initialServices, setInitialServices] = useState<any[]>([]);
  const [initialMasters, setInitialMasters] = useState<any[]>([]);
  const [initialAvailability, setInitialAvailability] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);

  const setStep = (newStep: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('booking', newStep);
      next.delete('step'); // Remove old step param to clean URL
      return next;
    }, { replace: true });
  };

  const resetBooking = () => {
    const initialState = {
      services: [],
      professional: null,
      professionalSelected: false,
      date: null,
      time: null,
      phone: '',
    };
    setBookingState(initialState);
    sessionStorage.removeItem(STORAGE_KEY);
    setStep('menu');
  };

  const handleGlobalBack = () => {
    if (step === 'menu') {
      if (window.history.length > 2) {
        navigate(-1);
      } else {
        window.location.href = 'http://localhost:5173';
      }
    } else {
      setStep('menu');
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (window.history.length > 2) {
      navigate('/account');
    } else {
      window.location.href = 'http://localhost:5173';
    }
  };

  useEffect(() => {
    const initCorrect = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        // PARALLEL DATA FETCHING: Settings, Active Services, All Masters
        // Removed availability fetching from critical path to speed up initial load
        const [settingsRes, servicesRes, employeesRes] = await Promise.all([
          api.getPublicSalonSettings(),
          api.getPublicServices(),
          api.getPublicEmployees(i18n.language)
        ]);

        setSalonSettings(settingsRes);

        const servicesData = Array.isArray(servicesRes) ? servicesRes : (servicesRes.services || []);
        console.log('[UserBookingWizard] Loaded services:', servicesData.length);
        setInitialServices(servicesData);

        // API возвращает массив напрямую, не объект с полем employees
        const employeesData = Array.isArray(employeesRes) ? employeesRes : [];
        console.log('[UserBookingWizard] Loaded employees from public API:', employeesData.length);
        setInitialMasters(employeesData);

        // Fetch availability in background to not block UI
        api.getPublicBatchAvailability(today).then(res => {
          if (res && res.availability) {
            setInitialAvailability(res.availability);
          }
        }).catch(err => console.error("Background availability fetch failed", err));

        // Handle prefill from location state OR query params
        const state = location.state as any;
        const queryPrefillMaster = searchParams.get('masterId');
        const queryPrefillDate = searchParams.get('date');
        const queryPrefillTime = searchParams.get('time');
        const queryPrefillService = searchParams.get('serviceId');

        if (state?.editBookingId || state?.prefillMaster || state?.prefillService || queryPrefillMaster || queryPrefillDate || queryPrefillTime || queryPrefillService) {
          const newState: Partial<BookingState> = {};

          // Prefill service
          const serviceId = state?.prefillService || (queryPrefillService ? parseInt(queryPrefillService) : null);
          if (serviceId) {
            const service = servicesData.find((s: any) => s.id === serviceId);
            if (service) {
              newState.services = [service];
            }
          }

          // Prefill master/professional
          const masterId = state?.prefillMaster || (queryPrefillMaster ? parseInt(queryPrefillMaster) : null);
          if (masterId) {
            console.log('[UserBookingWizard] Searching for master with ID:', masterId);
            const master = employeesData.find((m: any) => m.id === masterId);
            console.log('[UserBookingWizard] Found master:', master);
            if (master) {
              newState.professional = master;
              newState.professionalSelected = true;
            }
          }

          // Prefill date and time
          const dateParam = state?.prefillDate || queryPrefillDate;
          if (dateParam) {
            try {
              newState.date = new Date(dateParam);
            } catch (e) {
              console.error('[UserBookingWizard] Failed to parse prefillDate:', e);
            }
          }

          const timeParam = state?.prefillTime || queryPrefillTime;
          if (timeParam) {
            newState.time = timeParam;
          }

          // Update booking state with prefilled data
          if (Object.keys(newState).length > 0) {
            console.log('[UserBookingWizard] Prefilling booking state:', newState);
            setBookingState(prev => ({ ...prev, ...newState }));

            // If both service and master are prefilled, skip to datetime
            if (newState.services?.length && newState.professional) {
              setStep('datetime');
            } else if (newState.services?.length) {
              // Only services prefilled, go to services step
              setStep('services');
            } else if (newState.professional && newState.date && newState.time) {
              // If master, date and time prefilled - go to services to select what to book
              setStep('services');
            }
          }
        }

      } catch (e) {
        console.error("[UserBookingWizard] Failed to load initial data:", e);
        // Even on error, set loading to false so user can see the page
        // ServicesStep will fallback to loading data itself
      } finally {
        setLoading(false);
      }
    }

    initCorrect();
  }, []);

  // Handle location state changes (for prefilling master/service)
  useEffect(() => {
    if (loading || initialMasters.length === 0) return;

    const state = location.state as any;
    console.log('[UserBookingWizard] Location state changed:', state);

    if (state?.prefillMaster) {
      const prefillMasterId = state.prefillMaster;
      const currentMasterId = bookingState.professional?.id;

      // Only update if master is different or not set
      if (currentMasterId !== prefillMasterId) {
        console.log('[UserBookingWizard] Attempting to prefill master:', prefillMasterId);
        const master = initialMasters.find((m: any) => m.id === prefillMasterId);
        console.log('[UserBookingWizard] Found master from initialMasters:', master);

        if (master) {
          setBookingState(prev => ({
            ...prev,
            professional: master,
            professionalSelected: true
          }));

          // Don't change step - let user stay on menu to see the full flow
        }
      }
    }
  }, [location.state, initialMasters, loading]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      state: { ...bookingState, date: bookingState.date ? format(bookingState.date, 'yyyy-MM-dd') : null },
      timestamp: Date.now()
    }));
  }, [bookingState]);

  // Cascading selection logic: ensure selections are compatible
  useEffect(() => {
    let needsUpdate = false;
    const updates: Partial<BookingState> = {};

    // If master is selected, ensure selected services are provided by that master
    if (bookingState.professional?.service_ids && bookingState.services.length > 0) {
      const masterServiceIds = bookingState.professional.service_ids;
      const validServices = bookingState.services.filter((service: Service) =>
        !masterServiceIds || masterServiceIds.length === 0 || masterServiceIds.includes(service.id)
      );

      if (validServices.length !== bookingState.services.length) {
        updates.services = validServices;
        needsUpdate = true;
      }
    }

    // If services are selected, ensure master provides at least one of them
    if (bookingState.services.length > 0 && bookingState.professional) {
      const serviceIds = bookingState.services.map((s: Service) => s.id);
      const professional = bookingState.professional as any;

      if (professional.service_ids && professional.service_ids.length > 0) {
        const hasMatchingService = serviceIds.some((sid: number) =>
          professional.service_ids.includes(sid)
        );

        if (!hasMatchingService) {
          updates.professional = null;
          updates.professionalSelected = false;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      setBookingState((prev: BookingState) => ({ ...prev, ...updates }));
    }
  }, [bookingState.services, bookingState.professional]);

  const updateState = (updates: Partial<BookingState>) => setBookingState((prev: BookingState) => ({ ...prev, ...updates }));
  const totalPrice = bookingState.services.reduce((sum: number, s: Service) => sum + s.price, 0);
  const totalDuration = bookingState.services.reduce((sum: number, s: Service) => {
    const duration = parseInt(s.duration || '0');
    // If service has no duration, assume 60 minutes as default
    return sum + (duration > 0 ? duration : 60);
  }, 0);

  if (loading) return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 border-8 border-purple-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs animate-pulse">{t('loading', 'Initializing Studio')}</p>
    </div>
  );

  return (
    <div className="wizard-scrollable min-h-screen bg-gray-50 selection:bg-purple-100 selection:text-purple-600">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleGlobalBack}
              className="w-10 h-10 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 hover:text-purple-600 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {t('newBooking', 'Reservation')}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <PublicLanguageSwitcher />
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -20 }}
            transition={{ type: "spring", duration: 0.6, bounce: 0.2 }}
          >
            {step === 'menu' && (
              <BookingMenu
                bookingState={bookingState}
                onNavigate={setStep}
                onReset={resetBooking}
                totalPrice={totalPrice}
                totalDuration={totalDuration}
                salonSettings={salonSettings}
              />
            )}
            {step === 'services' && (
              <ServicesStep
                selectedServices={bookingState.services}
                onServicesChange={(services: any) => updateState({ services })}
                salonSettings={salonSettings}
                preloadedServices={initialServices}
                selectedProfessional={bookingState.professional}
              />
            )}
            {step === 'professional' && (
              <ProfessionalStep
                selectedProfessionalId={bookingState.professional?.id || null}
                professionalSelected={bookingState.professionalSelected}
                onProfessionalChange={(prof: any) => {
                  if (bookingState.professional?.id === prof?.id && (prof !== null || bookingState.professionalSelected)) {
                    updateState({ professional: null, professionalSelected: false });
                  } else {
                    updateState({ professional: prof, professionalSelected: true });
                  }
                }}
                salonSettings={salonSettings}
                preloadedProfessionals={initialMasters}
                preloadedAvailability={initialAvailability}
                selectedServices={bookingState.services}
                selectedDate={bookingState.date}
              />
            )}
            {step === 'datetime' && (
              <DateTimeStep
                selectedDate={bookingState.date}
                selectedTime={bookingState.time}
                selectedMaster={bookingState.professional}
                selectedServices={bookingState.services}
                totalDuration={totalDuration}
                onDateTimeChange={(date: any, time: any) => updateState({ date, time })}
              />
            )}
            {step === 'confirm' && (
              <ConfirmStep
                bookingState={bookingState}
                totalPrice={totalPrice}
                onPhoneChange={(phone: any) => updateState({ phone })}
                onSuccess={() => {
                  sessionStorage.removeItem(STORAGE_KEY);
                  if (onSuccess) onSuccess();
                  if (onClose) onClose();
                }}
                salonSettings={salonSettings}
                setStep={setStep}
                onOpenRescheduleDialog={() => setShowRescheduleDialog(true)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky Bottom Navigator for Steps */}
      {step !== 'menu' && step !== 'confirm' && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 p-4 z-[55] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] pb-safe"
        >
          <div className="max-w-4xl mx-auto">
            {/* Single row with info and buttons */}
            <div className="flex items-center justify-between gap-4">
              {/* Left: Booking info */}
              <div className="flex flex-col min-w-0 flex-1">
                {(bookingState.services.length > 0 || bookingState.professionalSelected || bookingState.date || bookingState.time) ? (
                  <>
                    <p className="text-sm font-black text-gray-900 uppercase tracking-tighter truncate">
                      {bookingState.services.length > 0 ? (
                        bookingState.services.length === 1
                          ? getLocalizedName(bookingState.services[0], i18n.language)
                          : `${bookingState.services.length} ${getPluralForm(bookingState.services.length, t('services.service_one', 'service'), t('services.service_few', 'services'), t('services.service_many', 'services'))} ${t('services.selected', 'selected').toLowerCase()}`
                      ) : bookingState.professionalSelected ? (
                        bookingState.professional?.full_name || t('professional.anyAvailable', 'Flexible Match')
                      ) : (
                        t('booking:booking_info', 'Информация о записи')
                      )}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {bookingState.professional && <span>{bookingState.professional.full_name} • </span>}
                      {bookingState.services.length > 0 && <span>{totalDuration} {t('min', 'min')} • {totalPrice} {salonSettings?.currency || 'AED'}</span>}
                      {(bookingState.date || bookingState.time) && (
                        <>
                          {bookingState.services.length > 0 && ' • '}
                          {bookingState.date && format(bookingState.date, 'dd MMM')}
                          {bookingState.time && ` ${bookingState.time}`}
                        </>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-gray-500">
                    {t('booking:select_to_continue', 'Выберите услугу или мастера для продолжения')}
                  </p>
                )}
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Services button - show if services not selected AND not on services step */}
                {bookingState.services.length === 0 && step !== 'services' && (
                  <Button
                    onClick={() => setStep('services')}
                    className="h-10 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-medium text-sm text-white transition-all whitespace-nowrap"
                  >
                    {t('booking:continue_services', 'Продолжить с выбора услуг')}
                  </Button>
                )}

                {/* Professional button - show if professional not selected AND not on professional step */}
                {!bookingState.professionalSelected && step !== 'professional' && (
                  <Button
                    onClick={() => setStep('professional')}
                    className="h-10 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-medium text-sm text-white transition-all whitespace-nowrap"
                  >
                    {t('booking:continue_professional', 'Продолжить с выбора мастера')}
                  </Button>
                )}

                {/* DateTime button - show if date/time not selected AND not on datetime step */}
                {(!bookingState.date || !bookingState.time) && step !== 'datetime' && (
                  <Button
                    onClick={() => setStep('datetime')}
                    className="h-10 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-medium text-sm text-white transition-all whitespace-nowrap"
                  >
                    {t('booking:continue_datetime', 'Продолжить с выбора даты и времени')}
                  </Button>
                )}

                {/* Confirm button - show if everything is selected */}
                {bookingState.services.length > 0 && bookingState.professionalSelected && bookingState.date && bookingState.time && (
                  <Button
                    onClick={() => setStep('confirm')}
                    className="h-10 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-medium text-sm text-white transition-all whitespace-nowrap"
                  >
                    {t('confirm.title', 'Подтвердить')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Reschedule dialog for changing booking details */}
      {showRescheduleDialog && (
        <RescheduleDialog
          isOpen={showRescheduleDialog}
          onClose={() => setShowRescheduleDialog(false)}
          appointment={{
            id: null, // Новая запись, не редактирование существующей
            service_name: bookingState.services.map((s: Service) => getLocalizedName(s, i18n.language)).join(', '),
            service_id: bookingState.services[0]?.id,
            master_name: bookingState.professional?.full_name || t('common.any_master', 'Любой мастер'),
            master_id: bookingState.professional?.id,
            date: bookingState.date ? format(bookingState.date, 'yyyy-MM-dd') : '',
            time: bookingState.time || ''
          }}
          onChangeStep={(newStep) => setStep(newStep)}
        />
      )}

      <Toaster />
    </div>
  );
}