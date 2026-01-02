
import { useTranslation } from 'react-i18next';
import { Calendar, User, Scissors } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

interface RescheduleDialogProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: any;
}

export function RescheduleDialog({ isOpen, onClose, appointment }: RescheduleDialogProps) {
    const { t } = useTranslation(['account', 'common']);
    const navigate = useNavigate();

    if (!appointment) return null;

    const handleOption = (option: 'datetime' | 'master' | 'service') => {
        const state: any = {
            editBookingId: appointment.id,
            prefillService: appointment.service_id,
            prefillMaster: appointment.master_id,
        };

        // If changing time, keep master and service
        if (option === 'datetime') {
            state.prefillDate = appointment.date;
            // navigate to datetime step
            navigate('/new-booking?booking=datetime', { state });
        }
        // If changing master, keep service but clear master (wizard logic handles this if we don't pass prefillMaster?)
        // Actually, the wizard logic is: if prefillMaster is present, it selects it.
        // If we want to CHANGE it, we probably shouldn't prefill it, OR we prefill it but go to the 'professional' step.
        else if (option === 'master') {
            // We keep the service, but let user pick master. 
            // We can pass prefillMaster so it's selected, but user is on 'professional' step to change it.
            navigate('/new-booking?booking=professional', { state: { ...state, prefillDate: null } });
        }
        // If changing service, go to services step
        else if (option === 'service') {
            navigate('/new-booking?booking=services', { state: { ...state, prefillMaster: null, prefillDate: null } });
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
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('appointments.current_service', 'Услуга')}:</span>
                            <span className="font-medium">{appointment.service_name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('appointments.current_master', 'Мастер')}:</span>
                            <span className="font-medium">{appointment.master_name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('appointments.current_time', 'Время')}:</span>
                            <span className="font-medium">
                                {new Date(appointment.date.replace(' ', 'T')).toLocaleDateString()} {appointment.time}
                            </span>
                        </div>
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
