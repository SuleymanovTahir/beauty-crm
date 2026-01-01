import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Scissors, User, Calendar, Check, ChevronRight, MapPin, X, Edit } from 'lucide-react';
import { motion } from 'motion/react';
import { getLocalizedName } from '../../../../src/utils/i18nUtils';

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
            title: t('menu.services', 'Select Services'),
            description: getServicesDescription(),
            isComplete: isServicesComplete,
            step: 'services',
            gradient: 'from-purple-500 to-pink-500',
        },
        {
            id: 'professional',
            icon: User,
            title: t('menu.professional', 'Professional'),
            description: isProfessionalComplete
                ? (bookingState.professional?.full_name || bookingState.professional?.username || t('professional.anyAvailable', 'Flexible Match'))
                : t('menu.selectProfessional', 'Select master'),
            isComplete: isProfessionalComplete,
            step: 'professional',
            gradient: 'from-pink-500 to-rose-500',
        },
        {
            id: 'datetime',
            icon: Calendar,
            title: t('menu.datetime', 'Date & Time'),
            description: getDateTimeDescription(),
            isComplete: isDateTimeComplete,
            step: 'datetime',
            gradient: 'from-rose-500 to-orange-500',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Salon Info */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-6"
            >
                <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Scissors className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900">{salonSettings?.name || t('salon.name', 'Beauty HQ')}</h2>
                        <p className="text-gray-600 flex items-center gap-2 mt-2">
                            <MapPin className="w-4 h-4" />
                            {salonSettings?.address || t('salon.address', 'Studio Location')}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onReset}
                        className="text-[10px] font-black uppercase tracking-widest border-red-100 text-red-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all rounded-xl"
                    >
                        {t('common.reset', 'Reset All')}
                    </Button>
                </div>
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
                        >
                            <Card
                                className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-200 overflow-hidden group"
                                onClick={() => onNavigate(card.step)}
                            >
                                <div className={`h-2 bg-gradient-to-r ${card.gradient}`} />
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        {card.isComplete && (
                                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                                    <p className="text-sm text-gray-600 mb-4">{card.description}</p>

                                    <div className="flex items-center justify-between">
                                        <Badge variant={card.isComplete ? 'default' : 'outline'} className={card.isComplete ? 'bg-green-500' : ''}>
                                            {card.isComplete ? t('menu.completed', 'Complete') : t('common.select', 'Select')}
                                        </Badge>
                                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                                    </div>
                                </CardContent>
                            </Card>
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
                                    <span className="font-medium">{service.price} {salonSettings?.currency || 'AED'}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t pt-4 flex justify-between items-center mb-6">
                        <div>
                            <p className="text-gray-600">{t('services.total', 'Total')}</p>
                            <p className="text-sm text-gray-500">{totalDuration} {t('min', 'min')}</p>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">{totalPrice} {salonSettings?.currency || 'AED'}</p>
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
