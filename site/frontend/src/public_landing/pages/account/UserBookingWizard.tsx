import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@site/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { Toaster } from '../../components/ui/sonner';
import { api } from '@site/services/api';
import PublicLanguageSwitcher from '@site/components/PublicLanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { getLocalizedName } from '@site/utils/i18nUtils';

// New Synced Components
import { useCurrency } from '@site/hooks/useSalonSettings';
import { BookingMenu } from './booking/BookingMenu';
import { ServicesStep } from './booking/ServicesStep';
import { ProfessionalStep } from './booking/ProfessionalStep';
import { DateTimeStep } from './booking/DateTimeStep';
import { ConfirmStep } from './booking/ConfirmStep';
import { RescheduleDialog } from './v2_components/RescheduleDialog';


import './UserBookingWizard.css';

import { TIMEOUTS, LIMITS } from '../../utils/constants';
import { getTodayDate } from '../../utils/dateUtils';

const STORAGE_KEY = 'booking-state-v2';
const STATE_EXPIRY_TIME = TIMEOUTS.STATE_EXPIRY; // 1 hour

// --- Types ---
export interface Service {
  id: number;
  name: string;
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
  service_ids?: number[]; // IDs услуг, которые предоставляет мастер
}

export interface BookingState {
  services: Service[];
  professional: Master | null;
  professionalSelected: boolean;
  date: Date | null;
  time: string | null;
  phone: string;
  id?: number | null;
}

interface Props {
  onClose?: () => void;
  onSuccess?: () => void;
}

import { ArrowLeft } from 'lucide-react';

const isValidDateValue = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

