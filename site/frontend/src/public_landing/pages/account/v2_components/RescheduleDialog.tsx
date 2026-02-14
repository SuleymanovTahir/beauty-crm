
import { useTranslation } from 'react-i18next';
import { Calendar, User, Scissors, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@site/public_landing/components/ui/dialog';
import { Button } from '@site/public_landing/components/ui/button';
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

    const handleOption = (option: 'datetime' | 'master' | 'service' | 'all') => {
        // Если есть callback (используется внутри UserBookingWizard)
        if (onChangeStep) {
            if (option === 'datetime') {
                onChangeStep('datetime');
            } else if (option === 'master') {
                onChangeStep('professional');
            } else {
                onChangeStep('services');
            }
        } else {
            // Иначе используем navigate (для редактирования существующих записей)
            const baseState: any = {
                editBookingId: appointment.id,
                prefillService: appointment.service_id,
                prefillServiceName: appointment.service_name,
                prefillMaster: appointment.master_id,
                prefillMasterName: appointment.master_name,
                prefillDate: appointment.date,
                prefillTime: appointment.time,
            };

            const params = new URLSearchParams();
            params.set('id', String(appointment.id));

            const setIfPresent = (key: string, value: unknown) => {
                if (value === undefined || value === null) {
                    return;
                }
                const normalized = String(value).trim();
                if (normalized.length > 0) {
                    params.set(key, normalized);
                }
            };

            if (option === 'datetime') {
                params.set('booking', 'datetime');
                setIfPresent('serviceId', appointment.service_id);
                setIfPresent('serviceName', appointment.service_name);
                setIfPresent('masterId', appointment.master_id);
                setIfPresent('date', appointment.date);
                setIfPresent('time', appointment.time);
                navigate(`/new-booking?${params.toString()}`, { state: baseState });
            } else if (option === 'master') {
                params.set('booking', 'professional');
                setIfPresent('serviceId', appointment.service_id);
                setIfPresent('serviceName', appointment.service_name);
                setIfPresent('date', appointment.date);
                setIfPresent('time', appointment.time);
                navigate(`/new-booking?${params.toString()}`, { state: baseState });
            } else if (option === 'service') {
                params.set('booking', 'services');
                setIfPresent('serviceId', appointment.service_id);
                setIfPresent('serviceName', appointment.service_name);
                navigate(`/new-booking?${params.toString()}`, {
                    state: {
                        ...baseState,
                        prefillMaster: null,
                        prefillMasterName: null,
                        prefillDate: null,
                        prefillTime: null
                    }
                });
            } else {
                params.set('booking', 'services');
                navigate(`/new-booking?${params.toString()}`, {
                    state: {
                        editBookingId: appointment.id,
                        prefillService: null,
                        prefillServiceName: null,
                        prefillMaster: null,
                        prefillMasterName: null,
                        prefillDate: null,
                        prefillTime: null
                    }
                });
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
                        {appointment.date && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('appointments.current_time', 'Время')}:</span>
                                <span className="font-medium">
                                    {new Date(appointment.date.replace(' ', 'T')).toLocaleDateString()} {appointment.time}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <Button variant="outline" className="justify-start h-auto py-4 px-4 min-w-0" onClick={() => handleOption('datetime')}>
                            <Calendar className="w-5 h-5 mr-3 text-primary" />
                            <div className="flex flex-col items-start min-w-0 w-full">
                                <span className="font-medium whitespace-normal break-words text-left">{t('appointments.change_time', 'Изменить время')}</span>
                                <span className="text-xs text-muted-foreground font-normal whitespace-normal break-words text-left">
                                    {t('appointments.change_time_desc', 'Выбрать другую дату или время')}
                                </span>
                            </div>
                        </Button>

                        <Button variant="outline" className="justify-start h-auto py-4 px-4 min-w-0" onClick={() => handleOption('master')}>
                            <User className="w-5 h-5 mr-3 text-primary" />
                            <div className="flex flex-col items-start min-w-0 w-full">
                                <span className="font-medium whitespace-normal break-words text-left">{t('appointments.change_master', 'Выбрать другого мастера')}</span>
                                <span className="text-xs text-muted-foreground font-normal whitespace-normal break-words text-left">
                                    {t('appointments.change_master_desc', 'Оставить услугу, но сменить специалиста')}
                                </span>
                            </div>
                        </Button>

                        <Button variant="outline" className="justify-start h-auto py-4 px-4 min-w-0" onClick={() => handleOption('service')}>
                            <Scissors className="w-5 h-5 mr-3 text-primary" />
                            <div className="flex flex-col items-start min-w-0 w-full">
                                <span className="font-medium whitespace-normal break-words text-left">{t('appointments.change_service', 'Изменить услугу')}</span>
                                <span className="text-xs text-muted-foreground font-normal whitespace-normal break-words text-left">
                                    {t('appointments.change_service_desc', 'Выбрать другую процедуру')}
                                </span>
                            </div>
                        </Button>

                        <Button variant="outline" className="justify-start h-auto py-4 px-4 min-w-0" onClick={() => handleOption('all')}>
                            <Settings2 className="w-5 h-5 mr-3 text-primary" />
                            <div className="flex flex-col items-start min-w-0 w-full">
                                <span className="font-medium whitespace-normal break-words text-left">{t('appointments.change_all', 'Изменить всё')}</span>
                                <span className="text-xs text-muted-foreground font-normal whitespace-normal break-words text-left">
                                    {t('appointments.change_all_desc', 'Сменить услугу, мастера и время за один раз')}
                                </span>
                            </div>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
