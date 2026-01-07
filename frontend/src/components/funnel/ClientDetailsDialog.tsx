
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { ScrollArea } from '../ui/scroll-area';
import { CalendarDays, Clock, Phone, Trash2, Edit2, Plus, Save, User as UserIcon, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";


interface Client {
    id: string;
    name: string;
    username: string;
    phone?: string;
    notes?: string;
    total_spend: number;
    last_contact: string;
    temperature: 'cold' | 'warm' | 'hot';
    pipeline_stage_id: number;
    profile_pic?: string;
    reminder_date?: string;
}

interface Booking {
    id: number;
    service_name: string;
    start_time: string;
    status: string;
    price: number;
    master_name?: string;
}

interface Stage {
    id: number;
    name: string;
    color: string;
    key?: string;
}

interface ClientDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: Client | null;
    onSuccess: () => void;
    stages?: Stage[];
    onAddBooking?: (client: Client) => void;
}

export function ClientDetailsDialog({ open, onOpenChange, client, onSuccess, stages = [], onAddBooking }: ClientDetailsDialogProps) {
    const { t } = useTranslation(['admin/funnel', 'common']);
    const [activeTab, setActiveTab] = useState<'info' | 'bookings'>('info');

    // Editable state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [reminderDate, setReminderDate] = useState('');
    const [temperature, setTemperature] = useState<'cold' | 'warm' | 'hot'>('cold');
    const [stageId, setStageId] = useState<string>(''); // form value

    const [isEditing, setIsEditing] = useState(false);

    // Bookings
    const [bookings, setBookings] = useState<Booking[]>([]);

    useEffect(() => {
        if (client) {
            setName(client.name || '');
            setPhone(client.phone || '');
            setNotes(client.notes || '');
            setReminderDate(client.reminder_date || '');
            setTemperature(client.temperature || 'cold');
            setStageId(client.pipeline_stage_id?.toString() || '');
            fetchClientDetails(client.id);
        }
    }, [client]);

    const fetchClientDetails = async (clientId: string) => {
        try {
            // Fetch bookings
            const bookingsData = await api.get(`/api/bookings?client_id=${clientId}`);
            setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        } catch (error) {
            console.error('Error fetching client details:', error);
            setBookings([]);
        }
    };

    const handleSave = async () => {
        if (!client) return;
        try {
            // Auto-move to "Remind Later" stage if reminder date is set and stage not manually changed to something else particular
            // But here we respect stageId which might have been changed by handleReminderDateChange

            // Update info
            await api.post(`/api/clients/${client.id}/update`, {
                name,
                phone,
                notes,
                reminder_date: reminderDate || null
            });

            // Update temperature
            if (temperature !== client.temperature) {
                await api.post(`/api/clients/${client.id}/temperature`, { temperature });
            }

            // Update stage if changed
            if (stageId && Number(stageId) !== client.pipeline_stage_id) {
                await api.post('/api/funnel/move', {
                    client_id: client.id,
                    stage_id: Number(stageId)
                });
            }

            toast.success(t('client_updated', 'Данные клиента обновлены'));
            setIsEditing(false);
            onSuccess(); // Refresh parent
        } catch (error) {
            console.error(error);
            toast.error(t('update_failed'));
        }
    };

    const handleRemoveFromFunnel = async () => {
        if (!client) return;
        if (!confirm(t('confirm_remove_funnel', 'Убрать клиента из воронки? (Клиент останется в базе)'))) return;

        try {
            await api.delete(`/api/funnel/clients/${client.id}`);
            toast.success(t('removed_from_funnel', 'Клиент убран из воронки'));
            onOpenChange(false);
            onSuccess();
        } catch (error) {
            toast.error(t('remove_failed', 'Ошибка удаления'));
        }
    };

    if (!client) return null;

    const currentStageName = stages.find(s => s.id === client.pipeline_stage_id)?.name || 'Unknown';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-white max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>{client.name || 'Client Details'}</DialogTitle>
                    <DialogDescription>
                        {t('client_details_description', 'Detailed view and editing of client information and bookings')}
                    </DialogDescription>
                </DialogHeader>
                {/* Header with Avatar */}
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center text-2xl font-bold text-pink-600 overflow-hidden relative">
                            {client.profile_pic ? (
                                <img src={client.profile_pic} alt={client.name} className="w-full h-full object-cover" />
                            ) : (
                                client.name?.[0]?.toUpperCase() || <UserIcon />
                            )}
                            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${temperature === 'hot' ? 'bg-red-500' : temperature === 'warm' ? 'bg-orange-500' : 'bg-blue-300'
                                }`} title={`Temperature: ${temperature}`} />
                        </div>
                        <div className="flex-1">
                            {isEditing ? (
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="font-bold text-lg h-8 mb-1 bg-white"
                                />
                            ) : (
                                <h2 className="text-xl font-bold text-gray-900 line-clamp-1">{name || client.username}</h2>
                            )}
                            <div className="text-sm text-gray-500">@{client.username}</div>
                            {!isEditing && (
                                <div className="text-xs text-purple-600 font-medium mt-1 bg-purple-100 px-2 py-0.5 rounded-full w-fit">
                                    {currentStageName}
                                </div>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto"
                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        >
                            {isEditing ? <Save className="w-4 h-4 text-green-600" /> : <Edit2 className="w-4 h-4 text-gray-400" />}
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'info' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('info')}
                    >
                        {t('info', 'Инфо')}
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'bookings' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('bookings')}
                    >
                        {t('bookings', 'Записи')} ({bookings.length})
                    </button>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1 p-6">
                    {activeTab === 'info' ? (
                        <div className="space-y-4">
                            {isEditing && (
                                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-gray-400 uppercase">Температура</Label>
                                        <Select value={temperature} onValueChange={(v: any) => setTemperature(v)}>
                                            <SelectTrigger className="bg-white h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cold">❄️ Cold</SelectItem>
                                                <SelectItem value="warm">🔥 Warm</SelectItem>
                                                <SelectItem value="hot">💥 Hot</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-gray-400 uppercase">Стадия</Label>
                                        <Select value={stageId} onValueChange={setStageId}>
                                            <SelectTrigger className="bg-white h-8 text-xs">
                                                <SelectValue placeholder="Select Stage" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {stages.map(s => (
                                                    <SelectItem key={s.id} value={s.id.toString()}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {!isEditing && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-400 uppercase">{t('temperature', 'Температура')}</Label>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${temperature === 'hot' ? 'bg-red-500' : temperature === 'warm' ? 'bg-orange-500' : 'bg-blue-300'}`} />
                                        <span className="capitalize text-gray-700 font-medium">
                                            {temperature === 'hot' ? 'Hot' : temperature === 'warm' ? 'Warm' : 'Cold'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">{t('phone', 'Телефон')}</Label>
                                {isEditing ? (
                                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        {phone || t('no_phone', 'Нет телефона')}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">{t('reminder', 'Напоминание')}</Label>
                                {isEditing ? (
                                    <Input
                                        type="datetime-local"
                                        value={reminderDate}
                                        onChange={(e) => {
                                            const newDate = e.target.value;
                                            setReminderDate(newDate);
                                            if (newDate) {
                                                const remindStage = stages.find(s => s.key === 'remind_later' || s.name?.toLowerCase().includes('напомнить') || s.name?.toLowerCase().includes('remind'));
                                                if (remindStage) {
                                                    setStageId(remindStage.id.toString());
                                                }
                                            }
                                        }}
                                        className="bg-white h-8"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Bell className="w-4 h-4 text-gray-400" />
                                        {reminderDate ? format(new Date(reminderDate), 'dd MMM yyyy HH:mm', { locale: ru }) : <span className="text-gray-400 italic">{t('no_reminder', 'Не установлено')}</span>}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">{t('notes', 'Заметки')}</Label>
                                {isEditing ? (
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="min-h-[100px]"
                                        placeholder={t('add_notes', 'Добавить заметку...')}
                                    />
                                ) : (
                                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[60px]">
                                        {notes || <span className="text-gray-400 italic">{t('no_notes', 'Нет заметок')}</span>}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <Button
                                    variant="destructive"
                                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 border-none shadow-none"
                                    onClick={handleRemoveFromFunnel}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {t('remove_from_funnel', 'Убрать из воронки')}
                                </Button>
                                <p className="text-xs text-center text-gray-400 mt-2">
                                    {t('remove_hint', 'Клиент останется в базе, но пропадет с доски')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {bookings.map(booking => (
                                <div key={booking.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-medium text-gray-900">{booking.service_name}</div>
                                        <div className={`text-xs px-2 py-0.5 rounded-full ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                            booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {booking.status}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2 mb-1">
                                        <CalendarDays className="w-3 h-3" />
                                        {format(new Date(booking.start_time), 'dd MMM yyyy', { locale: ru })}
                                        <Clock className="w-3 h-3 ml-1" />
                                        {format(new Date(booking.start_time), 'HH:mm')}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Master: {booking.master_name || '-'}
                                    </div>
                                </div>
                            ))}
                            {bookings.length === 0 && (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    {t('no_bookings', 'Нет записей')}
                                </div>
                            )}

                            <Button className="w-full mt-4" variant="outline" onClick={() => client && onAddBooking?.(client)}>
                                <Plus className="w-4 h-4 mr-2" />
                                {t('add_booking', 'Добавить запись')}
                            </Button>
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                        {t('close', 'Закрыть')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
