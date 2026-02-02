
import { useTranslation } from 'react-i18next';
import { Calendar, User, Scissors } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

interface RescheduleDialogProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: any;
    onChangeStep?: (step: string) => void; // Опциональный callback для внутреннего использования
}

export function RescheduleDialog({ isOpen, onClose, appointment, onChangeStep }: RescheduleDialogProps) {
    const { t } = useTranslation(['account', 'common']);
    const navigate = useNavigate();

    if (!appointment) return null;

    const handleOption = (option: 'datetime' | 'master' | 'service') => {
        // Если есть callback (используется внутри UserBookingWizard)
        if (onChangeStep) {
            if (option === 'datetime') {
                onChangeStep('datetime');
            } else if (option === 'master') {
                onChangeStep('professional');
            } else if (option === 'service') {
                onChangeStep('services');
            }
        } else {
            // Иначе используем navigate (для редактирования существующих записей)
            const state: any = {
                editBookingId: appointment.id,
                prefillService: appointment.service_id,
                prefillMaster: appointment.master_id,
            };

            if (option === 'datetime') {
                state.prefillDate = appointment.date;
                navigate(`/new-booking?booking=datetime&id=${appointment.id}`, { state });
            } else if (option === 'master') {
                navigate(`/new-booking?booking=professional&id=${appointment.id}`, { state: { ...state, prefillDate: null } });
            } else if (option === 'service') {
                navigate(`/new-booking?booking=services&id=${appointment.id}`, { state: { ...state, prefillMaster: null, prefillDate: null } });
            }
        }

        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('appointments.reschedule_title', 'Изменить запись')}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
                        {appointment.service_name && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('appointments.current_service', 'Услуга')}:</span>
                                <span className="font-medium">{appointment.service_name}</span>
                            </div>
                        )}
                        {appointment.master_name && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('appointments.current_master', 'Мастер')}:</span>
                                <span className="font-medium">{appointment.master_name}</span>
                            </div>
                        )}
                        {appointment.date && appointment.time && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('appointments.current_time', 'Время')}:</span>
                                <span className="font-medium">
                                    {new Date(appointment.date.replace(' ', 'T')).toLocaleDateString()} {appointment.time}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <Button variant="outline" className="justify-start h-auto py-4 px-4" onClick={() => handleOption('datetime')}>
                            <Calendar className="w-5 h-5 mr-3 text-primary" />
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{t('appointments.change_time', 'Изменить время')}</span>
                                <span className="text-xs text-muted-foreground font-normal">
                                    {t('appointments.change_time_desc', 'Выбрать другую дату или время')}
                                </span>
                            </div>
                        </Button>

                        <Button variant="outline" className="justify-start h-auto py-4 px-4" onClick={() => handleOption('master')}>
                            <User className="w-5 h-5 mr-3 text-primary" />
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{t('appointments.change_master', 'Выбрать другого мастера')}</span>
                                <span className="text-xs text-muted-foreground font-normal">
                                    {t('appointments.change_master_desc', 'Оставить услугу, но сменить специалиста')}
                                </span>
                            </div>
                        </Button>

                        <Button variant="outline" className="justify-start h-auto py-4 px-4" onClick={() => handleOption('service')}>
                            <Scissors className="w-5 h-5 mr-3 text-primary" />
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{t('appointments.change_service', 'Изменить услугу')}</span>
                                <span className="text-xs text-muted-foreground font-normal">
                                    {t('appointments.change_service_desc', 'Выбрать другую процедуру')}
                                </span>
                            </div>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
