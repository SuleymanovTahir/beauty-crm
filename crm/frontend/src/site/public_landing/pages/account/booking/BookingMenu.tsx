import { useTranslation } from 'react-i18next';
import { useCurrency } from '@crm/hooks/useSalonSettings';
import { Button } from './ui/button';
import { Scissors, User, Calendar, Check, ChevronRight, X, Edit } from 'lucide-react';
import { motion } from 'motion/react';
import { getLocalizedName } from '@crm/utils/i18nUtils';

interface BookingMenuProps {
    bookingState: any;
    onNavigate: (step: string) => void;
    onReset: () => void;
    totalDuration: number;
    totalPrice: number;
    salonSettings: any;
}

export function BookingMenu({ bookingState, onNavigate, onReset, totalDuration, totalPrice, salonSettings }: BookingMenuProps) {
    const { t, i18n } = useTranslation(['booking', 'common']);
    const { formatCurrency } = useCurrency();

    const isServicesComplete = bookingState.services.length > 0;
    const isProfessionalComplete = bookingState.professional !== null || bookingState.professionalSelected;
    const isDateTimeComplete = bookingState.date !== null && bookingState.time !== null;
    const isAllComplete = isServicesComplete && isProfessionalComplete && isDateTimeComplete;

    // Helper function to get service description
    const getServicesDescription = () => {
        if (!isServicesComplete) return t('menu.selectServices', 'Pick treatment');

        if (bookingState.services.length === 1) {
            return getLocalizedName(bookingState.services[0], i18n.language);
        }
        return `${bookingState.services.length} ${t('services.selected', 'услуг выбрано')}`;
    };

    // Helper function to get date/time description
    const getDateTimeDescription = () => {
        if (!isDateTimeComplete) return t('menu.selectDateTime', 'Pick time slot');

        const date = bookingState.date;
        const time = bookingState.time;
        const formattedDate = date ? new Date(date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short'
        }) : '';
        return `${formattedDate}, ${time}`;
    };

    const cards = [
        {
            id: 'services',
            icon: Scissors,
            title: t('menu.services', 'Services'),
            description: getServicesDescription(),
            isComplete: isServicesComplete,
            step: 'services',
        },
        {
            id: 'professional',
            icon: User,
            title: t('menu.professional', 'Professional'),
            description: isProfessionalComplete
                ? (bookingState.professional?.full_name || bookingState.professional?.username || t('professional.anyAvailable'))
                : t('menu.selectProfessional', 'Select master'),
            isComplete: isProfessionalComplete,
            step: 'professional',
        },
        {
            id: 'datetime',
            icon: Calendar,
            title: t('menu.datetime', 'Date & Time'),
            description: getDateTimeDescription(),
            isComplete: isDateTimeComplete,
            step: 'datetime',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Salon Info */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between shadow-sm"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                        <Scissors size={24} />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm text-gray-900">{salonSettings?.name || ''}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{salonSettings?.address || ''}</p>
                    </div>
                </div>
                {(isServicesComplete || isProfessionalComplete || isDateTimeComplete) && (
                    <button
                        onClick={onReset}
                        className="text-xs text-gray-400 hover:text-gray-600 uppercase tracking-wide font-medium"
                    >
                        {t('common.resetAll', 'Reset all')}
                    </button>
                )}
            </motion.div>

            {/* Booking Steps */}
            <div className="grid md:grid-cols-3 gap-6">
                {cards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => onNavigate(card.step)}
                            className="bg-white rounded-xl border border-gray-200 p-5 transition-all hover:border-gray-900 hover:shadow-md cursor-pointer group flex flex-col h-full shadow-sm"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                                    <Icon size={20} />
                                </div>
                                {card.isComplete ? (
                                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full border-2 border-gray-100" />
                                )}
                            </div>

                            <h3 className="text-sm font-bold text-gray-900 mb-1">{card.title}</h3>
                            <p className="text-xs text-gray-500 line-clamp-2 flex-grow">{card.description}</p>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${card.isComplete ? 'text-green-600' : 'text-gray-400'
                                    }`}>
                                    {card.isComplete ? t('menu.completed', 'Complete') : t('common.select', 'Select')}
                                </span>
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Summary */}
            {isServicesComplete && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{t('confirm.summary', 'Selection Summary')}</h3>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => onNavigate('services')}
                                className="h-8 w-8 rounded-lg border-purple-200 text-purple-600 hover:bg-purple-50"
                                title={t('common.edit', 'Edit')}
                            >
                                <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={onReset}
                                className="h-8 w-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                                title={t('common.cancel', 'Cancel')}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        {bookingState.services.map((service: any) => (
                            <div key={service.id} className="flex justify-between items-center">
                                <span className="text-gray-700">{getLocalizedName(service, i18n.language)}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-500">{service.duration} {t('min', 'min')}</span>
                                    <span className="font-medium">{formatCurrency(service.price)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t pt-4 flex justify-between items-center mb-6">
                        <div>
                            <p className="text-gray-600">{t('services.total', 'Total')}</p>
                            <p className="text-sm text-gray-500">{totalDuration} {t('min', 'min')}</p>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalPrice)}</p>
                    </div>

                    {isAllComplete && (
                        <Button
                            onClick={() => onNavigate('confirm')}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 text-lg font-bold"
                            size="lg"
                        >
                            {t('menu.continue', 'Finalize Booking')}
                        </Button>
                    )}
                </motion.div>
            )}
        </div>
    );
}