export function UserBookingWizard({ onClose, onSuccess }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStep = searchParams.get('booking');
  const normalizedStep = rawStep !== null && rawStep.trim().length > 0 ? rawStep.trim() : 'menu';
  const allowedSteps = ['menu', 'services', 'professional', 'datetime', 'confirm'];
  const step = allowedSteps.includes(normalizedStep) ? normalizedStep : 'menu';
  const stepHistoryRef = useRef<string[]>([]);
  const { t, i18n } = useTranslation(['booking', 'common']);
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();

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
          if (state.date) {
            const parsedDate = parseISO(state.date);
            state.date = isValidDateValue(parsedDate) ? parsedDate : null;
          }
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
      id: null,
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
      id: null,
    };
    setBookingState(initialState);
    sessionStorage.removeItem(STORAGE_KEY);
    setStep('menu');
  };

  const handleGlobalBack = () => {
    if (step === 'menu') {
      if (window.history.length > LIMITS.HISTORY_LENGTH_THRESHOLD) {
        navigate(-1);
      } else {
        // Use current origin instead of hardcoded localhost
        window.location.href = window.location.origin;
      }
      return;
    }

    const history = stepHistoryRef.current;
    if (history.length > 1) {
      history.pop();
      const previousStep = history[history.length - 1] ?? 'menu';
      setStep(previousStep);
      return;
    }

    setStep('menu');
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (window.history.length > 2 && user) {
      navigate('/account');
    } else {
      window.location.href = window.location.origin;
    }
  };

  useEffect(() => {
    const initCorrect = async () => {
      try {
        setLoading(true);
        const today = getTodayDate();

        // PARALLEL DATA FETCHING: Settings, Active Services, All Masters
        // Removed availability fetching from critical path to speed up initial load
        const [settingsRes, servicesRes, employeesRes] = await Promise.all([
          api.getPublicSalonSettings(),
          api.getPublicServices(),
          api.getPublicEmployees(i18n.language)
        ]);

        setSalonSettings(settingsRes);

        const servicesData = Array.isArray(servicesRes) ? servicesRes : (servicesRes.services || []);
        setInitialServices(servicesData);

        // API возвращает массив напрямую, не объект с полем employees
        const employeesData = Array.isArray(employeesRes) ? employeesRes : [];
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
        const queryPrefillServiceName = searchParams.get('serviceName');
        const queryBookingId = searchParams.get('id');
        const requestedStepFromQuery = searchParams.get('booking');
        const hasRequestedStep = requestedStepFromQuery !== null && allowedSteps.includes(requestedStepFromQuery);

        if (
          state?.editBookingId ||
          queryBookingId ||
          state?.prefillMaster ||
          state?.prefillService ||
          state?.prefillServiceName ||
          queryPrefillMaster ||
          queryPrefillDate ||
          queryPrefillTime ||
          queryPrefillService ||
          queryPrefillServiceName
        ) {
          const newState: Partial<BookingState> = {};

          if (state?.editBookingId || queryBookingId) {
            newState.id = state?.editBookingId || (queryBookingId ? parseInt(queryBookingId as string) : null);
          }

          // Prefill service
          const serviceId = state?.prefillService || (queryPrefillService ? parseInt(queryPrefillService) : null);
          const serviceName = state?.prefillServiceName ?? queryPrefillServiceName;
          if (serviceId) {
            const service = servicesData.find((s: any) => s.id === serviceId);
            if (service) {
              newState.services = [service];
            }
          } else if (typeof serviceName === 'string' && serviceName.trim().length > 0) {
            const normalizedServiceName = serviceName.trim().toLowerCase();
            const service = servicesData.find((serviceItem: any) => {
              const localizedServiceName = String(getLocalizedName(serviceItem, i18n.language)).trim().toLowerCase();
              const rawServiceName = String(serviceItem?.name ?? '').trim().toLowerCase();
              const serviceKey = String(serviceItem?.service_key ?? '').trim().toLowerCase();
              return (
                localizedServiceName === normalizedServiceName ||
                rawServiceName === normalizedServiceName ||
                serviceKey === normalizedServiceName
              );
            });
            if (service) {
              newState.services = [service];
            }
          }

          // Prefill master/professional
          const masterId = state?.prefillMaster || (queryPrefillMaster ? parseInt(queryPrefillMaster) : null);
          if (masterId) {
            const master = employeesData.find((m: any) => m.id === masterId);
            if (master) {
              newState.professional = master;
              newState.professionalSelected = true;
            }
          }

          // Prefill date and time
          const dateParam = state?.prefillDate || queryPrefillDate;
          if (dateParam) {
            const parsedDate = new Date(dateParam);
            if (isValidDateValue(parsedDate)) {
              newState.date = parsedDate;
            } else {
              console.error('[UserBookingWizard] Failed to parse prefillDate');
            }
          }

          const timeParam = state?.prefillTime || queryPrefillTime;
          if (timeParam) {
            newState.time = timeParam;
          }

          // Update booking state with prefilled data
          if (Object.keys(newState).length > 0) {
            setBookingState(prev => ({ ...prev, ...newState }));

            if (hasRequestedStep && requestedStepFromQuery !== null) {
              setStep(requestedStepFromQuery);
            } else if (newState.services?.length && newState.professional) {
              setStep('datetime');
            } else if (newState.services?.length) {
              setStep('services');
            } else if (newState.professional && newState.date && newState.time) {
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
  }, [i18n.language]);

  // Handle location state changes (for prefilling master/service)
  useEffect(() => {
    if (loading || initialMasters.length === 0) return;

    const state = location.state as any;

    if (state?.prefillMaster) {
      const prefillMasterId = state.prefillMaster;
      const currentMasterId = bookingState.professional?.id;

      // Only update if master is different or not set
      if (currentMasterId !== prefillMasterId) {
        const master = initialMasters.find((m: any) => m.id === prefillMasterId);

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
    const persistedDate = isValidDateValue(bookingState.date)
      ? format(bookingState.date, 'yyyy-MM-dd')
      : null;

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      state: { ...bookingState, date: persistedDate },
      timestamp: Date.now()
    }));
  }, [bookingState]);

  useEffect(() => {
    const history = stepHistoryRef.current;
    if (history.length === 0) {
      history.push(step);
      return;
    }

    const lastStep = history[history.length - 1];
    if (lastStep !== step) {
      history.push(step);
    }
  }, [step]);

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
  const hasSelectedDate = isValidDateValue(bookingState.date);
  const selectedDateValue = hasSelectedDate ? bookingState.date : null;
  const totalDuration = bookingState.services.reduce((sum: number, s: Service) => {
    const duration = parseInt(s.duration || '0');
    // If service has no duration, assume 60 minutes as default
    return sum + (duration > 0 ? duration : 60);
  }, 0);
  const professionalPosition = typeof bookingState.professional?.position === 'string'
    ? bookingState.professional.position.trim()
    : '';
  const professionalName = typeof bookingState.professional?.full_name === 'string'
    ? bookingState.professional.full_name.trim()
    : '';
  const isPositionDuplicateOfName = professionalPosition.length > 0 && professionalName.length > 0
    ? professionalPosition.toLowerCase() === professionalName.toLowerCase()
    : false;
  const bookingMetaParts: string[] = [];

  if (bookingState.professional) {
    if (bookingState.services.length > 0) {
      bookingMetaParts.push(professionalName);
    } else if (professionalPosition.length > 0 && !isPositionDuplicateOfName) {
      bookingMetaParts.push(professionalPosition);
    }
  }
  if (bookingState.services.length > 0) {
    bookingMetaParts.push(`${totalDuration} ${t('min', 'min')}`);
    bookingMetaParts.push(String(formatCurrency(totalPrice)));
  }
  if (hasSelectedDate || bookingState.time) {
    const dateTimeLabel = `${selectedDateValue ? format(selectedDateValue, 'dd MMM') : ''}${bookingState.time ? ` ${bookingState.time}` : ''}`.trim();
    if (dateTimeLabel.length > 0) {
      bookingMetaParts.push(dateTimeLabel);
    }
  }

  if (loading) return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 border-8 border-purple-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs animate-pulse">{t('loading', 'Initializing Studio')}</p>
    </div>
  );

  return (
    <div className="wizard-scrollable min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-[70]">
        <div className="max-w-5xl mx-auto w-full min-w-0 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-2">
              {(user || step !== 'menu') && (
                <button onClick={handleGlobalBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-900 transition-colors">
                  <ArrowLeft size={20} />
                </button>
              )}
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {t('newBooking', 'Reservation')}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <PublicLanguageSwitcher />
              {user && (
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                  title={t('common:close', 'Close')}
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 pt-[92px] sm:pt-[100px] pb-40 sm:pb-36 w-full">
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
                selectedTime={bookingState.time}
                onProfessionalChange={(prof: any) => {
                  if (bookingState.professional?.id === prof?.id && (prof !== null || bookingState.professionalSelected)) {
                    updateState({ professional: null, professionalSelected: false });
                  } else {
                    updateState({ professional: prof, professionalSelected: true });
                  }
                }}
                onSlotSelect={(prof: any, date: Date, time: string) => {
                  updateState({
                    professional: prof,
                    professionalSelected: true,
                    date,
                    time
                  });
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
                selectedDate={selectedDateValue}
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
                onGuestInfoChange={(info: any) => updateState(info)}
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
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 sm:p-4 z-[55] shadow-lg pb-safe overflow-x-hidden"
        >
          <div className="max-w-5xl mx-auto w-full min-w-0">
            {/* Single row with info and buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Left: Booking info */}
              <div className="flex flex-col min-w-0 flex-1">
                {(bookingState.services.length > 0 || bookingState.professionalSelected || hasSelectedDate || bookingState.time) ? (
                  <>
                    <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                      {bookingState.services.length > 0 ? (
                        bookingState.services.length === 1
                          ? getLocalizedName(bookingState.services[0], i18n.language)
                          : `${bookingState.services.length} ${getPluralForm(bookingState.services.length, t('services.service_one', 'service'), t('services.service_few', 'services'), t('services.service_many', 'services'))}`
                      ) : bookingState.professionalSelected ? (
                        bookingState.professional?.full_name || t('professional.anyAvailable')
                      ) : (
                        t('booking:booking_info', 'Booking info')
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 font-medium">
                      {bookingMetaParts.map((part, idx) => (
                        <span key={`${part}-${idx}`} className={idx === bookingMetaParts.length - 1 ? 'text-gray-900 font-semibold' : ''}>
                          {idx > 0 ? `• ${part}` : part}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-medium text-gray-400">
                    {t('booking:select_to_continue', 'Select service or master to continue')}
                  </p>
                )}
              </div>

              {/* Right: Action Buttons */}
              <div className="flex w-full sm:w-auto flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-end gap-2 sm:gap-3 flex-shrink-0 max-w-full">
                {/* Services button - show if services not selected AND not on services step */}
                {bookingState.services.length === 0 && step !== 'services' && (
                  <button
                    onClick={() => setStep('services')}
                    className="w-full sm:w-auto min-h-10 px-3 sm:px-5 py-2 rounded-lg bg-gray-900 text-white font-bold text-[clamp(0.7rem,2.7vw,0.875rem)] hover:bg-gray-800 transition-colors text-center leading-tight whitespace-normal break-words"
                  >
                    {t('booking:continue_services', 'Continue with Services')}
                  </button>
                )}

                {/* Professional button - show if professional not selected AND not on professional step */}
                {!bookingState.professionalSelected && step !== 'professional' && (
                  <button
                    onClick={() => setStep('professional')}
                    className="w-full sm:w-auto min-h-10 px-3 sm:px-5 py-2 rounded-lg bg-gray-900 text-white font-bold text-[clamp(0.7rem,2.7vw,0.875rem)] hover:bg-gray-800 transition-colors text-center leading-tight whitespace-normal break-words"
                  >
                    {t('booking:continue_professional', 'Select Professional')}
                  </button>
                )}

                {/* DateTime button - show if date/time not selected AND not on datetime step */}
                {(!hasSelectedDate || !bookingState.time) && step !== 'datetime' && (
                  <button
                    onClick={() => setStep('datetime')}
                    className="w-full sm:w-auto min-h-10 px-3 sm:px-5 py-2 rounded-lg bg-gray-900 text-white font-bold text-[clamp(0.7rem,2.7vw,0.875rem)] hover:bg-gray-800 transition-colors text-center leading-tight whitespace-normal break-words"
                  >
                    {t('booking:continue_datetime', 'Choose Date & Time')}
                  </button>
                )}

                {/* Confirm button - show if everything is selected */}
                {bookingState.services.length > 0 && bookingState.professionalSelected && hasSelectedDate && bookingState.time && (
                  <button
                    onClick={() => setStep('confirm')}
                    className="w-full sm:w-auto min-h-10 px-4 sm:px-6 py-2 rounded-lg bg-gray-900 text-white font-bold text-[clamp(0.7rem,2.7vw,0.875rem)] hover:bg-gray-800 transition-colors text-center leading-tight whitespace-normal break-words"
                  >
                    {t('confirm.title', 'Confirm')}
                  </button>
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
            id: bookingState.id,
            service_name: bookingState.services.map((s: Service) => getLocalizedName(s, i18n.language)).join(', '),
            service_id: bookingState.services[0]?.id,
            master_name: bookingState.professional ? getLocalizedName(bookingState.professional, i18n.language) : t('professional.anyAvailable'),
            master_id: bookingState.professional?.id,
            date: selectedDateValue ? format(selectedDateValue, 'yyyy-MM-dd') : '',
            time: bookingState.time || ''
          }}
          onChangeStep={(newStep) => setStep(newStep)}
        />
      )}

      <Toaster />
    </div>
  );
}
